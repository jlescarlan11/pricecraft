import io
import json
import zipfile
from PIL import Image
import pytest
from ph_import import import_archive


def archive(tmp_path, extra=None):
    p = tmp_path / 'receipts.zip'
    image = io.BytesIO(); Image.new('RGB', (20, 30), 'white').save(image, format='PNG')
    with zipfile.ZipFile(p, 'w') as z:
        z.writestr('README.dataset.txt', 'License: CC BY 4.0')
        z.writestr('train/a.png', image.getvalue())
        z.writestr('train/_annotations.coco.json', json.dumps({
            'categories': [{'id': i, 'name': n} for i, n in enumerate(['Date', 'Merchant', 'Total'])],
            'images': [{'id': 0, 'file_name': 'a.png', 'width': 20, 'height': 30}]}))
        if extra: z.writestr(extra, 'bad')
    return p


def test_import_preserves_image_and_starts_unreviewed(tmp_path):
    output = tmp_path / 'data'
    result = import_archive(archive(tmp_path), output)
    assert result['images'] == 1
    row = json.loads((output / 'manifest.jsonl').read_text())
    assert row['status'] == 'draft' and row['items'] == []
    assert row['size'] == [20, 30]
    assert len(row['sha256']) == 64
    assert (output / 'source-v1.coco.zip').exists()


def test_archive_cannot_write_outside_dataset(tmp_path):
    output = tmp_path / 'data'
    with pytest.raises(ValueError): import_archive(archive(tmp_path, '../escape.txt'), output)
    assert not output.exists()
    assert not (tmp_path / 'escape.txt').exists()


def test_existing_dataset_is_never_overwritten(tmp_path):
    output = tmp_path / 'data'; output.mkdir(); (output / 'labels').write_text('keep')
    with pytest.raises(FileExistsError): import_archive(archive(tmp_path), output)
    assert (output / 'labels').read_text() == 'keep'
