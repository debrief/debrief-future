## What We're Building

Analysts can already filter the STAC catalog by tags, platforms, and feature-tags. What they can't do today is fix those fields when the filter surfaces the wrong plots — they have to close the app, open a text editor against `item.json`, and hope they don't break the JSON. That's the gap this feature closes.

A context-sensitive Properties Panel appears at two surfaces. When a plot is open, a new 4th section in the ActivityPanel (alongside TimeController, Tools, Layers) edits the active plot's metadata — edits stage into session-state and flush when the plot is saved, piggy-backing on the existing unsaved-changes machinery. When no plot is open and the analyst is triaging the catalog, a stacked area under `ThumbnailPreview` in `StacBrowser` writes `item.json` directly through `stacService.updateItemMetadata`. Same form component, same field set, different persistence path.

## How It Fits

The form itself is driven from the LinkML-generated JSON Schema — `@debrief/schemas/json-schema/debrief.schema.json` is already a build artefact. A new `<PropertiesForm>` in `shared/components/src/PropertiesPanel/` introspects the schema and maps each property to either the existing `ParameterEditor` widget family (for strings, enums, numbers, booleans) or a small set of sibling widgets for types `ParameterEditor` doesn't cover today: `ArrayWidget` for chip lists, `DateTimeWidget` for ISO-8601, `BboxWidget` for the four-quad, `PlatformArrayWidget` for platform records.

The payoff: adding a new extension field in LinkML surfaces a new input on the next build with zero panel-component change. That's the test we've written for ourselves (SC-003) — introduce a test-only field, confirm it appears. Schema-first, not form-first.

## Key Decisions

- **Two surfaces, one form component.** Context-sensitivity routes through the existing session-state selection model — no new selection store, no parallel "which item am I editing?" state. If a plot is open, ActivityPanel owns the edit. If not, StacBrowser does. They can't both be live at once.

- **Stack Properties under `ThumbnailPreview`, not a new panel.** `StacBrowser` already splits list-left / thumbnail-right. Adding a vertical split on the right side (thumbnail above, properties below) reuses existing layout machinery. A 4th GoldenLayout panel would mean a new persisted layout key and first-time users dragging panels around before they can triage anything.

- **Overrides tracked via a new `debrief:overrides` array on `item.properties`.** `stacService.updateTemporalMetadata` already auto-derives `start_datetime`, `end_datetime`, `datetime` today — so an analyst who edits one of those needs their value to survive the next save. The overrides list is compact, iteratable, and lives next to the fields it governs. No sidecar files, no per-field `*_override_source` siblings. Future auto-derivation (including #135 when it lands) must consult this list before writing.

- **Provenance for every save.** Article III is non-negotiable. Every save records a log entry through `LogService.recordToolResult` with `tool='debrief.propertiesPanel'`, `method='properties-panel@<version>'`, and the list of edited field names. Item-level, so `modified_features[]` stays empty.

- **No new form library.** FR-011 is explicit. We extend the `ParameterEditor` pattern — same props shape, same commit/cancel lifecycle, same styling — rather than adopting `react-jsonschema-form` or cramming arrays into the existing widget's type discriminator. Four new sibling widgets, each simple, each testable on its own.

- **Offline-only.** No network round-trips for render, validate, or save. The whole loop is local-filesystem.
