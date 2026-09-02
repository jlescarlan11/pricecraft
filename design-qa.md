# PriceCraft Design QA

Date: 2026-09-02

## Visual source of truth

- Selected direction: **03 — Avant-Garde Product UI**
- Reference image: `/Users/johnlesterescarlan/.codex/generated_images/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/exec-fa3d217c-d3af-4375-96c1-221d0a660151.png`
- Reference dimensions: 1487 × 1058 px
- Primary implementation state: Chocolate Chip Cookies sample loaded, Ingredients expanded, live Price Runway visible.
- Implementation screenshot: `/Users/johnlesterescarlan/.codex/visualizations/2026/09/02/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/pricecraft-phase2/20-calculator-final-desktop.jpg`
- Browser viewport override: 1440 × 1024 CSS px at DPR 1
- Captured content dimensions: 1432 × 1018 px

## Comparison evidence

- Final side-by-side comparison: `/Users/johnlesterescarlan/.codex/visualizations/2026/09/02/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/pricecraft-phase2/21-design-qa-final-comparison.png`
  - The source and implementation are each normalized to 1432 × 1018 px.
  - Combined canvas: 2866 × 1018 px with a 2 px divider.
- Editable ledger focus: `/Users/johnlesterescarlan/.codex/visualizations/2026/09/02/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/pricecraft-phase2/22-design-qa-ledger-focus.png`
- Price Runway focus: `/Users/johnlesterescarlan/.codex/visualizations/2026/09/02/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/pricecraft-phase2/23-design-qa-runway-focus.png`
- Mobile implementation: `/Users/johnlesterescarlan/.codex/visualizations/2026/09/02/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/pricecraft-phase2/24-calculator-final-mobile.jpg`
  - Viewport: 390 × 844 CSS px at DPR 1.

All listed comparison images were visually inspected at original resolution.

## Comparison history

### Pass 1

- P1: The Price Runway began below a full-width page header instead of anchoring at the top of the decision workspace.
- P1: The loaded reference state did not expose the ingredient ledger above the fold.
- Fix: Moved the editorial page header and metadata into the main ledger column so the runway starts at the top of the grid.
- Fix: Complete persisted recipes now open the Ingredients section by default.

### Pass 2 and final pass

- Header, workspace rail, ledger, price hierarchy, financial data, and decision CTA align with the selected direction.
- Layout uses the intended dark/light asymmetry, compact mono labels, editorial display type, thin rules, square controls, and signal yellow.
- No remaining actionable P0, P1, or P2 visual mismatches.

## Screen and state coverage

- Calculator: blank state, sample state, live result state, committed decision report, stale/changed state, preset modal entry point.
- Product surfaces: Catalog, Receipt capture, Batch Planner, Sales, Price Drift, Pricing Sheet, Settings, Account, and Pricing Tips.
- Authentication and protected-route loading/redirect states.
- Shared cards, forms, tables/lists, badges, switches, modals, toasts, empty states, loading skeletons, and error presentation.
- Desktop navigation and mobile drawer navigation.

Protected surfaces were inspected using a temporary local preview bypass, which was removed before final validation. Production route protection remains unchanged.

## Interaction and responsive checks

- Loaded the sample recipe and confirmed live pricing updates.
- Committed the price and confirmed the Decision Report, Save, and Share surfaces appear.
- Opened and closed the mobile navigation drawer and confirmed dialog semantics and links.
- Verified the calculator at 1440 × 1024 and 390 × 844.
- Verified protected routes redirect normally after removing the local preview bypass.
- Fresh browser audit after the final interactions: 0 console errors and 0 console warnings.

## Intentional differences from the visual reference

- The mock command/search field and save-status copy were not implemented because PriceCraft has no corresponding behavior; no fake controls were introduced.
- PriceCraft retains its richer purchase-quantity and recipe-quantity costing model, so ingredient rows are vertically denser than the visual reference table.
- Guest navigation exposes only public routes; authenticated users receive the complete product navigation.
- Existing PriceCraft branding, content, calculations, permissions, APIs, and data behavior were preserved.

## Validation

- Lint: 0 errors; 3 pre-existing Fast Refresh warnings in `SettingsContext.tsx`.
- Tests: 51 files passed; 346 tests passed.
- Production build: passed, including PWA generation.

## Final result

passed

---

## Follow-up — blank scroll area and unified theme canvas

### Visual source of truth

- User-reported screenshot: `/var/folders/mh/rxmkm5jd2s1d952s608rwwy40000gn/T/codex-clipboard-39b38206-0d6b-473b-9326-f8536c2d4d3b.png`
- Reproduced pre-fix state: `/Users/johnlesterescarlan/.codex/visualizations/2026/09/02/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/pricecraft-phase2/25-blank-issue-before.jpg`
- Final light state: `/Users/johnlesterescarlan/.codex/visualizations/2026/09/02/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/pricecraft-phase2/32-unified-light-canvas-final.jpg`
- Final dark state: `/Users/johnlesterescarlan/.codex/visualizations/2026/09/02/01a0601f-67ba-7bd0-a7c1-eb58293ae47a/pricecraft-phase2/30-unified-dark-canvas-final.jpg`
- Audit viewport: 1280 × 720 CSS px at DPR 1.

### Root cause and correction

- Closed calculator accordions used a zero-row CSS grid. Their content looked collapsed, but hidden descendants still increased the document scroll height and created a large empty tail below the real shell.
- Closed panels now use the native `hidden` state while remaining mounted, so their form state is preserved without contributing to layout or the accessibility tree.
- Before: document scroll height 1821 px while the application shell was 1332 px.
- After: document and application shell scroll heights both measure 1332 px; all four closed sections compute to `display: none`.
- The theme now sets the root color scheme and full semantic surface token set before paint. Body, root, application shell, sidebar, and topbar resolve to `#ffffff` in Light and `#050505` in Dark.
- Navigation contrast is theme-aware: black active marks on white and signal yellow active marks on black.

### Validation

- Light and dark theme switching verified through Settings and after route reloads.
- Accordion open/close semantics verified with `aria-controls`, `aria-expanded`, labeled regions, and hidden closed content.
- Lint: 0 errors; 3 existing Fast Refresh warnings in `SettingsContext.tsx`.
- Tests: 51 files passed; 346 tests passed.
- Production build: passed, including PWA generation.

### Follow-up result

passed
