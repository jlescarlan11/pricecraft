# Donut decoding repair implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline;
> steps below record progress and verification.

**Goal:** Fix repetitive and structurally invalid Donut inference, benchmark
frozen adapters again, and retain Groq pending actual PriceCraft superiority.

**Architecture:** Add a menu-schema logits processor and field-local repetition
guard, then strictly validate the complete generated token stream. Keep model
weights, source labels, and scoring unchanged. Preserve raw outputs and legacy
generation for reproducible comparisons.

**Tech Stack:** Existing Python 3.12, PyTorch, Transformers 4.57.6, pytest, Pillow.

**Spec:** The user's request in this chat; constraints and acceptance below.

## Global constraints

- Groq remains active; no production changes, paid compute, commits or pushes.
- Work within the existing uncommitted experiment; preserve unrelated app edits.
- No test labels/images in training; no new training is needed for decoding fixes.
- Use the four existing public development receipts to assess the fix, freeze
  code/settings, then evaluate seven old comparison and three grocery receipts.
- Previously seen public sets are regression comparisons, never an actual user
  holdout. Reuse exact Groq predictions, including errors, rather than selectively retrying.
- Retain the 768-token cap and fail closed at the cap, even with forced EOS.
- Grammar controls structure only; it must not inject correct names/prices or
  borrow truth to repair predictions. Same scorer for every system.

## Evidence and review focus

Baseline: 33 experiment tests pass. Development-only traces reproduce repeated
PPC/ZNADZE, mismatched name/count tags, early EOS, and malformed numeric fields.
Installed `token2json` skips missing closes and can emit a root list; the runner
only tests EOS membership and does not validate structure. Gold grocery targets
fit within 768 tokens. No evidence supports simply increasing the token budget.

Tests must cover forced EOS at cap; missing/mismatched/extra tags; legitimate
duplicate item rows; numeric/currency boundary cases; and repetition blocking
without blocking repeated structural delimiters or later duplicate products.

## Tasks

### 1. Fail closed and retain diagnostics

- [x] Add regression tests against current inference for forced-EOS cap and
  malformed tags; observe expected failures.
- [x] Implement strict stream validation and raw decoded/token-ID retention.
  Reject incomplete/empty menus, invalid fields and non-finite prices/counts;
  preserve zero prices, optional counts, and duplicate item rows.
- [x] Run relevant tests and whole experiment suite.

### 2. Guard generation

- [x] Write failing processor tests for legal schema transitions, numeric
  fields, within-name repeated ngrams, and duplicate rows across fields.
- [x] Implement a menu/nm/optional-cnt/price grammar; mask illegal delimiters
  and EOS until menu closure. Block repeated four-token sequences within a name,
  with a bounded field budget that reports failure rather than inventing closure.
- [x] Add guarded default and explicit legacy generation profile; do not modify
  training or checkpoint weights. Run tests.

### 3. Benchmark and review

- [x] Freeze sources, manifests, adapters, settings and scoring hashes before
  predictions; run guarded inference on both adapters' four development receipts.
- [x] Freeze the candidate without using test outcomes to tune it; run both
  adapters on the seven old and three grocery public comparison receipts.
- [x] Compare legacy/fixed results and cached Groq under the same score, retaining
  all failures and reporting syntactic validity separately from item accuracy.
- [x] Run experiment suite and application tests; get one independent code review,
  address material findings, and document outcomes/remaining recognition failures.

## Execution notes

The user's explicit “go ahead and fix ... then benchmark” authorizes continuous
inline execution. Keep this in the current experiment checkout so its untracked
research code/data and prior changes remain available. No worktree, branch switch,
or commit is necessary for this local repair.
