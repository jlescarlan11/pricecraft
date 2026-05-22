# Receipt OCR + Personal Ingredient Catalog — Design

**Date:** 2026-05-23
**Status:** Approved
**Author:** PriceCraft

## Summary

A "leap-up" feature for PriceCraft that lets small food businesses:

1. Build a **personal ingredient catalog** of items they buy regularly, with the price they last paid.
2. **Scan grocery receipts** with their phone or laptop camera — fully client-side OCR — to add or update catalog items without manual typing.
3. **Detect price drift** in saved recipes when catalog prices change, and surface which recipes are affected.

The whole feature is free, runs entirely in the browser (no external API costs), and is PHP/Philippines-first.

## Goals

- Remove the #1 friction point in PriceCraft: re-entering ingredient costs every time grocery prices move.
- Build a moat: the more receipts a user scans, the more valuable the catalog becomes.
- Stay aligned with PriceCraft's existing offline-first, Supabase-backed, RLS-enforced architecture.

## Non-Goals (v1)

- Storing receipt images (we OCR and discard).
- Multi-language OCR (English only in v1; PH receipts are overwhelmingly English).
- Per-store receipt templates (SM/Puregold/Robinsons). Pure heuristic parser first; templates only if data shows we need them.
- Auto-updating presets when catalog prices change — user always confirms.
- Cross-user ingredient suggestions.
- Drift email/push notifications.
- Bulk re-OCR of past receipts.

## Architecture

Three new subsystems, all following the existing offline-first pattern (`src/services/presetService.ts` is the template — localStorage + sync queue → Supabase).

### 1. Ingredient Catalog

Per-user library of ingredients with their current purchase price + unit. Source of truth for "what does flour cost right now."

### 2. Receipt Scanner

`tesseract.js` Web Worker → image preprocessor → heuristic line-item parser → confirmation UI → writes accepted rows to catalog + price history.

Fully client-side. No keys, no servers, works offline.

### 3. Drift Detection

When a catalog price changes by ≥ ±5%, compute deltas against every preset that links to the affected ingredient, and surface the affected recipes for user-driven update.

## Data Model

### New Supabase tables (RLS, mirroring `presets`)

```sql
catalog_ingredients (
  id uuid pk,
  user_id uuid fk auth.users on delete cascade,
  name text not null,
  normalized_name text not null,           -- lowercased, stripped for fuzzy match
  purchase_quantity numeric not null,      -- e.g. 1
  purchase_unit text not null,             -- e.g. 'kg'
  purchase_cost numeric not null,          -- e.g. 65
  current_price_per_base_unit numeric not null,  -- ₱/g or ₱/ml, computed for sorting/comparison
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_synced_at timestamptz
)

price_history (
  id uuid pk,
  catalog_ingredient_id uuid fk on delete cascade,
  user_id uuid fk auth.users on delete cascade,
  purchase_quantity numeric not null,
  purchase_unit text not null,
  purchase_cost numeric not null,
  source text not null check (source in ('manual','receipt')),
  receipt_id uuid null,
  recorded_at timestamptz default now()
)

receipts (
  id uuid pk,
  user_id uuid fk auth.users on delete cascade,
  store_name text null,
  scanned_at timestamptz default now(),
  raw_ocr_text text,                       -- kept for debugging + history
  line_count int not null default 0,
  accepted_count int not null default 0
  -- image NOT stored
)
```

RLS policies follow the existing pattern (users can only see/modify their own rows).

### Extension to existing `Ingredient` type (`src/types/calculator.ts`)

```ts
export interface Ingredient {
  // ...existing fields
  catalogIngredientId?: string;   // optional link to catalog
}
```

When `catalogIngredientId` is set, `purchaseCost` / `purchaseQuantity` / `purchaseUnit` are pulled live from the catalog and the row is rendered read-only with an unlink action. Unlinked ingredients keep working exactly as today. Zero breaking change.

## OCR Pipeline

### Capture

Single `<input type="file" accept="image/*" capture="environment">`. On mobile this opens the camera; on desktop it's file upload. No custom camera UI.

### Preprocessing (canvas, no deps)

1. Downscale to max 1600px on the long edge.
2. Grayscale.
3. Contrast bump (lookup table).
4. Adaptive threshold to near-binary.
5. Pass processed `ImageData` to Tesseract.

We skip deskew/rotation; UI hint asks user to hold receipt flat.

### OCR

`tesseract.js` v5, English worker (`createWorker('eng')`), in a Web Worker. Progress drives a progress bar.

### Line parser (`src/services/receiptParser.ts`, pure function)

- Split OCR text by `\n`, trim, drop empties.
- Price anchor regex at end of line: `/(?:₱|P|PHP)?\s*(\d{1,4}(?:[,.]\d{3})*[.,]\d{2})\s*$/`.
- Text left of price = item name, after stripping qty prefixes (`2x`, `2 @`, `1pc`).
- Qty + unit extracted via keyword list: `kg|g|gram|ml|l|liter|pc|pcs|pack|sachet|btl|can|box`.
- Footer lines rejected by keyword: `subtotal|total|vat|change|cash|tender|tin|or no|thank you|cashier`.
- Per-line confidence: `1.0` if price + name + unit all clean; lower if guessed/missing.

