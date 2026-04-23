## What We're Building

Every analyst has asked "what did I do to this plot?" — especially after loading it days later, or inheriting it from a colleague. The Log Panel answers that question. It's a VS Code activity bar panel that displays the analytical history of a plot: every import, calculation, property edit, and export, in chronological order. Filter by operation type, search by operation name, and see exactly what changed.

We're treating log access as a mode switch. Opening the Log Panel is an explicit shift to retrospection — you're stepping back from analysis to understand how you got here. That's why it gets its own activity bar icon, not a tab embedded in the main Activity Panel.

## How It Fits

This is Phase 2 of E02 — PROV Logging Implementation. Feature #070 gave us the schema foundation, #071 gave us the Log Recording Service that writes operations to disk. The Log Panel is where analysts actually see that history. Every operation performed through VS Code or the web shell gets recorded, and the Log Panel makes it queryable.

The data flows through the same Provider ↔ Webview message passing pattern we use in ActivityPanel. The Log Service (#071) provides deduplicated timeline data — it knows how to read the GeoJSON files in each STAC Item directory and merge them into a single timeline.

## Key Decisions

**Separate Activity Bar Icon** — The Log Panel isn't a tab in ActivityPanel. It's a distinct mode. Opening it signals "I'm reviewing history", not "I'm working on features". This gives us room to make selection behavior unambiguous.

**Selecting a Log Entry Replaces Map Selection** — When you click a log entry, the map highlights whatever features were affected by that operation. This replaces the current feature selection, it doesn't add a second highlight layer. The alternative — maintaining two selection contexts — felt like cognitive overhead for something analysts do occasionally.

**Operation Categories** — We're grouping operations into four types: calculation, import, property-edit, export. That's enough to make filtering useful without creating proliferation. If analysts need finer granularity, we can add it later.

**Shared React Components** — The panel UI lives in `@debrief/components` as framework-agnostic React components. The VS Code webview is a thin wrapper. This keeps the web shell pathway open and makes testing easier.

**Externalized Strings** — All user-facing text goes into a strings module, not hardcoded into components. We're not building i18n now, but we're not closing the door on it either.
