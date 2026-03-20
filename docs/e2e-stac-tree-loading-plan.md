# E2E Plan: STAC Store Tree Loading in CI

**Status:** Assigned for investigation
**Context:** 20 of 28 VS Code E2E tests fail in CI because `openPlotViaStacTree()` times out (~42s)

---

## What We Know

### Symptom

Every E2E test that calls `codeServerPage.openPlotViaStacTree('Exercise Alpha')` fails with a timeout in CI (GitHub Actions). Tests that only use `codeServerPage.revealSidebar()` pass reliably.

| Pattern | Result | Example |
|---------|--------|---------|
| `revealSidebar()` only | PASS (11-21s) | `test-activity-panel-screenshot` |
| `openPlotViaStacTree()` | FAIL (~42s) | `test-load-display`, `test-catalog-browse`, `test-selection-sync` |

The 42s timeout matches the sum of the method's internal timeouts: `focusStacView` (5s) + `waitForExtensionReady` (10s) + `ensureStacPaneExpanded` (10s) + store row wait (10s) ≈ 35-45s.

### What `openPlotViaStacTree` Does

The method (`tests/e2e/models/code-server-page.ts:146-237`) performs this sequence:

1. **focusStacView()** — clicks "STAC STORES" pane header or Explorer icon
2. **waitForExtensionReady()** — polls until "Loading stores" text disappears
3. **ensureStacPaneExpanded()** — checks `aria-expanded`, clicks header if collapsed
4. **Wait for store row** — looks for `.monaco-list-row:has-text("STAC:")`
5. **If no row → seedConfigAndReload()** — writes config via terminal, reloads window
6. **Expand store** → **find plot node** → **click** → **wait for webview iframe**

### Where It Likely Stalls

The STAC tree view (`debrief.stacExplorer`) is contributed to VS Code's Explorer sidebar. For it to populate:

1. Extension must activate (triggered by workspace contains `catalog.json` or explicit command)
2. `ConfigService.loadConfig()` must find `~/.config/debrief/config.json`
3. `StacTreeProvider.getChildren()` must read the store path and parse `catalog.json`
4. VS Code must render the tree rows into `.monaco-list-row` elements

In CI, the config is pre-seeded by the workflow (`e2e.yml:147-152`) with `GITHUB_WORKSPACE`-relative paths. The server starts with `--default-folder` pointing to the test workspace. But the **extension activation timing** vs **tree view rendering** is the likely gap — the STAC STORES pane may not be visible or expanded when the test starts probing.

### CI Environment Details

- **Server:** openvscode-server v1.109.5 on Ubuntu (GitHub Actions runner)
- **Config path:** `~/.config/debrief/config.json`
- **Store path:** `${GITHUB_WORKSPACE}/tests/e2e/test-workspace/local-store`
- **Workspace:** `${GITHUB_WORKSPACE}/tests/e2e/test-workspace`
- **Patches applied:** CSP hash, origin hash guard, visibility gate (`patch-webview.sh`)
- **Extension:** installed from VSIX into `/tmp/ovs-data`

### What Works

The `revealSidebar()` method succeeds because it:
1. Opens the command palette (`Ctrl+Shift+P`)
2. Runs "Debrief: Focus on Debrief View"
3. This triggers `resolveWebviewView()` which creates the sidebar webview
4. The MessagePort interceptor (installed by the fixture) injects the activity panel HTML

This works because it bypasses the STAC tree entirely — it goes directly to the Debrief sidebar container where the webview view lives.

---

## Three Possible Solutions

### Option A: Fix `openPlotViaStacTree` Reliability

**Approach:** Debug and harden the existing method to work in CI.

**Investigation steps:**
1. Add diagnostic screenshots at each stage of `openPlotViaStacTree` to identify exactly where it stalls (focusStacView? ensureStacPaneExpanded? store row wait?)
2. Check the openvscode-server log (`/tmp/ovs.log` in CI) for extension activation errors or config read failures
3. Verify the STAC STORES pane is actually contributed to the Explorer sidebar (vs a custom view container)
4. Test whether `--default-folder` causes the workspace to be in a different location than expected

