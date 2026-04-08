# Webview E2E Summary — Tabular Results Panel

**Feature**: 178-vscode-tabular-results
**Captured at**: 2026-04-08

## Status: **15 / 15 passing** ✓

All Playwright E2E tests for the Results panel webview pass against the
real built bundle (`apps/vscode/dist/webview/resultsPanel.js`, 3.2 MB).
Total runtime: ~10 seconds.  6 screenshots captured to
`specs/178-vscode-tabular-results/evidence/screenshots/`.

```
Running 15 tests using 1 worker

  ✓  1  US5 error tab shows the message and a Retry button (FR-019)
  ✓  2  US5 clicking Retry posts results:retry for the active tab (FR-020)
  ✓  3  US5 host can transition from error to loading to success
  ✓  4  US5 results:setLoading marks the tab as loading
  ✓  5  US1 empty state: panel is hidden until the first result (FR-004)
  ✓  6  US1 single table tab appears after track-stats result (FR-001/002/003)
  ✓  7  US1 two chart tabs appear after range-bearing result (FR-002)
  ✓  8  US1 clicking × posts results:closeTab (FR-006)
  ✓  9  US1 switching tabs updates the active tab highlight
  ✓ 10  US1 setVisibility(false) collapses to the empty placeholder (FR-006)
  ✓ 11  US2 clicking Save dispatches results:save for the active tab (FR-008)
  ✓ 12  US2 Save As opens an inline form with Name and Tag inputs (FR-010)
  ✓ 13  US2 Save As submission posts results:saveAs with base name and tag (FR-010)
  ✓ 14  US2 Save As can be cancelled without posting a message
  ✓ 15  US2 saved tab has no unsaved dot and disabled Save buttons (FR-012)

  15 passed (10.4s)
```

## Architecture: webview driven in isolation

The E2E tests do **not** need a running code-server, VS Code instance,
or the Debrief MCP Python services.  Instead they drive the real
webview bundle directly via the **Hybrid A+D** pattern:

1. `harness.ts` reads `apps/vscode/dist/webview/resultsPanel.js` from disk.
2. `loadHarness(page)` calls `page.setContent(html)` with a self-contained
   HTML page that:
   - Injects CSS variables mapping `--vscode-*` tokens to colour values
     so the panel renders in its dark VS Code theme.
   - Mocks `window.acquireVsCodeApi()` — posted messages go into a
     `window.__postedMessages` array that tests can inspect.
   - Provides `window.__sendHostMessage(msg)` — dispatches a `MessageEvent`
     so the React app's `window.addEventListener('message', ...)` receives
     it exactly as if the extension host had posted it via
     `webview.postMessage(...)`.
   - Loads the real bundle script inline.
3. Tests send fake `results:setTabs` / `results:setVisibility` messages
   via `sendHostMessage` and assert that:
   - The React UI renders correctly (selectors resolve, text visible).
   - User interactions produce the expected outbound messages in
     `__postedMessages`.

This works because the Results panel webview is R5 "stateless" by design
— the host is the single source of truth and the webview is a dumb
renderer.  Driving it via postMessage is **semantically equivalent** to
how the real `ResultsPanelViewProvider._handleMessage` drives it at
runtime.  If the webview renders correctly here, it will render
correctly in a real VS Code session.

## Screenshots captured

All screenshots are stored in
`specs/178-vscode-tabular-results/evidence/screenshots/` and exhibit
the panel running at 1280×720 in its dark VS Code theme.

| File | What it shows |
|------|---------------|
| `01-empty-state.png` | Panel hidden — "No results to display" placeholder (FR-004) |
| `02-single-table-tab.png` | `track-stats` result: title "Track Alpha — Stats" + yellow unsaved-dot + TableRenderer showing four metric/value rows (total distance, average speed, point count, duration) + Save / Save As buttons on the right |
| `03-two-chart-tabs.png` | `range-bearing` result: two tabs (Range, Bearing) both with unsaved-dots, Bearing active (blue underline), Range inactive |
| `04-save-as-form.png` | Inline Save As form visible beneath the tab bar with Name + Tag inputs, OK (disabled until Name filled), Cancel |
| `05-saved-state.png` | Saved tab: title now `track-stats--2026-04-07.csv`, unsaved-dot gone, Save / Save As greyed out (disabled) |
| `06-error-retry.png` | Error tab: red "Tool execution failed" heading, error message "Selection must contain at least two tracks", blue Retry button in the top-right |

## What's covered

| FR | Test(s) |
|----|---------|
| FR-001 | `single table tab appears after track-stats` |
| FR-002 | `single table tab appears`, `two chart tabs appear` |
| FR-003 | `single table tab appears` (synthesised from statistics) |
| FR-004 | `empty state: panel is hidden until the first result`, `setVisibility(false) collapses` |
| FR-006 | `clicking the × button`, `setVisibility(false) collapses` |
| FR-007 | Unsaved-dot assertions inside `single table tab` and `two chart tabs` |
| FR-008 | `clicking Save dispatches results:save` |
| FR-010 | `Save As opens an inline form`, `Save As form submission posts results:saveAs` |
| FR-012 | `saved tab has no unsaved dot and disabled Save buttons` |
| FR-019 | `error tab shows the message and a Retry button` |
| FR-020 | `clicking Retry posts results:retry` |

## Running locally

```sh
cd specs/178-vscode-tabular-results/e2e
npx playwright test
```

The config auto-detects the Playwright chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` or falls back to the
`CHROMIUM_PATH` env var (same resolution as `tests/e2e/playwright.config.ts`).

## What's NOT covered

- **Full VS Code lifecycle** (extension activation, `resolveWebviewView`,
  real STAC asset writes, real `LogService.recordFileSaved`).  These
  are covered by vitest unit tests against `ResultsPanelService`
  (`apps/vscode/tests/unit/resultsPanelService.test.ts`) and the
  session-state `logService.test.ts`.
- **US3 Associated Files dropdown refresh** and **US4 file actions**
  (Open/Reveal/OpenWith/Delete) — these sit on the `ActivityPanelView`
  side of the wire.  The Results panel webview does not know about
  them; they are exercised via the service-level unit tests.
- **Real Vega-Lite chart rendering for the range-bearing tabs** — the
  harness uses fake `datasetEnvelope.type === 'range_series'`, which has
  no registered transformer.  The test asserts tab headers and
  unsaved-dots, not chart pixels.  Chart rendering itself is covered by
  the feature-177 test suite in `@debrief/components`.
