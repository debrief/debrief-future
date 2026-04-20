The first slice of Storyboarding in Future Debrief ships no UI at all — and that's the point.

Storyboarding (#024) is how an analyst walks a reader through a plot: captured Scenes, each with a viewport, a timestamp, a visible-feature set, a thumbnail. The full epic needs a capture shortcut, a panel, playback, and an edit suite. Four sibling specs.

Spec #215 is the unglamorous one: LinkML schema for Storyboard, Scene, Viewport, and HistoryEntry; generated Pydantic and TypeScript bindings; and a headless CRUD module that enforces every invariant — ordering, duplicate-timestamp rejection, `feature_set_hash` over sorted feature IDs, provenance append-only — before any UI code runs.

Landing this in isolation unblocks the three sibling UI specs to build in parallel, and it locks in the Article II schema-adherence tests (round-trip Python↔TypeScript, Pydantic-vs-LinkML JSON Schema equality) every later PR will depend on.

Three genuine open questions for people who've done this work: is `DDHHmmZ MMM YY` the right DTG format? Is the ten-value `op` vocabulary complete? Is SHA-256 over sorted feature IDs the right staleness signal?

Read the planning post: [LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
