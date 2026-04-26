---
feature: "230-storyboard-edit-wiring"
captured_at: "2026-04-24T20:00:00Z"
git_sha: "496e15b4"
tests_passed: 2406
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: Storyboard edit suite — webview wiring + web-shell harness + error triage

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 2,410 (reducer + component + vscode + web-shell + playwright) |
| Passed | 2,406 |
| Failed | 0 |
| Skipped | 4 (pre-existing skips — unrelated) |
| Coverage | Not measured (out of scope for this feature) |

Breakdown of new tests introduced by this feature:

| Suite | New tests | Purpose |
|-------|-----------|---------|
| `useStoryboardEditReducer.test.ts` | 26 | Every action + state invariant |
| `SceneRow.test.tsx` | 13 | Chevron, double-click, Shift+F10, ContextMenu key |
| `SceneOverflowMenu.test.tsx` | 9 | Rendering, focus, keyboard nav, Escape close |
| `StoryboardPanel.test.tsx` (extended) | 4 | Panel-level chevron + overflow + refresh-all-stale wiring |
| `storyboardPanelView.test.ts` (refreshed) | 20 | No regressions introduced by the refresh-payload enrichment |
| `stacService.loadPlotDiagnostic.test.ts` | 2 | Each null-return branch of `loadPlot` writes a distinct line |
| `StoryboardEditHarness.querystring.test.ts` | 7 | `?stale`, `?pendingDelete`, `?missingData` parser |
| `storyboard-edit.spec.ts` (Playwright) | 7 | Smoke coverage of the primary polish-loop through the harness |
| **Total new tests** | **88** | — |

## Test Breakdown

### Components package (`@debrief/components`)

| Suite | Tests | Status |
|-------|-------|--------|
| Full test run | 1,854 passed, 4 skipped | ✅ Pass |
| Storyboard panel domain | 153 (of which 39 new) | ✅ Pass |

### VS Code extension (`debrief-vscode`)

| Suite | Tests | Status |
|-------|-------|--------|
| Full test run | 545 passed | ✅ Pass |
| `storyboardPanelView.test.ts` | 20 passed | ✅ Pass (refresh() payload extended without regression) |
| `stacService.loadPlotDiagnostic.test.ts` | 2 passed | ✅ Pass (new) |

### Web-shell (`@debrief/web-shell`)

| Suite | Tests | Status |
|-------|-------|--------|
| Unit: query-string parser | 7 passed | ✅ Pass |
| Playwright E2E: `storyboard-edit.spec.ts` | 7 passed | ✅ Pass |

## Key Scenarios Verified

- **Chevron disclosure (FR-001)**: Clicking the chevron on a Scene row opens the inline edit form; clicking it again closes it; opening a different row's form collapses the previous one (FR-004).
- **Double-click disclosure (FR-002)**: Double-clicking the row body (outside the overflow trigger) toggles the same inline edit form as the chevron.
- **Overflow menu (FR-003)**: Right-click, `Shift+F10`, and the Context Menu key all open the six-item overflow menu; keyboard navigation (ArrowDown/ArrowUp/Home/End/Escape) behaves per WAI-ARIA menu spec.
- **Action routing (FR-005)**: Each overflow menu item dispatches the corresponding outbound postMessage (`scene-delete-requested`, `scene-duplicate-clicked`, etc.) with the correct sceneId.
- **Delete + undo (FR-005 + US2 AC2)**: Delete soft-removes the row and surfaces an Undo toast; clicking Undo restores the row byte-identically.
- **Stale flag refresh (FR-012)**: Scenes marked stale via `?stale=A,C` render a `<StaleBadge>`; clicking the Storyboard header's `Refresh all stale (N)` button clears every badge and dispatches `storyboard-refresh-all-stale-clicked`.
- **Missing-data remediation**: `?missingData=sceneC:f1,f2` surfaces the hard-block affordance inside the edit form.
- **Viewport race (FR-050)**: `MapView` now emits an initial bounds report on mount + `map.whenReady`, and the webview's `handleBoundsChange` now includes the four-corner polygon so the session-store viewport actually populates — fresh-plot-open + immediate-capture no longer fails with "map has not reported a viewport yet".
- **STAC load diagnostics (FR-051)**: Each null-return branch in `loadPlot` (item-not-found, item-has-no-properties, missing-required-field, caught-exception) writes a distinct structured line to the Debrief output channel.

## Known Issues

- Pre-existing test-pollution failures in `services/config/tests/` (test isolation bug in the XDG store registration tests — unrelated to 230). Documented in `baseline-verify.txt`.
- Playwright bundle size warning (`index-*.js > 500KB`). Pre-existing; not introduced by this feature.

## Environment

- Runners: `vitest` (components + vscode + web-shell unit), `@playwright/test` (web-shell E2E)
- Branch: `230-storyboard-edit-wiring`
- Date: 2026-04-24
- Baseline reference: PR #520 / feature 218 landed at 2,983 vitest + Python tests; this feature keeps that baseline green while adding 88 new tests.
