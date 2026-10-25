"""Local Donut inference and decoder-adapter training. No production changes."""
import argparse
import json
import random
import time
from pathlib import Path

import torch
from PIL import Image
from transformers import DonutProcessor, VisionEncoderDecoderModel, LogitsProcessorList
from transformers.modeling_outputs import BaseModelOutput
from peft import LoraConfig, PeftModel, get_peft_model
from metrics import load_jsonl
from training_utils import next_token_loss, target_tokens
from feature_cache import cache_features
from donut_decode import decode_generation, ReceiptLogitsProcessor

ROOT = Path('.receipt-ml')
MODEL_ROOT = ROOT / 'donut'


def load_model(adapter=None):
    torch.manual_seed(20261025)
    torch.set_num_threads(4)
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    processor = DonutProcessor.from_pretrained(MODEL_ROOT, local_files_only=True, use_fast=False)
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_ROOT, local_files_only=True)
    if adapter:
        model.decoder = PeftModel.from_pretrained(model.decoder, adapter)
    model.to(device)
    print(json.dumps({'device': device, 'parameters': sum(p.numel() for p in model.parameters()), 'image_size': processor.image_processor.size}), flush=True)
    return processor, model, device


def pixels(processor, row, device):
    with Image.open(row['image']) as image:
        return processor(image.convert('RGB'), return_tensors='pt').pixel_values.to(device)


def infer(args):
    processor, model, device = load_model(args.adapter)
    model.eval()
    rows = load_jsonl(ROOT / f'{args.split}.jsonl')[:args.limit]
    output = ROOT / 'predictions' / f'{args.name}-{args.split}.jsonl'
    output.parent.mkdir(exist_ok=True)
    profile = getattr(args, 'decoding_profile', 'guarded')
    existing = load_jsonl(output) if output.exists() else []
    if any(r.get('decoding_profile', 'legacy') != profile for r in existing):
        raise ValueError('Use a fresh prediction name when changing the decoding profile')
    done = {r['id'] for r in existing}
    prompt = processor.tokenizer('<s_cord-v2>', add_special_tokens=False, return_tensors='pt').input_ids.to(device)
    for row in rows:
        if row['id'] in done:
            continue
        start = time.perf_counter()
        guard = ReceiptLogitsProcessor(processor.tokenizer) if profile == 'guarded' else None
        try:
            generation_options = {}
            if guard is not None:
                generation_options = dict(logits_processor=LogitsProcessorList([guard]),
                                          forced_eos_token_id=None, renormalize_logits=True)
            with torch.inference_mode():
                generated = model.generate(pixels(processor, row, device), decoder_input_ids=prompt,
                    max_length=768, pad_token_id=processor.tokenizer.pad_token_id,
                    eos_token_id=processor.tokenizer.eos_token_id, use_cache=True,
                    bad_words_ids=[[processor.tokenizer.unk_token_id]], num_beams=1,
                    **generation_options)
            ids = generated[0].tolist()
            result = dict(id=row['id'], **decode_generation(processor.tokenizer, ids),
                          seconds=time.perf_counter() - start)
        except Exception as e:
            result = dict(id=row['id'], items=[], schema_valid=False,
                          error=str(e)[:600], seconds=time.perf_counter() - start)
            if guard is not None and guard.last_ids:
                result.update(token_ids=guard.last_ids, generated_tokens=len(guard.last_ids),
                              decoded=processor.tokenizer.decode(guard.last_ids, skip_special_tokens=False))
        result['decoding_profile'] = profile
        with output.open('a') as f:
            f.write(json.dumps(result, default=str, ensure_ascii=False) + '\n')
        print(json.dumps({k: result[k] for k in ['id', 'seconds', 'error', 'generated_tokens'] if k in result}), flush=True)
        if result.get('error') and ('memory' in result['error'].lower() or 'not implemented' in result['error'].lower()):
            break


