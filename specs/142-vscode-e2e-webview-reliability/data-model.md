# Data Model: VS Code E2E Webview Reliability

**Feature**: 142-vscode-e2e-webview-reliability
**Date**: 2026-03-18

## Test Environment Model

This feature does not introduce new data entities. It modifies the test infrastructure's interaction with existing VS Code/openvscode-server internals.

### Webview Lifecycle States

The webview view goes through these states during test execution:

| State | DOM Signal | Meaning |
|-------|-----------|---------|
| **Container Created** | `.webview-view` element exists | VS Code has created the view container in the sidebar |
| **Iframe Loaded** | `iframe.webview` present | The webview host page (`pre/index.html`) has loaded |
| **Ready** | `iframe.webview.ready` class added | The webview-ready message was sent and processed |
| **Content Set** | `#active-frame` iframe exists | `resolveWebviewView` was called, provider set HTML |
| **App Rendered** | `.leaflet-container` or `.debrief-activity-panel` visible | The React app inside the webview has mounted |

### Current Failure Point

The lifecycle stalls between **Ready** and **Content Set**. The `webview-ready` message is processed (port stored, styles sent) but `resolveWebviewView()` is never called on the extension's provider, so no `content` message is sent and `#active-frame` is never created.

### Test Skip Decision Tree

Each test file currently uses this pattern to decide whether to skip:

```
Can we find #active-frame within timeout?
  ├─ YES → Run test assertions against real content
  └─ NO  → test.skip("Webview content not available")
```

After this feature, the pattern should be:

```
Skip annotations removed — tests run unconditionally.
  ├─ #active-frame found within timeout → Run test assertions against real content
  ├─ Feature not implemented → test.fixme("Feature X not yet implemented — backlog #NNN")
  └─ #active-frame NOT found → Test times out and FAILS naturally
```

Note: `test.fail()` is not a Playwright API. Tests fail naturally via timeout when `#active-frame` is not created — no explicit failure call is needed. Use `test.fixme()` (valid Playwright API) only for tests that exercise genuinely unimplemented extension features.

### Patch Version Compatibility

| openvscode-server Version | Patch 1 (SW) | Patch 2 (CSP) | Patch 3 (Origin) | Patch 4 (Resolve) |
|--------------------------|:---:|:---:|:---:|:---:|
| v1.109.5 (current) | Applied | Applied | Applied | To be added |
| v1.95+ (if upgraded) | TBD | TBD | TBD | TBD |

Each patch must include a version guard that fails fast if the expected text pattern is not found in the target file.