**Likely fixes:**
- The pane header text might differ from `"STAC STORES"` in the CI build (case or whitespace mismatch)
- Extension activation may depend on a workspace-contains activation event that doesn't fire with `--default-folder`
- The `focusStacView()` fallback chain may not reach the right view container
- Config path resolution may differ between global-setup (Node.js `homedir()`) and the server process (runner's `$HOME`)

**Pros:** Fixes all 20 failing tests; uses real STAC loading path (high confidence)
**Cons:** Root cause may be environment-specific; potentially fragile across openvscode-server versions

### Option B: Open Plots via Command Palette Instead of Tree Navigation

**Approach:** Replace tree-click interaction with a VS Code command that opens a plot by URI.

The extension already registers a `debrief.openPlot` command. Instead of navigating the tree:

```typescript
async openPlotViaCommand(plotUri: string): Promise<void> {
  await this.executeCommand('Debrief: Open Plot');
  // Or directly invoke the command via the terminal:
  //   code --command debrief.openPlot --args stac://local-store/exercise-alpha/item.json
}
```

**Implementation:**
1. Add a `debrief.openPlotByUri` command to the extension that accepts a URI argument (if not already present)
2. In E2E tests, invoke it via the command palette or `page.evaluate` with `vscode.commands.executeCommand`
3. Alternatively, use the terminal to run: `openvscode-server --open-url 'stac://local-store/exercise-alpha/item.json'`

**Pros:** Bypasses all tree UI navigation; deterministic; no timing issues with pane expansion
**Cons:** Doesn't test the STAC tree UI itself; requires extension to support command-based opening; `executeCommand` may not be accessible from Playwright's page context

### Option C: Pre-load Plot Data in the Webview Fixture

**Approach:** Extend the Hybrid A+D content injection to include plot data, so tests don't need the STAC tree at all.

The base fixture (`tests/e2e/fixtures/base.ts`) already injects activity panel HTML via the MessagePort interceptor. Extend this to also inject a pre-loaded map view:

```typescript
function buildContentQueue(): Array<{ html: string; allowScripts: boolean }> {
  const queue = [];
  // Activity panel with pre-loaded features (no STAC fetch needed)
  if (hasWebviewBundle('activityPanel')) {
    queue.push({
      html: generateWebviewHtml('activityPanel', {
        preloadedFeatures: loadTestGeoJSON(),
      }),
      allowScripts: true,
    });
  }
  // Map with pre-loaded plot data
  if (hasWebviewBundle('mapView')) {
    queue.push({
      html: generateWebviewHtml('mapView', {
        preloadedPlot: loadTestStacItem(),
      }),
      allowScripts: true,
    });
  }
  return queue;
}
```

**Implementation:**
1. Modify `generateWebviewHtml()` in `helpers/extension-content.ts` to accept initial state
2. Inject GeoJSON features and STAC item metadata as `window.__DEBRIEF_PRELOAD__`
3. Modify the React components (or the webview bootstrap) to read preloaded data if present
4. Tests that need "a plot open" would just reveal the sidebar — features would already be loaded

**Pros:** Fastest test execution; no dependency on STAC tree or config at all; tests focus on UI behavior
**Cons:** Doesn't exercise the real data loading pipeline; requires component changes to support preloading; diverges from real user flow

---

## Recommended Approach

Start with **Option A** (diagnose and fix) since it provides the most value — all 20 tests exercise the real STAC loading path. Add diagnostic screenshots first to pinpoint the failure stage before changing any test code.

If Option A proves intractable (e.g., openvscode-server tree view timing is fundamentally unreliable), fall back to **Option B** (command-based opening) for tests that need a plot open, and keep Option A for a dedicated STAC tree navigation test.

---

## Key Files

| File | Purpose |
|------|---------|
| `tests/e2e/models/code-server-page.ts:146-237` | `openPlotViaStacTree()` — the failing method |
| `tests/e2e/models/code-server-page.ts:519-602` | `focusStacView()`, `ensureStacPaneExpanded()`, `seedConfigAndReload()` |
| `tests/e2e/global-setup.ts:97-127` | `ensureDebriefConfig()` — pre-seeds config in global setup |
| `tests/e2e/fixtures/base.ts` | Fixture: CDN interceptor + MessagePort injector |
| `tests/e2e/helpers/extension-content.ts` | Generates webview HTML from esbuild bundles |
| `.github/workflows/e2e.yml:147-193` | CI config seeding + server start + test run |
| `apps/vscode/src/extension.ts` | Extension activation (ConfigService → StacTreeProvider) |
| `apps/vscode/src/providers/stacTreeProvider.ts` | Tree data provider (`getChildren()`) |
| `apps/vscode/src/services/configService.ts` | Reads `~/.config/debrief/config.json` |
| `tests/e2e/test-workspace/local-store/catalog.json` | Test STAC catalog with 2 items |

## Diagnostic First Steps

Before implementing any solution, gather data:

1. **Screenshot each stage** — Add `page.screenshot()` calls after each step in `openPlotViaStacTree` to see where the UI stalls
2. **Dump server log** — Cat `/tmp/ovs.log` after test failure to check for extension activation errors
3. **Print tree rows** — Log `page.locator('.monaco-list-row').allTextContents()` to see what the tree actually shows
4. **Verify config read** — Add a CI step that cats `~/.config/debrief/config.json` after server start to confirm it's valid
5. **Check extension output** — Open the Output panel for "Debrief Maritime Analysis" channel to see if the extension logged config/store errors
