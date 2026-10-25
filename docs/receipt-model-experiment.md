# CORD / Donut experiment — 25 October 2026

**Completed: downloaded CORD, benchmarked both systems, trained and evaluated a
Donut adapter. Extra training produced no measured gain.** Production continues
using OCR.space + Groq. No model was deployed.

## Results

Each split below contains 20 receipts. Validation has 35 aggregated ground-truth
items; test has 41. These are pilot scores under the mapping below, not overall
PriceCraft accuracy or a claim about Philippine receipts.

| System | Validation item/price F1 | Test item/price F1 | Test strict name/price F1 | Test count coverage |
| --- | ---: | ---: | ---: | ---: |
| Current OCR.space + Groq | 55.1% | 53.8% | 38.5% | 80.0% |
| Pretrained Donut | 98.6% | 73.8% | 57.1% | 74.3% |
| Donut + locally trained adapter | 98.6% | 73.8% | 57.1% | 74.3% |

Groq recovered 21/41 test items with matching names and prices; Donut recovered
31/41 while also producing more unmatched products. The F1 denominator accounts
for missing and extra predictions. All item/price comparisons passed for 8/20
Groq receipts versus 14/20 Donut receipts, using tolerant name matching and without
requiring counts. Count accuracy among comparable matches was 100% for both on
test; coverage shows the omissions.

Three failed Groq-pipeline receipt attempts on validation and one on test were
retried and retained in history. Final results include all 20 receipts per split;
zero final transport failures remained. An empty successful prediction still
loses item recall. These scores describe the pipeline after retries, not first-try
reliability or the browser fallback workflow.

The adapter did not beat pretrained Donut on validation or test. Keep Groq in
production and retain the adapter as an experiment. Machine-readable metrics,
provenance, curriculum IDs and checksums are in
[`2026-10-25-cord-pilot.json`](../experiments/receipt_model/results/2026-10-25-cord-pilot.json).

## What ran

