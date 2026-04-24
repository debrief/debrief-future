## What We're Building

The Debrief VS Code extension has 18 E2E test files. Fifteen of them self-skip.

Not because the tests are wrong — they correctly detect that the webview content never appears. The extension registers a `WebviewViewProvider`, VS Code calls `registerWebviewViewProvider`, and then... nothing. The `resolveWebviewView()` callback where the extension generates its real React/Leaflet HTML is never invoked.

This sprint is focused on finding and fixing that root cause inside openvscode-server, the browser-accessible VS Code host we use for headless Playwright testing in CI. Three earlier blockers in the webview lifecycle were already patched (a service worker conflict, a CSP hash mismatch, and an origin hash guard). The fourth — the one that matters most — remains.

The outcome we're working toward: real extension content rendering inside the `#active-frame` iframe during Playwright tests, in headless CI, without Docker.

## How It Fits

The web-shell E2E suite has 81 tests covering the browser-based orchestration surface. What it can't test is anything that depends on the VS Code extension host: VSIX packaging, command registration, webview lifecycle, the MessagePort boundary between the extension and its React content. That coverage gap has existed since the E2E infrastructure was built in #005. This sprint closes it.

The existing `patch-webview.sh` script is the right model — targeted, version-pinned patches to openvscode-server's minified workbench code. The plan is to extend it with whatever fix blocker 4 requires, not to replace the overall approach.

## Key Decisions

- **Primary approach**: Use `vscode.commands.executeCommand` to force the sidebar view reveal after extension activation. If VS Code never makes the view container visible, it never calls `resolveWebviewView`. Forcing the reveal via command is the least invasive option and works inside VS Code's intended API.
- **Secondary**: Upgrade openvscode-server from v1.109.5 to the latest stable release. VS Code's webview view lifecycle has had improvements since June 2024 — the bug may be fixed upstream, which would eliminate the need for a patch entirely.
- **Tertiary**: Add a fourth patch to `patch-webview.sh` that targets the visibility gate in the webview view resolution code path directly.
- **Fallback**: Real VS Code running under xvfb for highest fidelity — full Electron shell, native webview lifecycle, no patches needed. More complex CI setup, but the most reliable test environment possible.
- **Last resort**: Accept a hybrid split — VS Code E2E covers the extension host side (activation, commands, tree views, STAC navigation), web-shell E2E covers all webview DOM assertions. Meaningful coverage, but leaves a gap: bugs in how the extension packages and delivers its webview HTML wouldn't be caught.

The approaches are ordered by effort and invasiveness. We'll try the command-based reveal first — if it works, the patch surface stays small.
