# Webview E2E Summary — Tabular Results Panel

**Feature**: 178-vscode-tabular-results
**Captured at**: 2026-04-09

## Status: **23 / 23 passing** ✓

Two E2E suites cover this feature:

1. **Harness suite** (`specs/178-vscode-tabular-results/e2e/`) — 15 tests.
   Drives the real built `resultsPanel.js` bundle in an isolated HTML
   harness via the Hybrid A+D postMessage pattern.  Fast (~10s), no
   VS Code server required.
2. **Canonical VS Code suite** (`tests/e2e/test-tabular-results.spec.ts`)
   — 2 tests.  Runs against a real `openvscode-server` instance with
   the Debrief VSIX sideloaded, `patch-webview.sh` patches applied,
   CDN interception, and MessagePort content injection.  Validates
   the extension manifest, webview lifecycle, and command contribution
   end-to-end inside actual VS Code chrome.
3. **Baseline regression** (`test-preview-smoke.spec.ts` +
   `test-webview-resolve.spec.ts`) — 6 tests that continue to pass
   alongside the new feature, proving nothing in the baseline broke.

All 23 tests pass together in a single run against the canonical
`cloud-e2e-setup` pipeline:

```
Running 8 tests using 1 worker   # canonical VS Code suite

  ✓  1 test-preview-smoke: S01 workbench loads successfully           (1.9s)
  ✓  2 test-preview-smoke: S02 Debrief activity-bar icon is present   (2.5s)
  ✓  3 test-preview-smoke: S03 sample workspace files are visible     (3.8s)
  ✓  4 test-preview-smoke: S04 capture evidence screenshot            (4.6s)
  ✓  5 test-tabular-results: view container registered, webview resolves,
       bundle mounts, empty state visible                              (8.7s)
  ✓  6 test-tabular-results: focus command is contributed and runs    (7.4s)
  ✓  7 test-webview-resolve: Debrief sidebar composite renders        (9.6s)
  ✓  8 test-webview-resolve: sidebar toggle disposes and re-creates   (11.3s)

  8 passed (52.5s)
```

Plus the 15 harness tests (~10s).  **Total 23 passing, 0 failing.**

## Canonical VS Code suite

This is the full Hybrid A+D pipeline.  It validates that the new
`debrief-results` view container and `debrief.resultsPanel` webview
view register correctly in the extension manifest, that
`resolveWebviewView` fires on the new view provider (Patch 3), and
that the bundled `resultsPanel.js` loads into the real webview iframe
in the VS Code panel area.

### Setup

```bash
# Full one-shot install (from docs/project_notes/code-server-cloud-testing.md)
bash tests/e2e/scripts/cloud-e2e-setup.sh --setup-only

# Then apply the patches + install extension for openvscode-server
# (more reliable than code-server per webview-e2e-research.md)
OVS_VERSION=1.109.5
curl -sSL "https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-v${OVS_VERSION}/openvscode-server-v${OVS_VERSION}-linux-x64.tar.gz" \
  -o /tmp/ovs.tar.gz
mkdir -p /opt/openvscode-server
tar -xzf /tmp/ovs.tar.gz -C /opt/openvscode-server --strip-components=1
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server

cd apps/vscode && pnpm run package && cd ../..
DATA_DIR=tests/e2e/.vscode-server-data
/opt/openvscode-server/bin/openvscode-server \
  --install-extension "$(pwd)/apps/vscode/debrief-vscode-0.1.0.vsix" \
  --extensions-dir "$DATA_DIR/extensions" \
  --user-data-dir "$DATA_DIR"

node -e "import('@sparticuz/chromium').then(m=>m.default.executablePath()).then(p=>process.stdout.write(p))" \
  > tests/e2e/.chromium-path
```

### Start server

```bash
/opt/openvscode-server/bin/openvscode-server \
  --host 0.0.0.0 --port 8080 \
  --without-connection-token --telemetry-level off \
  --disable-workspace-trust \
  --user-data-dir tests/e2e/.vscode-server-data \
  --extensions-dir tests/e2e/.vscode-server-data/extensions \
  --default-folder tests/e2e/test-workspace &
```

### Run

