# Research: Enabling E2E Business-Flow Testing Through VS Code Webviews

**Date:** 2026-02-22
**Updated:** 2026-03-18 — Five blockers identified, four patched, one remaining (CDN URL)
**Status:** PARTIAL — `resolveWebviewView` fires, but webview host page cannot load in sandbox

## Executive Summary

**Four patches** to openvscode-server's VS Code installation (automated by `scripts/patch-webview.sh`) resolve the server-side webview lifecycle. However, a **fifth blocker** prevents end-to-end webview content rendering in sandboxed CI: the webview iframe's `src` points to an unreachable CDN URL.

### What works (Patches 1a, 1b, 2, 3):

| Capability | Status |
|-----------|--------|
| `resolveWebviewView` fires in headless | Working (Patch 3) |
| Webview iframe created with correct `src` | Working |
| Sidebar composite renders | Working |
| Webview survives sidebar toggle | Working |
| Playwright DOM read access (outer frames) | Working |
| `frameLocator` chaining pattern | Working |

### What doesn't work (Blocker 5):

| Capability | Status |
|-----------|--------|
| `pre/index.html` host page loads | Blocked (CDN URL unreachable) |
| `#active-frame` created inside host page | Blocked (depends on host page) |
| Real extension React content renders | Blocked (depends on `#active-frame`) |

---

## Root Cause Analysis (Five Blockers)

### Blocker 1: Service Worker Conflict (RESOLVED)

**File:** `pre/index.html` (line 36)

openvscode-server registers its own service worker at `/`. The webview host page finds the WRONG SW — `workerReady` Promise never resolves.

**Fix (Patch 1a):** Set `disableServiceWorker = true` in the inline module script.

### Blocker 2: CSP Hash Mismatch (RESOLVED)

**File:** `pre/index.html` (line 8)

Modifying the inline `<script type="module">` invalidates the SHA-256 hash in the CSP meta tag. Browser refuses to execute the modified script.

**Fix (Patch 1b):** Comment out the CSP meta tag entirely.

### Blocker 3: Origin Hash Guard Drops webview-ready (RESOLVED)

**File:** `workbench.js` (minified VS Code bundle)

VS Code's `WebviewElement.ib()` has a guard that silently drops the `webview-ready` message if the origin hash (`this.g`) hasn't resolved yet. The hash computation completes after the message arrives.

**Fix (Patch 2):** Remove the `this.g` precondition:
```
Before: if(!(!this.g||i?.data?.target!==this.a)){if(i.origin!==this.nb(this.g)){
After:  if(i?.data?.target===this.a){if(this.g&&i.origin!==this.nb(this.g)){
```

### Blocker 4: `resolveWebviewView` Never Called (RESOLVED)

**File:** `workbench.js`

In headless openvscode-server, sidebar webview views are gated on `isBodyVisible()`. In the headless environment, the DOM element is never "visible", so `resolveWebviewView()` is never called on the extension's `WebviewViewProvider`.

**Fix (Patch 3):** Unconditionally call `this.pc()` (which triggers `resolveWebviewView`), then conditionally claim/release the webview based on visibility:
```
Before: oc(){this.isBodyVisible()?(this.pc(),this.c.value?.claim(...))):this.c.value?.release(this)}
After:  oc(){this.pc();if(this.isBodyVisible()){this.c.value?.claim(...)}else{this.c.value?.release(this)}}
```

**Validation:** 3/3 consecutive test runs show `resolveWebviewView` firing and the webview iframe being created with `class="webview"`.

### Blocker 5: CDN URL Unreachable in Sandbox (UNRESOLVED)

**Discovery date:** 2026-03-18

Even with Patches 1-4 applied, the webview iframe's `src` attribute points to:
```
https://<random-uuid>.vscode-cdn.net/insider/<commit>/out/vs/workbench/contrib/webview/browser/pre/index.html
```

This URL is unreachable in the sandboxed CI environment (no external DNS resolution for `vscode-cdn.net`). The `pre/index.html` host page never loads, so:
- `#active-frame` is never created
- The extension's `content` message has nowhere to go
- No React content renders

#### Why the CDN URL Exists

VS Code uses a **per-session random subdomain** (`<uuid>.vscode-cdn.net`) to achieve cross-origin isolation between the workbench and webview content. This is a security feature — each webview gets its own origin, preventing one webview from accessing another's DOM.

