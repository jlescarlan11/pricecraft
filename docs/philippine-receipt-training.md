# Philippine receipt adaptation — source audit, 25 October 2026

This is the historical v1 pilot. See the [expanded v2 review and training report](philippine-receipt-training-v2.md)
for the subsequent 59 checked labels, 46-receipt training set, and separate public test.

Status: **archive downloaded, draft labels prepared, local adapter trained and evaluated**.
Groq remains the production extractor. The completed CORD experiment is separate;
its adapter did not improve on the pretrained Donut checkpoint. See
[the measured CORD results](receipt-model-experiment.md).

## Sources checked

| Publisher / source | Observed contents | Suitability |
| --- | --- | --- |
| Capstone, [Receipts Dataset Philippines](https://universe.roboflow.com/capstone-emk5p/receipts-dataset-philippines), version 1 | 278 images; CC BY 4.0; object detection classes Date, Merchant, Total. Version page shows 278 train, 0 validation, 0 test, auto-orient and fit within 800×800 preprocessing. | Downloaded and inspected. Published labels do not supply item transcripts; these require separate image review. |
| the, [Receipts Dataset Philippines](https://universe.roboflow.com/the-4xwq6/receipts-dataset-philippines-rncdq) | 301 images, same three classes; CC BY 4.0. | Possible overlapping collection; independence and original provenance unverified. Do not concatenate or count as independent evaluation data. |
| Capstone, [Receipts](https://universe.roboflow.com/capstone-emk5p/receipts-1m88i) | 365 images; Date, Merchant, Total classes. | Also lacks published item transcription labels. |
| Capstone, [Latest 2](https://universe.roboflow.com/capstone-emk5p/latest-2) | 1,227 images; Receipt and Total classes; CC BY 4.0. No project description. | Receipt-region detection, not item extraction. Philippine provenance not established merely by sharing an uploader. |

The public pages were inspected through web search and the user's Chrome extension
profile. After the user signed in and explicitly approved the separate export
terms prompt, the COCO ZIP downloaded successfully through Chrome. No cloud
training, paid credits, dataset fork, or uploads were used.

The original 11,581,824-byte archive is retained at
`.receipt-ml/philippines/source-v1.coco.zip`, SHA-256
`52e419736b51e1f985cfa9d671e33577b765eca4ce3bb92063859b3686b37bd7`.
Its README confirms 278 images, CC BY 4.0, fit-within 800×800 and the three detection
classes. All 278 images decoded; all byte hashes and decoded-pixel hashes differ.
This does **not** mean 278 distinct transactions: visual checks found rescans of
the same receipts. A perceptual-hash scan flags 63 candidate pairs for further
review. Those are candidate similarities, not 63 confirmed duplicates.

Local Apple Vision OCR processed all 278 images without API errors. The existing
PriceCraft heuristic parser produced 862 draft candidate rows across 249 images;
29 images have no candidates. These counts are not correct-item counts. Header
false positives, missing items, orientation problems and faint text remain.
Images, OCR boxes/text, drafts, and a side-by-side review page are retained locally.

Codex checked 19 readable images directly, corrected their item labels and recorded
per-image notes/hashes. These are explicitly `image_checked_ai`, **not human-verified
ground truth**. Fifteen selected receipts from five merchant groups are for training;
four from two other merchant groups are for validation. The remaining 259 are
unreviewed drafts, not an independent test set, and include transaction duplicates.
Selection favored readability and is not representative sampling.

The pilot preserves printed item descriptions, strips tax markers, separates
counts from package sizes, excludes unpriced combo components, and nets a clearly
adjacent bag discount against that bag. Ambiguous receipts are excluded. Physical
purchase quantities remain unknown; this pilot does not measure kg/g/ml accuracy.
The label gate rejects incomplete/draft checks, changed image hashes, ambiguous
numeric strings, duplicate IDs and receipt-family/merchant leakage across splits.

Additional searches covered Hugging Face dataset names, GitHub repositories, and
general literature/dataset search. No openly accessible, ready-to-train Philippine
item-level corpus was verified. This is a search outcome, not proof none exists.
Commercial OCR collections and Philippine OCR product pages were not treated as
public training data.

## Full-dataset protocol (partially completed by the pilot)

1. Obtain the 278-image export through normal Roboflow access. Keep the original
   archive, SHA-256, version, publisher citation and distributed license under
   ignored `.receipt-ml/philippines/`. Inspect the archive before claiming that its
   actual annotations match the public schema or that every image is usable.
2. Check readability and remove duplicate receipts, including rescans and crops.
   Assign receipt families and merchant groups before allocating train/validation/
   test. The publisher's all-train split provides no independent evaluation set.
3. Create item-level transcripts from the images. Record printed name, line total,
   count, unit price, purchased quantity/unit, package size, discounts, and the
   evidence for each. Keep count, package size and purchased weight distinct;
   missing values stay unknown. Record whether line prices are before or after
   discounts. Do not infer a product from tax, payment or footer lines.
4. Any model-assisted transcription starts as `draft`, with the model/version and
   source image recorded. It becomes `reviewed` only after an independent image
   check. Do not use Donut or Groq output as evaluation truth. Unreadable fields
   remain flagged; do not silently substitute guessed targets.
5. Map reviewed training labels to Donut's supported CORD target tokens, audit
   tokenizer coverage/target length, and preserve field order. Keep richer
   quantity evidence separately where the existing token schema cannot represent
   it. Unsupported quantities cannot count as successful predictions.
6. Benchmark the current deployed OCR/Groq pipeline and pretrained Donut on the
   same reviewed validation images. Freeze production code/model versions anew;
   the old CORD baseline commit may no longer be current. Fine-tune a new local
   adapter on training images only, compare validation, then freeze the candidate
   before running the reserved public test set. Preserve existing CORD artifacts.

## Gate for changing production

Public Philippine data is for adaptation and a domain benchmark. Keep a separate,
independently checked set of actual PriceCraft receipt photos/corrections out of
training and model selection. Cover weighted groceries, package sizes, repeated
items, discounts, VAT markers, multiline names and difficult thermal-paper photos.
Reserve a validation portion and an untouched final test portion by receipt family;
do not tune on the final test after seeing errors.

Before evaluation, freeze the actual-receipt IDs, model hashes, normalization rules
and metrics. Require better item/name/line-price F1, no regression in exact prices
or purchased quantity/unit coverage and accuracy, and no increase in payment/tax/
footer false positives. Include all failed calls in the denominator. Report paired
per-receipt results and bootstrap uncertainty by receipt; a tiny apparent gain on
a small sample is inconclusive. Latency, memory and serving feasibility must also
be verified before deployment. No sample size or threshold guarantees correctness.

Groq stays active until that evidence exists. A training loss decrease, success on
CORD, or a score against automatically generated labels cannot satisfy this gate.

## Remaining requirements

- Review remaining drafts against images, resolve duplicate families, and obtain
  independent human checks before treating the labels as an evaluation standard.
- Expand the small readability-selected pilot before making broad domain claims.
- Replacement evidence: an independently checked actual-PriceCraft holdout has
  not been established in this experiment.

Application code, production configuration and provider selection are unchanged
by this Philippine experiment. Experimental data, predictions and local weights
are isolated under `.receipt-ml/philippines/`; historical CORD results are retained.

## Completed pilot

On the **same four public validation receipts**, containing eight products after
duplicate-name aggregation:

| System | Item/name + exact-price F1 | Strict-name + price F1 | Comparable count accuracy | Count coverage |
| --- | ---: | ---: | ---: | ---: |
| OCR.space + Groq | 93.3% | 66.7% | 4/4 | 4/4 |
| Pretrained Donut | 8.0% | 8.0% | 1/1 | 1/4 |
| Locally trained Donut adapter | 38.1% | 19.0% | 0/1 | 1/4 |

The adapter improved the combined item/price score over pretrained Donut, but
remains far below Groq and regressed the one comparable count prediction. **Keep
Groq; do not deploy this adapter.** These are pilot validation scores against AI
image-checked labels, not human-certified accuracy, an independent test score, or
accuracy on actual PriceCraft receipts. No confidence claim is justified by four
receipts from two merchant groups. There were no final provider failures on these
four examples; no claim about real-world reliability follows from that.

Groq's comparison ran the repository HEAD services frozen at
`1f7ceab1d9100f6ea8ba5f72fd0bf2618cc4602b` (OCR.space Engine 2 →
`openai/gpt-oss-120b`). Pending local application edits were excluded. This is the
same frozen baseline as the earlier experiment; live production behavior was not
reverified. Only public dataset images/text were sent to those existing providers.
Draft transcription used Apple's local Vision framework instead.

The model started from the original NAVER CORD checkpoint, revision
`8003d433113256b4ce3a0f5bf604b29ff78a7451`, rather than the previous CORD adapter.
It trained for **100 optimization steps on 13 distinct checked images** on MPS,
using a frozen encoder/base and decoder q/v LoRA (rank 8, alpha 16, dropout 0.05,
262,144 trainable parameters, AdamW 0.0001, gradient clipping 1, seed 20261025).
Two of the 15 selected images, `ph-0000` and `ph-0040`, were excluded because the
actual slow XLM-R tokenizer emits unknown tokens for their `PREM1`/`DONUT1`
targets. There were 15 skipped encounters across repeated epochs, not 15 distinct
excluded receipts. Actual training therefore used four merchant groups.

The 100 logged steps took 564 seconds; mean loss was 2.0002, decreasing from
3.2853 over the first ten steps to 0.6436 over the last ten. This is training loss,
not held-out accuracy. All 16 initially-zero LoRA B matrices became nonzero. The
saved adapter is 1,053,040 bytes, SHA-256
`e16ed43cad23c88ebd696236d2315527fc14a716bac51f64b75550fe722338fe`.

Post-training errors include treating Bonchon meal components as extra purchases,
mislabeling the meal heading as the product, predicting two portions of rice
instead of one, repeating MONEA text, and producing a price without a product name.
No further tuning to these validation failures or final test evaluation was run.

Scoring retains the earlier one-to-one name matching threshold (0.75) and duplicate
aggregation, with exact normalized price equality for this Philippine pilot.
It accepts the Philippine `P` prefix and treats the period as decimal and commas
as thousands separators. For example, `P34.000` means 34, not 34,000. Locale rules
apply equally to all providers; raw predictions are preserved. Historical CORD
normalization and its one-cent tolerance are unchanged. Physical units are not
scored; conditional count accuracy and coverage are shown together.

The initial Philippine score incorrectly inherited CORD's three-digit separator
heuristic and reported 28.6% for the adapter. Correcting that locale bug and
rescoring all providers yields the final 38.1% above; strict-name F1 remains 19.0%.
The correction followed validation-output inspection, so this remains development
validation, not an untouched final benchmark. Regression tests cover this case.

### Saved artifacts

- `.receipt-ml/philippines/review.html`: images alongside draft or checked labels.
- `.receipt-ml/philippines/draft-labels.jsonl`: all 278 unverified draft records.
- `.receipt-ml/philippines/checked-v1.jsonl`: 19 AI image checks with hashes/notes.
- `.receipt-ml/philippines/pilot-v1/adapters/donut-ph-v1/`: weights, run configuration and losses.
- `.receipt-ml/philippines/pilot-v1/predictions/`: all three systems' raw outputs.
- `.receipt-ml/philippines/pilot-v1/reports/validation.json`: per-receipt metrics.
- [Compact results and checksums](../experiments/receipt_model/results/2026-10-25-philippines-pilot.json).

The safe importer and label-preparation CLI reproduced the original manifest,
reviewed targets and OCR input image bytes exactly in separate verification
directories. Rerun instructions are in the
[experiment README](../experiments/receipt_model/README.md#philippine-pilot).

Verification: all **20 Python experiment tests** passed. The full application
suite passed with one worker: **375 passed, 2 opt-in live API tests skipped**.
The first application run overlapped model inference and had six timeouts in
`CalculatorForm` (renders all sub-components), `CalculatorForm.variants` (toggles
variant mode; updates limits after reducing batch size), `OverheadCost` (toggles
calculator modal), and `App.integration` (form-to-results navigation; edit results
back to form). All passed on the full serial rerun without code or timeout changes.
Lint completed with no errors and three existing `SettingsContext.tsx` Fast Refresh
warnings. No application build or production browser verification was rerun for
this isolated model experiment; no production deployment was performed.
