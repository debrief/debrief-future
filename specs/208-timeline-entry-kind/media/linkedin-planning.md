The LogPanel in Debrief currently decides whether an entry is a manual checkpoint by asking the rendering layer what colour chip to draw. That's fine while only one entry type needs distinguishing — and it silently breaks the moment a second one lands.

Three features are queued behind this conflation: a snapshot button for manual checkpoints, inline tune markers, and analyst-authored rationale entries. None of them can be built cleanly while the only available signal is a visual category.

So before any of them, a small refactor: add an optional `activity_type` field to the LinkML `LogEntry` schema, project it onto a closed `kind` union on the UI-side `TimelineEntry` type, and migrate the single existing call site off the visual-category check. Optional on the schema side keeps existing records valid; closed union on the TypeScript side gives exhaustiveness at every consumer.

It's unglamorous groundwork, but it's the kind of separation of concerns that determines whether the next three features land cleanly or each paper over the previous one's assumptions.

Planning post and open questions: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
