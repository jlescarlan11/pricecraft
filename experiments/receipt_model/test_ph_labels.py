import copy
import pytest
from ph_labels import checked_splits
from ph_score import ph_menu_items
from metrics import evaluate


def receipt(id='a', split='train'):
    return dict(id=id, split=split, receipt_family=id, merchant_group=id,
        sha256='abc', image='receipt.jpg', items=[dict(name='RICE', price='177.00', count='2')],
        review=dict(status='image_checked_ai', image_sha256='abc', complete=True,
                    reviewer='Codex visual inspection', notes='Read all product lines.'))


def test_draft_and_stale_image_checks_cannot_train():
    row = receipt()
    row['review']['status'] = 'draft'
    with pytest.raises(ValueError): checked_splits([row])
    row = receipt()
    row['review']['image_sha256'] = 'old'
    with pytest.raises(ValueError): checked_splits([row])


def test_partial_labels_or_guessed_prices_cannot_train():
    row = receipt()
    row['review']['complete'] = False
    with pytest.raises(ValueError): checked_splits([row])
    row = receipt()
    row['items'][0]['price'] = None
    with pytest.raises(ValueError): checked_splits([row])


def test_receipt_or_merchant_leakage_is_rejected():
    a, b = receipt(), receipt('b', 'validation')
    b['sha256'] = 'other'; b['review']['image_sha256'] = 'other'
    b['receipt_family'] = a['receipt_family']
    with pytest.raises(ValueError): checked_splits([a, b])
    b['receipt_family'] = 'b'; b['merchant_group'] = a['merchant_group']
    with pytest.raises(ValueError): checked_splits([a, b])


def test_mapping_preserves_zero_prices_and_unknown_count():
    row = receipt()
    row['items'].append(dict(name='FREE BAG', price='0.00', count=None))
    before = copy.deepcopy(row)
    result = checked_splits([row])
    assert result['train'][0]['ground_truth']['gt_parse'] == {'menu': [
        {'nm': 'RICE', 'cnt': '2', 'price': '177.00'}, {'nm': 'FREE BAG', 'price': '0.00'}]}
    assert row == before


def test_duplicate_ids_and_invalid_numbers_are_rejected():
    with pytest.raises(ValueError): checked_splits([receipt(), receipt()])
    for number in ['NaN', 'Infinity', '-1', '1,00']:
        row = receipt(); row['items'][0]['price'] = number
        with pytest.raises(ValueError): checked_splits([row])


def test_philippine_currency_prefix_and_exact_cent_scoring():
    items = ph_menu_items({'menu': [{'nm': 'BAG', 'price': 'P0.01'},
                                    {'nm': 'RICE', 'price': 'PHP 1,234.50'}]})
    assert str(items[0]['price']) == '0.01'
    assert str(items[1]['price']) == '1234.50'
    score = evaluate([{'id': 'a', 'items': [{'name': 'BAG', 'price': '0.00'}]}],
                     [{'id': 'a', 'items': items[:1]}], price_tolerance=0)
    assert score['matched_prices'] == 0


def test_ph_decimal_point_is_not_an_indonesian_thousands_separator():
    items = ph_menu_items({'menu': [{'nm': 'RICE', 'price': 'P34.000'}]})
    assert items[0]['price'] == 34
