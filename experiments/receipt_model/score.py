import argparse
import json
from pathlib import Path
from metrics import evaluate, load_jsonl, menu_items

parser = argparse.ArgumentParser()
parser.add_argument('--split', choices=['validation', 'test'], default='validation')
parser.add_argument('--limit', type=int, default=100)
parser.add_argument('--systems', nargs='+', default=['groq', 'donut-base'])
args = parser.parse_args()
root = Path('.receipt-ml')
records = load_jsonl(root / f'{args.split}.jsonl')[:args.limit]
truth = [{'id': r['id'], 'items': menu_items(r['ground_truth']['gt_parse'])} for r in records]
summary = {'split': args.split, 'requested_receipts': len(truth),
    'metric': 'Micro F1 of aggregated product-name matches (SequenceMatcher >= .75) with exact normalized line price (tolerance .01).',
    'count_note': 'Count accuracy is conditional on comparable predictions; coverage includes all labeled ground-truth counts. Physical-unit accuracy is unavailable.',
    'systems': {}}
for system in args.systems:
    p = root / 'predictions' / f'{system}-{args.split}.jsonl'
    predictions = load_jsonl(p) if p.exists() else []
    score = evaluate(truth, predictions)
    relevant_ids = {r['id'] for r in truth}
    attempts = [r for r in predictions if r['id'] in relevant_ids]
    score['recorded_attempts'] = len(attempts)
    score['recorded_failed_attempts'] = sum(bool(r.get('error')) for r in attempts)
    score['retry_note'] = 'Latest recorded outcome per receipt is scored; earlier failed attempts remain separately reported. Internal HTTP 429 retries are in runner logs.'
    summary['systems'][system] = score
    print(system, json.dumps({k: v for k, v in score.items() if k != 'details'}))
(root / 'reports').mkdir(exist_ok=True)
(root / 'reports' / f'{args.split}-{args.limit}.json').write_text(json.dumps(summary, default=str, indent=2))
