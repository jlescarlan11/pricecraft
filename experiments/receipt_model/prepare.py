"""Download publisher-pinned CORD/Donut and materialize reproducible local inputs."""
import hashlib
import io
import json
from pathlib import Path
import urllib.request

from huggingface_hub import snapshot_download
from PIL import Image
import pyarrow.parquet as pq

ROOT = Path('.receipt-ml')
DATA_REV = '7f0115a4b758a71d6473b8d085751692da2fef98'
MODEL_REV = '8003d433113256b4ce3a0f5bf604b29ff78a7451'


def prepare():
    ROOT.mkdir(exist_ok=True)
    data = Path(snapshot_download('naver-clova-ix/cord-v2', repo_type='dataset',
        revision=DATA_REV, local_dir=ROOT / 'cord', max_workers=2))
    print('Dataset downloaded', flush=True)
    images = ROOT / 'images'
    images.mkdir(exist_ok=True)
    shard_hashes, counts, image_splits = {}, {}, {}
    for split, expected in [('validation', 100), ('train', 800), ('test', 100)]:
        rows = []
        for shard in sorted((data / 'data').glob(f'{split}-*.parquet')):
            shard_hashes[shard.name] = hashlib.file_digest(shard.open('rb'), 'sha256').hexdigest()
            for batch in pq.ParquetFile(shard).iter_batches(batch_size=1):
                record = batch.to_pylist()[0]
                gt = json.loads(record['ground_truth'])
                raw = record['image']['bytes']
                digest = hashlib.sha256(raw).hexdigest()
                if digest in image_splits and image_splits[digest] != split:
                    raise ValueError('Identical image occurs across splits; resolve leakage before training')
                image_splits[digest] = split
                receipt_id = f'{split}-{len(rows):04d}'
                source = Image.open(io.BytesIO(raw))
                extension = 'jpg' if source.format == 'JPEG' else source.format.lower()
                image_path = images / f'{receipt_id}.{extension}'
                image_path.write_bytes(raw)
                im = source.convert('RGB')
                # Equivalent scale/grayscale policy to imagePreprocess.ts. Pillow
                # bicubic/JPEG encoding differs from browser canvas; record this.
                longest = max(im.size)
                scale = 1600 / longest if longest > 1600 else 1000 / longest if longest < 1000 else 1
                processed = im.resize(tuple(round(x * scale) for x in im.size), Image.Resampling.BICUBIC).convert('L').convert('RGB')
                ocr_path = images / f'{receipt_id}-ocr.jpg'
                for quality in [92, 85, 70, 55, 40, 25]:
                    processed.save(ocr_path, quality=quality)
                    if ocr_path.stat().st_size <= 1024 * 1024:
                        break
                assert ocr_path.stat().st_size <= 1024 * 1024
                rows.append(dict(id=receipt_id, split=split, image=str(image_path),
                    image_sha256=digest, ocr_image=str(ocr_path), ground_truth=gt))
        assert len(rows) == expected, (split, len(rows))
        (ROOT / f'{split}.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))
        counts[split] = len(rows)
        print('Prepared', split, len(rows), flush=True)
    license_text = urllib.request.urlopen('https://raw.githubusercontent.com/clovaai/cord/327310ce58c1623255821d062b3a759ff3789e3c/LICENSE-CC-BY', timeout=30).read()
    (ROOT / 'CORD-LICENSE-CC-BY.txt').write_bytes(license_text)
    manifest = dict(dataset='naver-clova-ix/cord-v2', dataset_revision=DATA_REV,
        counts=counts, parquet_sha256=shard_hashes, license='CC-BY-4.0',
        attribution='Park et al., CORD: A Consolidated Receipt Dataset for Post-OCR Parsing, 2019, NAVER CLOVA AI',
        model='naver-clova-ix/donut-base-finetuned-cord-v2', model_revision=MODEL_REV,
        ocr_preprocessing='PriceCraft scale/grayscale policy, Pillow bicubic/JPEG implementation; not pixel-identical to browser canvas')
    (ROOT / 'provenance.json').write_text(json.dumps(manifest, indent=2))
    snapshot_download(manifest['model'], revision=MODEL_REV, local_dir=ROOT / 'donut', max_workers=2,
        allow_patterns=['*.json', '*.model', '*.bin', 'README.md'])
    print('Model downloaded; preparation complete', flush=True)


if __name__ == '__main__':
    prepare()
