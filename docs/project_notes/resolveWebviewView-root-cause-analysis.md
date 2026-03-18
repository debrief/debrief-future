# Root Cause Analysis: `resolveWebviewView` Never Called in openvscode-server

**Date:** 2026-03-18
**Feature:** #142 (VS Code E2E Webview Reliability)
**Status:** Root cause identified with proposed fixes

## Executive Summary

The `resolveWebviewView` lifecycle stall has **two independent root causes**, both stemming from the same architectural constraint: the webview view pane's resolution chain is gated by body visibility, and even when that gate is removed, the resolution depends on an async RPC call whose prerequisite (extension host readiness) may not be met at the time it fires.

### Root Cause 1: Visibility-Gated Resolution (Primary)

In the **original** (unpatched) `workbench.js`, the `oc()` method gates `pc()` behind `isBodyVisible()`:

```javascript
// ORIGINAL (unpatched) code — from workbench.js.bak
oc() {
  this.isBodyVisible()
    ? (this.pc(), this.c.value?.claim(this, $e(this.element), void 0))
    : this.c.value?.release(this);
}
```

`isBodyVisible()` returns `this.gb && this.isExpanded()`, where:
- `this.gb` = set by `setVisible(e)`, depends on the view container being open
- `this.isExpanded()` = pane is not collapsed (defaults to `true`)

**The timing issue:** The view pane constructor calls `this.oc()` directly, but at construction time the pane has not yet been laid out — `setVisible(true)` has not been called, so `this.gb` is `false`. This means `pc()` is never called from the constructor.

Later, when the sidebar opens:
1. `setVisible(true)` fires `onDidChangeBodyVisibility` → `oc()` re-enters
2. Now `isBodyVisible()` is `true` → `pc()` runs → resolution chain starts
3. `claim()` also runs → creates and mounts the webview iframe

This flow works **in normal VS Code** because the sidebar opens through user interaction, giving enough time for everything to initialize. In **E2E tests**, the flow may fail because:
- The view may never become visible (sidebar not opened, or opened before pane is created)
- There may be a race between extension host readiness and view visibility

### Root Cause 2: Async Resolution Chain Dependency on Extension Host (Secondary)

Even when `pc()` is called, the resolution chain is:

```
pc() → sc(async () => {
  await this.ec.activateByEvent('onView:debrief.activityPanel');
  await this.jc.resolve(this.id, viewDescriptor, token);
}) → KRs.resolve() → registered resolver's callback → $resolveWebviewView (RPC) → extension host
```

The `activateByEvent()` call may hang if:
- The remote extension host hasn't connected yet (barrier at `await this.c.wait()`)
- The extension host process failed to start
- The extension doesn't contain the matching activation event

In openvscode-server, the extension runs in a **remote Node.js extension host** (kind=3), connected via WebSocket. If this connection isn't established when the view becomes visible, `activateByEvent` blocks indefinitely.

### Root Cause 3: Existing Patch Creates a New Race Condition

The current workbench.js has been manually patched to call `pc()` unconditionally:

```javascript
// PATCHED (current) code
oc() {
  this.pc();  // Called regardless of visibility
  if (this.isBodyVisible()) {
    this.c.value?.claim(this, $e(this.element), void 0);
  } else {
    this.c.value?.release(this);
  }
}
```

This patch has a subtle flaw: `pc()` has a **once-guard** (`if(this.g) return; this.g = true`). If `oc()` is called from the constructor (when body is NOT visible), `pc()` runs and sets the guard. When the view later becomes visible and `oc()` is called again, `pc()` returns immediately — the guard prevents re-entry. But `claim()` IS called correctly in the second invocation.

The resolution chain started by the first `pc()` call proceeds as:
1. `activateByEvent` fires → extension activates → provider registers
2. `jc.resolve()` → calls provider → `$resolveWebviewView` on ext host
3. Extension's `resolveWebviewView` is called → extension sets `webview.html`
4. `$setHtml` flows back to main thread → overlay stores HTML in `this.h`
5. Overlay dispatches to underlying element via `this.ab(t => t.setHtml(e))`

**But at step 5**, if `claim()` hasn't been called yet (view not visible), the overlay's underlying element (`this.c.value`) doesn't exist. The `ab()` dispatch method is:
```javascript
ab(e) { this.c.value && e(this.c.value); }
```
With no underlying element, `setHtml` is a no-op on the element level. The HTML IS stored in the overlay's `this.h`, which gets applied later when `P(e)` runs during `claim()`. So this should eventually work.

