Just shipped plot restoration for the VS Code extension. When you close and reopen VS Code, your open plots come back automatically — exactly where you left them.

The implementation is straightforward: `OpenPlotsService` persists the list of open plots to VS Code's workspace state in real-time, not just on shutdown. This means it survives crashes. On startup, each plot reopens through the existing command pipeline. Missing or deleted files get silently removed from the persisted list.

Real-time persistence over shutdown-only was the key call. VS Code's `deactivate()` hook isn't guaranteed to fire on crash, so we write state on every open and close event. The write is async but fast — milliseconds for a handful of URIs.

Built with zero new dependencies and 28 unit tests across 4 user stories. Just workspace-scoped persistence and the `stac://` URIs the codebase already uses everywhere.

[See the implementation](LINK)

#FutureDebrief #MaritimeAnalysis #OpenSource
