# CORD Benchmark and Donut Fine-tuning Implementation Plan

> Execute locally in this session. The user approved downloading CORD, comparing
> Donut with the current Groq setup, training from the findings, and retaining Groq.

**Goal:** Produce reproducible baseline metrics, a locally trained candidate,
and a held-out comparison without changing production.

**Architecture:** Isolated Python environment and ignored `.receipt-ml/` artifacts.
Pinned official CORD and Donut snapshots. Python runs Donut and evaluation;
Node executes a frozen copy of the production OCR.space/Groq services. Retain
provider responses and failures. No provider receives private user receipts.

**Tech stack:** Python 3.12, PyTorch MPS, Transformers 4.x, PEFT, PyArrow/Pillow;
existing Vite/esbuild for TypeScript service loading.

**Spec:** `docs/receipt-dataset-research.md` and the user's explicit execution request.

## Global constraints

- Keep Groq in production; no deployment or remote compute provisioning.
- CORD official splits: 800 train / 100 validation / 100 test. Never train on validation/test.
- Freeze the current deployed Git version and record local uncommitted extraction changes separately.
- Score item detection, exact normalized prices, and count only where comparable;
  no claimed kilogram/gram accuracy without labels. Account for duplicate merging.
- Treat API failures and truncated generations as failures, not excluded successes.
- Keep source attributions, revision IDs, hashes, seeds, package versions, and actual run coverage.
- The pretrained Donut checkpoint already trained on CORD; additional training
  is adaptation, not a fresh uncontaminated model or a guarantee of improvement.

## Review focus

Locale-dependent prices; duplicate product aggregation; nested menu entries;
free items and absent counts; validation/test leakage and interrupted resume.

## Tasks

- [x] Download pinned official dataset/model, preserve license and counts; check image decoding and IDs.
- [x] Write failing tests for numeric normalization, matching/duplicates, zero prices,
      missing counts, and failed predictions. Implement the evaluator and make tests pass.
- [x] Freeze production services and run shared-image benchmark on validation.
      Record any native-image preprocessing differences; oracle text is diagnostic only.
- [x] Analyze validation errors, select a training-only curriculum, and run a bounded
      decoder LoRA fine-tune using local MPS. Save adapter/config/loss history.
- [x] Choose candidate using validation only. Freeze it, then evaluate baseline and
      candidate on official test data; report failures and uncertainty.
- [x] Review metrics/scripts, write report and rerun commands. Keep Groq regardless
      of CORD score until Philippine-domain evaluation supports replacement.

## Execution decisions

- Local machine: Apple M5, 16 GiB RAM, about 59 GiB disk available at start.
- Start with a validation smoke run to measure throughput before the full run.
- Use decoder adapters and a frozen encoder to fit memory. Choose training effort
  from observed failure types and measured local throughput, and record actual steps.
- Do not commit unrelated pending application changes or put credentials in artifacts.
- Groq has an 8,000 token/minute limit. Use a bounded, reproducible convenience
  pilot: first 20 validation and first 20 test receipts, chosen before comparing
  outcomes. Download all 1,000; do not describe this as full-split evaluation.
- Corrected training run: 100 steps, 96 distinct usable train receipts, four
  overly long/unknown-token examples skipped, 262,144 decoder adapter parameters,
  rank 8, learning rate 0.0001. Early setup runs were invalidated before selection.
- Candidate selection frozen before test: adapter must improve validation
  item-price F1 without reducing strict-name-price F1. The adapter tied the base
  checkpoint, so retain the base candidate. Production remains Groq.
- Completed pilot: test item/price F1 Groq 53.8%, Donut 73.8%, adapter 73.8%.
  See `docs/receipt-model-experiment.md` for strict scores, coverage, and limitations.