**However**, this depends on `resolveWebviewView` completing before the view becomes visible. If there's any delay or error in the RPC chain, the HTML might never be set.

## Code Path Trace

### File Locations in openvscode-server v1.109.5

| Component | File | Identifier |
|-----------|------|------------|
| WebviewViewPane | `workbench.js` | Class with `oc()`, `pc()`, `sc()` methods |
| WebviewViewService (KRs) | `workbench.js` | `oJe = xe("webviewViewService")` |
| MainThreadWebviewViews (rJe) | `workbench.js` | Handles `$registerWebviewViewProvider`, `$resolveWebviewView` proxy |
| Overlay Webview (mRt) | `workbench.js` | `claim()`, `P(e)`, `setHtml()`, `ab()` |
| WebviewElement | `workbench.js` | `gb()` (create iframe), `hb()` (set src), `mountTo()`, `ib()` (message handler) |
| ExtHostWebviewViews | `extensionHostProcess.js` | `$resolveWebviewView()`, extension-side provider |
| Webview host page | `pre/index.html` | `signalReady()`, `hostMessaging`, content handler |

### Resolution Chain (Happy Path)

```
1. Sidebar opens
2. ViewPaneContainer.setVisible(true)
3. ViewPane.setVisible(true) → gb=true → fires onDidChangeBodyVisibility
4. WebviewViewPane.oc() → isBodyVisible()=true
5. WebviewViewPane.pc() → creates overlay → starts async resolution
6.   claim() → P(e) → createWebviewElement → mountTo → iframe loads
7.   iframe: signalReady() → posts webview-ready + MessagePort
8.   ib(): receives webview-ready, stores port, sends pending messages
9. sc(async): activateByEvent('onView:debrief.activityPanel')
10.  Extension activates → registerWebviewViewProvider
11.  $registerWebviewViewProvider → KRs.register() → resolver registered
12. sc(async): jc.resolve() → KRs.resolve() → resolver.resolve()
13.  resolver callback → $resolveWebviewView (RPC to ext host)
14.  ExtHost: resolveWebviewView(view, context, token)
15.  Extension: webview.html = "<html>..."
16.  $setHtml → overlay.setHtml → element.setHtml → fb("content",...)
17.  content message sent via port → pre/index.html creates #active-frame
```

### Failure Points

| Step | Can Fail When | Symptom |
|------|---------------|---------|
| 4 | View not visible (sidebar not open) | `pc()` never called |
| 6 | `P(e)` not called (no `claim()`) | Iframe never created |
| 7 | CDN unreachable (offline) | Iframe never loads |
| 7 | `signalReady()` hash validation fails | `webview-ready` never sent |
| 9 | Extension host not connected | `activateByEvent` hangs |
| 10 | Extension fails to activate | Provider never registered |
| 13 | RPC channel disconnected | `$resolveWebviewView` never reaches ext host |

## Why the Existing Workaround Works

The `webview-injector.ts` test helper bypasses the entire resolution chain:

1. Installs a `message` event listener in capture phase on the main window
2. When `webview-ready` arrives from any webview iframe, captures the MessagePort
3. Manually sends a `content` message via the port with test HTML
4. The host page's content handler processes it, creating `#active-frame`
5. Blocks subsequent `content` messages to prevent the extension from overwriting

This works because the webview iframe DOES load and send `webview-ready` (after patches 1-3). The issue is solely in the VS Code workbench's resolution chain — the extension host never triggers `resolveWebviewView`, so the `content` message is never sent through the normal path.

## Proposed Fixes

### Fix A: Force View Revelation via VS Code Command (Recommended)

Instead of patching `workbench.js` further, use a VS Code command to force the view to reveal:

```typescript
// In E2E test setup, after extension loads:
await page.evaluate(() => {
  // VS Code exposes command execution via the API
  // The 'workbench.view.extension.debrief' command opens the view container
  // Then 'debrief.activityPanel.focus' or equivalent focuses the view
});
```

Or use the `vscode.commands.executeCommand('workbench.view.extension.debrief')` from within the extension itself during activation.

### Fix B: Patch `oc()` to Retry Resolution After `claim()` (Targeted)

```javascript
// Patch oc() to ensure resolution happens AFTER claim
oc() {
  this.pc();
  if (this.isBodyVisible()) {
    this.c.value?.claim(this, $e(this.element), void 0);
    // Force resolution retry if the view just became visible
    // and pc() was already called but the extension hasn't resolved yet
    if (!this.g_resolved) {
      this.jc.resolve(this.id, ...).catch(() => {});
    }
  } else {
    this.c.value?.release(this);
  }
}
```