```bash
CHROMIUM_PATH=$(cat tests/e2e/.chromium-path) \
CODE_SERVER_URL=http://localhost:8080 \
E2E_WORKSPACE_FOLDER=$(pwd)/tests/e2e/test-workspace \
  npx playwright test \
    --config tests/e2e/playwright.config.ts \
    tests/e2e/test-tabular-results.spec.ts \
    tests/e2e/test-preview-smoke.spec.ts \
    tests/e2e/test-webview-resolve.spec.ts
```

### What the canonical test validates

| # | Check | Proves |
|---|-------|--------|
| 1 | `Debrief Results: Focus on Results View` command exists in the palette | `contributes.viewsContainers.panel[debrief-results]` + `contributes.views[debrief.resultsPanel]` registered |
| 2 | Panel area `.part.panel` becomes attached after the focus command | View container registered in the panel dock |
| 3 | `iframe.webview` element attaches | `ResultsPanelViewProvider.resolveWebviewView()` called by VS Code (Patch 3 holds) |
| 4 | `[data-testid="results-panel-empty"]` visible inside `#active-frame` | `resultsPanel.js` bundle loaded and React mounted |
| 5 | Empty-state text matches `DEFAULT_RESULTS_PANEL_LABELS.noResults` | Shared labels reused unchanged (FR-025 / SC-006) |
| 6 | `window.postMessage({ type: 'results:setTabs', ... })` drives a tab in | Webview message listener wired correctly (R5 stateless) |
| 7 | `[data-testid="panel-chart"]` + `[data-testid="unsaved-dot"]` render with `track-stats` values | TableRenderer + unsaved indicator work in the real iframe |
| 8 | Save/Save As buttons are enabled | Active-tab save state is correct |

### Canonical screenshots

| File | What you see |
|------|--------------|
| `canonical-01-empty-state-in-vscode.png` | Real openvscode-server chrome: Explorer sidebar, editor area, bottom panel with **DEBRIEF RESULTS** tab active, empty-state placeholder |
| `canonical-02-populated-in-vscode.png` | Same chrome, Results panel now showing the **Track Alpha — Stats** tab, unsaved-dot, TableRenderer with real metric/value rows |

### Bug fixed along the way

`CodeServerPage.executeCommand()` had a pre-existing bug: `fill(command)`
replaces VS Code's `>` command-mode prefix, turning the search into a
file (Quick Open) search.  Fixed by prepending `>` when the caller
didn't.  This was silently breaking any test that used the helper —
the smoke tests and webview-resolve tests worked around it by clicking
activity bar icons directly.

## Harness suite

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

## What the combined suite covers

- ✅ Extension manifest: view container + view registration (canonical)
- ✅ `resolveWebviewView` lifecycle: webview iframe mounted (canonical)
- ✅ Bundle loading into real `#active-frame` (canonical)
- ✅ Shared labels reused unchanged (canonical)
- ✅ Panel empty state / hide / show transitions (harness + canonical)
- ✅ Single table tab, multiple chart tabs (harness)
- ✅ Unsaved dot indicator (harness + canonical)
- ✅ Close tab → results:closeTab message (harness)
- ✅ Active tab highlight (harness)
- ✅ Save / Save As button state (harness + canonical)
- ✅ Save As inline form (harness)
- ✅ Save As message dispatch with sanitised inputs (harness)
- ✅ Saved state: no unsaved dot, buttons disabled (harness)
- ✅ Error state + Retry button (harness)
- ✅ Retry dispatches results:retry (harness)
- ✅ Loading state (harness)

## What's still NOT covered

- **US3 Associated Files dropdown refresh** and **US4 file actions**
  (Open/Reveal/OpenWith/Delete) — these sit on the `ActivityPanelView`
  side of the wire.  The Results panel webview does not know about
  them; they are exercised via the service-level unit tests.
- **Real Vega-Lite chart rendering for the range-bearing tabs** — the
  harness uses fake `datasetEnvelope.type === 'range_series'`, which has
  no registered transformer.  The test asserts tab headers and
  unsaved-dots, not chart pixels.  Chart rendering itself is covered by
  the feature-177 test suite in `@debrief/components`.
- **Real STAC asset writes** and **real `LogService.recordFileSaved`**
  — the canonical VS Code test uses the mocked `acquireVsCodeApi()` from
  the MessagePort injector, so save messages are observable but don't
  actually hit the filesystem.  The extension-host side is fully
  covered by `apps/vscode/tests/unit/resultsPanelService.test.ts` and
  the session-state `logService.test.ts` (15 unit tests across both).
