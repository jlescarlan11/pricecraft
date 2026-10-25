"""Receipt-level scoring; thresholds are frozen before running validation."""
import json
import re
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from decimal import Decimal, InvalidOperation
from scipy.optimize import linear_sum_assignment


def amount(value):
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float, Decimal)):
        result = Decimal(str(value))
        return result if result.is_finite() else None
    text = re.sub(r'(?:rp|idr|php|₱|\$)|\s', '', str(value), flags=re.I).strip('.,')
    if not re.fullmatch(r'-?\d+(?:[.,]\d+)*', text):
        return None
    if ',' in text or '.' in text:
        last = max(text.rfind(','), text.rfind('.'))
        if len(text) - last - 1 in (1, 2):
            text = re.sub('[,.]', '', text[:last]) + '.' + text[last + 1:]
        else:
            text = re.sub('[,.]', '', text)
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def count(value):
    if isinstance(value, str):
        value = re.sub(r'\s*[xX×]\s*$', '', value)
    return amount(value)


def name_key(value):
    return ' '.join(re.sub(r'[^\w\s]', ' ', unicodedata.normalize('NFKC', str(value)).lower()).split())


def menu_items(parsed):
    menus = parsed.get('menu', []) if isinstance(parsed, dict) else []
    if isinstance(menus, dict):
        menus = [menus]
    if not isinstance(menus, list):
        return []
    return [{'name': str(m.get('nm', '')), 'price': amount(m.get('itemsubtotal', m.get('price'))),
             'count': count(m.get('cnt'))} for m in menus if isinstance(m, dict) and m.get('nm')]


def aggregate(items):
    groups = {}
    for item in items:
        name = name_key(item.get('name', ''))
        if not name:
            continue
        price, qty = amount(item.get('price')), count(item.get('count'))
        if name not in groups:
            groups[name] = {'name': name, 'price': price, 'count': qty}
        else:
            prev = groups[name]
            prev['price'] = prev['price'] + price if prev['price'] is not None and price is not None else None
            prev['count'] = prev['count'] + qty if prev['count'] is not None and qty is not None else None
    return list(groups.values())


def evaluate(truth, predictions, threshold=.75, price_tolerance=Decimal('.01')):
    by_id = {r['id']: r for r in predictions}
    totals = defaultdict(int)
    details = []
    latencies = []
    for receipt in truth:
        prediction = by_id.get(receipt['id'], {})
        failed = not prediction or bool(prediction.get('error'))
        gt = aggregate(receipt['items'])
        pred = aggregate(prediction.get('items', [])) if not failed else []
        totals['missing_or_failed_receipts'] += int(failed)
        totals['ground_truth_items'] += len(gt)
        totals['count_eligible'] += sum(a['count'] is not None for a in gt)
        totals['predicted_items'] += len(pred)
        match_details = []
        if gt and pred:
            similarities = [[SequenceMatcher(None, a['name'], b['name']).ratio() for b in pred] for a in gt]
            # Invalid pairs cost more than every valid pair. Assignment is one-to-one.
            costs = [[1 - s if s >= threshold else 100 for s in row] for row in similarities]
            ri, ci = linear_sum_assignment(costs)
            for i, j in zip(ri, ci):
                if similarities[i][j] < threshold:
                    continue
                a, b = gt[i], pred[j]
                exact_price = a['price'] is not None and b['price'] is not None and abs(a['price'] - b['price']) <= price_tolerance
                totals['matched_items'] += 1
                totals['matched_prices'] += int(exact_price)
                totals['exact_names'] += int(a['name'] == b['name'])
                totals['matched_exact_name_prices'] += int(exact_price and a['name'] == b['name'])
                if a['count'] is not None and b['count'] is not None:
                    totals['count_compared'] += 1
                    totals['matched_counts'] += int(a['count'] == b['count'])
                match_details.append({'truth': a, 'prediction': b, 'price_correct': exact_price})
        perfect = len(match_details) == len(gt) == len(pred) and all(m['price_correct'] for m in match_details) and not failed
        totals['perfect_receipts'] += int(perfect)
        details.append({'id': receipt['id'], 'failed': failed, 'perfect': perfect, 'truth_count': len(gt), 'prediction_count': len(pred), 'matches': match_details})
        if prediction.get('seconds') is not None:
            latencies.append(prediction['seconds'])
    def div(a, b):
        return a / b if b else 0.
    return dict(totals, receipts=len(truth),
        item_precision=div(totals['matched_items'], totals['predicted_items']),
        item_recall=div(totals['matched_items'], totals['ground_truth_items']),
        item_price_f1=div(2 * totals['matched_prices'], totals['ground_truth_items'] + totals['predicted_items']),
        strict_name_price_f1=div(2 * totals['matched_exact_name_prices'], totals['ground_truth_items'] + totals['predicted_items']),
        exact_price_accuracy_on_matches=div(totals['matched_prices'], totals['matched_items']),
        count_accuracy=div(totals['matched_counts'], totals['count_compared']),
        count_coverage=div(totals['count_compared'], totals['count_eligible']),
        perfect_receipt_rate=div(totals['perfect_receipts'], len(truth)),
        mean_seconds=div(sum(latencies), len(latencies)), latency_receipts=len(latencies), details=details)


def load_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
