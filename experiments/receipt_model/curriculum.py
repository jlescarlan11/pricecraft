"""Reproduce the train-only curriculum chosen after validation error inspection."""
import json
import random
from pathlib import Path
from metrics import load_jsonl

root = Path('.receipt-ml')
rows = load_jsonl(root / 'train.jsonl')
assert all(row['split'] == 'train' for row in rows)
rng = random.Random(20261025)
rng.shuffle(rows)

def challenging(row):
    parsed = row['ground_truth']['gt_parse']
    menus = parsed.get('menu', [])
    menus = [menus] if isinstance(menus, dict) else menus
    return ('discount' in json.dumps(parsed).lower()
            or any('.' in str(m.get('cnt', '')) for m in menus))

hard = [r for r in rows if challenging(r)][:50]
chosen = {r['id'] for r in hard}
balanced = [r for r in rows if r['id'] not in chosen][:100 - len(chosen)]
record = {
    'seed': 20261025,
    'rationale': 'Validation showed a discount emitted as a product and a missing decimal-formatted count. Mix matching train examples with general receipts.',
    'validation_ids_inspected': [f'validation-{i:04}' for i in range(20)],
    'hard_examples': len(hard),
    'general_examples': len(balanced),
    'train_ids': [r['id'] for r in hard + balanced],
    'test_used_for_selection': False,
}
(root / 'curriculum.json').write_text(json.dumps(record, indent=2))
print(json.dumps({k: v for k, v in record.items() if k not in ['train_ids', 'validation_ids_inspected']}))
