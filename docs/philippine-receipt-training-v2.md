# Philippine receipt adaptation — expanded review, 25 October 2026

For the subsequent 65-receipt, 600-step run, see the [third-batch report](philippine-receipt-training-v3.md).

Groq remains the production extractor. This local experiment does not establish
accuracy on actual PriceCraft receipts. The earlier [v1 report](philippine-receipt-training.md)
and its data, weights, predictions and results are preserved.

## Review and allocation

All 278 public images were screened using contact sheets. Forty additional
original images received complete item-label checks, bringing the total to **59
AI image-checked receipts, zero human-verified receipts**. The remaining screening
dispositions are 156 likely repeat-transaction images, 56 needing full review,
and seven top-up/load service receipts outside this goods-label pilot. Screening
and duplicate candidates are not label verification; none of those drafts enter
training. Some repeats still need invoice-level confirmation before future reuse.

The new labels preserve printed abbreviations, keep pack sizes separate from
counts, use line totals rather than unit prices, account for explicit adjacent
item discounts, retain standalone free bags, and exclude unpriced meal components
and zero-price utensil/tissue service options. Ambiguous paid meal upgrades,
receipt-wide discounts, and clipped or unreadable names remain excluded. Physical
purchased weight/volume is not measured by this CORD-format experiment.

The frozen allocation is:

| Split | Receipts | Purpose |
| --- | ---: | --- |
| Selected training | 48 | Complete AI image checks |
| Usable training | 46 | Actual slow Donut tokenizer accepts every target |
| Development validation | 4 | Exact same images and labels as v1; already seen during development |
| New public test | 7 | Six merchant groups excluded from training |

The two excluded training receipts are still `ph-0000` and `ph-0040`: the
checkpoint's slow XLM-R tokenizer emits unknown tokens for PREM1/DONUT1. They
remain in the checked-label archive but are removed from the training manifest
before training, with their decoded targets recorded in `tokenizer-exclusions.json`.
No text was silently altered to make those examples trainable.

New test merchant groups: Kyu Kyu, H&M, Uniqlo, Panda Express, Daiso, and WOW Brand.
The two WOW Brand images have different invoice numbers/dates despite the same
product and price. Watsons and Bonchon remain development-validation-only. The
checked-label preparation rejects cross-split merchant/family/image overlap, and
the screening duplicate groups contain at most one selected image each.

These are small, readability-selected public sets. They do not support population
accuracy claims or an inference about real PriceCraft receipts. No test labels
come from Groq/Donut predictions. Data allocation and the 200-step schedule were
recorded before evaluating the candidate; no test-directed tuning is planned.

## Run and comparison protocol

Fresh decoder q/v LoRA from NAVER's original CORD-v2 checkpoint, revision
`8003d433113256b4ce3a0f5bf604b29ff78a7451`; not a continuation of v1 optimizer
state. Frozen encoder/base, rank 8, alpha 16, dropout .05, 262,144 trainable
parameters, AdamW .0001, gradient clipping 1, seed 20261025, native 1280×960
processor size, 200 optimization steps on the 46 usable receipts.

The first attempt (`donut-ph-v2`) was intentionally interrupted after 33 logged
steps when the laptop experienced heavy swapping. Its last saved checkpoint is
step 25 and is **ineligible for evaluation**. Logs and weights remain available.
The fresh `donut-ph-v2b` attempt used MPS high/low allocator ratios .4/.25 instead
of .6/.5, but was also interrupted after 68 logged steps when steps stalled for
50–74 seconds. Its last checkpoint is step 50 and is also ineligible for evaluation.

Candidate `donut-ph-v2c` starts fresh with the same labels, resolution and schedule.
It computes the frozen, evaluation-mode encoder's features once per receipt,
saves float32 tensors locally, and keeps only the currently needed encoder or
decoder on the GPU. Repeated steps load the exact cached features. Unused MPS
allocations are released between steps. Regression checks verify identical
features, decoder losses and gradients across a cache round trip, reject an
encoder in training mode, and prevent overwriting a prior cache. Cache metadata
binds each tensor to the source-image hash and processor/model configuration.
The real cached run's first 33 steps also match the uncached run's receipt order
and losses exactly (maximum loss difference **0.0**), recorded in
`pilot-v2/cache-equivalence.json`.

The original four-receipt Groq/base/v1 predictions are reused unchanged; rescoring
reproduced every historical metric exactly. The new public test uses fresh calls
through the same frozen OCR.space Engine 2 → Groq `openai/gpt-oss-120b` services at
commit `1f7ceab1d9100f6ea8ba5f72fd0bf2618cc4602b`. Pending application edits are not
part of that comparator; live production behavior has not been reverified.
Three initial network failures were recovered by one resumed benchmark run. All
attempts remain on disk; final scoring uses each receipt's latest result and
separately reports failed attempts.

The primary score aggregates duplicate normalized product names, then requires
name similarity ≥ .75 and exactly equal Philippine line prices. It is not exact
transcription accuracy. Strict-name/price F1 and count coverage/accuracy are also
reported. Default CORD scoring is unchanged. The PH scorer now accepts a separate
`--split test` and cannot overwrite development-validation reports when doing so.

## Completed training and development validation

