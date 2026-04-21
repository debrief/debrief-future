One keystroke to freeze a moment on the map — viewport, time, visible tracks — as a durable, schema-validated Scene attached to the plot.

That's the scope of the next Future Debrief slice (#216): `Ctrl/Cmd+Alt+C` inside the Map Viewer captures the current state, writes a thumbnail as a STAC asset, and persists a Scene through the CRUD module that landed last slice. The Storyboard panel opens to confirm it's saved.

What's interesting about the planning is how much of it is *reuse*. The schema, canonicalisation, and provenance came with #215. Thumbnails come from #174. The snapshot tuple comes from the session-state store that's already populated. The extension adds one command, one view provider, a thumbnail helper, and a panel mutator — no new runtime dependencies, no Python changes.

Playback (#217) and the edit suite (#218) come next. Capture had to land first because you can't replay a Scene you never took.

Decisions we're genuinely unsure about — duplicate-timestamp ergonomics, offset granularity, first-capture naming friction — are in the post:

{{POST_URL}}

#MaritimeAnalysis #OpenSource
