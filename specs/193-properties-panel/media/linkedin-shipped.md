Until this week, fixing a wrong tag or platform on a Debrief plot meant closing the app, opening a text editor against item.json, and hoping you didn't break the JSON. That's gone.

The new Properties Panel edits STAC plot and catalog metadata in-app, from two surfaces: a 4th section in the ActivityPanel when a plot is open, and a stacked area under the thumbnail in StacBrowser when no plot is open. Same form, same field set — both routed through a single service method, `stacService.updateItemMetadata`, that does an atomic temp+rename onto item.json and rejects the commit if the file's mtime changed between read and write. No session-state staging, no parallel writers, no silent last-write-wins.

The form itself is generated from the LinkML JSON Schema, so adding a field upstream surfaces a new input on the next build with zero panel-component change. Auto-derived fields (like start_datetime) now respect a per-item overrides list, so analyst edits survive the next derivation pass.

78 tests green. Storybook screenshots and Playwright E2E are follow-ups — correctness first.

Full write-up: [link to shipped post]

#FutureDebrief #MaritimeAnalysis #OpenSource
