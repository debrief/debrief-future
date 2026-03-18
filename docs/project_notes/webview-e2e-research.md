# Research: Enabling E2E Business-Flow Testing Through VS Code Webviews in code-server

**Date:** 2026-02-22
**Updated:** 2026-03-18 — Blocker 4 resolved (resolveWebviewView now fires natively)
**Status:** RESOLVED — all four blockers patched, real extension webview content renders

## Executive Summary

**Four patches** to openvscode-server's VS Code installation (automated by `scripts/patch-webview.sh`) enable real extension webview content to render in headless Playwright:

1. **Patch 1a**: Disable service worker in `pre/index.html`
2. **Patch 1b**: Comment out CSP meta tag in `pre/index.html`
3. **Patch 2**: Remove origin hash guard in `workbench.js`
4. **Patch 3** (NEW): Remove `isBodyVisible()` gate in `workbench.js` — fixes `resolveWebviewView` never called

With all four patches, `resolveWebviewView()` fires natively and the extension's real React/Leaflet content renders without needing the MessagePort injector.

### Current results (2026-03-18):

| Capability | Status |
|-----------|--------|
| `resolveWebviewView` fires in headless | ✓ Fixed (Patch 3) |
| Webview `#active-frame` creation | ✓ Working |
| Sidebar composite renders | ✓ Working |
| Webview survives sidebar toggle | ✓ Working |
| Playwright DOM read access | ✓ Working |
| `frameLocator` chaining pattern | ✓ Working |

### Proof-of-concept results:

| Capability | Status |
|-----------|--------|
| Webview `#active-frame` creation | ✓ Working |
| Playwright DOM read access | ✓ Working |
| Button click interactions | ✓ Working |
| Text input + echo | ✓ Working |
| JS evaluation inside inner iframe | ✓ Working |
| `frameLocator` chaining pattern | ✓ Working |

---

## Root Cause Analysis (Experimentally Validated)

### The Three Blockers

Through systematic instrumentation of both `pre/index.html` and `workbench.js`, three distinct issues were identified:

#### Blocker 1: Service Worker Conflict

**File:** `pre/index.html` (line 36)

code-server registers its own service worker at `/` (`/_static/out/browser/serviceWorker.js`). The webview host page (`pre/index.html`) checks `navigator.serviceWorker.controller` and finds the WRONG SW. The `workerReady` Promise never resolves because:

```
webview host page:
  "Found unexpected service worker controller.
   Found: http://localhost:8080/_static/out/browser/serviceWorker.js.
   Expected: service-worker.js?v=4&..."
```

**Fix:** Set `disableServiceWorker = true` in the inline module script. This causes `workerReady` to resolve immediately (line 252-253).

#### Blocker 2: CSP Hash Mismatch

**File:** `pre/index.html` (line 8)

Modifying the inline `<script type="module">` content invalidates the SHA-256 hash in the Content-Security-Policy meta tag. The browser refuses to execute the modified script.

**Fix:** Comment out the CSP meta tag entirely.

#### Blocker 3: Origin Hash Guard in webview-ready Handler

**File:** `workbench.js` (minified VS Code bundle)

VS Code's `WebviewElement.ib()` method has a guard:

```javascript
if (!(!this.g || i?.data?.target !== this.a)) {
```

This silently drops the `webview-ready` message if `this.g` (the origin hash computed by `fOt()`) hasn't resolved yet. In code-server on `http://localhost:8080`, this hash computation via `crypto.subtle.digest()` completes correctly, but the `webview-ready` message arrives before the hash is stored in `this.g`.

**Fix:** Remove the `this.g` guard, making the condition `if (i?.data?.target === this.a)`, and make the origin check conditional: `if (this.g && i.origin !== this.nb(this.g))`.

#### Blocker 4: `resolveWebviewView` Never Called (code-server bug)

Even with blockers 1-3 fixed, VS Code in code-server **never calls `resolveWebviewView()`** on the extension's `WebviewViewProvider`. The webview container is created, the iframe loads, `webview-ready` is processed (port stored), `styles` and `focus` messages are sent — but `setHtml()` / `fb("content")` is never called.

The extension activates and registers the provider, but code-server never invokes the resolution callback. This appears to be a code-server-specific bug in the webview view lifecycle.

**Workaround:** The test helper intercepts the `webview-ready` message in the capture phase and manually sends the `content` message via the transferred MessagePort, bypassing VS Code's broken resolution pipeline entirely.

### VS Code Webview Architecture (3-layer iframe)