### Confirmation UI

Two-column on desktop, stacked on mobile. Every row editable inline (name, qty, unit, price). High-confidence rows ticked by default; low-confidence rows unticked. A row can be marked "same as existing catalog item" via fuzzy-match dropdown (Levenshtein on `normalized_name`) — this is what enables drift detection (links new price to existing ingredient instead of duplicating).

### On accept

For each ticked row, in one logical transaction:

1. If linked to existing catalog item → append `price_history`, update `catalog_ingredients.current_price_per_base_unit` if changed.
2. If new → insert `catalog_ingredients` + first `price_history`.
3. Insert one `receipts` row with raw OCR text + counts.
4. Trigger drift recompute.

### Error handling

- Tesseract worker fails to load → friendly error, "Add ingredients manually" CTA.
- OCR returns zero parseable lines → show raw text in textarea, let user copy-paste-edit.
- Image too small / no text → same path.
- Offline → entire flow still works; writes queued.

## Drift Detection

`src/services/driftService.ts`, pure function over (catalog snapshot, presets snapshot).

- When a catalog ingredient's `current_price_per_base_unit` changes by ≥ 5%, compute new total cost + margin for every preset linking that ingredient via `catalogIngredientId`.
- Surface in two places:
  1. **Drift banner** on `CalculatorPage` and `CatalogPage` — non-modal, dismissible: *"3 recipes affected by recent price changes. Review →"*.
  2. **Drift dashboard** (`/drift`) — list per affected ingredient: old → new, % change, list of affected presets, one-tap "Update preset to current price" per row.

Never auto-updates presets. User always confirms.

5% threshold is fixed in v1 (configurable later).

## Calculator Integration

`src/components/calculator/IngredientRow.tsx`:

- Add a "Link to catalog" affordance: search input with autocomplete from user's catalog.
- When linked: row shows chip `🔗 Flour all purpose`; cost/qty/unit fields become read-only; unlink action restores manual editing.
- Existing `measurementMode: 'advanced'` UI handles the unit math — no recalculation logic changes.
- Unlinked ingredients behave as today.

## Catalog Page (`/catalog`)

- List view: name, current price, unit, last updated.
- Search + sort.
- "Add ingredient manually" modal (reuses fields from `IngredientRow`).
- Per-row: edit, view price history (inline mini sparkline, ~8 most recent points, pure SVG, no chart lib).
- Top-right CTA: "Scan a receipt →".

## Routing

`App.tsx` additions:

```
/catalog        — CatalogPage          (auth required)
/scan-receipt   — ScanReceiptPage      (auth required)
/drift          — DriftPage            (auth required)
```

Guest users see "sign in to use" empty state — catalog data needs persistence.

## File Layout

```
src/types/catalog.ts                     — CatalogIngredient, PriceHistoryEntry, ReceiptScan, ParsedReceiptLine
src/services/catalogService.ts           — CRUD + sync queue (mirrors presetService.ts)
src/services/receiptParser.ts            — pure heuristic line parser
src/services/driftService.ts             — diff catalog vs presets
src/hooks/use-catalog.ts                 — exposes {items, add, update, delete, status}
src/hooks/use-receipt-scan.ts            — wraps Tesseract worker {status, progress, result, error}
src/components/catalog/                  — CatalogList, CatalogItem, AddIngredientModal, CatalogPicker, PriceSparkline
src/components/receipt/                  — ReceiptScanner, ReceiptConfirmation, ReceiptLineRow, imagePreprocess.ts
src/components/drift/                    — DriftBanner, DriftDashboard, DriftRow
src/pages/CatalogPage.tsx
src/pages/ScanReceiptPage.tsx
src/pages/DriftPage.tsx
supabase/schema.sql                      — append new tables + RLS
```

## Testing

Existing Vitest + RTL setup.

- **`receiptParser.test.ts`** — ~10 fixture OCR strings (hand-typed from real PH receipts). Covers clean line, missing unit, missing qty, footer-skip, peso symbol variants, OCR character noise (`O`/`0`, `l`/`1`).
- **`driftService.test.ts`** — pure functions over synthetic catalog + preset fixtures.
- **`catalogService.test.ts`** — sync queue behavior under offline → online (clone of presetService tests).
- **Component tests** — `CatalogPicker` autocomplete + selection; `ReceiptConfirmation` tick/edit/skip flow; `IngredientRow` link/unlink + read-only enforcement.
- **No tests for Tesseract itself** — dependency boundary; trust it returns text.

## Dependencies

- `tesseract.js` (^5)

No other new runtime deps. Image preprocessing uses native Canvas API. Sparkline is hand-rolled SVG.

## Open Questions / Future Work

- If real-world OCR accuracy is below ~70% on user receipts, revisit option B (free vision LLM fallback like Gemini Flash free tier).
- Per-store templates if heuristic parser proves brittle for specific PH chains.
- Configurable drift threshold.
- Bulk import (CSV upload) for users migrating from spreadsheets.
