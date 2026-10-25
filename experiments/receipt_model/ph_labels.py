"""Review gate for a separate Philippine Donut pilot."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from PIL import Image


def number(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d+(?:\.\d+)?', value):
        raise ValueError('Use checked, nonnegative decimal strings; no guessed or locale-ambiguous numbers')
    return value

def checked_splits(rows):
    splits = {key: [] for key in ('train', 'validation', 'test')}
    ids, groups = set(), {}
    for row in rows:
        review = row.get('review', {})
        if (review.get('status') not in ('image_checked_ai', 'human_verified')
                or review.get('complete') is not True
                or not review.get('reviewer') or not review.get('notes')
                or not row.get('sha256') or review.get('image_sha256') != row['sha256']):
            raise ValueError('Every included receipt requires a complete image-bound check')
        if row.get('split') not in splits or not row.get('id') or row['id'] in ids:
            raise ValueError('Invalid split or duplicate receipt ID')
        ids.add(row['id'])
        for field in ('receipt_family', 'merchant_group', 'sha256'):
            if not row.get(field):
                raise ValueError(f'Missing {field}')
            group = (field, row[field])
            if group in groups and groups[group] != row['split']:
                raise ValueError(f'{field} occurs across splits')
            groups[group] = row['split']
        if not row.get('items'):
            raise ValueError('An empty draft is not a checked negative receipt')
        menu = []
        for item in row['items']:
            if not isinstance(item.get('name'), str) or not item['name'].strip():
                raise ValueError('Missing checked product name')
            target = {'nm': item['name']}
            if item.get('count') is not None:
                target['cnt'] = number(item['count'])
            target['price'] = number(item.get('price'))
            menu.append(target)
        splits[row['split']].append(dict(id=row['id'], image=row['image'],
            split=row['split'], image_sha256=row['sha256'],
            ground_truth={'gt_parse': {'menu': menu}}, review=review))
    return splits


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('labels', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    rows = [json.loads(line) for line in args.labels.read_text().splitlines() if line]
    for row in rows:
        with Path(row['image']).open('rb') as f:
            if hashlib.file_digest(f, 'sha256').hexdigest() != row['sha256']:
                raise ValueError('Image changed since review')
    splits = checked_splits(rows)
    if args.output.exists():
        raise FileExistsError('Preserve existing split artifacts; use a fresh output directory')
    args.output.mkdir(parents=True)
    (args.output / 'ocr-images').mkdir()
    for split, records in splits.items():
        for row in records:
            with Image.open(row['image']) as source:
                im = source.convert('RGB')
            longest = max(im.size)
            scale = 1600 / longest if longest > 1600 else 1000 / longest if longest < 1000 else 1
            im = im.resize(tuple(round(x * scale) for x in im.size), Image.Resampling.BICUBIC).convert('L').convert('RGB')
            image_path = args.output / 'ocr-images' / f"{row['id']}.jpg"
            for quality in [92, 85, 70, 55, 40, 25]:
                im.save(image_path, quality=quality)
                if image_path.stat().st_size <= 1024 * 1024:
                    break
            if image_path.stat().st_size > 1024 * 1024:
                raise ValueError('Prepared OCR image exceeds provider limit')
            row['ocr_image'] = str(image_path.resolve())
        (args.output / f'{split}.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in records))
    (args.output / 'labels.sha256').write_text(hashlib.sha256(args.labels.read_bytes()).hexdigest() + '\n')
    print(json.dumps({k: len(v) for k, v in splits.items()}))