```
Page (VS Code workbench at http://localhost:8080)
  └── iframe.webview (class="webview ready", same origin)
        └── pre/index.html (module script, MessageChannel)
              └── #active-frame (inner iframe, extension content)
                    └── Extension HTML + React app
```

---

## The Solution

### 1. Patch Script: `tests/e2e/scripts/patch-webview.sh`

Applies three patches to code-server's VS Code installation:

```bash
bash tests/e2e/scripts/patch-webview.sh [CODE_SERVER_DIR]
```

| File | Patch | Purpose |
|------|-------|---------|
| `pre/index.html` | `disableServiceWorker = true` | Bypasses SW that blocks `workerReady` |
| `pre/index.html` | CSP meta tag commented out | Allows modified script to execute |
| `workbench.js` | Origin hash guard removed | Prevents silent drop of `webview-ready` |

### 2. Test Helper: `tests/e2e/helpers/webview-injector.ts`

Provides `activateWebviewWithContent(page, html)` which:

1. Installs a `message` event listener on the main window (capture phase)
2. When `webview-ready` arrives with a MessagePort, sends a `content` message with the test HTML
3. The host page's content handler processes it, creating `#active-frame`
4. Returns the inner Frame object for Playwright interaction

```typescript
import { activateWebviewWithContent } from './helpers/webview-injector';

test('webview interaction', async ({ codeServerPage }) => {
  const page = codeServerPage.page;
  const inner = await activateWebviewWithContent(page, MY_HTML);

  // Now interact with content inside the webview
  await expect(inner.locator('.my-element')).toHaveText('Expected');
  await inner.locator('button').click();
});
```

### 3. Runtime Requirements

- **xvfb-run** for headed Chromium in CI: `xvfb-run --auto-servernum npx playwright test ...`
- **E2E_HEADED=1** environment variable to enable headed mode
- **Chromium** via `@sparticuz/chromium` (installed by `ensure-chromium.sh`)

---

## What This Enables

### Business Flows That Can Now Be Tested

| Flow | How | Status |
|------|-----|--------|
| **Open files** | Click STAC tree → map panel with real Leaflet map | **Validated** |
| **View layers** | Activity panel shows tracks, locations, with collapse/expand | **Validated** |
| **View tools** | ToolsPanel shows 11 tools with selection requirements | **Validated** (requires debrief-calc installed) |
| **Change time** | TimeController slider/buttons inside sidebar iframe | Ready to test |
| **Run tools** | Select features → tools become active → click run | Ready to test |
| **Inspect PROV LOG** | Execute tool → verify provenance entry recorded | Ready to test |

### Real Extension Content (Validated)

Both the **map panel** (editor webview) and **activity panel** (sidebar webview) have been validated
running with real extension bundles in E2E tests. The approach:

#### Map Panel (Editor Webview)
- Opens automatically when a STAC plot is clicked in the tree view
- Uses **route interception** for `vscode-resource.vscode-cdn.net` URLs (DNS unreachable in sandbox)
- Playwright `page.route()` serves files from the local extension installation
- Real Leaflet map renders with track symbols, time labels, shapes, reference areas

#### Activity Panel (Sidebar Webview)
- Uses **MessagePort injection** with the real `activityPanel.js` bundle inlined
- `buildActivityPanelHtml()` reads the bundle from the installed extension and inlines it (avoids cross-origin issues in blob iframe)
- Real React components render: TimeController, ToolsPanel, LayersToolbar + FeatureList
- Collapsible sections work (click section headers via `frame.evaluate()`)

#### debrief-calc Connection
- **Architecture:** subprocess CLI, NOT an MCP server
- Extension spawns `python -m debrief_calc.cli` with JSON on stdin, reads stdout
- **Validation:** `calcService.checkAvailability()` checks: (1) Python interpreter accessible, (2) `import debrief_calc` succeeds
- **Python path resolution:** Setting `debrief.calc.pythonPath` > workspace `.venv/bin/python` (walks up 5 dirs) > system `python`
- **Circuit breaker:** 3 failures = skip for 30s
- **In E2E env:** `pip install -e services/calc` + set `debrief.calc.pythonPath` in code-server User settings
- When connected: 11 tools appear with selection requirements (e.g., "Need 1 TRACK, have 0")

