When an analyst re-runs an analysis tool with tweaked parameters, the result view showing that output has no idea a newer version exists. It would need to scan the filesystem to find out.

We're building a Result ID Registry for Future Debrief that solves this with a simple indirection layer. Tools declare a stable logical ID for their outputs. The registry maps that ID to the current versioned file and emits change events when results update. Views subscribe, get notified, refresh. No polling, no coupling between tools and views.

Pure in-memory, zero new dependencies, reconstructed from STAC metadata each session. Part of the Results Visualization epic that will bring chart rendering and auto-refresh to the VS Code-based analysis environment.

https://debrief.github.io/future/2026/02/13/planning-logical-result-id-registry.html

#FutureDebrief #MaritimeAnalysis #OpenSource
