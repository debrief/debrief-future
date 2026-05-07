---
feature: "247-lazy-mobile-bundle"
captured_at: "2026-05-07T16:06:00Z"
git_sha: "fddf210"
tests_passed: 152
tests_failed: 0
tests_skipped: 6
coverage_pct: null
---

# Test Summary: Lazy-load Backlog Navigator mobile component tree

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 158 (effective) |
| Passed | 152 |
| Failed | 0 |
| Skipped | 6 (Playwright project-matrix branches: each scenario runs only on the viewport class for which it is meaningful) |
| Coverage | n/a (per-feature coverage not gated by CI) |

## Test Breakdown

### Vitest — `@debrief/backlog-navigator` (138 tests, all green)

| Suite | Tests | Status |
|-------|-------|--------|
| `src/__tests__/chunkErrorBoundary.test.tsx` | 11 | All pass |
| `src/__tests__/lazyBoundary.test.tsx` | 3 | All pass |
| `src/editors/__tests__/EditorOverlayProvider.test.tsx` | 9 | All pass (regression check after gating editor mount on `isMobile`) |
| `src/components/mobile/__tests__/CardList.test.tsx` | 9 | All pass |
| `src/components/mobile/__tests__/ItemCard.test.tsx` | 11 | All pass |
| `src/components/mobile/__tests__/BottomSheet.test.tsx` | 10 | All pass |
| `src/components/mobile/__tests__/StickyPushBar.test.tsx` | 7 | All pass |
| `src/components/mobile/__tests__/byteParityBottomSheet.test.tsx` | 5 | All pass |
| `src/components/mobile/__tests__/byteParityDescription.test.tsx` | 4 | All pass |
| `src/components/editors/__tests__/CellEditors.test.tsx` | 14 | All pass |
| `src/state/__tests__/push.test.ts` | 9 | All pass |
| `src/state/__tests__/pendingEdits.test.ts` | 5 | All pass |
| `src/state/__tests__/deploymentMode.test.ts` | 4 | All pass |
| `src/state/__tests__/speckitCommand.test.ts` | 11 | All pass |
| `src/parser/__tests__/parseBacklog.test.ts` | 9 | All pass |
| `src/parser/__tests__/liveBacklog.roundtrip.test.ts` | 2 | All pass |
| `src/pwa/__tests__/registerSW.test.tsx` | 6 | All pass |
| `src/__tests__/types.test.ts` | 8 | All pass |
| `src/format/__tests__/summary.test.ts` | 2 | All pass |

### Node test runner — bundle-budget guard (7 tests, all green)

`scripts/__tests__/check-bundle-size.test.mjs` — exercises the new manifest-aware contract:

| Test | Status |
|------|--------|
| within-budget single entry → exit 0 | Pass |
| over-budget single entry → exit 1 | Pass |
| manifest with zero `isEntry: true` entries → exit 2 | Pass |
| manifest with multiple `isEntry: true` entries → exit 2 | Pass |
| missing manifest file → exit 2 | Pass |
| lazy chunks listed alongside entry with `(entry)` / `(lazy)` annotations | Pass |
| missing baseline file → exit 2 | Pass |

### Playwright E2E — `apps/backlog-navigator/e2e/mobile/lazy-mobile-chunk.mobile.spec.ts` (6 effective, all green)

Run: `cd apps/backlog-navigator && CLAUDE_CODE=1 node run-playwright.mjs lazy-mobile-chunk`

| Project | Scenario | Status |
|---------|----------|--------|
| `mobile-iphone` (390×844) | cold mobile load shows skeleton then card list | Pass |
| `mobile-iphone` | chunk-fetch failure shows recovery banner with reload | Pass |
| `mobile-iphone` | cold desktop load never requests mobile chunk | Skipped (project is < 1024) |
| `mobile-iphone` | viewport resize across breakpoint | Skipped (starts mobile) |
| `tablet-portrait` (768×1024) | cold mobile load shows skeleton then card list | Pass |
| `tablet-portrait` | chunk-fetch failure shows recovery banner with reload | Pass |
| `tablet-portrait` | cold desktop load never requests mobile chunk | Skipped (project is < 1024) |
| `tablet-portrait` | viewport resize across breakpoint | Skipped (starts mobile) |
| `tablet-landscape` (1366×1024) | cold desktop load never requests mobile chunk | Pass |
| `tablet-landscape` | viewport resize across breakpoint | Pass |
| `tablet-landscape` | cold mobile load | Skipped (project is ≥ 1024) |
| `tablet-landscape` | chunk-fetch failure | Skipped (project is ≥ 1024) |

## Key Scenarios Verified

- **Lazy boundary fires on cold mobile, not on cold desktop.** The `tablet-landscape` project (≥ 1024 px) opens the navigator and observes its network panel — zero requests match the mobile-chunk URL pattern. The `mobile-iphone` and `tablet-portrait` projects observe the skeleton then the eventual card list. This jointly proves FR-001 (no mobile code in the desktop entry) and the sibling positive case for mobile.
- **Chunk-fetch failure surfaces the recovery banner.** Routing the `CardList-*.js` chunk URL to a synthetic 404 (emulating a stale-deploy URL after Workbox swaps in a new precache entry) reliably triggers the `ChunkErrorBoundary`. The `Reload` button is visible and exposed via `data-testid="chunk-error-reload"`. This proves FR-005 and Constitution Article I.3 (no silent failures).
- **Viewport resize crosses the breakpoint cleanly.** Starting at 1366×1024, the test resizes to 600×800; the `useIsMobile` matchMedia signal flips and the lazy `CardList` chunk is fetched on demand. Proves FR-004 / US3 acceptance scenario 1.
- **EditorOverlayProvider regression suite is unchanged.** The provider's 9-test suite (rotation guards, dirty-edit prompts, save/cancel paths) all pass after gating `<BottomSheetEditor>` and `<DescriptionEditorScreen>` on `isMobile` and wrapping them in `<Suspense>`. Tests pass `isMobileOverride={true}` so the lazy path is exercised but the assertions target the context API and discard-confirm modal — both unchanged.
- **Bundle-budget guard behaves correctly across six contract cases.** The new `check-bundle-size.mjs` exits 0 within budget, 1 over budget, and 2 on every documented configuration error (zero-entry manifest, multi-entry manifest, missing manifest, missing baseline) — proving the CLI contract recorded in `contracts/bundle-budget-cli.md`.

## Known Issues

- The 6 Playwright skips are intentional: each scenario runs only on the viewport class for which it is meaningful (`< 1024` for mobile cold-load and chunk-failure recovery; `≥ 1024` for desktop chunk-absence and resize-from-desktop). This is the same project-matrix pattern used by the rest of the navigator's mobile suite (#244).
- Pre-existing failures in `services/session-state` and `apps/vscode` (unrelated to #247) caused by missing `@debrief/utils` build artefact — confirmed reproducible on the base branch via `git stash && pnpm lint`.

## Environment

- Runner: vitest 1.6.1, node:test (Node 20), Playwright 1.58 with `@sparticuz/chromium` 143
- Branch: `claude/implement-speckit-247-ugfSI` (active feature `247-lazy-mobile-bundle`)
- Date: 2026-05-07
