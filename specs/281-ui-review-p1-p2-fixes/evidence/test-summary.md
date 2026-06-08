---
feature: "281-ui-review-p1-p2-fixes"
captured_at: "2026-06-08T21:55:00Z"
git_sha: "92890925"
tests_passed: 2399
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: UI Review Follow-up — Remaining P1 & All P2 Fixes

## Results

| Metric | Value |
|--------|-------|
| Component unit tests (vitest) | 2399 passed / 4 skipped |
| Web-shell E2E (Playwright) | 13 specs across 3 new suites — all passing |
| P1.4 flake proof | 40/40 first-attempt passes (4 tests × 10 repeats, `retries:0`) |
| Lint (ruff + ESLint) | 0 errors |
| Typecheck (pyright + tsc, all workspaces) | 0 errors |
| Failed | 0 |

## Test Breakdown

### US1 (P1.3) — HC-light header link contrast — `ui-review-contrast.spec.ts`

| Test | Status |
|------|--------|
| HC-light header links — 0 axe `color-contrast` violations (SC-001) | Pass |
| Header link screenshots — four theme variants | Pass |

### US2 (P1.4) — properties-screenshots reliability — `properties-screenshots.spec.ts`

| Test | Status |
|------|--------|
| 4 tests × 10 repeats, `retries:0` — 100% first-attempt pass (SC-002) | Pass (40/40) |

### US3 (P2.1) / US4 (P2.2) — analysis layout — `ui-review-layout.spec.ts`

| Test | Status |
|------|--------|
| SC-003 @ 1920px: 0 ellipsised tool labels, rail in wide band | Pass |
| SC-004 @ 1366px: rail ~280px target, map keeps majority | Pass |
| 1440px: rail in middle band, map majority | Pass |
| FR-011: a saved custom layout is respected verbatim | Pass |
| SC-005: Properties reachable at 1280×720 with feature selected | Pass |
| Properties section exists in ActivityPanel at 1280×720 | Pass |

### US5 (P2.3) / US6 (P2.4) — catalog — `ui-review-catalog.spec.ts`

| Test | Status |
|------|--------|
| Collapse Timeline control is discoverable (label + tooltip) | Pass |
| Collapse Map control is discoverable (label + tooltip) | Pass |
| Collapse the preview row → exercise list grows, restore returns it (SC-006) | Pass |
| Collapsed state survives a page reload (SC-006 persistence / FR-016) | Pass |
| S/M/L buttons are visible | Pass |
| S/M/L produce visibly distinct row heights (SC-007) | Pass |
| Thumbnail size choice survives a reload (SC-007 persistence / FR-020) | Pass |

### Unit suites (vitest, `@debrief/components`)

| Suite | Status |
|-------|--------|
| `defaultLayout.test.ts` — discrete bands, map majority, purity (T012) | 20 pass |
| `layoutPersistence.test.ts` — v2 legacy layout discarded at v3 (T013) | 9 pass |
| `ActivityPanel.shortHeight.test.tsx` — never persists / respects controlled / no-op ≥900px (T019) | 13 pass |
| `thumbnailSizePreference.test.ts` — union narrowing + fallback to 'small' (T028) | 15 pass |
| `ExerciseListView.test.tsx` — `virtualizer.measure()` gated to `[rowHeight]` (T029) | 24 pass |

## Key Scenarios Verified

- **SC-001 (contrast)**: An axe-core audit against the *real* themed root in HC-light proved the original change regressed contrast to 1.22:1 (dark link on the fixed dark title bar); the corrected bright HC token measures ~8.6:1, clearing WCAG AAA 7:1.
- **SC-002 (flake)**: 40 consecutive first-attempt passes with retries disabled — the row-click is now gated on actionability before clicking, and the 15s form wait is preserved so genuine breakage still fails loudly.
- **SC-003/SC-004 (responsive layout)**: rail width follows discrete bands (~280px ≤1366, ~320px middle, ~380px ≥1600) with the map always keeping the majority; no tool-label ellipsis at the wide band.
- **FR-011 (saved layout respected)**: a real app-saved resolved layout, widened to 30%, round-trips through `LayoutConfig.fromResolved` and is applied verbatim after reload.
- **SC-005 (short height)**: at 1280×720 with a feature selected, the ActivityPanel auto-collapses upper sections so Properties is reachable — without persisting and without overriding a controlled `collapseState`.
- **SC-006 (catalog collapse)**: the whole preview row collapses via discoverable controls, the list reclaims the space, and the collapsed state survives a reload (immediate save + mount-time reconciliation).
- **SC-007 (thumbnail resize)**: S/M/L produce visibly distinct row heights via a `[rowHeight]`-gated `virtualizer.measure()`, and the choice persists across reload.

## Known Issues

- **`interaction.gif` omitted**: GIF capture requires `ffmpeg`, which is not available in this cloud session (the shared `videoToGif` helper / existing GIF spec skip when ffmpeg is missing). The collapse + resize flows are captured as static stills (`catalog-collapse.png`, `thumbnail-sizes.png`); no behaviour is left unverified.
- The Python perf test `test_10k_feature_collection_validates_within_budget` is environment-load sensitive (0.51s vs a 0.5s budget under parallel load); it passes in isolation and is unrelated to this frontend-only feature.

## Environment

- Runner: vitest (unit) + Playwright with bundled `@sparticuz/chromium` (E2E)
- Branch: `claude/nifty-keller-4ex7d0`
- Date: 2026-06-08
