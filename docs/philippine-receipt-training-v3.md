# Philippine receipt adaptation — third label batch, 25 October 2026

Groq remains the production extractor. The new local Donut candidate completed
600 optimization steps on 65 distinct public receipts. Actual PriceCraft receipt
superiority has not been established. The [previous run](philippine-receipt-training-v2.md)
and all its data, predictions and weights are preserved.

## Label review

All 56 images previously marked as needing full review were inspected directly;
four sideways images were also viewed through rotated analysis copies. The
original files remain unchanged. Twenty complete item-label checks were retained,
bringing the archive to **79 AI image checks and zero human-verified checks**.

The batch adds explicit counts, pharmacy pack-size/count distinctions, free
physical-goods accessories, and paid parent meals with unpriced components. An
explicit nested drink upgrade is included in its already-printed parent-meal
line total. Fuel volume is not treated as a product count; this CORD-format
experiment does not establish purchased weight/volume accuracy.

One provisional discounted-combo label (`ph-0254`, price 165) was withdrawn after
checking repeat photo `ph-0138`. The repeated source prints totals of 166 while
its printed senior-meal/discount numbers subtract to 165. That conflict is flagged
for human review. The initial attempt using the provisional set was interrupted
after 161 logged steps and is **ineligible for evaluation**. Its preparations,
logs, provisional labels and retraction are preserved. The final candidate starts
fresh from the original base model with that receipt excluded; it does not inherit
the interrupted adapter or optimizer state.

Current dispositions across 278 images:

| Disposition | Images |
| --- | ---: |
| Complete AI image checks | 79 |
| Duplicate candidates | 161 |
| Need human review | 23 |
| Top-up/load services outside this pilot | 7 |
| Reserved evaluation merchants, not promoted | 2 |
| Additional fuel photos not selected for this batch | 6 |

Duplicate candidates are not verified item labels. Long weighted-grocery
receipts, faint abbreviations, and unresolved discount allocations remain
excluded. No partial transcript is promoted to a complete training target.

## Allocation and training

| Allocation | Receipts |
| --- | ---: |
| Selected training | 68 |
| Tokenizer-compatible training | 65 |
| Existing development validation | 4 |
| Existing public comparison set | 7 |

Training contains 122 item rows across 20 merchant groups. `ph-0000`, `ph-0040` and `ph-0229` are excluded
because the checkpoint's slow tokenizer emits unknown tokens in their printed
names. Targets are preserved without silently editing text to bypass this check.
The final preflight reuses the first preparation's tokenizer audit only after
verifying that all 68 retained targets and image hashes are identical; one
provisional receipt was removed and no new target introduced after that audit.

Candidate `donut-ph-v3b` starts from NAVER CORD-v2 revision
`8003d433113256b4ce3a0f5bf604b29ff78a7451`. Encoder/base weights remain frozen;
decoder q/v LoRA uses rank 8, alpha 16, dropout .05 and 262,144 trainable parameters.
AdamW .0001, gradient clipping 1, seed 20261025, native 1280×960 processing and
600 steps were chosen before candidate evaluation. The encoder's float32 features
are cached once per image; MPS allocator high/low ratios are .4/.25.

All **600 steps completed on 65 distinct receipts**, with zero skips. Logged
optimization took 250.0 seconds, excluding model loading, one-time encoding and
checkpoint I/O. Mean loss was 6.2142 over the first ten steps and .5329 over the
last ten. Training loss does not establish held-out accuracy.

The final 1,053,040-byte adapter was frozen before evaluation, SHA-256:
`b7f3c39e8266b357eb93a18da2d741073a686d879e235d053ea1b79251dca100`.

## Evaluation protocol

The four validation and seven public comparison receipts keep the same images,
labels and merchant reservations as v2. All 11 prepared OCR images are byte-for-byte
identical to v2. Prior Groq/base/v1/v2 predictions are reused unchanged. These
sets were already evaluated in earlier runs: neither is a new blind test, and
neither contains actual PriceCraft customer receipts.

The new candidate uses the unchanged Donut inference function, greedy decoding
and maximum length 768. A local harness loads the model once and invokes that
function sequentially for both reserved splits. No generation or normalization
change is made between them. Scoring keeps the frozen name-similarity threshold
.75, exact Philippine line prices, duplicate-name aggregation and separate
strict-name/price and count metrics. Empty or unusable predictions remain in the
denominator. No post-evaluation tuning is part of this run.

The comparator remains the previously frozen OCR.space Engine 2 → Groq
`openai/gpt-oss-120b` services at commit
`1f7ceab1d9100f6ea8ba5f72fd0bf2618cc4602b`. Pending application edits are excluded.
This reuses recorded baseline calls rather than asserting a new production walk.

