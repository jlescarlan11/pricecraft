# Philippine original-photo review and grocery comparison

On 2026-10-25, recovered ten full-resolution public receipt photos from
[Receipts by capstone-emk5p on Roboflow](https://universe.roboflow.com/capstone-emk5p/receipts-1m88i),
listed as [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
These are public Philippine examples, not actual PriceCraft customer receipts.
Groq remains in production; no application, provider, or deployment changes were made.

## Checked data

The original-image download is substantially clearer than the old 800-pixel
export. For example, the H&M original is 1941 × 4117 versus 377 × 800; the
weighted grocery originals are 939 × 4255, 1014 × 4108, and 2250 × 4000.
Original bytes, hashes, filenames, source links, attribution, and separate
analysis crops are preserved under ignored local data.

- Eight complete **AI image checks**, with 85 item rows; zero human verification.
- Five training candidates, with 14 rows: Greenwich, Jollibee, McDonald's,
  Chowking, and Starbucks. They have not been used in a new training run.
- Three Puregold grocery receipts, with 71 source rows, reserved for evaluation.
  Puregold is absent from the previous 79 checked labels. Its related photos
  and duplicate families must also remain excluded from training.
- One H&M original confirmed as the existing `ph-0092` test transaction;
  excluded as a new independent example and never added to training.
- One gelato original still has uncertain flavor abbreviations; withheld.

All eight item-price sums and 58 quantity × unit-price calculations passed.
Prices are complete line totals. Counts, package sizes, and physical multipliers
are separate fields. Physical units absent from the print remain null, including
decimal meat/rice multipliers; they are not relabeled as pieces. Unpriced meal
components are retained as metadata rather than invented extra purchases.
Free utensils with an explicit price/count remain labeled. Receipt-level reward
redemption is not allocated as an unsupported item discount.

The combined `checked-v4.jsonl` has **87 AI-checked receipts**: 73 training
candidates, four validation, ten public comparison. This is a label-corpus count,
not a claim that 73 examples have been trained. Old tokenizer exclusions remain.
The new eight targets pass tokenizer preflight at 20–568 tokens. All source hashes
and the combined review gate passed; eight existing label/scorer tests passed.
Previous labels and model weights were preserved.

## Frozen public grocery challenge

Truth and source images were frozen before predictions. The three convenience-
selected, newly readable grocery receipts contain 64 items after duplicate-name
aggregation. Both previously trained Donut adapters were evaluated without
retraining. The Groq baseline uses service code at `1f7ceab`, matching local HEAD,
with OCR.space preprocessing and no oracle transcription. This checks the
production service path locally, not the production browser upload workflow.

| System | Item-and-price F1 | Strict-name-and-price F1 | Perfect receipts |
| --- | ---: | ---: | ---: |
| OCR.space + Groq | 45.2% | 32.3% | 0 / 3 |
| Philippine Donut v3b | 0.0% | 0.0% | 0 / 3 |
| Synthetic-augmented Donut | 0.0% | 0.0% | 0 / 3 |

Primary scoring uses the existing one-to-one name similarity threshold ≥0.75
with exactly equal line prices after duplicate aggregation. These F1 scores
are not exact transcription accuracy or estimates of all Philippine receipts.
Groq returned one HTTP 400 JSON-validation failure, retained in the denominator.
It matched 21 item prices from 64 ground-truth items and compared eight eligible
counts, four correctly; physical quantity/unit accuracy is not measured by this
scorer. Request pacing is excluded from recorded latency.

Donut v3b reached 768 tokens twice and returned unstructured text on the third
receipt. The synthetic adapter reached the cap on all three. Neither produced
usable items under the unchanged extraction contract; some parsed outputs were
root lists instead of the required menu object. Raw predictions are retained.
The historical runner's EOS flag can miss forced-EOS cap hits, so a separately
recorded conservative score treats every 768-token generation as a failure;
both F1 scores remain zero. Gold targets fit within the cap, so merely increasing
the output limit is not supported as a sufficient fix.

## Decision and next experiment

Keep Groq. No further training was started: this comparison does not support
replacing the incumbent or assuming more training steps alone will fix the
failures. Investigate valid structured output, repetitive generation, and long-
image legibility/segmentation on development data before another bounded run.
Preserve this challenge merchant outside training. Its results are now known,
so future work should also reserve a fresh independent evaluation set.

The actual PriceCraft-user holdout remains unavailable. Public examples cannot
establish that Donut is better on actual user uploads.

## Artifacts

- Local review gallery: `.receipt-ml/philippines/original-review-v1/review.html`
- New checked labels: `original-review-v1/checked-originals-v1.jsonl`
- Combined labels: `.receipt-ml/philippines/checked-v4.jsonl`
- Provenance, dispositions, reservations, hashes, tokenizer preflight and
  arithmetic verification: `original-review-v1/`
- Frozen manifests, protocol, raw predictions, OCR responses, service code,
  conservative cap evaluation and logs: `original-review-v1/benchmark-v1/`
- [Recorded results](../experiments/receipt_model/results/2026-10-25-original-philippine-grocery-challenge.json)

Raw photos and label files remain ignored local research data. Source images
were not altered; crops are separate analysis aids. No private customer receipts
were sent to the benchmark services.
