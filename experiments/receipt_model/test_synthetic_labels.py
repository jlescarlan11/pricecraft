import copy
import json
import pytest
from synthetic_labels import checked_target


def example():
    return {'locale': 'DE', 'n_items': 2,
            'full_text': 'RICE 2 KG 3,98 EUR\n  2 x 1,99 EUR\nBAG 0,00 EUR\nSUMME 3,98 EUR',
            'fields': json.dumps({'locale': 'DE', 'lines': [
                {'name': 'RICE 2 KG', 'qty': 2, 'unit_price': 1.99, 'total': 3.98},
                {'name': 'BAG', 'qty': 1, 'unit_price': 0, 'total': 0}],
                'tax_included': True, 'subtotal': None, 'total': 3.98,
                'taxes': [{'amount': .64}]})}


def test_maps_printed_name_and_line_total_without_inventing_physical_units():
    row = example(); before = copy.deepcopy(row)
    assert checked_target(row) == {'menu': [
        {'nm': 'RICE 2 KG', 'cnt': '2', 'price': '3.98'},
        {'nm': 'BAG', 'cnt': '1', 'price': '0.00'}]}
    assert row == before


def test_rejects_inconsistent_item_arithmetic_or_missing_printed_price():
    row = example(); f = json.loads(row['fields']); f['lines'][0]['total'] = 1.99
    row['fields'] = json.dumps(f)
    with pytest.raises(ValueError, match='arithmetic'): checked_target(row)
    row = example(); row['full_text'] = row['full_text'].replace('3,98', '8,88')
    with pytest.raises(ValueError, match='printed'): checked_target(row)


@pytest.mark.parametrize('bad', [None, -1, float('nan'), float('inf'), True])
def test_rejects_invalid_price_values(bad):
    row = example(); f = json.loads(row['fields']); f['lines'][0]['unit_price'] = bad
    row['fields'] = json.dumps(f)
    with pytest.raises(ValueError): checked_target(row)


def test_rejects_missing_item_and_invented_description():
    row = example(); row['n_items'] = 3
    with pytest.raises(ValueError, match='item count'): checked_target(row)
    row = example(); row['full_text'] = row['full_text'].replace('RICE 2 KG', 'RICE')
    with pytest.raises(ValueError, match='printed'): checked_target(row)


def test_checks_tax_exclusive_total_without_promoting_tax_to_an_item():
    row = example(); f = json.loads(row['fields'])
    row.update(locale='US', full_text='RICE 2 KG $3.98\n  2 x $1.99\nBAG $0.00\nTOTAL $4.38')
    f.update(locale='US', tax_included=False, subtotal=3.98, total=4.38, taxes=[{'amount': .40}])
    row['fields'] = json.dumps(f)
    assert len(checked_target(row)['menu']) == 2
    f['total'] = 4.37; row['fields'] = json.dumps(f)
    with pytest.raises(ValueError, match='receipt total'): checked_target(row)


def test_price_substrings_and_wrong_quantity_continuations_are_not_evidence():
    row = example(); row['full_text'] = row['full_text'].replace('3,98', '13,98')
    with pytest.raises(ValueError, match='printed'): checked_target(row)
    row = example(); row['full_text'] = row['full_text'].replace('2 x', '3 x')
    with pytest.raises(ValueError, match='multiplier'): checked_target(row)
