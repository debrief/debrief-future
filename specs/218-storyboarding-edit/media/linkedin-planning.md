It's the day after the briefing. The analyst is back at their desk with a plot carrying twelve captured Scenes. A few titles are rough. One wants a paragraph of context. Two were accidents. And an early Scene's thumbnail no longer matches what the underlying features now show.

That's the shape of Future Debrief #218 — the polish slice that closes out the Storyboarding epic. Inline Scene rename. Markdown description with live CommonMark preview in the row. Soft-delete with a session-scoped 50-entry undo buffer, FIFO-evicted when it fills. Update-to-current re-snapshots a Scene's viewport, time, features, and thumbnail atomically. Duplicate, copy across Storyboards with a deep-copied thumbnail, and per-Scene refresh for thumbnails that have drifted since capture.

What's interesting in the planning: every edit emits a card to the Analysis Log Panel (#176) via a new first-class `recordStoryboardEdit` recorder — not a tool-result piggyback, because a storyboard edit isn't a tool run. And the markdown editor lives inside the webview rather than opening a separate VS Code document, which keeps the Scene description feeling like a field rather than a side-trip.

Three open questions — undo-buffer eviction behaviour, per-Scene vs bulk thumbnail refresh, and log-card aggregation for polish-heavy sessions — are in the post:

{{POST_URL}}

#FutureDebrief #MaritimeAnalysis #OpenSource
