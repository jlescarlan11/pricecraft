"""Validate generated receipt labels before mapping them to CORD targets."""
import json
import re
from decimal import Decimal, InvalidOperation


def _number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)):
        raise ValueError('Expected a finite nonnegative numeric label')
    try:
        result = Decimal(str(value))
    except InvalidOperation as error:
        raise ValueError('Invalid numeric label') from error
    if not result.is_finite() or result < 0:
        raise ValueError('Expected a finite nonnegative numeric label')
    return result


def checked_target(row):
    fields = json.loads(row['fields'], parse_float=Decimal)
    locale = row['locale']
    if locale not in ('US', 'UK', 'DE', 'IT', 'FR') or fields['locale'] != locale:
        raise ValueError('Unknown or inconsistent locale')
    lines = fields['lines']
    if not lines or len(lines) != row['n_items']:
        raise ValueError('Inconsistent item count')
    printed = row['full_text'].splitlines()
    menu, total = [], Decimal(0)
    for item in lines:
        name = item['name']
        quantity = _number(item['qty'])
        price, unit_price = _number(item['total']), _number(item['unit_price'])
        if quantity <= 0 or quantity != quantity.to_integral_value():
            raise ValueError('This source uses positive integer package counts')
        if price * 100 != (price * 100).to_integral_value() or quantity * unit_price != price:
            raise ValueError('Inconsistent line arithmetic')
        number = f'{price:.2f}'
        if locale in ('DE', 'IT', 'FR'):
            number = number.replace('.', ',')
        matched = [i for i, text in enumerate(printed)
                   if isinstance(name, str) and name.strip()
                   and text.lstrip().startswith(name + ' ')
                   and re.search(r'(?<![\d.,])' + re.escape(number) + r'(?![\d.,])', text[len(name):])]
        if not matched:
            raise ValueError('Name and price must be printed together')
        if quantity > 1:
            unit_text = f'{unit_price:.2f}'
            if locale in ('DE', 'IT', 'FR'):
                unit_text = unit_text.replace('.', ',')
            multiplier = r'^\s*' + str(int(quantity)) + r'\s+x\s+.*(?<![\d.,])' + re.escape(unit_text) + r'(?![\d.,])'
            if not any(i + 1 < len(printed) and re.search(multiplier, printed[i + 1]) for i in matched):
                raise ValueError('Count and unit price require the printed multiplier')
        menu.append({'nm': name, 'cnt': str(int(quantity)), 'price': f'{price:.2f}'})
        total += price
    receipt_total = _number(fields['total'])
    if fields['tax_included'] is True:
        valid_total = fields['subtotal'] is None and receipt_total == total
    elif fields['tax_included'] is False:
        tax = sum((_number(t['amount']) for t in fields['taxes']), Decimal(0))
        valid_total = _number(fields['subtotal']) == total and receipt_total == total + tax
    else:
        valid_total = False
    if not valid_total:
        raise ValueError('Inconsistent receipt total')
    # Count-only supervision: printed pack-size tokens are never converted to kg/g/ml.
    return {'menu': menu}
