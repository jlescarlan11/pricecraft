# Receipt-model experiment

Local research only. Production continues using Groq. Data and weights live in
ignored `.receipt-ml/`; commands run from the repository root. See
`docs/superpowers/plans/2026-10-25-cord-benchmark-training.md` for the protocol.
The completed experiment is documented in
[`docs/receipt-model-experiment.md`](../../docs/receipt-model-experiment.md).

```sh
uv venv --python 3.12 .receipt-ml/venv
uv pip install --python .receipt-ml/venv/bin/python -r experiments/receipt_model/requirements.lock.txt
HF_HUB_DISABLE_XET=1 .receipt-ml/venv/bin/python experiments/receipt_model/prepare.py
.receipt-ml/venv/bin/python -m pytest experiments/receipt_model -q
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.6
export PYTORCH_MPS_LOW_WATERMARK_RATIO=0.5
node experiments/receipt_model/groq_benchmark.mjs validation 20
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer --split validation --limit 20
.receipt-ml/venv/bin/python experiments/receipt_model/score.py --split validation --limit 20
.receipt-ml/venv/bin/python experiments/receipt_model/curriculum.py
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py train --split train --name donut-adapter-v3 --steps 100 --learning-rate 0.0001 --curriculum .receipt-ml/curriculum.json
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer --split validation --limit 20 --name donut-adapter-v3 --adapter .receipt-ml/adapters/donut-adapter-v3
.receipt-ml/venv/bin/python experiments/receipt_model/score.py --split validation --limit 20 --systems groq donut-base donut-adapter-v3
.receipt-ml/venv/bin/python experiments/receipt_model/select_candidate.py
node experiments/receipt_model/groq_benchmark.mjs test 20
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer --split test --limit 20
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer --split test --limit 20 --name donut-adapter-v3 --adapter .receipt-ml/adapters/donut-adapter-v3
.receipt-ml/venv/bin/python experiments/receipt_model/score.py --split test --limit 20 --systems groq donut-base donut-adapter-v3
.receipt-ml/venv/bin/python experiments/receipt_model/export_results.py
```

This bounded experiment uses the first 20 official validation receipts and first
20 official test receipts, chosen before comparing results. It is a convenience
pilot, not a random or full-split benchmark. All 1,000 receipts are downloaded;
increase `--limit` (and the Node positional limit) to 100 for a later full benchmark.
The lock file records the tested Python 3.12/macOS ARM environment.

The Groq runner freezes Git HEAD services on first use, not pending local edits.
It reads existing Vite API credentials into memory, never logs them, and only
sends public CORD images/text. It runs the primary OCR.space Engine 2 + Groq path;
the browser's Tesseract error fallback is not simulated. Provider failures are
retained in the denominator. Groq calls are paced at 25 seconds with up to three
HTTP 429 retries; daily quota/auth errors stop the run. Successful requests and
predictions are cached. An explicit resumed run retries failed receipts, retaining
earlier attempts. Scores use the latest outcome and separately report failed
attempts. Runtime pacing is excluded from instrumented request latencies; one
early validation latency that included pacing is omitted from latency summaries.
No billing-cost measurement or browser fallback reliability claim is made.

OCR image scaling/grayscale follows PriceCraft's policy, but Pillow's bicubic
resizing/JPEG encoding is not pixel-identical to browser canvas. Donut receives
the original RGB receipt through its published processor at native resolution.
Both systems see the same receipts. No oracle transcription is fed to Groq.

The scorer aggregates duplicate normalized names on both sides and sums their
prices/counts. It uses one-to-one name matching with similarity >= 0.75 and exact
normalized price to a tolerance of 0.01. This is our item-oriented metric, not the
published Donut tree-edit score. Zero-price items remain in ground truth. Nested
sub-items are not counted as separate purchased products. Truncated generations,
invalid outputs and absent predictions are failures, never excluded successes.
The secondary strict-name-and-price F1 requires identical normalized names;
the primary tolerant score must not be described as exact transcription accuracy.
CORD annotation prices are used as published, even where a receipt also shows
discounts/taxes. PriceCraft's post-discount interpretation can differ from that
annotation convention.

Use validation failures to choose training-only curriculum IDs. Decoder q/v
LoRA adapters use a frozen encoder and fixed seed; save step counts/losses and
compare validation before freezing a candidate. Evaluate test only after that
choice. CORD count labels do not establish kg/g/ml quantities. Neither CORD
results nor this pretrained checkpoint prove Philippine receipt performance.

