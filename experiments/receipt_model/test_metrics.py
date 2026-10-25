from metrics import amount, evaluate, menu_items


def test_locale_amounts_and_missing_values():
    assert amount('75,000') == amount('75.000') == 75000
    assert amount('40,000.') == 40000
    assert amount('1.234,50') == amount('1,234.50') == 1234.5
    assert amount('0') == 0
    assert amount('') is None and amount(None) is None
    assert amount('not a number') is None


def test_nested_components_are_not_billed_twice():
    result = menu_items({'menu': {'nm': 'Meal', 'price': '50', 'cnt': '1 x',
        'sub': [{'nm': 'Rice', 'price': '10'}]}})
    assert len(result) == 1 and result[0]['price'] == 50


def test_duplicate_merges_and_free_items():
    truth = [{'name': 'Tea', 'price': 10, 'count': 1}, {'name': 'Tea', 'price': 10, 'count': 1},
        {'name': 'Free Rice', 'price': 0, 'count': 1}]
    result = evaluate([{'id': 'a', 'items': truth}], [{'id': 'a', 'items': [
        {'name': 'Tea', 'price': 20, 'count': 2}, {'name': 'Free Rice', 'price': 0, 'count': 1}]}])
    assert result['item_price_f1'] == 1
    assert result['count_accuracy'] == 1


def test_wrong_price_and_missing_prediction_count_as_errors():
    truth = [{'id': 'a', 'items': [{'name': 'Rice', 'price': 25, 'count': 1}]},
             {'id': 'b', 'items': [{'name': 'Tea', 'price': 10, 'count': 1}]}]
    result = evaluate(truth, [{'id': 'a', 'items': [{'name': 'Rice', 'price': 250, 'count': None}]}])
    assert result['item_price_f1'] == 0
    assert result['item_recall'] == .5
    assert result['missing_or_failed_receipts'] == 1
    assert result['count_coverage'] == 0


def test_ambiguous_numbers_never_become_zero():
    assert amount('1..2') is None


def test_unmatched_counts_reduce_coverage_and_latest_attempt_wins():
    truth = [{'id': 'a', 'items': [{'name': 'Rice', 'price': 10, 'count': 1},
                                 {'name': 'Tea', 'price': 5, 'count': 1}]}]
    predictions = [{'id': 'a', 'error': 'rate limit', 'items': []},
                   {'id': 'a', 'items': [{'name': 'Rice', 'price': 10, 'count': 1}]}]
    result = evaluate(truth, predictions)
    assert result['missing_or_failed_receipts'] == 0
    assert result['count_accuracy'] == 1
    assert result['count_coverage'] == .5
    assert result['item_price_f1'] == 2 / 3


def test_partial_output_from_truncated_generation_is_failure():
    items = [{'name': 'Tea', 'price': 10, 'count': 1}]
    result = evaluate([{'id': 'a', 'items': items}],
                      [{'id': 'a', 'items': items, 'error': 'truncated'}])
    assert result['item_price_f1'] == 0
    assert result['missing_or_failed_receipts'] == 1


def test_fuzzy_matching_is_not_reported_as_exact_name_accuracy():
    result = evaluate([{'id': 'a', 'items': [{'name': 'Choco Devil', 'price': 10}]}],
                      [{'id': 'a', 'items': [{'name': 'Choco Devi', 'price': 10}]}])
    assert result['item_price_f1'] == 1
    assert result['strict_name_price_f1'] == 0
