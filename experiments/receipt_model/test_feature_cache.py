"""A frozen-feature cache must preserve decoder losses and gradients exactly."""
import json
from types import SimpleNamespace
import pytest
import torch
from feature_cache import cache_features


def test_cache_preserves_frozen_encoder_features_loss_and_decoder_gradients(tmp_path):
    class Encoder(torch.nn.Module):
        def forward(self, x):
            return SimpleNamespace(last_hidden_state=x.square() + 0.25)
    encoder = Encoder().eval()
    source = tmp_path / 'image'; source.write_bytes(b'original pixels')
    rows = [{'id': 'a', 'image': str(source)}]
    pixels = torch.tensor([[[1., 2.], [3., 4.]]])
    direct = encoder(pixels).last_hidden_state
    cache = tmp_path / 'features'
    paths = cache_features(rows, encoder, lambda row: pixels, cache,
                           {'revision': 'fixed', 'processor': {'height': 1280}})
    saved = torch.load(paths['a'], weights_only=True)
    assert torch.equal(direct, saved)
    assert not saved.requires_grad
    decoder = torch.nn.Linear(2, 3)
    first = decoder(direct).square().mean(); first.backward()
    gradients = [p.grad.clone() for p in decoder.parameters()]
    decoder.zero_grad()
    second = decoder(saved).square().mean(); second.backward()
    assert first.item() == second.item()
    assert all(torch.equal(a, b.grad) for a, b in zip(gradients, decoder.parameters()))
    metadata = json.loads((cache / 'manifest.json').read_text())
    assert metadata['model']['revision'] == 'fixed'
    assert metadata['images'][0]['id'] == 'a'
    assert len(metadata['images'][0]['sha256']) == 64
    with pytest.raises(FileExistsError):
        cache_features(rows, encoder, lambda row: pixels, cache, {})


def test_cache_rejects_training_mode_encoder(tmp_path):
    with pytest.raises(ValueError, match='eval'):
        cache_features([], torch.nn.Linear(1, 1), lambda row: None,
                       tmp_path / 'features', {})
