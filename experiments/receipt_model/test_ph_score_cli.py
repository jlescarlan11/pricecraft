"""Keep held-out scoring separate from development validation artifacts."""
import json
import subprocess
import sys
from pathlib import Path


def test_test_split_does_not_read_or_overwrite_validation(tmp_path):
    row = {'id': 'held-out', 'ground_truth': {'gt_parse': {
        'menu': [{'nm': 'RICE', 'price': 'P34.000'}]}}}
    (tmp_path / 'test.jsonl').write_text(json.dumps(row) + '\n')
    (tmp_path / 'predictions').mkdir()
    prediction = {'id': 'held-out', 'items': [{'name': 'RICE', 'price': '34'}]}
    (tmp_path / 'predictions' / 'groq-test.jsonl').write_text(json.dumps(prediction) + '\n')
    (tmp_path / 'reports').mkdir()
    old_report = tmp_path / 'reports' / 'validation.json'
    old_report.write_text('preserve previous validation')
    result = subprocess.run([sys.executable, str(Path(__file__).with_name('ph_score.py')),
        '--root', str(tmp_path), '--split', 'test', '--systems', 'groq'],
        text=True, capture_output=True)
    assert result.returncode == 0, result.stderr
    report = json.loads((tmp_path / 'reports' / 'test.json').read_text())
    assert report['split'] == 'test'
    assert report['systems']['groq']['matched_prices'] == 1
    assert old_report.read_text() == 'preserve previous validation'