Training preserves field order, as the publisher's
[CORD configuration](https://github.com/clovaai/donut/blob/master/config/train_cord.yaml)
sets `sort_json_key: False`. Explicit cross-entropy uses already-shifted targets
exactly once, avoiding Transformers' generic causal-loss fallback. Regression
tests cover both. The early local v1/v2 setup runs were aborted and marked invalid;
only v3 is eligible for evaluation. Do not reuse an existing adapter output name
for a fresh experiment: retain its logs and use a new name.

The publisher's Donut checkpoint was already trained on CORD. An extra adaptation
run can fail to improve it. Report measured outcomes and retain the incumbent.

## Philippine pilot

See [`docs/philippine-receipt-training.md`](../../docs/philippine-receipt-training.md).
The Roboflow export is an image source with header/total detection boxes, not item
transcripts. Never turn empty imported labels or OCR suggestions into truth.
The current `.receipt-ml/philippines/` holds all 278 images and local draft labels;
`review.html` shows images beside the suggestions and the 19 AI image checks.
These checks are explicitly not human verification. The pilot uses 15 selected
training receipts and four validation receipts from different merchant groups.
There is no independent actual-PriceCraft test set or production replacement.

To import a newly downloaded archive, use a fresh destination:

```sh
.receipt-ml/venv/bin/python experiments/receipt_model/ph_import.py "/path/to/Receipts Dataset Philippines.v1i.coco.zip" .receipt-ml/philippines-new
swiftc experiments/receipt_model/ph_ocr.swift -o .receipt-ml/philippines/ph-ocr
.receipt-ml/philippines/ph-ocr .receipt-ml/philippines/manifest.jsonl .receipt-ml/philippines/ocr
node experiments/receipt_model/ph_drafts.mjs
```

The draft helper currently targets `.receipt-ml/philippines/`. Review images and
write a separate `checked-vN.jsonl` with explicit status, image hash, reviewer,
complete-item check, notes, receipt family, merchant group and split. Keep draft
and checked files separate. For each item use checked `name`, decimal-string
`price`, and nullable decimal-string `count`; keep physical units separately.
Use `image_checked_ai` for model visual checks, `human_verified` only for a real
human review. Never auto-promote OCR or parser outputs.

```sh
.receipt-ml/venv/bin/python experiments/receipt_model/ph_labels.py .receipt-ml/philippines/checked-v1.jsonl .receipt-ml/philippines/pilot-v1
RECEIPT_ML_ROOT=.receipt-ml/philippines/pilot-v1 node experiments/receipt_model/groq_benchmark.mjs validation 4
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer --data-root .receipt-ml/philippines/pilot-v1 --split validation --limit 4
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py train --data-root .receipt-ml/philippines/pilot-v1 --split train --name donut-ph-v1 --steps 100 --learning-rate 0.0001
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer --data-root .receipt-ml/philippines/pilot-v1 --split validation --limit 4 --name donut-ph-v1 --adapter .receipt-ml/philippines/pilot-v1/adapters/donut-ph-v1
.receipt-ml/venv/bin/python experiments/receipt_model/ph_score.py --root .receipt-ml/philippines/pilot-v1 --systems groq donut-base donut-ph-v1
```

The pilot already exists; preparation and training deliberately refuse to overwrite
existing outputs. Use new version names for a fresh run. Keep the MPS memory limits
shown above. Scoring accepts a leading Philippine `P` currency prefix and requires
exactly equal normalized prices, so a one-cent discount discrepancy is an error.
Historical CORD scoring defaults/results are unchanged. The generic Donut runner
accepts a separate `--data-root` while loading the original cached model weights.
Label preparation checks are a prerequisite to using it for this Philippine pilot.

## Expanded Philippine run (v2)

The [expanded review report](../../docs/philippine-receipt-training-v2.md) records
59 complete AI image checks and screening dispositions for all 278 images.
`review-v2.html` and `checked-v2.jsonl` preserve v1 separately. The allocation is
48 selected train / 4 development validation / 7 new public test receipts; the
actual training manifest contains 46 after slow-tokenizer preflight excludes
`ph-0000` and `ph-0040`. The unfiltered manifest is `train-selected.jsonl`.
Do not train on the screening candidates or unverified drafts. Physical quantity
accuracy and actual PriceCraft accuracy remain unmeasured.

The run uses the following commands; existing output names must not be reused.
For reproduction use a fresh data root containing copies of the frozen manifests,
protocol, tokenizer exclusions, OCR images and frozen production baseline. Check
the manifest hashes in `protocol.json` before training. `ph_labels.py` alone
prepares all 48 selected rows; it does not perform the model-tokenizer preflight.

```sh
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.4
export PYTORCH_MPS_LOW_WATERMARK_RATIO=0.25
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py train --data-root .receipt-ml/philippines/pilot-v2 --split train --name donut-ph-v2c --steps 200 --learning-rate 0.0001 --cache-encoder-features
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer --data-root .receipt-ml/philippines/pilot-v2 --split validation --limit 4 --name donut-ph-v2c --adapter .receipt-ml/philippines/pilot-v2/adapters/donut-ph-v2c
.receipt-ml/venv/bin/python experiments/receipt_model/ph_score.py --root .receipt-ml/philippines/pilot-v2 --systems groq donut-base donut-ph-v1 donut-ph-v2c
RECEIPT_ML_ROOT=.receipt-ml/philippines/pilot-v2 node experiments/receipt_model/groq_benchmark.mjs test 7
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer --data-root .receipt-ml/philippines/pilot-v2 --split test --limit 7 --name donut-ph-v2c --adapter .receipt-ml/philippines/pilot-v2/adapters/donut-ph-v2c
.receipt-ml/venv/bin/python experiments/receipt_model/ph_score.py --root .receipt-ml/philippines/pilot-v2 --split test --systems groq donut-ph-v2c
```

The four original validation predictions for Groq, base Donut and v1 are reused
unchanged; their full scores reproduce exactly. The new test receives fresh
predictions and is reported separately. Retained failed API attempts are not
deleted when retrying. The interrupted `donut-ph-v2` and `donut-ph-v2b` attempts are not candidates;
only the completed, frozen `donut-ph-v2c` adapter is eligible for evaluation.

## Third Philippine label batch (v3)

See the [third-batch report](../../docs/philippine-receipt-training-v3.md).
All 56 previously pending original images were inspected; 20 complete checks
were retained, for 79 total AI checks. The final `checked-v3.jsonl` excludes a
withdrawn discounted-combo label. Provisional additions/labels and the retraction
remain separate; never train from those provisional files.

The final root is `.receipt-ml/philippines/pilot-v3b/`: 65 usable training
receipts, 122 item rows, 600 completed steps. `pilot-v3/` contains the interrupted
provisional attempt and is not eligible for evaluation. Three tokenizer-incompatible
receipts remain excluded. The existing four validation and seven public comparison
receipts are preserved; they are previously evaluated benchmarks, not a new blind
or actual-PriceCraft test. Groq remains active.

Commands used (existing output names cannot be reused for a fresh run):

```sh
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.4
export PYTORCH_MPS_LOW_WATERMARK_RATIO=0.25
.receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py train --split train --data-root .receipt-ml/philippines/pilot-v3b --name donut-ph-v3b --steps 600 --learning-rate 0.0001 --cache-encoder-features
.receipt-ml/venv/bin/python .receipt-ml/philippines/pilot-v3b/evaluate-shared-model.py
.receipt-ml/venv/bin/python experiments/receipt_model/ph_score.py --root .receipt-ml/philippines/pilot-v3b --systems groq donut-base donut-ph-v1 donut-ph-v2c donut-ph-v3b
.receipt-ml/venv/bin/python experiments/receipt_model/ph_score.py --root .receipt-ml/philippines/pilot-v3b --split test --systems groq donut-ph-v2c donut-ph-v3b
```

The local evaluation harness loads the frozen candidate once and calls the
unchanged inference function sequentially for both splits. Scores improve from
38.1% to 44.4% on validation and 19.0% to 34.8% on the public comparison set;
these do not establish actual-receipt accuracy. The signed-in production page
showed zero saved/fully reviewed receipts on this browser/device, so no actual
receipts were available there for comparison. This does not establish the count
of cloud-only or other-device records.

## Synthetic receipt sample pilot

The source is `albertobarnabo/synthetic-receipts-ocr`, pinned to revision
`ed46e02b9b1136f6b54847c1d4bce9e94d11e55c`. The ignored local root
`.receipt-ml/synthetic-pilot-v1/` retains two original Parquet shards, checksums,
70 sampled clean/degraded pairs, original publisher fields/transcripts,
`selection-policy.json`, `automatic-audit.json`, `visual-audit.json`, and
`review.html`. This is a stratified first-shard pilot, not all 32,000 receipts.
Thirty pairs (141 product rows) were directly AI image-checked; the remaining
40 receive automated checks only. No example is human verified.

`synthetic_labels.checked_target` independently checks finite numeric labels,
line arithmetic, exact printed name/price evidence, multiplier continuations,
and receipt-total consistency. It maps package count and extended line total;
printed sizes remain in descriptions and do not establish physical quantities.
Tests include wrong price substrings and count continuations. Source metadata
states Apache 2.0; the pinned source has no separate LICENSE file.

The frozen mixed manifest contains the existing 65 Philippine training receipts
plus 60 generated ones (450 item rows), with ten synthetic development receipts
excluded from training. All targets pass the tokenizer preflight. A new base
model, q/v rank-8 decoder LoRA, frozen encoder caching, fixed 600 steps and
learning rate .0001 are selected before evaluation. `protocol.json` freezes
inputs/code; `candidate-freeze.json` freezes the completed model.

```sh
.receipt-ml/venv/bin/python -m pytest experiments/receipt_model -q
PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.4 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.25 .receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py train --data-root .receipt-ml/synthetic-pilot-v1 --split train --name donut-ph-synth-v1 --steps 600 --learning-rate 0.0001 --cache-encoder-features
PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.4 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.25 .receipt-ml/venv/bin/python .receipt-ml/synthetic-pilot-v1/evaluate-candidates.py
.receipt-ml/venv/bin/python .receipt-ml/synthetic-pilot-v1/score-synthetic.py
.receipt-ml/venv/bin/python experiments/receipt_model/ph_score.py --root .receipt-ml/synthetic-pilot-v1 --systems groq donut-ph-v3b donut-ph-synth-v1
.receipt-ml/venv/bin/python experiments/receipt_model/ph_score.py --root .receipt-ml/synthetic-pilot-v1 --split test --systems groq donut-ph-v3b donut-ph-synth-v1
```

Existing adapter names must not be reused for a fresh run. Local preparation and
evaluation harnesses are preserved in the ignored experiment root. Both versions
are compared on the same ten synthetic development examples. Philippine inputs,
labels, decoding and prior Groq/v3b predictions remain unchanged; these 4/7
public sets have already been evaluated before. No fresh actual-PriceCraft test
or synthetic Groq benchmark is implied. Groq remains active.

## Full-resolution Philippine originals

The [original-photo review and grocery comparison](../../docs/philippine-original-receipt-review.md)
adds eight complete AI checks / 85 item rows from ten recovered public originals.
The combined label corpus is `checked-v4.jsonl` (87 receipts, no human verification).
Five new training candidates remain unused; three newly checked Puregold receipts
are reserved outside training. On that frozen public grocery challenge, Groq
scores 45.2% item-and-price F1 and both frozen Donut adapters score 0%.
Raw outputs and conservative cap-failure scoring are preserved under
`.receipt-ml/philippines/original-review-v1/benchmark-v1/`. No new training or
production changes were made. This does not replace an actual PriceCraft holdout.

## Donut decoding repair

The [decoding repair report](../../docs/donut-decoding-repair.md) records the
complete-menu validator, forced-EOS cap fix, field-local repetition guard and
numeric/tokenizer fixes. Inference now defaults to `--decoding-profile guarded`;
`legacy` preserves old generation options only, while retaining strict validation.
Both profiles target menu/nm/optional-cnt/price, not complete CORD trees with totals.
Use fresh prediction names when changing profiles. Raw text/token IDs and failures
are retained; this repair does not change checkpoint weights or the scorer.

Final comparison artifacts live under `.receipt-ml/donut-decoding-v2/` (v1 is the
preserved pre-review attempt). The synthetic adapter's old public comparison F1
improves from 14.8% to 27.6%, but both adapters still score 0% on the three grocery
receipts, now with explicit failures. Groq remains active, pending an actual
PriceCraft-receipt benchmark. Tests: 69 experiment tests and 375 application tests
passed; two live API tests skipped.
