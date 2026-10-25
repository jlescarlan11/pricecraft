# Synthetic receipt Donut pilot implementation plan

> Execute inline using superpowers:executing-plans and verification-before-completion. The user's request authorizes the bounded download, audit and conditional training below.

**Goal:** Audit a reproducible public synthetic sample and, if it passes, measure whether mixed-data Donut training helps the existing Philippine pilot.

**Architecture:** Pin the source revision, download one train and one evaluation shard, and select 60 train / 10 evaluation examples stratified across five locales using seed 20261025. Audit 20 train plus all 10 evaluation image/label pairs. Preserve untouched source labels and clean/degraded twins; train on degraded images only. Use the existing Donut runner and Philippine scorer without production changes.

**Tech stack:** Existing local Python environment, Hugging Face, PyArrow, Pillow, PyTorch MPS, decoder LoRA.

**Spec:** The user request in this chat and `docs/receipt-dataset-research.md` expanded source audit.

## Constraints and review focus

- Groq remains active; public results cannot authorize replacement on actual receipts.
- All new source images remain under ignored `.receipt-ml/synthetic-pilot-v1/`; preserve prior runs and unrelated working-tree changes.
- Labels must preserve printed descriptions and paid line totals; never infer physical quantities/units from item count.
- Keep source train/evaluation and clean/degraded twins together; exclude incompatible targets before training with a recorded reason.
- Check generated label arithmetic and image agreement, duplicates, token limits, decimal conventions and generated font limitations.
- Local public-data experiment only; no paid compute, private uploads, commit, push or deploy.

## Tasks

- [x] Pin revision, source metadata and shard checksums; download two shards and select the stratified sample before inspecting outcomes.
- [x] Inspect publisher generator/validator as untrusted source; independently validate labels and compare the fixed visual sample against clean and degraded images. Record exact disagreements. Stop conditional training if systematic label errors cannot be safely excluded.
- [x] If a reusable mapping helper is needed, test field/count/price validation and rejection of incomplete or inconsistent labels before implementing it. Use source labels, not OCR predictions, as supervision.
- [x] Freeze an eligible mixed manifest (existing 65 Philippine training examples plus accepted sampled synthetic training records), exclusions, all hyperparameters and code hashes. Use a fresh base, decoder q/v rank-8 LoRA, 600 steps, learning rate .0001, frozen encoder feature caching. Do not tune after comparison results.
- [x] Run training to completion, verify finite changed adapter weights and completed steps, then freeze the candidate. Evaluate the 10 synthetic development examples and unchanged 4/7 Philippine public splits using identical decoding/scoring; reuse existing frozen baselines where inputs match.
- [x] Run the experiment tests and artifact checks; report sample limitations, gains/regressions and actual-receipt availability. Keep Groq regardless of public comparison outcome.

## Execution notes

This extends existing local experiment artifacts; no application feature or serving behavior changes. Execute in the current workspace to retain access to cached model/data and absolute image paths. Review this experiment separately from inherited application edits. No new independent actual-PriceCraft holdout is available from the previously audited exports, which are synthetic QA fixtures.

## Completion record

Completed 600 steps, 31 inference attempts, 33 experiment tests and independent code review. New adapter improves synthetic F1 but regresses on the seven-receipt Philippine comparison; Groq retained. Two cap hits are explicitly reported despite legacy EOS-only status flags. See `docs/synthetic-receipt-training.md` and the compact result JSON. No application changes, commits, push or deployment.
