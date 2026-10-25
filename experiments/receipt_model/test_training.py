from training_utils import target_tokens, next_token_loss


def test_cord_preserves_annotation_order_and_list_separators():
    value = {'menu': [{'nm': 'Tea', 'cnt': '2'}, {'nm': 'Rice'}],
             'total': {'total_price': '10'}}
    assert target_tokens(value) == ('<s_menu><s_nm>Tea</s_nm><s_cnt>2</s_cnt>'
        '<sep/><s_nm>Rice</s_nm></s_menu><s_total><s_total_price>10</s_total_price></s_total>')


def test_training_labels_are_shifted_exactly_once():
    import torch
    # Decoder sees [start, A], should predict [A, EOS] at those same positions.
    logits = torch.tensor([[[0., 10., 0.], [0., 0., 10.]]])
    labels = torch.tensor([[1, 2]])
    assert next_token_loss(logits, labels).item() < .001
