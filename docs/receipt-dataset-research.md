# Public receipt datasets for PriceCraft

Researched 25 October 2026. The original CORD recommendation has since been
benchmarked, and three Philippine adaptation rounds are documented separately.
The expanded audit below identifies additional candidates; no new training or
deployment was performed during this research update. Groq remains active until
a replacement is better on independently checked actual PriceCraft receipts.

## Dataset selection

| Dataset | Verified contents and published license | Decision |
| --- | --- | --- |
| [CORD v2 — publisher repository](https://github.com/clovaai/cord) / [official dataset](https://huggingface.co/datasets/naver-clova-ix/cord-v2) | Public release: 1,000 Indonesian receipts, split 800 train / 100 validation / 100 test; images, text boxes, item names/counts/prices, nested items, and totals. CC BY 4.0. | Primary source for receipt structure and item extraction. Preserve attribution and upstream splits. |
| [OCR Invoice, version 1](https://data.mendeley.com/datasets/5n3jwggcjk/1) | Publisher describes 800 training and 90 test examples of noisy OCR text with manually verified item/charge JSON from Indonesian receipts. CC BY 4.0. | Promising second source for replacing the text-to-items step. Description checked; files/schema and overlap with other corpora still need auditing. |
| [Receipts Dataset Philippines](https://universe.roboflow.com/capstone-emk5p/receipts-dataset-philippines) | 278 images; object-detection classes Date, Merchant, Total. CC BY 4.0. | Useful local-domain images, but lacks the product/quantity/price annotations needed for this task. Those would need annotation. |
| [Humans in the Loop receipt dataset](https://humansintheloop.org/resources/datasets/free-receipt-ocr-dataset/) | 192 images and 3,839 manually labeled bounding boxes, including item information, subtotal, tax, and total. Publisher states CC0. Download requires a form. | Supplement for region detection; do not assume box labels include exact item transcripts or quantities. |
| [SROIE competition](https://arxiv.org/abs/2103.10213) | Receipt OCR/localization and key-information extraction benchmark. | Useful OCR benchmark; not the primary item-level training corpus. Original download terms must be checked before import. |

Additional candidates: [AMuRD](https://github.com/Update-For-Integrated-Business-AI/AMuRD)
explicitly limits the dataset to non-commercial research, so exclude it from the
commercial-product training plan. [CORU's publisher repository](https://github.com/Update-For-Integrated-Business-AI/CORU)
and [official dataset](https://huggingface.co/datasets/abdoelsayed/CORU) advertise
larger Arabic/English receipt resources and an MIT license. The repository's linked
LICENSE file returned 404 during this audit; confirm the distributed license and
file contents before adding it to the selected corpus. These decisions refer to
the publishers' stated terms, not third-party mirrors' license tags.

## What was inspected in CORD

Pinned dataset revision: `7f0115a4b758a71d6473b8d085751692da2fef98`.
The official Hugging Face training preview returned 26 receipts with 95 top-level
menu items. All 95 had names and prices; 87 had counts, 20 had unit prices, and nine
had nested sub-items. This was a preview audit, not a full-corpus quality assessment.

Important mapping rules for our experiment:

- Keep package/item **count** separate from **purchased amount and unit**. A count
  of one does not establish one gram. Preserve unknown amounts until supported by
  text or an explicit label.
- Preserve original amount strings and resolve number formats per dataset. A
  thousands separator cannot be interpreted as a decimal separator globally.
- Preserve grouping for sub-items and do not emit meal components as additional
  purchases. Retain zero-price items as valid annotations.
- Distinguish verified transcripts from actual OCR output. Evaluate both the
  extractor with clean labels and the full pipeline with OCR errors.
- Keep real PriceCraft reviews separate from imported annotations, with source,
  version, license, and split recorded for every example.

## Candidate model and experiment

[NAVER's Donut checkpoint fine-tuned on CORD v2](https://huggingface.co/naver-clova-ix/donut-base-finetuned-cord-v2)
already maps receipt images to structured output. Its model page lists MIT. It is
a baseline candidate, not evidence of an accuracy improvement on Philippine
receipts. Reusing this checkpoint is inference, not training a new model.

1. Import CORD with its original splits and attribution. Audit duplicates before
   combining any other source. Reserve the test set from tuning.
2. Compare the current OCR + Groq pipeline, the heuristic fallback, and Donut on
   the same evaluation receipts. Measure item precision/recall, exact prices,
   count accuracy, missed items, footer false positives, latency, and compute cost.
   Mark purchase-unit accuracy unavailable when the dataset does not label it.
3. Use the validation split to identify failures and choose whether to fine-tune
   an image-to-items model or an OCR-text-to-items model. Train only on training
   examples. Keep an untouched Philippine evaluation set as real corrections
   accumulate; CORD scores alone cannot establish local accuracy.
4. Replace Groq only if the candidate meets the application accuracy and hosting
   requirements. A dataset is not a model, and a new model needs a serving path;
   changing the current Groq model name does not deploy a custom checkpoint.

Research completed: official sources and licenses checked as described, CORD
preview annotations inspected, and candidate checkpoint identified. That research
was followed by the [completed CORD benchmark and adapter experiment](receipt-model-experiment.md):
full public corpus downloaded, a bounded comparison run, and a local adapter
trained and evaluated. Groq remains in production. No private receipts or
credentials were sent to a training provider.

Follow-up: [Philippine source audit and adaptation protocol](philippine-receipt-training.md).
The local image collections found so far publish detection boxes rather than
item transcripts. The 278-image collection has now been downloaded and given
draft labels; a small AI image-checked subset supported a local Donut training
pilot. It improved over pretrained Donut but remained below Groq. See the linked
report for the sample size, label-quality limits and final scores.

## Expanded source audit — 25 October 2026

These are candidates for an audited import, not an approved combined training
corpus. Publisher descriptions, available annotation schemas and reuse statements
were checked. No full new image corpus was downloaded or image-audited this round.

| Source | Verified evidence | Proposed use and remaining work |
| --- | --- | --- |
| [Synthetic receipts OCR](https://huggingface.co/datasets/albertobarnabo/synthetic-receipts-ocr) | Publisher lists Apache 2.0, 32,000 generated receipts: 30,000 train / 2,000 evaluation. Clean/degraded image pairs, transcripts and structured name/count/unit-price/line-total fields. Five US/European locales; generator included. | First new Donut candidate to sample-audit. Preserve paired-image and source splits. Physical purchase units are not established by these fields. Its evaluation is synthetic; real-photo improvement is explicitly unmeasured. |
| [docjay131 receipt OCR](https://huggingface.co/datasets/docjay131/receipts-ocr-dataset) | 230 image/JSON records; MIT metadata. Names, counts, unit prices and line totals. Publisher says labels were extracted using Gemini. | Small image-to-items candidate after direct photo checks, upstream image provenance review and duplicate checks. These are model-generated labels, not human ground truth. No physical-unit field in the published schema. |
| [ExpressExpense SRD](https://expressexpense.com/blog/free-receipt-images-ocr-machine-learning-dataset/) / [JensWalter personal receipts](https://github.com/JensWalter/my-receipts) | First publisher offers 200 restaurant images under MIT with attribution; second offers PDF scans under CC0. Complete structured item targets were not established. | Sources for fresh image annotation. Check overlap with docjay131, other imports and the Humans in the Loop set, which explicitly derives from ExpressExpense. Do not add advertised counts as if all images were unique. |
| [Open Prices](https://huggingface.co/datasets/openfoodfacts/open-prices) | Official price data links proof images, proof types and receipt quantities; database metadata lists ODbL. Contributions may cover selected products rather than every printed receipt row. | Potential grocery-image source for new complete annotations. Filter receipt proofs, verify image terms separately, check completeness and actual Philippine availability. Do not use product price observations as complete receipt targets. |
| [OCR Invoice v1](https://data.mendeley.com/datasets/5n3jwggcjk/1) | 800 training / 90 test samples of noisy OCR text and manually verified item/charge JSON; CC BY 4.0. | Additional text-to-items experiment candidate. Original-image pairing is not established, so it is not yet a Donut image-training source. Audit overlap with CORD and number formats. |
| [CORU / ReceiptSense](https://github.com/Update-For-Integrated-Business-AI/CORU) | Repository claims MIT and 10,000 item records. The actual training CSV has 7,000 rows and ten item-attribute columns, with no receipt/image identifier. | Hold. All 7,000 complete rows also occur in AMuRD's training CSV. The collections are not independent item data; clarify the scope of the MIT claim against AMuRD's non-commercial terms before product use. |

The CORU comparison used entire CSV records, including blanks, not fuzzy item
names. Its 644,424-byte training CSV has SHA-256
`e48ba80ff9cac0e024bf61fde9ff24ecf8b1e2fe3836065839df880af79c3bb9`.
AMuRD's 3,975,044-byte train/validation CSV has SHA-256
`24ff11099bb1aca5db07d3b0a4b242ef0aa6c9016bfe03d73f3c65461244649a`.
This overlap observation does not resolve ownership or licensing authority.
The audit is in `.receipt-ml/dataset-research-20261025/coru-amurd-overlap-audit.json`.

Other sources considered:

- [AMuRD's actual license](https://github.com/Update-For-Integrated-Business-AI/AMuRD/blob/main/LICENSE)
  is CC BY-NC 4.0; keep it out of commercial-product training without additional rights.
- [WildReceipt's official dataset metadata](https://github.com/open-mmlab/mmocr/blob/main/dataset_zoo/wildreceipt/metafile.yml)
  lists dataset license as N/A. A loader's Apache license or a mirror's tag does
  not establish receipt-image reuse permission. It also needs item-row linking.
- [ReceiptQA](https://github.com/MahmoudElsayedMahmoud/ReceiptQA) targets question
  answering. Its README's split downloads are plain text placeholders, and
  availability of complete item targets was not verified. Defer it.
- [ReceiptBench's publisher card](https://huggingface.co/datasets/T0rl/ReceiptBench)
  currently resolves to MIT metadata alone. Source composition, item completeness
  and licensing lineage need inspection before use.
- [Receipt line items with taxonomy](https://huggingface.co/datasets/lxe/receipt-line-items-taxonomy)
  supplies printed-to-readable names/categories, including teacher-generated
  annotations. It is a separate name-normalization candidate, not image-to-items
  supervision or an authority for expanding ambiguous receipt abbreviations.

No additional Philippine collection with verified complete item/quantity/unit/price
labels and established reuse terms was identified in these searches. The existing
278-image Philippine source still needs our annotations; its published boxes
alone are not item labels. This is a search result, not a claim that no such
collection exists.

## Actual receipt availability and next experiment

Three `pricecraft-receipts-2026-10-24*.json` exports were found in Downloads.
They contain two distinct examples: `qa-synthetic.png` (`qa-text-fixture`) and
`fictional-receipt.png` (explicitly marked not a real purchase). Two export files
repeat the same example. Neither is eligible as an actual purchase receipt, even
though its export has a complete review. Original exports were left unchanged.
The minimal provenance audit is
`.receipt-ml/dataset-research-20261025/local-exports-audit.json`.

The connected Supabase project listing did not include PriceCraft's configured
project. Cloud availability remains unverified; no production receipt records
were read or changed. This audit does not establish that all account/device data
is empty. The supplied screenshots show extracted rows, not the original receipt
photo needed to verify every printed field.

Recommended sequence:

1. Collect original PriceCraft purchase photos and save complete reviews. Keep
   printed descriptions, package count, package size, purchased amount/unit,
   unit price and paid line total distinct. Preserve unknowns and flag ambiguity;
   never infer grams from a count of one or from an unsupported package label.
2. Independently check a fixed actual-receipt evaluation set before further
   tuning. Split by receipt family/transaction and reserve merchants where useful;
   repeated scans and derived images must stay together.
3. Audit a bounded sample of the new synthetic source, then compare training
   with/without it. Map printed names and line totals directly; keep generated
   clean/degraded twins together. Do not claim purchased-weight accuracy from
   count-only supervision. Record source version, license, hashes and split.
4. Finish with checked Philippine training examples, monitor validation and keep
   the best checkpoint. Compare exact paid prices, missed/extra products, counts
   and physical quantities/units against Groq on the same untouched actual photos.
   Retain Groq until that comparison supports replacement.

Follow-up: the [completed synthetic sample audit and training experiment](synthetic-receipt-training.md) downloads two pinned shards, checks 70 selected labels automatically and 30 image pairs directly, and trains a mixed-data Donut adapter. Synthetic accuracy improves but Philippine public comparison accuracy regresses; Groq remains active.
