# Synthetic receipt augmentation pilot — 25 October 2026

The sample passed the label audit and a new local Donut adapter completed
training. It improves substantially on the sampled synthetic receipts, but
regresses on the existing seven-receipt Philippine public comparison.
**Groq remains the production extractor. This adapter is experimental.**

## Download and label checks

Source: [albertobarnabo/synthetic-receipts-ocr](https://huggingface.co/datasets/albertobarnabo/synthetic-receipts-ocr),
revision `ed46e02b9b1136f6b54847c1d4bce9e94d11e55c`.
The publisher advertises 32,000 examples; this pilot downloads the first training
and evaluation Parquet shards, **351,855,800 bytes**, rather than the full corpus.
The pinned README declares Apache 2.0; no separate LICENSE file is present.

Selection was frozen before inspection: seed 20261025, 12 training and two
evaluation receipts per US/UK/DE/IT/FR locale. This yields **60 train / 10
synthetic development receipts**, not a full-corpus random sample. Original
clean/degraded image bytes, source fields, transcripts, hashes and selection
indices are retained. Only degraded images enter the model; twins stay together.

All 70 pass independent checks for finite numeric labels, extended-price
arithmetic, printed name/price evidence, explicit quantity continuations and
receipt-total consistency. A fixed **30 pairs, covering 141 item rows**, were
also inspected directly: four training and both evaluation receipts per locale.
No item-name/count/line-price disagreement was found in that visual sample.
These are AI checks, **zero human verification**, not certification of all 32,000
receipts. The other 40 sampled examples have automatic checks only.

Counts are purchased package counts. Printed dimensions, pack sizes and other
numbers stay in the printed descriptions; no grams, kilograms or millilitres
are invented. Prices are extended line totals, not unit prices. Tax, payment,
loyalty and total rows are excluded from the item target. Generated merchandise
and prices are not representative Philippine shopping observations.

The local `review.html` gallery contains all 70 pairs and targets. Source shards,
the generator inspected as source material, audit notes and frozen manifests
are under ignored `.receipt-ml/synthetic-pilot-v1/`.

## Training

The fresh candidate `donut-ph-synth-v1` combines the existing **65 Philippine
training receipts with 60 synthetic receipts**, for **125 receipts / 450 item
rows**. All targets pass the existing slow tokenizer and 768-token preflight;
none were excluded. No evaluation receipt enters training. Byte and decoded-pixel
hashes are distinct across the 146 model-input images. Existing same-name
sequences within Philippine splits are recorded; names alone are not proof of
the same transaction.

The NAVER CORD base revision remains
`8003d433113256b4ce3a0f5bf604b29ff78a7451`; frozen encoder/base, decoder q/v LoRA
rank 8, alpha 16, dropout .05, AdamW .0001, clipping 1, seed 20261025 and native
processor resolution. The fixed final **600-step** candidate was chosen before
evaluation; there was no post-comparison tuning or best-checkpoint search.
The mixed run changes Philippine exposure relative to the previous 600-step
Philippine-only run, so this is a bounded augmentation experiment, not a claim
about an optimal mixing ratio or isolated causal effects.

All 600 steps completed across 125 distinct receipts with zero skips.
Optimization took **181.3 seconds**, excluding loading, feature caching and
checkpoint I/O. Mean first/last-ten training losses were 2.1634 / .4781; these
are not held-out accuracy. All 32 adapter tensors are finite and all 16 LoRA B
tensors are nonzero. The 1,053,040-byte adapter was frozen before inference:

`8b4f011e75c2f4c58d715a73374700d4bd8ce53f90ea7b89a9e8476b52d466c9`

## Measured results

Primary F1 requires one-to-one item-name similarity at least .75 and an exactly
equal line price after duplicate-name aggregation. It is not exact transcription
accuracy. The synthetic normalizer accepts canonical decimals and locale comma
cents without guessing that three decimal digits imply thousands. Philippine
decoding, labels and scoring stay unchanged.

| Evaluation set | Previous Donut v3b | New mixed adapter | Frozen Groq |
| --- | ---: | ---: | ---: |
| 10 synthetic development receipts, 42 items | 64.9% | **95.2%** | Not run |
| 4 Philippine development receipts, 8 aggregated items | 44.4% | **52.6%** | 93.3% |
| 7 Philippine public comparison receipts, 14 items | **34.8%** | 14.8% | 21.4% |

The synthetic evaluation font is absent from sampled training fonts, but both
come from the same generator. Strict-name/price F1 improves 62.2% → 92.9%; perfect
item/name-price receipts improve 3/10 → 7/10. Comparable count coverage improves
1/42 → 40/42, with those 40 counts correct. Neither quantity coverage nor perfect
receipt status establishes weight/volume accuracy.

Philippine validation gains include Dolfenal's correct 33.50 total. However,
Bioflu's count regresses from unknown to an incorrect one instead of ten,
and Bonchon's receipt produces header metadata as products. Count accuracy on
comparable validation rows falls 2/2 → 1/2 at unchanged 2/4 coverage.

On the seven-receipt comparison, Daiso improves to both correct products and
prices. Kyu Kyu regresses: two prices retain a trailing `V`, which fails the
frozen numeric contract, and the third is 99 instead of 199. H&M still has
incorrect discounts/extra rows; Uniqlo still emits machine identifiers as
products/prices; Panda Express produces invoice text as an item. Thus the
aggregate synthetic gain is not an overall Philippine improvement.

## Generation audit and comparison limits

All **31 inference attempts** returned records: ten old-adapter synthetic,
ten new-adapter synthetic and eleven new-adapter Philippine. No runtime
exceptions occurred, but **two new-adapter outputs reached the 768-token cap**
(`synth-eval-000517`, `ph-0245`). They contribute zero extracted items.

The legacy runner checks EOS presence to mark truncation; forced EOS at the
length cap makes that flag misleading. Raw predictions and preregistered scores
are preserved. A separate conservative audit treats all cap hits as failures
uniformly across both adapters and all sets: every primary F1 above stays
unchanged, while failed-receipt counters correctly increase for those two cases.
See local `inference-audit.json`; raw error/truncation flags alone must not be
reported as generation success. This experiment does not repair that legacy
status flag or silently rewrite historical results.

The four/seven Philippine sets have been evaluated in prior runs and contain
public, AI-labeled examples. Their manifests and frozen baseline predictions
are byte-identical; all prior baseline metrics reproduce. They are neither new
blind tests nor actual PriceCraft customer receipts. No new Groq calls, cloud
training, application changes or deployment occurred. Latency under variable
laptop load and reused API baselines is not a serving-speed comparison.

The previously available local PriceCraft exports are synthetic QA fixtures;
this run supplies no new original purchase photos. Actual-receipt superiority
remains unverified. The useful next data are checked real Philippine examples,
especially grocery weights, VAT suffixes, repeated items, discounts and footer
confusion, plus an independent actual-receipt holdout. Retain Groq.

## Verification and artifacts

- Full experiment test suite: **33 passed**, including ten new mapping tests
  exercised red → green. Independent Codex review found no material issues in
  the mapper, split handling, frozen inputs or evaluation setup.
- Completed training, finite/changed adapter weights, all inference IDs, model
  and input hashes, baseline reproduction and 21 result artifact hashes verified.
- The application was not changed or re-tested by this local experiment.
- [Compact metrics and checksums](../experiments/receipt_model/results/2026-10-25-synthetic-augmentation-pilot.json).
- [Protocol and commands](../experiments/receipt_model/README.md#synthetic-receipt-sample-pilot).
- [Plan](superpowers/plans/2026-10-25-synthetic-receipt-pilot.md).