#### The URL Template

The URL is defined in two places:
1. **`product.json`** — `webviewContentExternalBaseUrlTemplate` (read at build time, NOT runtime)
2. **`workbench.js`** — hardcoded with the specific commit hash: `https://{{uuid}}.vscode-cdn.net/insider/ef65ac1ba57f57f2a3961bfe94aa20481caca4c6/out/vs/workbench/contrib/webview/browser/pre/`

Changing `product.json` at runtime has **no effect** — the URL is baked into `workbench.js` during the build.

#### Approaches Attempted and Results

| Approach | Result | Why |
|----------|--------|-----|
| Patch `product.json` | No effect | URL template baked into `workbench.js` at build time |
| Patch `workbench.js` to use `http://localhost:8080/static/...` | Server starts, iframe NOT created | Same-origin URL causes VS Code to skip webview iframe creation entirely — cross-origin isolation is required for the `iframe.webview` element to exist |
| Patch `workbench.js` with uuid in path (`/vscode-webview/{{uuid}}/...`) | Same result | Still same-origin; VS Code needs cross-origin |
| `/etc/hosts` entry for `vscode-cdn.net` | Cannot work | Linux `/etc/hosts` doesn't support wildcards, and the subdomain is random per session |
| `dnsmasq` wildcard DNS (`address=/vscode-cdn.net/127.0.0.1`) | DNS resolves, but HTTPS fails | Even if DNS resolves to localhost, the URL uses `https://` and localhost has no TLS cert for `*.vscode-cdn.net` |

#### Key Insight: Cross-Origin Is Architecturally Required

When the webview URL is same-origin with the workbench (both `localhost:8080`), VS Code **does not create** the `iframe.webview` element at all. The Chromium flags `--disable-features=IsolateOrigins,site-per-process` and `--disable-site-isolation-trials` in `playwright.config.ts` disable process-level isolation but do NOT disable the origin checks in VS Code's JavaScript.

The webview iframe creation is gated on the URL being cross-origin. This is not a Chromium feature — it's VS Code application logic.

---

## VS Code Webview Architecture (3-layer iframe)

```
Page (VS Code workbench at http://localhost:8080)
  └── iframe.webview (class="webview ready", CROSS-ORIGIN required)
        └── pre/index.html (module script, MessageChannel)
              └── #active-frame (inner iframe, extension content)
                    └── Extension HTML + React app (activityPanel.js from shared/components)
```

The extension's webview content (`activityPanel.js`, `mapView.js`, etc.) is built from `shared/components/` in this repo and bundled into `apps/vscode/dist/webview/`. The `_getHtmlContent()` method in each view provider generates HTML with `<script>` tags referencing these bundles via `webview.asWebviewUri()`.

The CDN URL issue is ONLY for the host page (`pre/index.html`) — the first iframe layer. The extension bundles are referenced via `vscode-resource.vscode-cdn.net` URLs (a second CDN domain) which can be intercepted via Playwright `page.route()`.

---

## Solution Strategy (Updated Priority Order)

### 1. Local HTTPS proxy with wildcard TLS (Most Promising)

Set up a lightweight HTTPS reverse proxy (e.g., `mkcert` + `caddy` or `nginx`) that:
- Generates a wildcard cert for `*.vscode-cdn.net`
- Terminates TLS locally
- Proxies requests to `localhost:8080/static/...`
- Combined with `dnsmasq` for DNS resolution

This preserves cross-origin isolation (different subdomain = different origin) while serving files locally.

**Complexity:** Medium. Requires `mkcert`, `dnsmasq`, and a reverse proxy in the test setup.

### 2. Patch workbench.js to use `http://` scheme (Moderate)

Change the URL template from `https://{{uuid}}.vscode-cdn.net/...` to `http://{{uuid}}.vscode-cdn.net/...`. Combined with `dnsmasq` resolving `*.vscode-cdn.net → 127.0.0.1`, the iframe would load from `http://<uuid>.vscode-cdn.net:8080/static/...` — cross-origin (different subdomain) and no TLS needed.

**Risk:** VS Code may enforce `https://` for webview URLs. Needs testing.

**Complexity:** Low if it works. Only needs `dnsmasq` + one `sed` patch.