#### Route Interceptor Pattern
```typescript
await page.route('**/*.vscode-resource.vscode-cdn.net/**', async (route) => {
  const url = route.request().url();
  const pathMatch = url.match(/vscode-cdn\.net(\/.*)/);
  const filePath = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
  if (filePath && existsSync(filePath)) {
    const body = readFileSync(filePath);
    await route.fulfill({ body, contentType: inferContentType(filePath) });
  } else {
    await route.continue();
  }
});
```

#### Finding the Correct Sidebar Frame
The page may contain multiple webview host frames (map + sidebar). To find the sidebar:
```typescript
const hostFrames = page.frames().filter(f =>
  f.url().includes('workbench/contrib/webview/browser/pre')
);
for (const host of hostFrames) {
  const child = host.childFrames()[0];
  const isActivityPanel = await child.evaluate(
    () => !!document.querySelector('.debrief-activity-panel')
  ).catch(() => false);
  if (isActivityPanel) { sidebarFrame = child; break; }
}
```

#### Interacting with React Components Inside Webview
```typescript
// Collapse a section by clicking its header button
await sidebarFrame.evaluate(() => {
  const buttons = document.querySelectorAll('.debrief-activity-panel__section-header');
  const tcBtn = Array.from(buttons).find(b => b.textContent?.includes('Time Controller'));
  if (tcBtn) (tcBtn as HTMLElement).click();
});
```

---

## Strategies Evaluated and Tested

| Strategy | Result |
|----------|--------|
| xvfb-run + headed mode | ✓ Works for smoke tests, but does NOT fix webview |
| Headless mode | ✗ Same failure as headed (root cause is not rendering) |
| Disable code-server SW | Necessary but not sufficient |
| Patch CSP hash | Necessary but not sufficient |
| Patch workbench.js origin guard | Necessary but not sufficient |
| MessagePort content injection | ✓ **This is the solution** |
| openvscode-server | Not tested (same VS Code webview arch) |
| @vscode/test-web | Not suitable (no webview DOM access) |
| WebdriverIO | Viable fallback (not tested) |
| Jupyter test middleware | Good complement for state-only testing |

---

## Experimental Timeline

| Step | Finding |
|------|---------|
| 1. xvfb + headed mode | Works for smoke tests, but webview `#active-frame` NOT created |
| 2. Disable SW in index.html | Script executes, `workerReady` resolves, `signalReady()` called |
| 3. Comment out CSP | Module script now executes (was blocked by hash mismatch) |
| 4. Trace message flow | `webview-ready` posted to parent with port, interceptor confirms receipt |
| 5. Patch workbench.js | VS Code's handler now processes `webview-ready`, stores port, sends `styles`/`focus` |
| 6. But no `content` message | `resolveWebviewView` never called — code-server lifecycle bug |
| 7. MessagePort interception | Manually send `content` via captured port → `#active-frame` created! |
| 8. Playwright DOM access | Full read/write/click/type access to inner iframe content ✓ |

---

## Files Created/Modified

### New files:
- `tests/e2e/scripts/patch-webview.sh` — Automated patching script
- `tests/e2e/helpers/webview-injector.ts` — Test helper for content injection
- `tests/e2e/test-webview-probe.spec.ts` — Proof-of-concept tests (injected HTML)
- `tests/e2e/test-real-webview.spec.ts` — Real extension bundle tests (map + activity panel)

### Evidence screenshots:
- `tests/e2e/evidence/real-webview-combined.png` — Map + activity panel, tools connected
- `tests/e2e/evidence/real-webview-layers-focus.png` — TC+Tools collapsed, Layers expanded

### Modified files:
- `tests/e2e/playwright.config.ts` — Added `E2E_HEADED` env var support

### Environment setup for debrief-calc:
- `pip install -e services/calc` — Install debrief-calc in system Python
- code-server User settings: `"debrief.calc.pythonPath": "/usr/local/bin/python"`

### Runtime patches (NOT in repo, applied by patch-webview.sh):
- `<code-server>/lib/vscode/out/vs/workbench/contrib/webview/browser/pre/index.html`
- `<code-server>/lib/vscode/out/vs/code/browser/workbench/workbench.js`

---

## Key References

- [VS Code source: pre/index.html](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/webview/browser/pre/index.html) — Webview host page
- [code-server issue #2038](https://github.com/coder/code-server/issues/2038) — Service workers not enabled
- [Playwright issue #36943](https://github.com/microsoft/playwright/issues/36943) — Nested iframes in CI
- [vscode-jupyter Integration Tests Wiki](https://github.com/microsoft/vscode-jupyter/wiki/Integration-Tests) — Jupyter middleware pattern
