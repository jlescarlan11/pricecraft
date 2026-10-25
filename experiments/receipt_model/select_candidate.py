"""Freeze a validation-only decision before examining test predictions."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path('.receipt-ml')
report_path = root / 'reports/validation-20.json'
report = json.loads(report_path.read_text())
base = report['systems']['donut-base']
adapted = report['systems']['donut-adapter-v3']
assert base['receipts'] == adapted['receipts'] == 20
assert not base['missing_or_failed_receipts'] and not adapted['missing_or_failed_receipts']
assert not (root / 'reports/test-20.json').exists(), 'Do not change selection after looking at test results'
assert not (root / 'candidate.json').exists(), 'Candidate decision is immutable for this experiment'
adapter = root / 'adapters/donut-adapter-v3/adapter_model.safetensors'
run = json.loads((adapter.parent / 'run.json').read_text())
assert run['completed_steps'] == run['steps'] == 100
improved = (adapted['item_price_f1'] > base['item_price_f1']
            and adapted['strict_name_price_f1'] >= base['strict_name_price_f1'])
decision = {
    'frozen_at_utc': datetime.now(timezone.utc).isoformat(),
    'selected_candidate': 'donut-adapter-v3' if improved else 'donut-base',
    'rule': 'Accept adapter only for higher validation item-price F1 without lower strict-name-price F1; otherwise retain pretrained baseline.',
    'validation_report_sha256': hashlib.sha256(report_path.read_bytes()).hexdigest(),
    'adapter_sha256': hashlib.sha256(adapter.read_bytes()).hexdigest(),
    'evaluated_candidates': ['donut-base', 'donut-adapter-v3'],
    'test_receipt_ids': [f'test-{i:04}' for i in range(20)],
    'production_decision': 'Keep OCR.space + Groq. CORD alone cannot establish Philippine-domain replacement accuracy.',
}
(root / 'candidate.json').write_text(json.dumps(decision, indent=2))
print(json.dumps(decision, indent=2))
