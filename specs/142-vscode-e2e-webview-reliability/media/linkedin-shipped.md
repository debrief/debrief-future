About 15 of the Debrief VS Code extension's 18 E2E test files were self-skipping in CI. The root cause turned out to be six characters in a 50,000-line minified file.

openvscode-server's webview view resolution gates on `isBodyVisible()`, which returns false in headless environments because no user interaction ever triggers the sidebar visibility flag. The extension's `resolveWebviewView()` callback — where it generates its actual React/Leaflet UI — was never called.

The fix separates webview creation from visibility, so the callback fires during extension activation regardless of whether the sidebar is shown. Two new validation tests confirm the fix. Five previously skipped test files are now running, and three more are converted from skip to fixme with specific backlog references for the upstream features they need.

The patch is version-pinned with exact string matching against the minified source. If someone upgrades the server, CI fails immediately rather than silently losing coverage.

Full post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
