"""PH pilot scoring; preserve historical CORD normalization and result files."""
import argparse
import copy
import json
import re
from decimal import Decimal
from pathlib import Path
from metrics import amount, evaluate, load_jsonl, menu_items


def ph_amount(value):
    if not isinstance(value, str):
        return amount(value)
    text = re.sub(r'^\s*(-?)\s*(?:PHP|P|₱)\s*', r'\1', value, flags=re.I).strip()
    if not re.fullmatch(r'-?\d+(?:,\d{3})*(?:\.\d+)?', text):
        return None
    # Philippine receipt amounts use a decimal point, not CORD's Indonesian
    # three-digit separator heuristic. P34.000 is 34, not 34,000.
    return Decimal(text.replace(',', ''))


def ph_menu_items(parsed):
    parsed = copy.deepcopy(parsed)
    menus = parsed.get('menu', []) if isinstance(parsed, dict) else []
    if isinstance(menus, dict):
        menus = [menus]
    if isinstance(menus, list):
        for menu in menus:
            if not isinstance(menu, dict):
                continue
            for field in ('price', 'itemsubtotal'):
                if field in menu:
                    menu[field] = ph_amount(menu[field])
            if 'cnt' in menu:
                value = menu['cnt']
                menu['cnt'] = ph_amount(re.sub(r'\s*[xX×]\s*$', '', value) if isinstance(value, str) else value)
    return menu_items(parsed)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--split', choices=['validation', 'test'], default='validation')
    parser.add_argument('--systems', nargs='+', default=['groq', 'donut-base'])
    args = parser.parse_args()
    rows = load_jsonl(args.root / f'{args.split}.jsonl')
    truth = [dict(id=r['id'], items=ph_menu_items(r['ground_truth']['gt_parse'])) for r in rows]
    report = dict(split=args.split, label_status='AI image-checked; not human verified',
        limitations='Small readability-selected public pilot; no actual PriceCraft receipts or deployment conclusion.',
        metric='Duplicate-aggregated name similarity >=.75 and exactly equal line prices; Philippine decimal-point/comma-thousands convention and P currency prefixes.',
        systems={})
    for system in args.systems:
        file = args.root / 'predictions' / f'{system}-{args.split}.jsonl'
        predictions = load_jsonl(file) if file.exists() else []
        for row in predictions:
            if 'parsed' in row:
                row['items'] = ph_menu_items(row['parsed'])
            else:
                for item in row.get('items', []):
                    # Currency-normalization applies consistently to every provider.
                    item['price'] = ph_amount(item.get('price'))
        score = evaluate(truth, predictions, price_tolerance=0)
        score['recorded_attempts'] = len(predictions)
        score['recorded_failed_attempts'] = sum(bool(r.get('error')) for r in predictions)
        report['systems'][system] = score
        print(system, json.dumps({k: v for k, v in score.items() if k != 'details'}))
    (args.root / 'reports').mkdir(exist_ok=True)
    (args.root / 'reports' / f'{args.split}.json').write_text(json.dumps(report, indent=2, default=str))
