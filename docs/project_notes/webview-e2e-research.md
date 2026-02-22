# Research: Enabling E2E Business-Flow Testing Through VS Code Webviews in code-server

**Date:** 2026-02-22
**Status:** VALIDATED — working solution with proof-of-concept tests passing

## Executive Summary

**Experimentally validated** approach for E2E testing VS Code webview content in code-server using Playwright:

1. **Two file patches** to code-server's VS Code installation (automated by `scripts/patch-webview.sh`)
2. **A test helper** (`helpers/webview-injector.ts`) that injects content via MessagePort interception
3. **xvfb-run + headed Chromium** for reliable webview iframe access

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

| Flow | How |
|------|-----|
| **Open files** | Inject HTML with Leaflet container, verify map renders |
| **Change time** | Inject TimeController UI, interact with slider/buttons |
| **Run tools** | Inject ToolsPanel, click run button, verify results |
| **Inspect PROV LOG** | Inject LogPanel HTML, verify entries |

### For testing with REAL extension content:

The interceptor sends any HTML you provide. To test with the actual extension bundle:

1. Read the extension's built `activityPanel.js` from `apps/vscode/dist/webview/`
2. Construct the HTML that `_getHtmlContent()` would produce
3. Use `webview.asWebviewUri()` equivalent paths for script sources

Alternatively, test the React components in isolation (Storybook/Vitest) for rendering correctness, and use this E2E approach for integration verification.

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
- `tests/e2e/test-webview-probe.spec.ts` — Proof-of-concept tests

### Modified files:
- `tests/e2e/playwright.config.ts` — Added `E2E_HEADED` env var support

### Runtime patches (NOT in repo, applied by patch-webview.sh):
- `<code-server>/lib/vscode/out/vs/workbench/contrib/webview/browser/pre/index.html`
- `<code-server>/lib/vscode/out/vs/code/browser/workbench/workbench.js`

---

## Key References

- [VS Code source: pre/index.html](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/webview/browser/pre/index.html) — Webview host page
- [code-server issue #2038](https://github.com/coder/code-server/issues/2038) — Service workers not enabled
- [Playwright issue #36943](https://github.com/microsoft/playwright/issues/36943) — Nested iframes in CI
- [vscode-jupyter Integration Tests Wiki](https://github.com/microsoft/vscode-jupyter/wiki/Integration-Tests) — Jupyter middleware pattern
