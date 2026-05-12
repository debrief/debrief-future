<!--
Cached opener for #192 — written during /speckit.plan, read by /speckit.pr.
No YAML front matter. Hook heading is stripped at ship time; the other
three sections are copied verbatim into the final post.
-->

## Hook

| Selection | Properties Panel before #192 | Properties Panel after #192 |
|---|---|---|
| Nothing selected | Plot-level editor (from #447) | Plot-level editor (unchanged) |
| One feature | Plot-level editor — no way in | **Schema-driven feature editor**: tags, per-platform overrides, the lot |
| One track point | No surface at all | **Sub-feature editor**: `label`, `tags`, `note` for that single fix |
| Two or more features | Plot-level editor (selection ignored) | **Read-only summary**: shared values, `(differs)` where they don't agree |

## What We're Building

The Properties Panel shipped in #447 covers one editing target: the plot itself. This feature extends the same panel — same shell, same widgets, same dirty indicator — to cover three more: a single feature, a single track point, and a multi-select read-only summary. The panel decides which mode to render entirely from the existing `FeatureSelection`, so analysts never have to think about which mode they're in. Click a track on the map and the panel becomes a tag-and-override editor for that track. Click one of the track's points and it becomes a metadata editor for that fix. Clear the selection and it falls back to the plot editor that was there before.

The headline new capability is per-point metadata. Until now there has been no schema slot anywhere in Debrief for annotating an individual fix on a track — analysts have had no way to mark one point as "intercept", attach a tag, or leave a note against it. This feature adds a new LinkML class `PositionMetadata` and an optional sparse slot `position_metadata: PositionMetadata[]` on `TrackProperties`, and gives that slot an editor in the panel.

## How It Fits

The Properties Panel is the long-running thread that started with #447 (the panel shell and the schema-driven form renderer) and that depends on #053 for nested-child selection paths and #181 for the per-platform override fields on `TrackProperties` that the feature editor now exposes. This item adds no new selection store, no new form library, and no new runtime dependency — it slots into the existing `ActivityPanel` section and reuses the existing `ParameterEditor` widget family. The only schema change is the new `PositionMetadata` class plus the one optional sibling slot on `TrackProperties`; the LinkML generators produce the Pydantic, JSON Schema, and TypeScript types from there in the usual way.

## Key Decisions

- **Sparse, indexed parallel array for point metadata, not inlined on `TimestampedPosition`.** The kinematic position class is consumed by REP import, the calc tools, and the chart renderer — adding optional metadata to it would force every kinematic round-trip everywhere to opt out of new fields. A sibling slot keeps `TimestampedPosition` byte-identical and lets us store only the points an analyst has actually touched. Documented as R-001 in `research.md`; a dense parallel array, an inline embedding, a separate STAC asset, and a string-keyed map were all considered and rejected.
- **Selection drives mode; no new store.** Mode resolution is a pure function of `(plot.features, selection)` and lives in one file (`selectionMode.ts`). Stale selections fall back to plot mode and dispatch the existing `clearSelection()` action, so the panel itself stays read-only against the store.
- **Multi-select stays read-only in v1.** The summary mode shows shared values and a `(differs)` token where features disagree; bulk-edit affordances are deferred. This keeps the feature surface honest about what the panel can actually do today and avoids a half-finished bulk editor.
- **Read-only plot detection deferred.** The disabled-state code path is wired so a future `isReadOnly` flag flips the form off cleanly, but no detection logic ships here. Adding the flag involves load/save, MapView affordances, and STAC catalog locks — none of which this item is approved to deliver. R-003 in `research.md` is explicit about this and a follow-up issue is planned.
- **Provenance reuses the #447 shape.** Every save with feature- or point-level edits writes one `LogEntry` per affected feature, `method = 'properties-panel@<version>'`, with point-level field paths prefixed `position_metadata[<index>]/`. NarrativeLog views render the new entries with no UI changes.
