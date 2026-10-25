"""One-pass, lossless features for a frozen, deterministic image encoder."""
import hashlib
import json
from pathlib import Path
import torch


def cache_features(rows, encoder, pixel_loader, destination, model_metadata):
    if encoder.training:
        raise ValueError('Frozen encoder must be in eval mode')
    destination = Path(destination)
    if len({row['id'] for row in rows}) != len(rows):
        raise ValueError('Duplicate receipt IDs')
    destination.mkdir(parents=True, exist_ok=False)
    paths, images = {}, []
    for index, row in enumerate(rows):
        with torch.no_grad():
            features = encoder(pixel_loader(row)).last_hidden_state.detach().cpu()
        path = destination / f'{index:04}.pt'
        torch.save(features, path)
        paths[row['id']] = path
        images.append(dict(id=row['id'], file=path.name,
            sha256=hashlib.sha256(Path(row['image']).read_bytes()).hexdigest(),
            feature_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
            shape=list(features.shape), dtype=str(features.dtype)))
        del features
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
        print(json.dumps(dict(event='cached_encoder_features', id=row['id'],
                              completed=index + 1, total=len(rows))), flush=True)
    (destination / 'manifest.json').write_text(json.dumps(
        dict(model=model_metadata, images=images), indent=2))
    return paths