Candidate `donut-ph-v2c` completed **200 steps on all 46 usable receipts**, with
zero skipped examples. The set contains 85 item rows across 14 merchant groups.
The logged optimization steps took 388.3 seconds (excluding one-time encoding,
model loading and checkpoint I/O). Mean loss fell from 6.8754 over the first ten
steps to 0.8656 over the last ten; this is training loss, not held-out accuracy.

The saved 1,053,040-byte adapter has SHA-256
`b915c29503d2a2182c1920d6863b72324a1f0dec5ab94ae59b7cd355d17b71d5`.
Its hash, code hashes and input hashes were frozen before candidate evaluation.
All 46 feature-file hashes and their original image bindings were verified.

On the same four development-validation receipts (eight aggregated truth items):

| System | Item/name + exact-price F1 | Strict-name + price F1 | Comparable count accuracy | Count coverage |
| --- | ---: | ---: | ---: | ---: |
| Frozen OCR.space + Groq | 93.3% | 66.7% | 4/4 | 4/4 |
| Pretrained Donut | 8.0% | 8.0% | 1/1 | 1/4 |
| Donut PH v1 | 38.1% | 19.0% | 0/1 | 1/4 |
| Donut PH v2c | 38.1% | 28.6% | 1/1 | 1/4 |

The primary validation metric **did not improve** over v1. Exact normalized
name/price matches increased from two to three, and the one comparable rice count
was corrected; coverage remains one of four eligible counts. The new adapter still
promotes meal components and a heading to products, repeats product text, drops
price digits, and fails to read Dolfenal's name correctly. Four valid-EOS outputs
do not imply four correct receipts. None was perfectly extracted.

Training and inference timings occurred under heavy laptop memory pressure;
they are not a fair serving-latency comparison with historical provider calls.

## New public test results

All seven reserved receipts were evaluated after freezing the final adapter.
The test contains 14 aggregated truth items. No test-directed model or scoring
change was made after inspecting these outputs.

| System | Item/name + exact-price F1 | Strict-name + price F1 | Comparable count accuracy | Count coverage |
| --- | ---: | ---: | ---: | ---: |
| Frozen OCR.space + Groq | 21.4% | 14.3% | 6/6 | 6/10 |
| Donut PH v2c | 19.0% | 9.5% | No comparable counts | 0/10 |

Both systems performed poorly on this small set. Groq swapped Uniqlo's bag and
parka prices, shifted Kyu Kyu's item prices onto the following rows, and read a
Daiso price as 96 instead of 98. Its H&M prices were correct, but SKU-based names
did not match the checked descriptions under the frozen .75 name threshold;
those are not counted as correct name-and-price predictions. The WOW Brand
names also fell below that threshold despite correct prices.

Donut produced no usable item records under the required CORD `menu` structure
on five of seven receipts, including a root-level list rather than a `menu`
object, missing names, and unrelated text. Those receipts remain in the score
denominator. Its two correct item/price matches came from Panda Express, where
it also emitted unpriced meal components as extra products. Valid EOS and no
runtime exception are not measures of extraction correctness.

Groq had ten recorded attempts, including three initial network failures; all
seven final results succeeded after one resume. Donut had seven completed
attempts without runtime errors or length-limit truncation. These counts are
recorded separately from semantic extraction failures. No deployment or
generalization conclusion follows from seven AI-labeled, readability-selected
public images. **The decision is to retain Groq and keep this adapter experimental.**

## Actual receipts and deployment

No actual PriceCraft receipts are included in these manifests. A read-only
Supabase schema check was denied by the connected account, so the current number
of saved complete production reviews could not be verified. This is an access
limitation, not evidence that there are no saved receipts.

Groq stays active until an independently checked holdout of actual PriceCraft
receipts demonstrates an improvement, including purchased quantities/units,
prices, and payment/tax/footer false positives. No provider switch, production
deployment, paid training service, or new cloud infrastructure is part of this run.

## Artifacts

- `.receipt-ml/philippines/review-v2.html`: images, complete labels, and screening notes.
- `.receipt-ml/philippines/checked-v2.jsonl`: 59 complete AI image checks.
- `.receipt-ml/philippines/screening-v2.json`: dispositions for all 278 images.
- `.receipt-ml/philippines/pilot-v2/protocol.json`: frozen allocation/settings and input hashes.
- `.receipt-ml/philippines/pilot-v2/`: manifests, tokenizer exclusions, attempts, predictions and reports.
- [Compact metrics, provenance and checksums](../experiments/receipt_model/results/2026-10-25-philippines-expanded.json).

Verification: **23 Python experiment tests passed**. The new tests cover separate
test-split scoring without overwriting validation, and lossless frozen-feature
caching with matching decoder loss/gradients. The real first-33-step cache
equivalence check passed. All 59 checked source-image hashes, all 278 review-page
image links, all 46 cached-feature hashes, the frozen manifests and final adapter
hash were verified. All 32 adapter tensors are finite; all 16 LoRA B tensors are
nonzero. Historical validation scores reproduce exactly. `git diff --check`
passed. Application tests/build and a production browser walkthrough were not
rerun for this isolated experiment; application/provider configuration was not
changed by this work.

Source: Capstone's [Receipts Dataset Philippines, Roboflow v1](https://universe.roboflow.com/capstone-emk5p/receipts-dataset-philippines),
CC BY 4.0. Original archive SHA-256:
`52e419736b51e1f985cfa9d671e33577b765eca4ce3bb92063859b3686b37bd7`.
