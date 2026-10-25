"""Import the public Roboflow COCO export without turning boxes into item labels."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import zipfile
from PIL import Image


def import_archive(archive, destination):
    archive, destination = Path(archive), Path(destination)
    if destination.exists():
        raise FileExistsError('Use a fresh directory; never overwrite reviewed data')
    with zipfile.ZipFile(archive) as z:
        names = set()
        if sum(info.file_size for info in z.infolist()) > 2_000_000_000:
            raise ValueError('Unexpected archive size')
        for info in z.infolist():
            path = PurePosixPath(info.filename)
            if (path.is_absolute() or '..' in path.parts or '\\' in info.filename
                    or stat.S_ISLNK(info.external_attr >> 16) or info.filename in names):
                raise ValueError('Unsafe or ambiguous archive member')
            names.add(info.filename)
        metadata = json.loads(z.read('train/_annotations.coco.json'))
        if not {'Date', 'Merchant', 'Total'} <= {c['name'] for c in metadata['categories']}:
            raise ValueError('Unexpected source label schema')
        license_text = z.read('README.dataset.txt').decode()
        if 'CC BY 4.0' not in license_text:
            raise ValueError('Expected publisher license statement is absent')
        rows, ids = [], set()
        for rec in sorted(metadata['images'], key=lambda r: r['id']):
            name = rec['file_name']
            if PurePosixPath(name).name != name or rec['id'] in ids:
                raise ValueError('Invalid image filename or duplicate ID')
            ids.add(rec['id'])
            raw = z.read('train/' + name)
            with Image.open(io.BytesIO(raw)) as source:
                image = source.convert('RGB')
                if image.size != (rec['width'], rec['height']):
                    raise ValueError('Image dimensions disagree with COCO metadata')
                rows.append(dict(id=f"ph-{rec['id']:04d}",
                    image=str((destination / 'export/train' / name).resolve()),
                    sha256=hashlib.sha256(raw).hexdigest(),
                    pixels_sha256=hashlib.sha256(image.tobytes() + str(image.size).encode()).hexdigest(),
                    size=list(image.size), status='draft', items=[]))
        destination.mkdir(parents=True)
        shutil.copy2(archive, destination / 'source-v1.coco.zip')
        z.extractall(destination / 'export')
    result = dict(images=len(rows), archive_sha256=hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest(),
        source='https://universe.roboflow.com/capstone-emk5p/receipts-dataset-philippines',
        version=1, license='CC BY 4.0', unique_byte_hashes=len({r['sha256'] for r in rows}),
        unique_pixel_hashes=len({r['pixels_sha256'] for r in rows}),
        note='Distinct hashes do not establish distinct transactions. Item labels require image review.')
    (destination / 'manifest.jsonl').write_text(''.join(json.dumps(r) + '\n' for r in rows))
    (destination / 'import.json').write_text(json.dumps(result, indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    print(json.dumps(import_archive(args.archive, args.destination)))