- Downloaded all 1,000 public [CORD v2 receipts](https://huggingface.co/datasets/naver-clova-ix/cord-v2):
  800 training, 100 validation, 100 test. Preserved publisher splits, attribution,
  CC BY 4.0 license, revision and shard hashes. No identical image byte hashes
  crossed splits. Images decoded successfully during preparation.
- Downloaded the [Donut checkpoint already fine-tuned on CORD](https://huggingface.co/naver-clova-ix/donut-base-finetuned-cord-v2).
  This was not training a new OCR model from scratch.
- Benchmarked the first 20 validation receipts and first 20 test receipts.
  These are reproducible convenience samples, not random or full-split results.
  Groq's 8,000 token/minute limit motivated this bounded pilot.
- Executed the production service code frozen at `1f7ceab1d9100f6ea8ba5f72fd0bf2618cc4602b`:
  OCR.space Engine 2 → `openai/gpt-oss-120b`. Pending local quantity-reconciliation
  edits were excluded. Donut received the same receipts as original RGB images.
  Groq received actual OCR output, not annotation transcripts.
- Trained a decoder LoRA adapter for **100 optimization steps**, using **96 distinct
  training receipts** from a 100-receipt curriculum. Four long/unknown-token
  examples were skipped; four usable examples repeated. No validation or test
  receipts were used for training.

## Evaluation protocol

The primary score is micro F1 for matching product names and correct line prices.
Names are normalized and matched one-to-one at SequenceMatcher similarity ≥0.75;
prices must agree within 0.01 after locale normalization. This tolerant score is
**not exact transcription accuracy**. The secondary strict score requires identical
normalized names and correct prices. Neither is the publisher's tree-edit metric.

Duplicate normalized product names are aggregated on both sides, with prices and
counts summed. Nested components are not separate ground-truth purchases.
Zero-price items remain in the labels. CORD prices are used as annotated; their
discount/tax convention can differ from PriceCraft's final-price interpretation.
Priced nested add-ons can also differ from the application's flat item semantics;
these are CORD structure scores, not a direct financial-correctness audit.
Truncated, failed, or missing predictions count as failures. Resumed API attempts
retain their history; the latest outcome per receipt is scored.

The adapter had to improve validation item-price F1 without reducing strict F1.
It tied the original checkpoint, so **pretrained Donut was retained as the candidate**.
That decision and adapter hash were frozen before test inference. Test results
were not used to change the model, training curriculum, or decision.

## Training details and findings

Validation exposed a discount wrongly emitted as a product and an omitted count.
The curriculum mixed 50 train examples with discounts or decimal-formatted counts
and 50 general examples. Training used Apple M5 MPS, a frozen encoder/base decoder,
262,144 trainable q/v adapter parameters, rank 8, alpha 16, dropout 0.05, AdamW,
learning rate 0.0001, gradient clipping 1.0, and seed 20261025.

The successful run took about 354 seconds of measured step time. Mean training
loss was 0.02795, which is not a held-out accuracy score. All 16 initially-zero
LoRA B matrices changed. The saved adapter is approximately 1 MiB.

Two early setup trials were aborted and marked invalid: the library's generic
causal loss shifted already-shifted labels again, and a generic serializer sorted
fields rather than preserving CORD's order. The final run uses explicit aligned
cross-entropy and the publisher's [CORD field-order setting](https://github.com/clovaai/donut/blob/master/config/train_cord.yaml).
Regression tests cover both issues. Only the corrected `donut-adapter-v3` was evaluated.

Extra CORD training produced **no measured improvement** on either evaluation
sample. This checkpoint already learned CORD, and the bounded adapter run does
not establish that more of the same training would improve PriceCraft.

## Errors that matter for replacement

- Groq frequently interprets Indonesian thousands separators as decimals, such
  as 23,000 → 23. This explains much of its validation gap and is domain-specific.
- Donut sometimes promotes nested meal components to separate products, includes
  SKU codes in names, fragments multi-line names, and drops a zero from a price.
  Its test item-price F1 is materially below its validation score.
- Donut's test count accuracy is 100% **among the 26 comparable matched counts**,
  but coverage is only 26/35 (74.3%). Reporting accuracy alone would hide omissions.
- CORD does not establish purchased kg/g/ml accuracy for PriceCraft's original
  grocery case. No independently checked Philippine evaluation set exists yet.

## Reproducibility and limits

All images, OCR responses, predictions, dataset/model provenance, training losses,
adapter weights, and the frozen decision are in ignored `.receipt-ml/`. No private
PriceCraft receipts were sent to a training service. Public CORD images/text were
sent to the existing OCR.space/Groq providers for the comparison.

Rerun instructions and the pinned Python/macOS ARM environment are in
[`experiments/receipt_model/README.md`](../experiments/receipt_model/README.md).
The production baseline does not simulate browser Tesseract or heuristic error
fallbacks. Pillow preprocessing follows PriceCraft's scale/grayscale policy but
is not pixel-identical to browser canvas. Latencies vary with local load and
exclude model loading and recorded API pacing; they do not establish hosting
cost or production throughput. No provider billing measurement was made.

Local artifacts:

- `.receipt-ml/adapters/donut-adapter-v3/adapter_model.safetensors` — trained adapter.
- `.receipt-ml/adapters/donut-adapter-v3/run.json` and `loss.jsonl` — actual steps and losses.
- `.receipt-ml/candidate.json` — decision frozen before test evaluation.
- `.receipt-ml/reports/validation-20.json` and `test-20.json` — full per-receipt scores.
- `.receipt-ml/predictions/` and `ocr/` — actual outputs and retained attempt history.

Verification: 10 Python evaluator/training tests passed, 36 targeted application
parser/Groq tests passed, application build passed, and lint passed. The build
reported existing chunk-size and Browserslist-age warnings. Script syntax checks,
dataset counts, frozen validation/adapter hashes, and complete test-attempt
coverage passed. Production behavior was not reverified or modified in this task.

Keep Groq. A replacement needs a larger comparison and a separately reviewed
Philippine receipt set covering weighted purchases, package sizes, discounts,
tax markers, and difficult photos. The remaining 80 CORD test receipts have not
been evaluated; preserve them for further checks instead of tuning to this pilot.

Attribution: Park et al., *CORD: A Consolidated Receipt Dataset for Post-OCR
Parsing*, 2019, NAVER CLOVA AI. [Dataset source and CC BY 4.0 terms](https://github.com/clovaai/cord).
Annotations were normalized for the metrics described above. Donut's model page
lists MIT; the checkpoint and architecture are attributed to NAVER CLOVA AI.