### 3. Chromium `--host-resolver-rules` flag (Simple)

Chromium supports `--host-resolver-rules="MAP *.vscode-cdn.net 127.0.0.1"` to redirect DNS at the browser level. No system DNS changes needed.

Combined with approach 2 (http:// scheme), this could work with just Playwright config changes.

**Risk:** `--host-resolver-rules` may not support wildcards. Needs testing.

### 4. MessagePort injector with real extension bundles (Proven Fallback)

The `webview-injector.ts` can inject the real `activityPanel.js` bundle (read from `apps/vscode/dist/webview/`) rather than placeholder HTML. This was validated in the original research — both map and activity panel rendered with real extension bundles.

**Downside:** Bypasses the native `resolveWebviewView` pipeline, so bugs in how the extension packages its webview HTML would not be caught. Also conflicts with Patch 3 (which now makes `resolveWebviewView` fire and send its own `content` message).

### 5. Hybrid testing (Last Resort)

- VS Code E2E: test extension-specific concerns (activation, commands, tree views, STAC navigation) — no webview DOM
- Web-shell E2E: test all webview DOM assertions (map, tools, selection, time controller)
- Only test the extension ↔ webview communication boundary in VS Code E2E

---

## Current Patch Architecture

### `tests/e2e/scripts/patch-webview.sh`

| # | File | Patch | Purpose | Status |
|---|------|-------|---------|--------|
| 1a | `pre/index.html` | `disableServiceWorker = true` | Bypasses SW that blocks `workerReady` | Applied |
| 1b | `pre/index.html` | CSP meta tag commented out | Allows modified script to execute | Applied |
| 2 | `workbench.js` | Origin hash guard removed | Prevents silent drop of `webview-ready` | Applied |
| 3 | `workbench.js` | `isBodyVisible()` gate removed | `resolveWebviewView` fires in headless | Applied |
| 5 | `workbench.js` | CDN URL → local | **NOT YET IMPLEMENTED** — see Blocker 5 | Pending |

### Test Helper: `tests/e2e/helpers/webview-injector.ts`

Provides `installWebviewInterceptor(page, { html })` for MessagePort content injection. With Patch 3 fixing native resolution, the injector now **conflicts** — both the injector and the extension try to send `content`. The injector blocks subsequent `content` messages to prevent overwrite, which means real extension content never loads when the injector is active.

**Current recommendation:** Use native pipeline (Patches 1-4) for real extension tests; reserve injector for isolated DOM interaction tests only.

---

## Test File Status

### Active (unskipped):

| File | Tests | Needs Webview Content? |
|------|-------|----------------------|
| `test-webview-resolve.spec.ts` | 3 | No (tests iframe creation only) |
| `test-webview-probe.spec.ts` | 2 (fixme) | Yes (uses injector, conflicts with Patch 3) |
| `test-load-display.spec.ts` | 3 | Yes (needs `#active-frame` for map content) |
| `test-catalog-browse.spec.ts` | 2 | Yes (needs sidebar content) |
| `test-selection-sync.spec.ts` | 3 | Yes (needs map + sidebar) |
| `test-time-controller.spec.ts` | 2 | Yes (needs sidebar) |
| `test-drawing.spec.ts` | 2 | Yes (needs map canvas) |
| `test-analysis-tool.spec.ts` | 1 | Yes (needs sidebar + tools) |
| `test-error-feedback.spec.ts` | 1 | Yes (needs sidebar for error display) |
| `test-real-webview.spec.ts` | 1 | Yes (screenshot of real content) |
| `test-preview-smoke.spec.ts` | 1 | No (smoke test) |
| `test-heroku-smoke.spec.ts` | 1 | No (remote smoke test) |

### Skipped (7 files):

`test-capture-log-evidence.spec.ts`, `test-event-log-propagation.spec.ts`, `test-log-edit-face.spec.ts`, `test-log-panel.spec.ts`, `test-styling-tools.spec.ts`, `test-tune-prov.spec.ts`, `test-undo-redo-split.spec.ts`

These remain skipped for feature-level reasons (log panel, undo/redo, styling not yet implemented).

---

## What This Enables (When Blocker 5 Is Resolved)

### Business Flows That Can Be Tested

| Flow | How | Status |
|------|-----|--------|
| **Open files** | Click STAC tree -> map panel with real Leaflet map | Blocked (needs `#active-frame`) |
| **View layers** | Activity panel shows tracks, locations, with collapse/expand | Blocked |
| **View tools** | ToolsPanel shows 11 tools with selection requirements | Blocked |
| **Change time** | TimeController slider/buttons inside sidebar iframe | Blocked |
| **Run tools** | Select features -> tools become active -> click run | Blocked |
| **Inspect PROV LOG** | Execute tool -> verify provenance entry recorded | Blocked |

### Already Validated (in prior code-server research):

- Map panel renders with real Leaflet, track symbols, time labels, shapes
- Activity panel renders with real React components (TimeController, ToolsPanel, LayersToolbar)
- Collapsible sections work (click section headers via `frame.evaluate()`)
- debrief-calc connects and shows 11 tools with selection requirements
- Route interception serves extension bundles from local filesystem

---

## Key Technical Details

### The Extension Bundle Pipeline

```
shared/components/  (React source: ActivityPanel, MapView, etc.)
  → esbuild bundle
    → apps/vscode/dist/webview/activityPanel.js  (bundled JS)
      → webview.asWebviewUri()  (generates vscode-resource URL)
        → _getHtmlContent()  (HTML with <script src="...">)
          → webview.html = ...  (set in resolveWebviewView)
            → VS Code sends 'content' message to iframe
              → pre/index.html creates #active-frame with the HTML
```

The `vscode-resource.vscode-cdn.net` URLs (for extension JS/CSS) are a **separate** CDN domain from the `<uuid>.vscode-cdn.net` host page URL. These resource URLs can be intercepted with Playwright's `page.route()`:

```typescript
await page.route('**/*.vscode-resource.vscode-cdn.net/**', async (route) => {
  const url = route.request().url();
  const pathMatch = url.match(/vscode-cdn\.net(\/.*)/);
  if (pathMatch) {
    const body = readFileSync(decodeURIComponent(pathMatch[1]));
    await route.fulfill({ body, contentType: inferContentType(pathMatch[1]) });
  } else {
    await route.continue();
  }
});
```

### Playwright Frame Navigation Pattern

```typescript
// Find the sidebar's webview host frame
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

### Environment Requirements

- **xvfb-run** for headed Chromium in CI: `xvfb-run --auto-servernum npx playwright test ...`
- **E2E_HEADED=1** environment variable to enable headed mode
- **Chromium** via `@sparticuz/chromium` (installed by `ensure-chromium.sh`)
- **openvscode-server v1.109.5** with patches applied by `patch-webview.sh`

---

## Files

### Test infrastructure:
- `tests/e2e/scripts/patch-webview.sh` — Automated patching script (4 patches)
- `tests/e2e/helpers/webview-injector.ts` — MessagePort content injection helper
- `tests/e2e/fixtures/base.ts` — Base fixture with `CodeServerPage`
- `tests/e2e/playwright.config.ts` — Playwright config with Chromium flags

### Test files:
- `tests/e2e/test-webview-resolve.spec.ts` — Patch 3 validation (iframe creation)
- `tests/e2e/test-webview-probe.spec.ts` — DOM interaction POC (uses injector)
- `tests/e2e/test-real-webview.spec.ts` — Real extension bundle screenshot
- 9 business-flow test files (active but need Blocker 5 resolved)
- 7 feature test files (skipped for feature-level reasons)

### Research documents:
- `docs/project_notes/webview-e2e-research.md` — This document
- `specs/142-vscode-e2e-webview-reliability/research.md` — Feature spike doc

### Runtime patches (NOT in repo, applied by `patch-webview.sh`):
- `<server>/out/vs/workbench/contrib/webview/browser/pre/index.html`
- `<server>/out/vs/code/browser/workbench/workbench.js`

---

## Key References

- [VS Code source: pre/index.html](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/webview/browser/pre/index.html) — Webview host page
- [code-server issue #2038](https://github.com/coder/code-server/issues/2038) — Service workers not enabled
- [Playwright issue #36943](https://github.com/microsoft/playwright/issues/36943) — Nested iframes in CI
- [Chromium --host-resolver-rules](https://www.chromium.org/developers/design-documents/network-stack/socks-proxy/) — Browser-level DNS override
