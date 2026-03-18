# Research: VS Code E2E Webview Reliability

**Feature**: 142-vscode-e2e-webview-reliability
**Date**: 2026-03-18
**Status**: Complete

## Research Questions

### RQ-1: Can `resolveWebviewView` be made to fire via further patching of `workbench.js`?

**Decision**: Yes — this is the most promising approach and should be the primary solution.

**Rationale**: The existing `patch-webview.sh` already applies three patches to `workbench.js` and `pre/index.html` that fix blockers 1-3. The fourth blocker (resolveWebviewView never called) is in the same codebase. The webview view lifecycle in VS Code proceeds through these steps:

1. Extension registers `WebviewViewProvider` via `registerWebviewViewProvider`
2. When the view container is revealed, VS Code creates a `WebviewView` instance
3. VS Code calls `resolveWebviewView()` on the provider, passing the webview view
4. The provider sets `webview.html` which triggers a `content` message to the iframe

In openvscode-server v1.109.5, step 3 appears to fail because the webview view resolution is gated on the webview container's visibility state. In the headless environment, the sidebar panel may not report as "visible" in the DOM sense that VS Code expects. The fix should either:
- Force the visibility check to pass in headless mode
- Trigger a `workbench.view.extension.debrief-sidebar` command after activation to force the view reveal
- Patch the `resolveWebviewView` gating logic in `workbench.js`

**Alternatives considered**:
- Waiting for upstream fix — too slow, openvscode-server release cadence is unpredictable
- Replacing the entire lifecycle — too invasive, would require maintaining a fork

### RQ-2: Does a newer openvscode-server version (1.95+) fix the webview view lifecycle?

**Decision**: Investigate as secondary approach — upgrade to latest stable openvscode-server and test.

**Rationale**: openvscode-server v1.109.5 is based on VS Code 1.109 (roughly June 2024). VS Code has had significant webview improvements since then, particularly around webview view lifecycle and service worker handling. A newer version (1.95+, based on VS Code 1.95+) may fix blocker 4 entirely or reduce the patching surface. However, upgrading may also break existing patches 1-3 due to minification changes.

**Alternatives considered**:
- Staying on v1.109.5 forever — creates growing maintenance burden as patches drift from upstream
- Forking openvscode-server — too heavy for a test infrastructure concern

### RQ-3: Would code-server exhibit the same `resolveWebviewView` bug?

**Decision**: Deprioritize — the original research was done against code-server and found the same fundamental issue.

**Rationale**: The `docs/project_notes/webview-e2e-research.md` research was originally conducted against code-server. All four blockers were discovered in that environment. openvscode-server was adopted as a lighter-weight alternative with fewer dependencies, but the webview lifecycle issue is shared because both use the same VS Code workbench code. Switching to code-server would not resolve blocker 4.

**Alternatives considered**:
- code-server may have community patches — worth checking issue tracker but not primary approach

### RQ-4: Can the extension's activation explicitly trigger `resolveWebviewView`?

**Decision**: This is the recommended first approach to try — use `vscode.commands.executeCommand` to trigger view reveal.

**Rationale**: VS Code provides the command `workbench.view.extension.debrief-sidebar` (or equivalent view container command) that forces the sidebar view to be revealed. When a view is revealed, VS Code should call `resolveWebviewView()` on the registered provider. The test infrastructure can:

1. Wait for extension activation (extension is active when the STAC tree view populates)
2. Execute `workbench.view.extension.debrief-sidebar` via the command palette or Playwright keyboard shortcut
3. Wait for the webview iframe to appear and populate

This approach has the lowest effort and highest compatibility — it works within VS Code's intended API rather than patching internals.

**Alternatives considered**:
- Patching extension code to auto-reveal — would require extension changes that may affect production behavior
- Using `vscode.window.registerWebviewViewProvider` with `retainContextWhenHidden` — may help with disposal but doesn't fix initial resolution

### RQ-5: Would `@vscode/test-web` or real VS Code in xvfb provide a more reliable alternative?

**Decision**: Real VS Code in xvfb is the highest-fidelity fallback if patching approaches fail.

**Rationale**: `@vscode/test-web` is designed for extension integration tests but runs in a limited VS Code web environment that may have the same webview issues. Running real VS Code (desktop) under `xvfb-run` provides the highest fidelity — the full Electron shell, native webview lifecycle, and no patching needed. However, this requires:
- Installing VS Code on the CI runner
- Running under xvfb for headless operation
- Sideloading the extension via CLI
- Connecting Playwright to the Electron app window

This is the most complex CI setup but provides the most reliable webview lifecycle.

**Alternatives considered**:
- `@vscode/test-web` — limited documentation, unclear webview support
- `@vscode/test-electron` — designed for unit tests, not E2E with Playwright

### RQ-6: Would a hybrid approach work?

**Decision**: Acceptable fallback if full webview rendering proves unreliable, but not the preferred outcome.

**Rationale**: The hybrid approach would:
- Keep VS Code E2E tests for extension-specific concerns (activation, commands, tree views, STAC navigation)
- Rely on web-shell E2E for all webview DOM assertions (map, tools, selection, time controller)
- Only test the extension ↔ webview communication boundary in VS Code E2E

This provides meaningful coverage (the extension host side is tested) while avoiding the unreliable webview rendering. However, it leaves a gap: bugs in how the extension packages and delivers its webview HTML would not be caught.

**Alternatives considered**:
- Full webview rendering in all tests — preferred if achievable
- Dropping VS Code E2E entirely — unacceptable, loses extension-specific coverage

## Solution Strategy (Ordered by Priority)

1. **Try RQ-4 first**: Use `executeCommand` to force view reveal after extension activation
2. **If RQ-4 insufficient, try RQ-1**: Patch `workbench.js` to fix the visibility gate
3. **If patches fragile, try RQ-2**: Upgrade openvscode-server to see if newer version fixes it
4. **If all patching fails, try RQ-5**: Real VS Code in xvfb as highest-fidelity fallback
5. **Last resort, RQ-6**: Hybrid approach — accept webview DOM testing stays in web-shell only

## Key Technical Findings

### openvscode-server Webview View Lifecycle

The webview view resolution in VS Code follows this sequence:

```
Extension activates
  → registerWebviewViewProvider('debrief.sidebar', provider)
  → VS Code creates ViewContainer
  → ViewContainer visibility change triggers view resolution
  → resolveWebviewView(webviewView) called on provider
  → Provider sets webviewView.webview.html = "..."
  → VS Code sends 'content' message to iframe via MessagePort
  → #active-frame renders the HTML
```

In openvscode-server headless, the chain breaks between steps 3 and 4. The view container is created but the visibility change event may not fire because the DOM element is not "visible" in the traditional sense.

### Existing Patch Architecture

The `patch-webview.sh` script uses `sed` for text replacement in `pre/index.html` and `workbench.js`. This approach:
- Works reliably for known patterns
- Is version-specific (minified code changes between releases)
- Can be extended with additional `sed` patterns for blocker 4
- Should include a version guard to fail fast if the expected patterns are not found

### Test Readiness Signal

The key signal that the webview is ready for interaction:
1. `iframe.webview.ready` class appears on the outer iframe
2. `#active-frame` iframe is created inside it
3. The extension's React app renders inside `#active-frame`

The existing `waitForActiveFrame()` helper handles step 2. Step 3 can be verified by checking for `.leaflet-container` (map panel) or `.debrief-activity-panel` (sidebar).
