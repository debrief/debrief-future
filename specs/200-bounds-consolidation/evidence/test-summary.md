---
feature: "200-bounds-consolidation"
captured_at: "2026-04-20T14:36:54Z"
git_sha: "b3d1d99"
tests_passed: 2264
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary: Consolidate bounds utilities into @debrief/utils

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 2265 |
| Passed | 2264 |
| Failed | 0 (in this feature's scope — see "Known Issues") |
| Skipped | 1 + 1 xfailed (Python) |
| Coverage | not measured (vitest default — no --coverage flag run) |

## Test Breakdown

### `@debrief/utils` (the package this feature changes)

| Suite | Result |
|-------|--------|
| `tests/bounds.test.ts` | 29 passed |
| `tests/interval.test.ts` | 36 passed |
| `tests/csv.test.ts` | 35 passed |
| `tests/errorMessages.test.ts` | 24 passed |
| `tests/duration.test.ts` | 24 passed |
| `tests/temporal.test.ts` | 15 passed |
| `tests/datasetSynthesis.test.ts` | 7 passed |
| `tests/errors.test.ts` | 4 passed |
| `tests/assert.test.ts` | 2 passed |
| **Total** | **176 passed / 0 failed** |

Of the 29 `bounds.test.ts` assertions, **15 are new in this feature**:

| Task | New assertions | Covers |
|------|-----------------|--------|
| T004 narrowing-gate shape-mismatch | 5 | FR-007, SC-009, C7 |
| T005 null-geometry regression | 4 | FR-002, SC-006, C5 |
| T007 per-geometry-type correctness | 6 | FR-008, SC-007, C6 |

### `debrief-vscode` (the consumer this feature updates)

| Suite | Result |
|-------|--------|
| All non-bounds unit tests | 340 passed |
| `tests/unit/bounds.test.ts` | **deleted** (T011 — coverage subsumed by `@debrief/utils/tests/bounds.test.ts`) |

### Python (`uv run pytest`)

| | Result |
|-|--------|
| Total | 1748 passed, 1 skipped, 1 xfailed |

Python suites are untouched by this feature; running confirms no cross-language regression.

### Lint (`pnpm lint` + `uv run ruff check .`)

- TypeScript: passes with 17 pre-existing warnings (`no-restricted-syntax` on unrelated call sites in `executeTool.ts`, `extension.ts`, `catalogOverviewPanel.ts`, `resultsPanelService.ts`, `stacService.ts`, `activityPanelView.ts`). Zero errors.
- Python: `All checks passed!`

### Typecheck (`pnpm -r typecheck` + `uv run pyright`)

- TypeScript: all 11 workspace projects with typecheck scripts pass. `apps/vscode` also passes via direct `tsc --noEmit`. Zero errors.
- Python: `0 errors, 0 warnings, 0 informations`.

## Key Scenarios Verified

- **SC-001 / SC-002 — single canonical implementation**: grep under `shared/utils/` + `apps/` returns exactly one `calculateBounds` and one `mergeBounds` definition; `apps/vscode` contains no `bounds.ts` or `bounds.test.ts`. Evidence: `canonical-grep.txt`.
- **SC-006 — null-geometry regression lives at the canonical location**: T005 tests exercise mixed null-geometry inputs, undefined-geometry inputs, and all-null inputs — all pass with zero throws.
- **SC-007 — every supported geometry type produces correct bounds**: T007 tests cover Point / LineString / Polygon / MultiPoint / MultiLineString / MultiPolygon in isolation; each returns the correct four-number tuple. This is what makes FR-008's "no silent miss in fitToSelection" durable.
- **SC-009 — narrowing gate is reviewable and cast-safe**: `coerceCoordinates` is the single named helper with Article XV.5 anchor comment; `grep -nE "\bany\b|as unknown as"` shows zero non-comment matches. Evidence: `narrowing-gate-source.md`.
- **FR-006 — cast-free call sites**: `pnpm -r typecheck` passes; `mapPanel.ts:1250` has no `as`-cast on `parseResult.features`. Evidence: `typecheck-output.txt`.
- **FR-008 — fitToSelection honours every geometry type**: rewrite delegates to the tested `calculateBounds`; coverage at the utility level guarantees every type flows through. Evidence: `selection-zoom-smoke.md`, `before-after-fittoselection.md`.

## Known Issues

- **`apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts::T028 read-only filesystem`** fails in the current execution environment (Claude Code sandbox runs as `root`, so `chmod 0o555` on the parent directory does not effectively block writes — the `fs.rename` call therefore does not throw `ReadOnlyFilesystemError`). Verified pre-existing: the same failure reproduces on `main` before any change in this feature. This is an environment-specific assertion, not a code issue introduced by #200.

## Environment

- Runner: vitest (TypeScript), pytest (Python).
- Branch: `claude/implement-speckit-200-Rg33g`.
- Date: 2026-04-20.
- Commands run (in order):
  1. `uv run ruff check .`
  2. `uv run pyright`
  3. `pnpm lint`
  4. `pnpm -r typecheck` + `apps/vscode` direct `tsc --noEmit`
  5. `uv run pytest`
  6. `pnpm --filter '!@debrief/web-shell' --filter '!@debrief/spec-navigator' test`