def train(args):
    assert args.split == 'train', 'Never train on evaluation splits'
    out = ROOT / 'adapters' / args.name
    if out.exists():
        raise FileExistsError('Use a new adapter name; do not overwrite a prior training run')
    assert args.steps > 0 and args.learning_rate > 0
    processor, model, device = load_model()
    for p in model.parameters():
        p.requires_grad = False
    model.encoder.eval()
    model.decoder = get_peft_model(model.decoder, LoraConfig(r=8, lora_alpha=16,
        target_modules=['q_proj', 'v_proj'], lora_dropout=.05, bias='none'))
    model.decoder.train()
    model.config.decoder_start_token_id = processor.tokenizer.convert_tokens_to_ids('<s_cord-v2>')
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    rows = load_jsonl(ROOT / 'train.jsonl')
    random.Random(20261025).shuffle(rows)
    # Optional curriculum receipt IDs are selected from train only after validation analysis.
    if args.curriculum:
        selected = set(json.loads(Path(args.curriculum).read_text())['train_ids'])
        assert selected <= {r['id'] for r in rows}
        rows = [r for r in rows if r['id'] in selected]
    out.mkdir(parents=True, exist_ok=True)
    config = dict(seed=20261025, steps=args.steps, learning_rate=args.learning_rate, rank=8,
        trainable_parameters=sum(p.numel() for p in model.parameters() if p.requires_grad),
        curriculum=args.curriculum, model_revision='8003d433113256b4ce3a0f5bf604b29ff78a7451',
        split='train', image_size=processor.image_processor.size, max_length=768,
        cache_encoder_features=args.cache_encoder_features)
    (out / 'run.json').write_text(json.dumps(config, indent=2))
    print(json.dumps(config), flush=True)
    cached = None
    if args.cache_encoder_features:
        # The encoder is frozen/eval and preprocessing is deterministic. Compute
        # each image once, preserving float32 features exactly on disk. Offload
        # the unused half of the model to reduce unified-memory pressure.
        model.decoder.to('cpu')
        if device == 'mps':
            torch.mps.empty_cache()
        cached = cache_features(rows, model.encoder,
            lambda row: pixels(processor, row, device), out / 'encoder-features',
            {'revision': config['model_revision'], 'processor': processor.image_processor.to_dict()})
        model.encoder.to('cpu')
        if device == 'mps':
            torch.mps.empty_cache()
        model.decoder.to(device)
    # Construct the optimizer after device moves so its parameters match those
    # used by the decoder on every backend.
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=args.learning_rate)
    completed, skipped = 0, 0
    for row in rows * (args.steps // max(1, len(rows)) + 2):
        text = '<s_cord-v2>' + target_tokens(row['ground_truth']['gt_parse']) + processor.tokenizer.eos_token
        ids = processor.tokenizer(text, add_special_tokens=False, return_tensors='pt').input_ids
        if ids.shape[1] > 768 or processor.tokenizer.unk_token_id in ids:
            skipped += 1
            continue
        start = time.perf_counter()
        optimizer.zero_grad(set_to_none=True)
        if cached is not None:
            features = torch.load(cached[row['id']], weights_only=True).to(device)
        else:
            with torch.no_grad():
                features = model.encoder(pixels(processor, row, device)).last_hidden_state.detach()
        ids = ids.to(device)
        outputs = model(encoder_outputs=BaseModelOutput(last_hidden_state=features),
            decoder_input_ids=ids[:, :-1], use_cache=False)
        # Labels are already shifted one token. Transformers' generic causal-LM
        # loss fallback shifts again; compute aligned teacher-forcing CE explicitly.
        loss = next_token_loss(outputs.logits, ids[:, 1:])
        if not torch.isfinite(loss):
            raise RuntimeError('Non-finite training loss; stopping without claiming successful training')
        loss.backward()
        torch.nn.utils.clip_grad_norm_((p for p in model.parameters() if p.requires_grad), 1.0)
        optimizer.step()
        completed += 1
        log = dict(step=completed, receipt_id=row['id'], loss=loss.item(), seconds=time.perf_counter() - start)
        with (out / 'loss.jsonl').open('a') as f:
            f.write(json.dumps(log) + '\n')
        print(json.dumps(log), flush=True)
        if cached is not None and device == 'mps':
            # Do not retain allocator pools while sharing a 16 GiB laptop.
            del outputs, features, loss
            torch.mps.empty_cache()
        if completed % 25 == 0 or completed == args.steps:
            model.decoder.save_pretrained(out, safe_serialization=True)
        if completed >= args.steps:
            break
    config.update(completed_steps=completed, skipped_long_or_unknown=skipped)
    (out / 'run.json').write_text(json.dumps(config, indent=2))
    assert completed == args.steps, 'Training ended before requested steps'


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['infer', 'train'])
    parser.add_argument('--split', default='validation', choices=['train', 'validation', 'test'])
    parser.add_argument('--limit', type=int, default=100)
    parser.add_argument('--name', default='donut-base')
    parser.add_argument('--adapter')
    parser.add_argument('--decoding-profile', choices=['guarded', 'legacy'], default='guarded')
    parser.add_argument('--steps', type=int, default=100)
    parser.add_argument('--learning-rate', type=float, default=2e-5)
    parser.add_argument('--curriculum')
    parser.add_argument('--cache-encoder-features', action='store_true')
    parser.add_argument('--data-root', type=Path, default=ROOT)
    args = parser.parse_args()
    ROOT = args.data_root
    infer(args) if args.mode == 'infer' else train(args)
