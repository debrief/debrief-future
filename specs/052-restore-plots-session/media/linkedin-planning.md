VS Code doesn't remember which STAC plots you had open. Every restart means manually hunting through the catalog to rebuild your working context. For analysts juggling multiple exercises, that adds up fast.

We're building automatic plot restoration for Future Debrief's VS Code extension. A lightweight `OpenPlotsService` persists the list of open plots to workspace state in real-time — not at shutdown — so it survives crashes. On startup, it walks the list and reopens each plot sequentially through the existing command pipeline. Missing or deleted files get silently skipped and cleaned from the persisted list.

The key design choice: real-time persistence over shutdown-only. VS Code's `deactivate()` hook isn't guaranteed to fire on crash, so we write state on every open and close event. The write is async but fast — a few milliseconds for a handful of URIs.

Zero new dependencies. No parallel code paths. Just workspace-scoped persistence and the `stac://` URIs the codebase already uses everywhere.

[Read the full post →](LINK)

#FutureDebrief #MaritimeAnalysis #OpenSource
