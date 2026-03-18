About 15 of the Debrief VS Code extension's 18 E2E test files self-skip in CI. Not a flaky test problem — a webview lifecycle problem.

The extension's `resolveWebviewView()` callback never fires inside openvscode-server's headless environment. Three earlier blockers in the webview lifecycle were already patched. This fourth one — where VS Code silently fails to call the callback that generates the extension's real UI content — has been the gap in automated coverage since the E2E infrastructure was built.

This week we're running a focused research sprint to find the fix. The plan starts with the least invasive option: forcing a sidebar view reveal via `executeCommand` after extension activation, which should prompt VS Code to call `resolveWebviewView` the way it would for a real user. If that doesn't work, we upgrade openvscode-server and see if the bug is already fixed upstream. If not, we go deeper into workbench.js.

The goal is real extension content — MapView, FeatureList, TimeController — rendering inside Playwright-controlled headless CI. Without that, the extension's core workflows have no automated E2E coverage.

Full planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
