"""Keep a compact, attributed experiment record in Git; large artifacts stay local."""
import hashlib
import json
import statistics
from pathlib import Path

root = Path('.receipt-ml')
out = Path('experiments/receipt_model/results')
out.mkdir(exist_ok=True)
adapter = root / 'adapters/donut-adapter-v3'
logs = [json.loads(x) for x in (adapter / 'loss.jsonl').read_text().splitlines()]
decision = json.loads((root / 'candidate.json').read_text())
assert hashlib.sha256((root / 'reports/validation-20.json').read_bytes()).hexdigest() == decision['validation_report_sha256']
assert hashlib.sha256((adapter / 'adapter_model.safetensors').read_bytes()).hexdigest() == decision['adapter_sha256']
assert len(logs) == 100
result = {
    'date': '2026-10-25',
    'scope': 'First 20 validation and first 20 test receipts; convenience pilot, not full-split or Philippine-domain evaluation.',
    'attribution': 'Park et al., CORD: A Consolidated Receipt Dataset for Post-OCR Parsing, 2019, NAVER CLOVA AI. Dataset CC BY 4.0; https://github.com/clovaai/cord',
    'provenance': json.loads((root / 'provenance.json').read_text()),
    'production_baseline': json.loads((root / 'frozen-production/provenance.json').read_text()),
    'decision': decision,
    'training': json.loads((adapter / 'run.json').read_text()),
    'training_summary': {
        'unique_receipts': len({r['receipt_id'] for r in logs}),
        'mean_loss': statistics.mean(r['loss'] for r in logs),
        'seconds': sum(r['seconds'] for r in logs),
        'note': 'Losses are on different training examples, not a held-out accuracy measurement.',
    },
    'curriculum': json.loads((root / 'curriculum.json').read_text()),
    'artifact_sha256': {},
    'benchmarks': {},
}
for split in ['validation', 'test']:
    r = json.loads((root / f'reports/{split}-20.json').read_text())
    assert set(r['systems']) == {'groq', 'donut-base', 'donut-adapter-v3'}
    expected = {f'{split}-{i:04}' for i in range(20)}
    for name in r['systems']:
        predictions = [json.loads(x) for x in (root / f'predictions/{name}-{split}.jsonl').read_text().splitlines()]
        assert expected <= {p['id'] for p in predictions}, f'Unattempted receipts: {name}/{split}'
    for system in r['systems'].values():
        system.pop('details', None)
    result['benchmarks'][split] = r
for path in [adapter / 'adapter_model.safetensors', adapter / 'loss.jsonl',
             root / 'candidate.json', *Path('experiments/receipt_model').glob('*.py'),
             Path('experiments/receipt_model/groq_benchmark.mjs'),
             Path('experiments/receipt_model/requirements.lock.txt')]:
    result['artifact_sha256'][str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
(out / '2026-10-25-cord-pilot.json').write_text(json.dumps(result, indent=2) + '\n')
print(out / '2026-10-25-cord-pilot.json')
