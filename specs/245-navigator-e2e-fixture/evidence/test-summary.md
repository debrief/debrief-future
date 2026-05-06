---
feature: "245-navigator-e2e-fixture"
captured_at: "2026-05-06T07:06:08Z"
git_sha: "3b7b165"
tests_passed: 174
tests_failed: 0
tests_skipped: 41
coverage_pct: null
---

# Test Summary: Backlog Navigator E2E Test Fixture Decoupling

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 215 (Playwright + Vitest) |
| Passed | 174 (49 Playwright + 125 Vitest) |
| Failed | 0 |
| Skipped | 41 (viewport-gated mobile tests; behaviour identical to pre-refactor) |
| Coverage | n/a (not measured for this refactor) |

## Test Breakdown

### Playwright E2E — `apps/backlog-navigator/e2e/`

Run via `node run-playwright.mjs` against the locally built dev preview.
Browser: bundled `@sparticuz/chromium`.

| Project          | Passed | Skipped |
|------------------|--------|---------|
| desktop          | 12     | 0       |
| mobile-iphone    | 22     | 0       |
| tablet-portrait  | 12     | 14      |
| tablet-landscape | 3      | 27      |
| **Total**        | **49** | **41**  |

Skipped tests are gated by `if ((page.viewportSize()?.width ?? 0) >= 1024)
test.skip(...)` and friends — behaviour unchanged from the live-coupling
implementation; they are skipped because the test bodies target the
mobile-only card layout.

### Vitest — `apps/backlog-navigator/`

Run via `pnpm --filter @debrief/backlog-navigator test`.

| Suite                                                   | Tests |
|---------------------------------------------------------|-------|
| src/parser/__tests__/parseBacklog.test.ts               | 9     |
| src/parser/__tests__/liveBacklog.roundtrip.test.ts      | 2     |
| src/__tests__/types.test.ts                             | 8     |
| src/state/__tests__/pendingEdits.test.ts                | 5     |
| src/state/__tests__/speckitCommand.test.ts              | 11    |
| src/state/__tests__/deploymentMode.test.ts              | 4     |
| src/format/__tests__/summary.test.ts                    | 2     |
| src/components/editors/__tests__/CellEditors.test.tsx   | 14    |
| src/components/mobile/__tests__/* (BottomSheet, ItemCard, StickyPushBar, byteParity*) | 37 |
| src/editors/__tests__/EditorOverlayProvider.test.tsx    | (incl. above) |
| src/pwa/__tests__/registerSW.test.tsx                   | 6     |
| **Total**                                               | **125** |

Of particular note:
- `liveBacklog.roundtrip.test.ts` (2 tests) **continues to read the live
  repo-root `BACKLOG.md`** and passes — Story 3 acceptance criterion
  preserved.

## Key Scenarios Verified

- **SC-001 (live drift no longer breaks CI)**: All 14 spec files (5
  desktop, 9 mobile) load the hand-curated fixture. A sweep of the live
  `BACKLOG.md` would not affect any E2E assertion.
- **SC-002 (suite < 60s)**: Full Playwright run (90 tests, including
  skipped) completed in 32.6s — well under the 60s budget.
- **SC-003 (fixture coverage)**: 12 fixture rows cover one row per
  workflow state (`proposed`, `approved`, `clarified`, `specified`,
  `implementing`, `complete`, `blocked`, `rejected`, `needs-interview`),
  one per category (Feature, Tech Debt, Enhancement, Bug, Infrastructure,
  Documentation, Research Spike), and the full parser edge-case grammar
  on row 010 (`\|` escape + Markdown link + `[[E02]]` epic tag).
- **SC-004 (Vitest round-trip preserved)**: `pnpm test` passes;
  `liveBacklog.roundtrip.test.ts` still resolves to the live BACKLOG.md
  via `'..', '..', '..', '..', '..', 'BACKLOG.md'`.
- **SC-005 (zero live references in `e2e/`)**: Verified by
  `grep -r "readFileSync.*BACKLOG" apps/backlog-navigator/e2e/` returning
  zero matches. Captured in `evidence/validation-output.txt`.
- **No-op-free status edits**: The two defensive
  `beforeStatus.includes('approved') ? 'specified' : 'approved'`
  branches in `interaction.mobile.spec.ts` and `push.mobile.spec.ts` were
  replaced with deterministic `selectOption('approved')` against fixture
  row 001 (always `proposed`).

## Known Issues

None. The 41 skipped Playwright tests are intentional viewport gates
inherited from the original specs (e.g. mobile-only flows skipped on
1024-px viewports).

## Environment

- Runner: Playwright 1.57 + Vitest 1.6
- Browser: Chromium via `@sparticuz/chromium`
- Branch: `claude/implement-speckit-245-WeY05`
- Working tree: `3b7b165` (HEAD at capture time)
- Node: v22.22.2