## Measured results

On the same four development-validation receipts, containing eight aggregated
truth items:

| System | Item/name + exact-price F1 | Strict-name + price F1 | Comparable count accuracy | Count coverage |
| --- | ---: | ---: | ---: | ---: |
| Previous Donut v2c | 38.1% | 28.6% | 1/1 | 1/4 |
| New Donut v3b | 44.4% | 33.3% | 2/2 | 2/4 |
| Frozen OCR.space + Groq | 93.3% | 66.7% | 4/4 | 4/4 |

The validation F1 gain comes from fewer extra predictions: four correct name/price
matches remain four, while aggregated predictions decrease from 13 to ten. Goya's
20.50 price is now correct, but repeated MONEA products are undercounted and their
combined price is wrong. Dolfenal's name and count improve, but its price is 33
instead of 33.50. No validation receipt is perfectly extracted.

On the seven previously evaluated public comparison receipts, containing 14
aggregated truth items:

| System | Item/name + exact-price F1 | Strict-name + price F1 | Comparable count accuracy | Count coverage |
| --- | ---: | ---: | ---: | ---: |
| Previous Donut v2c | 19.0% | 9.5% | No comparable counts | 0/10 |
| New Donut v3b | 34.8% | 34.8% | 3/3 | 3/10 |
| Frozen OCR.space + Groq | 21.4% | 14.3% | 6/6 | 6/10 |

Correct name/price matches increase from two to four. Kyu Kyu's three products,
prices and counts are now correct; Daiso's free bag is correctly extracted, but
its paid product is missed. Panda Express regresses from two correct products
to an incorrect single description. Uniqlo's machine identifiers become a false
product and an enormous false price; WOW Brand's descriptions are wrong despite
correct numbers. The aggregate gain is not uniform improvement across receipts.

All 11 new inference attempts completed with EOS and without runtime errors or
length-limit truncation. Semantic errors remain fully counted. Prior systems'
complete metrics reproduce exactly. The public sets are tiny, readability-selected
and AI-labeled; this run does not establish broad accuracy or actual-receipt
superiority. Timings under different laptop loads and reused provider calls are
not a fair serving-speed comparison.

**Decision: retain Groq.** The new adapter improves both aggregate Donut F1 scores,
but still trails Groq on development validation and purchased-count coverage.
Actual PriceCraft results, physical quantities/units and production serving have
not been verified. No production provider switch was made.

## Actual receipt availability

The user's John lester Chrome extension profile was identified from browser
inventory and its account association. The signed-in PriceCraft scan page then
confirmed the expected account and displayed **0 saved on this device · 0 fully
reviewed**, with Export reviewed receipts disabled. This establishes the current
browser/device collection only; it does not rule out cloud-only or other-device
records. No actual receipts were downloaded or used in this run.

Groq stays active until an independently checked set of actual PriceCraft
receipts demonstrates better item/name/price and purchased quantity/unit results,
including tax/payment/footer false positives. This local adapter is not connected
to production. No new cloud training service, paid infrastructure, or deployment
was used.

## Artifacts

- `.receipt-ml/philippines/checked-v3.jsonl`: 79 retained complete AI checks.
- `.receipt-ml/philippines/review-v3.html`: all source images, labels and exclusions.
- `.receipt-ml/philippines/screening-v3.json`: full review dispositions.
- `.receipt-ml/philippines/review-retractions-v3.json`: provisional-label withdrawal.
- `.receipt-ml/philippines/pilot-v3/`: interrupted provisional attempt, not a candidate.
- `.receipt-ml/philippines/pilot-v3b/`: final manifests, protocol, training, weights,
  feature hashes, predictions, actual-receipt availability evidence and reports.
- [Compact metrics, provenance and checksums](../experiments/receipt_model/results/2026-10-25-philippines-third-batch.json).

Verification: **23 experiment tests passed**. All 79 checked image hashes, all 278
review-page image links, all 65 cached-feature hashes, all 11 evaluation OCR-image
byte comparisons, frozen input/code hashes and final adapter hash were verified.
All 32 adapter tensors are finite and all 16 LoRA B tensors are nonzero. The
retracted receipt and three tokenizer exclusions do not appear in the final
training manifest or optimization log. Application tests/build were not rerun
for this data/model-only experiment; no application/provider changes were made
by this work.

Source: Capstone's [Receipts Dataset Philippines, Roboflow v1](https://universe.roboflow.com/capstone-emk5p/receipts-dataset-philippines),
CC BY 4.0. Original archive SHA-256:
`52e419736b51e1f985cfa9d671e33577b765eca4ce3bb92063859b3686b37bd7`.
