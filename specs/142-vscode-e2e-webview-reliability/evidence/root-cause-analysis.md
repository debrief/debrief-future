# Root Cause Analysis: resolveWebviewView Not Called in openvscode-server

**Feature**: 142-vscode-e2e-webview-reliability
**Date**: 2026-03-18
**Status**: Resolved — Patch 3 applied and validated

## Summary

`resolveWebviewView()` was never called in openvscode-server v1.109.5 because the webview view pane's resolution method (`oc()`) gates on `isBodyVisible()`, which returns `false` in headless environments where the sidebar view is never explicitly shown.

## Root Cause

### The Visibility Gate

In the minified `workbench.js`, the webview view pane class has this resolution method:

```javascript
// Original (minified)
oc(){this.isBodyVisible()?(this.pc(),this.c.value?.claim(this,$e(this.element),void 0)):this.c.value?.release(this)}
```

Where:
- `oc()` is the resolution trigger — called on construction, on visibility change, and when a new resolver is registered
- `isBodyVisible()` returns `this.gb && this.isExpanded()` — requires BOTH visible AND expanded
- `pc()` creates the webview overlay and triggers `resolveWebviewView` on the extension's provider

### Why It Fails in Headless

In headless openvscode-server:
1. The sidebar view container is created but `setVisible(true)` is never called because no user interaction reveals the sidebar
2. `this.gb` (visibility flag) stays `false`
3. `isBodyVisible()` returns `false`
4. `pc()` (webview creation/resolution) is never called
5. `resolveWebviewView()` on the extension's `WebviewViewProvider` is never invoked

### The Chain

```
Extension activates
  → registerWebviewViewProvider('debrief.sidebar', provider)
  → VS Code creates WebviewViewPane with oc() called
  → oc() checks isBodyVisible() → FALSE (gb=false, not expanded)
  → pc() NOT called
  → resolveWebviewView() NOT called
  → webview.html never set
  → 'content' message never sent to iframe
  → #active-frame never created
```

## Solution: Patch 3

Remove the `isBodyVisible()` gate so that `pc()` (webview creation) is always called:

```javascript
// Patched
oc(){this.pc();if(this.isBodyVisible()){this.c.value?.claim(this,$e(this.element),void 0)}else{this.c.value?.release(this)}}
```

This ensures:
- `pc()` is always called (creates the webview, triggers `resolveWebviewView`)
- The claim/release logic still respects visibility (only claims when visible)
- The webview content is created even when the sidebar is not shown

### Why This Is Safe

- `pc()` has an early return guard: `if(this.g)return;` — it only creates the webview once
- The webview is created lazily on first `oc()` call, then reused
- Claiming/releasing controls resource ownership, not creation

## Evidence

### Validation Test Results

```
✓ Debrief sidebar composite renders after clicking activity icon (5.7s)
✓ sidebar toggle disposes and re-creates webview (8.7s)

2 passed (15.8s)
```

### Activity Bar Verification

After patch, the Debrief extension registers both view containers:
```
Activity bar items: 9
  Item 5: Debrief
  Item 6: Debrief Log
```

### Webview Iframe Created

```
Found 1 webview iframe(s)
```

## Affected Files

| File | Patch | Purpose |
|------|-------|---------|
| `workbench.js` | Remove `isBodyVisible()` gate in `oc()` | Allow webview creation in headless |

## Version Compatibility

- **Tested against**: openvscode-server v1.109.5 (based on VS Code ~1.109)
- **Pattern matching**: Exact string match on minified code
- **Version guard**: Script exits 1 if pattern not found
- **Upgrade path**: If openvscode-server is upgraded, check if the pattern has changed in the new `workbench.js`

## Reproduction Steps

1. Install openvscode-server v1.109.5
2. Sideload the Debrief extension
3. Start in headless mode: `openvscode-server --host 0.0.0.0 --port 8080 --without-connection-token`
4. Open in Playwright (headed mode with xvfb)
5. **Without Patch 3**: No webview iframe appears in sidebar. `resolveWebviewView` is never called.
6. **With Patch 3**: Webview iframe appears. Extension's React/Leaflet content renders.

To apply:
```bash
bash tests/e2e/scripts/patch-webview.sh /opt/openvscode-server
```
