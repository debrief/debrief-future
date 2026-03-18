# Contract: Webview View Resolution Lifecycle

**Feature**: 142-vscode-e2e-webview-reliability
**Date**: 2026-03-18

## Overview

This contract defines the expected interaction between the test infrastructure and the openvscode-server webview view lifecycle. The goal is to ensure `resolveWebviewView()` is reliably called so that the extension's real HTML content renders in the `#active-frame` iframe.

## Expected Lifecycle Sequence

### Pre-conditions

1. openvscode-server is running on `localhost:8080` with the Debrief extension sideloaded
2. Patches 1-3 from `patch-webview.sh` have been applied
3. The test workspace folder is set as the default folder

### Sequence

```
1. Playwright navigates to http://localhost:8080/?folder=...
2. Workbench renders (.monaco-workbench visible)
3. Extension activates (STAC tree view populates)
4. Test triggers sidebar view reveal:
   - Option A: executeCommand('workbench.view.extension.debrief-sidebar')
   - Option B: Click sidebar icon via Playwright
5. VS Code creates WebviewView container
6. VS Code calls resolveWebviewView() on Debrief's provider
7. Provider sets webview.html with React/Leaflet bundle
8. VS Code sends 'content' message via MessagePort to iframe
9. #active-frame iframe is created with the HTML content
10. React app mounts and renders components
```

### Post-conditions

- `iframe.webview.ready` has class `ready`
- `#active-frame` iframe exists and contains the extension's HTML
- React components are mounted (`.leaflet-container` or `.debrief-activity-panel` visible)

## Readiness Signals

| Signal | Selector | Timeout | Meaning |
|--------|----------|---------|---------|
| Workbench ready | `.monaco-workbench` | 30s | VS Code UI has loaded |
| Extension active | STAC tree has content | 15s | Debrief extension is activated |
| Webview host loaded | `iframe.webview.ready` | 15s | Webview iframe loaded and ready |
| Content rendered | `#active-frame` exists | 20s | resolveWebviewView succeeded |
| App mounted | `.leaflet-container` | 10s | React app has rendered |

## Error Contract

If `#active-frame` is not created within the timeout:

1. The test MUST fail (not skip) — this indicates a regression in the fix
2. The error message MUST include: which readiness signal was the last to succeed
3. A screenshot MUST be captured for debugging
4. The Playwright trace MUST be saved as a CI artifact

## Patch Contract

Any patch to openvscode-server files:

1. MUST include a version guard: check that the expected text pattern exists before applying
2. MUST fail loudly if the pattern is not found (exit 1 with descriptive message)
3. MUST be idempotent (running twice produces the same result)
4. MUST document which openvscode-server version it was tested against
