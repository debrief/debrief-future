15 of our 18 VS Code E2E test suites skip every CI run. Same root cause each time: the STAC tree view in the Explorer sidebar never populates, so the test helper that opens plots by navigating the tree times out after 42 seconds of waiting.

The investigation found two likely culprits. A case-sensitive CSS selector that silently fails to match the pane header (test expects "STAC STORES", extension registers "STAC Stores"). And VS Code's lazy tree rendering — `getChildren()` only fires when the pane is visible, and in headless openvscode-server, it may never become visible without an explicit command.

The fix adds diagnostic instrumentation first (screenshots at each wait stage, captured as CI artifacts), then hardens the focus logic to use VS Code commands instead of CSS selectors, and provides a command-based fallback for opening plots without tree navigation. Roughly 50 individual tests waiting behind this one helper.

Full planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
