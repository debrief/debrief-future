<!--
Cached opener for #192 — written during /speckit.plan, read by /speckit.pr.
No YAML front matter. Hook heading is stripped at ship time; the other
three sections are copied verbatim into the final post.
-->

## Hook

| | Before #192 | After #192 |
|---|---|---|
| Editable surface | Catalog metadata and plot-level fields only | Catalog, plot-level, per-feature, and per-vertex across every geometry in the plot |
| Selection emitters | Single-select only on the map; the Layers panel and modifier keys did nothing | Single-select plus Ctrl/Cmd multi-select on both the map and the Layers panel |
| Read-only plots | Edits accepted in the form, then the save silently failed | A pre-flight banner across every panel mode, plus a post-write notice if the filesystem rejects the write anyway |
| Override revert | Re-type the auto-derived value by hand and hope it matched | One-click revert next to any overridden field, with the auto-derived value shown alongside |
| Annotation vertices | No metadata anywhere — polygon, line, and point vertices were geometry-only | `label`, `tags`, and `note` on any vertex via the same editor used for track points |

## What We're Building

Until now, the only way to annotate a single point on a track — or correct the nationality on one contact, or label a single vertex of an exclusion zone — was to open the underlying JSON. The Properties Panel handled the plot as a whole, and stopped there. With #192 the same panel becomes the editing surface for whatever the analyst has selected: a feature, a single vertex on that feature, several features compared side by side, or the whole plot. Clicking a track point lets you mark it as the moment of intercept and attach a note; clicking a polygon vertex lets you tag it the same way; Ctrl-clicking two contacts on the map shows a read-only summary of where they agree and where they differ.

The change is deliberately larger than it looked at first. After a Spec Navigator review I pulled four things out of the "out of scope" pile that the original plan had quietly assumed away. Multi-select emission, because the multi-select summary mode was unreachable without it — a documented capability that nothing in the running app could actually trigger. Read-only plot detection, because a save against a locked catalog item was failing silently and writing a provenance entry for a save that never happened, which is the exact failure mode the constitution forbids. Per-field revert, because shipping per-platform overrides without a way to undo them was half a feature. And sub-feature editing for non-track annotations, because designing a vertex-metadata schema slot now and then designing another one for polygons later would have been an obvious mistake.

## How It Fits

This sits on top of #447's Properties Panel shell and consumes the per-platform override fields from #181, the structured vertex-path convention from #053, the annotation geometries from #093, and the auto-derived values from #135. Nothing new joins the dependency graph — no new packages, no new runtime libraries, no new Zustand stores. The staging buffer lives in React state inside the panel's host controller, the read-only signal lives on the existing session-state plot slice as `isReadOnly` plus a `readOnlyReason`, and the selection model stays the existing `features` slice — the map and Layers panel click handlers grow modifier flags but the shape of `selection` is unchanged. The headline schema change is one LinkML class (`VertexMetadata`) and one slot (`vertex_metadata`) added to `BaseFeatureProperties`, which means every feature class that inherits from it — `TrackProperties` plus the seven annotation classes — picks up the slot for free. The address inside each entry is a structured string `path` following #053's selection-path convention: `positions/N` for tracks, `rings/R/vertices/V` for polygons, `vertices/N` for lines and multipoints, `vertex/0` for points.

## Key Decisions

- **Staging buffer is panel-local React state, not a new Zustand slice.** The first plan had me adding a cross-package store; the Spec Navigator review pointed out that nothing outside the panel reads it, and that introducing shared state for a panel-private concern would be the wrong call. It now lives where the panel can see it and nowhere else.
- **The staging buffer, the save→flush wiring, and the per-save provenance call site are net-new in #192, not extensions of #447.** The original plan claimed they were inherited from the plot-editor; an Article I.3 audit showed they weren't. Misclassifying them risked shipping the silent-save bug into the per-feature path too, so I added an integrated save-path Vitest specifically to close that hole.
- **Read-only detection combines a writer capability report with post-write escalation.** The writer's `CapabilityReport.persistent` flag drives the pre-flight banner. If a save still fails with `ReadOnlyFilesystemError`, `EACCES`, or `EPERM`, the panel escalates to read-only after the fact and surfaces a notice. Where the catalog lock and the filesystem permission disagree, the most restrictive wins.
- **One shared `VertexMetadata` class, addressed by a structured string `path`.** The alternative was a per-geometry class hierarchy, which would have meant generating four near-identical types and four mode-resolver branches. A single class with a path slot kept the schema sparse (vertices with no metadata add nothing to the saved file), kept the editor branch-free (the same `label`/`tags`/`note` form regardless of geometry kind), and meant the mode resolver only needs to recognise a vertex path — not decode it.
- **`PropertiesForm` gets a `mode` prop and three new sibling components — `FeatureEditorMode`, `SubFeatureEditorMode`, `MultiSelectSummaryMode` — rather than a single super-component that branches internally.** Each mode is independently storyable, independently testable, and independently rerenderable when the selection changes.
- **Multi-select emission is upstream of the panel.** The map's `onSelect` and the Layers panel's row click handler grow modifier flags; the panel itself learns nothing new about how the selection was built. This keeps the panel's mode-resolution logic pure: it reads the selection and renders, and it never asks where the selection came from.
- **Vertex re-mapping under geometry mutation is explicitly deferred.** If a later feature edits a polygon's vertices, the rules for how `vertex_metadata` entries follow insertions and deletions will be defined alongside that feature, not pre-emptively here. Annotating today is in scope; reshaping is not.
