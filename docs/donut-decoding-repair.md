# Donut decoding repair and regression benchmark

Local experiment on 2026-10-25. Groq remains active. No training, checkpoint,
application, or deployment changes are part of this repair.

## Diagnosis and changes

Development traces reproduced repeated name text, mismatched tags, early EOS,
and malformed prices. The previous runner only checked whether EOS appeared
anywhere. The checkpoint forces EOS at the output limit, so capped streams could
be reported as successful. The upstream permissive token parser can skip missing
closing tags and return a partial object or root list; those are unsuitable as
complete PriceCraft receipt outputs.

The local runner now defaults to a guarded receipt decoding profile:

- Enforce `menu → nm → optional cnt → price`, with balanced tags and EOS only
  after the complete menu closes. No correct labels or oracle text are supplied.
- Block repeated four-token sequences within the current name, while permitting
  recurring structural tags and legitimate duplicate item rows.
- Abort fields beyond the 64-token budget instead of fabricating a closing tag.
  The whole-generation cap remains 768, and hitting it is always a failure.
- Require complete, nonempty items, explicit decimal points and optional comma
  thousands separators. Reject malformed punctuation, non-finite strings,
  negative values, missing fields, and trailing garbage.
- Preserve raw decoded text, token IDs, original parsed field strings, and errors.
  Extract accepted currency-prefixed numbers to finite `Decimal` amounts.
- Permit normal SentencePiece whitespace boundaries in numbers, while blocking
  consecutive whitespace-only tokens from creating another loop.

The model still chooses every name, count, and price. Valid syntax does not prove
that a row is a product or that its value is correct. A receipt that still loops
or fails a budget produces an explicit error and no usable items; it is retained
in evaluation. This bounds and exposes failures rather than solving recognition
on every photo.

`--decoding-profile legacy` preserves the old **generation settings only**. Both
profiles use the new complete menu validation and raw-output recording. Complete
CORD trees with totals, unit prices, or other fields are outside this menu-only
profile; historical results and the pre-change runner remain preserved separately.
The scorer and training implementation are unchanged.

The installed checkpoint's tokenizer accepts ordinary `0.00`, `5.00`, `P10.50`,
`PHP 0.00`, and `Rp 1.25` token paths after the fix. The `₱` glyph maps to UNK
in this checkpoint and remains forbidden during generation. The parser can
understand that currency symbol when present in other input, but the check does
not claim the model can generate an unsupported glyph.

## Review and verification

The initial 33-test experiment baseline passed. Six inference regressions failed
before the completeness repair; five grammar tests failed before generation
guarding. An independent review identified three Important issues: bare `P`
prices became null through generic extraction; whitespace-only SentencePiece
tokens were excluded; and numeric punctuation validation was too permissive.
All three were reproduced and corrected in one test-first fix pass. The first
benchmark is retained under `donut-decoding-v1` as a superseded attempt.

Final code verification: **69 experiment tests passed**. The application suite
passed **375 tests**, with two live API tests skipped. A separate check walked
the actual cached tokenizer's supported numeric target paths through the grammar.
Production browser upload behavior has not been reverified in this task.

## Benchmark protocol

The final run is under `.receipt-ml/donut-decoding-v2/`. Inputs, adapter weights,
generation settings, and source/scorer hashes are frozen before predictions.
The four existing public development receipts are evaluated first. The candidate
with higher development item-and-price F1 is frozen before rerunning the seven
old public comparison and three public grocery receipts. Both adapter outcomes
are reported, irrespective of the selection. No settings are selected using test
outcomes. The public examples have already been seen in previous experiments;
this is a regression comparison, not a new blind benchmark.

Groq predictions are reused byte-for-byte, including its grocery HTTP 400
JSON-validation failure. No provider requests are selectively retried. The same
unchanged Philippine scorer evaluates duplicate-aggregated name similarity ≥0.75
and exactly equal line prices, with strict-name-and-price F1 reported separately.
Unknown physical units are not inferred, and this score does not measure
physical quantity/unit accuracy.

| Public set | Cached Groq | Philippine v3b before → guarded | Synthetic adapter before → guarded |
| --- | ---: | ---: | ---: |
| Development: 4 receipts | 93.3% | 44.4% → 42.1% | 52.6% → 52.6% |
| Old comparison: 7 receipts | 21.4% | 34.8% → 34.8% | 14.8% → **27.6%** |
| Long grocery: 3 receipts | 45.2% | 0.0% → 0.0% | 0.0% → 0.0% |

Values are item-and-price F1, not exact transcription accuracy. The synthetic
adapter was selected from development results before test inference. Its gain
on the old public comparison does not generalize to the grocery receipts. The
Philippine adapter remains better on the old set, despite being worse on the
small development set; both outcomes are retained instead of selecting a model
after looking at test scores.

Across both adapters, all 22 development/old-comparison generations have valid
structure, while all six grocery generations fail explicitly: five field-budget
failures and one with no legal continuation. No final generation reaches the
768-token cap. These are six recognition failures, not six corrected receipts.
The synthetic adapter's last grocery attempt still spends 77 seconds before
failing. Runtime is not consistently improved; comparisons to cached baselines
also reflect different local workloads and cannot establish a speed gain.

**Decision: keep Groq.** The syntax and failure-reporting fixes are implemented,
but long-receipt recognition remains unresolved. Investigate image legibility,
receipt segmentation and header-versus-product confusion on development data
before another training decision. Public results cannot establish superiority
on actual PriceCraft user receipts; those remain unavailable for this comparison.

[Final recorded results](../experiments/receipt_model/results/2026-10-25-donut-decoding-repair.json)
include all scores, raw-generation audit counts, verification and frozen hashes.

## Reproduction

Use fresh prediction names/output roots to preserve previous outcomes:

```sh
.receipt-ml/venv/bin/python -m pytest experiments/receipt_model -q
PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.4 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.25 \
  .receipt-ml/venv/bin/python experiments/receipt_model/donut_run.py infer \
  --data-root /absolute/path/to/fresh-benchmark --split validation --limit 4 \
  --adapter /absolute/path/to/frozen-adapter --name donut-guarded-fresh \
  --decoding-profile guarded
```

The exact final manifests, generation logs, raw predictions, cached baselines,
candidate freeze, code hashes and result reports remain in the ignored experiment
root. No model is promoted to production by this script.

Upstream references: [Transformers generation configuration](https://huggingface.co/docs/transformers/v4.57.1/en/main_classes/text_generation)
documents forced EOS and ngram controls; [the original Donut implementation](https://github.com/clovaai/donut/blob/master/donut/model.py)
provides the token-tree parsing context. The local strict menu contract is a
PriceCraft experiment change, not an upstream model accuracy claim.
