"""CORD serialization and explicitly aligned next-token training loss."""


def target_tokens(value):
    # Publisher config/train_cord.yaml sets sort_json_key: False.
    if isinstance(value, dict):
        return ''.join(f'<s_{key}>' + target_tokens(child) + f'</s_{key}>'
                       for key, child in value.items())
    if isinstance(value, list):
        return '<sep/>'.join(target_tokens(x) for x in value)
    return str(value)


def next_token_loss(logits, target_ids):
    import torch.nn.functional as F
    # target_ids have already been shifted relative to decoder_input_ids.
    assert logits.shape[:-1] == target_ids.shape
    return F.cross_entropy(logits.reshape(-1, logits.shape[-1]), target_ids.reshape(-1))