This is fragile and not recommended.

### Fix C: Patch the Webview Iframe URL to Use Same-Origin (For Offline)

The webview iframe URL uses `https://{{uuid}}.vscode-cdn.net/...` which requires internet access. For offline/CI environments, patch `product.json` to use a same-origin URL:

```json
{
  "webviewContentExternalBaseUrlTemplate": "{{scheme}}://{{authority}}/out/vs/workbench/contrib/webview/browser/pre/"
}
```

This eliminates the CDN dependency but changes the security model (same-origin iframe vs cross-origin).

### Fix D: Ensure Extension Host Readiness Before View Opens

Add a startup check that waits for the extension host to be fully connected before the E2E test opens the sidebar:

```typescript
// Wait for extension to be active
await page.evaluate(async () => {
  const vscode = acquireVsCodeApi();
  // Poll for extension readiness
  while (!window.__debrief_extension_ready) {
    await new Promise(r => setTimeout(r, 500));
  }
});
```

### Fix E: Continue Using MessagePort Injection (Current Approach)

The existing `webview-injector.ts` approach is actually the most robust for E2E testing because it:
1. Doesn't depend on the extension lifecycle at all
2. Allows injecting arbitrary test content
3. Works regardless of extension host state
4. Already proven to work in CI

For tests that need the REAL extension content (not injected HTML), combine Fix A (force view revelation) with Fix E (MessagePort injection of the real extension's HTML by reading it from the bundle).

## Key Files

| File | Path |
|------|------|
| workbench.js (patched) | `/opt/openvscode-server/out/vs/code/browser/workbench/workbench.js` |
| workbench.js (original) | `/opt/openvscode-server/out/vs/code/browser/workbench/workbench.js.bak` |
| pre/index.html (patched) | `/opt/openvscode-server/out/vs/workbench/contrib/webview/browser/pre/index.html` |
| Extension host process | `/opt/openvscode-server/out/vs/workbench/api/node/extensionHostProcess.js` |
| product.json | `/opt/openvscode-server/product.json` |
| Patch script | `/home/user/debrief-future/tests/e2e/scripts/patch-webview.sh` |
| Webview injector | `/home/user/debrief-future/tests/e2e/helpers/webview-injector.ts` |
| Research doc | `/home/user/debrief-future/docs/project_notes/webview-e2e-research.md` |

## Minified Symbol Map (openvscode-server v1.109.5)

For future reference, key minified identifiers in `workbench.js`:

| Minified | Original | Context |
|----------|----------|---------|
| `oc()` | `updateViewVisibility` (approx) | WebviewViewPane: triggers resolution |
| `pc()` | `createWebview` (approx) | WebviewViewPane: creates overlay + starts resolution |
| `sc(e)` | `withViewProgress` (approx) | Wraps callback in progress indicator |
| `gb` | `_isVisible` | ViewPane: set by `setVisible()` |
| `this.g` | `_webviewHasBeenCreated` | WebviewViewPane: once-guard in `pc()` |
| `this.c.value` | `_webview` (Lazy) | Overlay webview / underlying element |
| `this.h` | `_html` | Overlay: stored HTML content |
| `this.H` | `_domNode` (FastDomNode) | Overlay: DOM container |
| `this.jc` | `_webviewViewService` | WebviewViewService (KRs) |
| `this.ec` | `_extensionService` | Extension activation |
| `this.ic` | `_webviewService` | Creates webview overlays |
| `KRs` | `WebviewViewService` | Manages view resolvers |
| `rJe` | `MainThreadWebviewViews` | Main thread ↔ ext host bridge |
| `mRt` | `OverlayWebview` | Webview overlay (lazy element) |
| `P(e)` | `_ensureElement` | OverlayWebview: creates underlying element |
| `fb(e,t)` | `_send` | WebviewElement: sends message through port |
| `sb(e)` | `_updateContent` | WebviewElement: updates content state |
| `ib(e)` | `_startMessageListener` | WebviewElement: message event handler |
| `gb(e,t)` | `_createIframe` | WebviewElement: creates iframe element |
| `hb(...)` | `_setIframeSrc` | WebviewElement: sets iframe URL |
| `mb(e)` | `_getWebviewBaseUri` | WebviewElement: constructs CDN URL |
| `nb(e)` | `_getWebviewOrigin` | WebviewElement: extracts origin |
