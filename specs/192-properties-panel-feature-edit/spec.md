# Feature Specification: Properties Panel — Feature & Sub-feature Editing

**Feature Branch**: `192-properties-panel-feature-edit`
**Created**: 2026-05-12
**Updated**: 2026-05-12 — scope expanded after `/speckit.review`: read-only plot detection, FeatureList multi-select emitter, override→auto-derived revert UX, and sub-feature editing for non-track annotations were pulled in from the original "Out of Scope" list (formerly slated for follow-up backlog items).
**Status**: Draft
**Input**: User description: "Extend Properties Panel to feature + sub-feature editing in plot view — reuses #447's ActivityPanel shell; form content swaps on `selection.primary`/`selection.featureIds` (one feature → feature editor; track-point path → sub-feature editor; cleared → plot editor); includes LinkML extension for point-level metadata (requires #447)"

**Backlog Reference**: Item 192 — extends issue #448 (depends on shipped #447).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit a single feature's metadata from inside an open plot (Priority: P1)

An analyst has a plot open and wants to correct or annotate the metadata of one
track on that plot — for example, fixing an incorrect nationality, adding a
classification tag, or overriding the auto-resolved vessel role. They click the
track on the map (or in the Layers panel), the Properties Panel switches to a
single-feature editor populated with that feature's editable schema fields,
they make the edit, and on plot save the change is persisted alongside any
plot-level edits.

**Why this priority**: This is the primary capability the item delivers and
the most common analyst workflow. Without it, fixing per-track metadata still
requires either re-importing or hand-editing JSON. Feature-level fields
(`debrief:feature_tags`, per-platform overrides) already exist in the schema
after #181 — only the editing surface is missing.

**Independent Test**: Open a plot containing at least one track, select the
track, change one editable field (e.g., add a tag), save the plot, reopen it,
and confirm the change is present and a provenance entry was recorded.

**Acceptance Scenarios**:

1. **Given** a plot is open and exactly one feature is selected, **When** the
   analyst opens the Properties Panel, **Then** the panel shows a form
   populated with that feature's editable, schema-defined fields
   (`debrief:feature_tags`, per-platform `TrackProperties` overrides) and a
   header identifying the feature by display name.
2. **Given** a single feature is selected and edits have been made in the
   Properties Panel, **When** the analyst saves the plot, **Then** the edits
   are persisted to the plot file, a provenance entry is appended (source =
   user edit, method = `properties-panel@`), and the panel's dirty indicator
   clears.
3. **Given** edits are staged in the Properties Panel for a single feature,
   **When** the analyst selects a different feature **without** saving,
   **Then** the staged edits remain in session-state for the original feature
   (not lost) and the form re-populates for the newly-selected feature.

---

### User Story 2 - Edit metadata on a single track point (sub-feature) (Priority: P1)

An analyst reviewing a track wants to annotate one specific fix on that track
— for example, marking a single point as "intercept", adding a free-text note,
or attaching a classification tag. They click the point (selection becomes
`track-id/index` per #053), the Properties Panel switches to a track-point
editor with the new point-level metadata fields, they make the edit, and on
save it persists with the feature.

**Why this priority**: Sub-feature editing is the headline new capability of
this item — there is currently no schema slot for per-point metadata at all,
and analysts have no way to annotate individual fixes. This unlocks
fine-grained tactical analysis (e.g., flagging significant moments in a
track's history).

**Independent Test**: Open a plot with a track, click one of the track's
points, set a label and a note in the panel, save the plot, reopen, click the
same point, and confirm the label and note are restored.

**Acceptance Scenarios**:

1. **Given** a plot is open and the primary selection is a track-point path
   (e.g., `track-1/42`), **When** the analyst opens the Properties Panel,
   **Then** the panel shows a form for that point's metadata fields (label,
   tags, note — defined by the new LinkML extension) and a header identifying
   the parent track and point index.
2. **Given** a track-point editor has unsaved edits, **When** the analyst
   saves the plot, **Then** the point-level metadata is persisted as part of
   the parent feature, a provenance entry is recorded, and the dirty indicator
   clears.
3. **Given** a track point has previously-saved metadata, **When** the analyst
   selects that point in a later session, **Then** the form is pre-populated
   with the stored values.

---

### User Story 3 - Editor swaps cleanly as selection changes (Priority: P2)

While working on a plot, analysts move fluidly between the plot, individual
features, and individual points. The Properties Panel must reflect the current
selection without requiring the analyst to think about which mode they're in.
When selection clears, the panel returns to the plot-level editor delivered in
#447. When two or more features are selected, the panel shows a non-editable
summary (bulk edit is out of scope for v1).

**Why this priority**: Coherent selection-driven swap behaviour is what makes
the unified panel feel like one tool rather than three. Misbehaviour here
(stale forms, lost edits, wrong header) directly undermines stories 1 and 2.

**Independent Test**: With a plot open, cycle through: no selection → one
feature → a point on that feature → two features → no selection. Confirm the
panel header and form region change as expected at each step and no
previously-staged edits are silently dropped.

**Acceptance Scenarios**:

1. **Given** a plot is open with no selection, **When** the analyst opens the
   Properties Panel, **Then** the panel shows the plot-level editor from #447
   (unchanged behaviour).
2. **Given** the analyst has two or more features selected, **When** the
   Properties Panel is active, **Then** the panel shows a read-only summary
   (count of selected features, shared field values where they agree, "—" or
   similar where they differ) and disables all input controls.
3. **Given** the analyst has a single feature selected with staged (unsaved)
   edits, **When** they clear the selection and then re-select the same
   feature, **Then** the previously-staged edits are restored in the form.

---

### User Story 4 - Multi-feature selection emits from map and Layers panel (Priority: P1)

An analyst working with several tracks (e.g., comparing two contacts on
the same plot) needs to select more than one feature. Today the
selection state shape supports an array, but the click handlers in the
map and the Layers panel only ever emit single-feature selections;
modifier+click is not wired up. Without this, US-3's multi-select
read-only summary mode is unreachable in the running app. This story
delivers the upstream emitter so the panel's existing multi-select
behaviour becomes a real workflow.

**Why this priority**: This is the gating prerequisite for the
multi-select summary mode already required by FR-011 / US-3 AS-2. Until
the click handlers emit multi-feature selections, that mode is dead
code. Same priority as US-1 / US-2 because shipping #192 without it
means a documented capability is silently unreachable.

**Independent Test**: Open a plot with at least two features. Hold the
platform modifier (e.g., Ctrl/Cmd) and click two distinct features on
the map. Repeat by Ctrl/Cmd-clicking two rows in the Layers panel.
Confirm in each case that the Properties Panel switches to the
multi-select read-only summary mode and the selection state reflects
both feature IDs.

**Acceptance Scenarios**:

1. **Given** a plot is open and one feature is already selected,
   **When** the analyst Ctrl/Cmd-clicks a second feature on the map,
   **Then** both features become selected (selection contains both
   IDs) and the Properties Panel switches to multi-select summary mode.
2. **Given** two features are selected, **When** the analyst
   Ctrl/Cmd-clicks one of them again, **Then** that feature is removed
   from the selection (toggle behaviour); if exactly one remains, the
   panel switches back to feature-editor mode.
3. **Given** two features are selected via the map, **When** the
   analyst then plain-clicks (no modifier) on a third feature, **Then**
   the selection collapses to just that third feature (replace
   behaviour) and the panel switches to feature-editor mode.
4. **Given** the analyst Ctrl/Cmd-clicks the same two features in the
   Layers panel rows, **Then** the multi-feature selection state is
   the same as if they had been clicked on the map.

---

### User Story 5 - Read-only plots disable editing visibly (Priority: P1)

Some plots are read-only — for example, items pulled from a locked
catalog folder, or items the analyst lacks write permission for. The
panel must make this state obvious and prevent edits at the source
(not just at save time, which would be a silent failure). This story
delivers the read-only signal end-to-end: detection at the catalog/
session-state boundary, propagation to the Properties Panel form, and
a clear UI banner.

**Why this priority**: Without read-only detection, the panel will
happily accept edits that the writer then rejects, leaving the analyst
confused (and producing a provenance entry against a save that did not
happen — Article I.3 / III.1 risk). P1 because every edit path in this
feature touches this state.

**Independent Test**: Mark a sample plot read-only (via a fixture or
the catalog's lock signal). Open it. Confirm every mode of the
Properties Panel (plot, feature, sub-feature, multi-select) renders in
a disabled state, the Save action is unavailable, and a clear banner
above the form explains the plot is read-only.

**Acceptance Scenarios**:

1. **Given** a read-only plot is opened, **When** the analyst opens the
   Properties Panel in any mode, **Then** every input is disabled, the
   Save action is unavailable, and a banner identifies the read-only
   reason (e.g., "Catalog item locked", "Read-only filesystem").
2. **Given** a writable plot is opened, **When** the analyst opens the
   Properties Panel, **Then** the read-only banner is absent and edits
   proceed normally (no regression to US-1, US-2, US-3).
3. **Given** a read-only plot is opened, **When** an attempt to save
   is made by any code path (autosave, save command), **Then** no
   write occurs, no provenance entry is appended, and a single
   non-blocking notice surfaces explaining why.

---

### User Story 6 - Revert an explicit override back to its auto-derived value (Priority: P2)

An analyst who has previously overridden a per-platform field (e.g.,
set `vessel_role = "intercept"` on a track whose registry-resolved
role is `"patrol"`) sometimes wants to undo that override and let the
auto-derived value flow back in. Today there is no UI affordance for
this — they would have to know the auto-derived value and type it
back, which defeats the purpose. This story adds a per-field "revert"
control on overrideable fields.

**Why this priority**: P2 because the override fields themselves are
already shipped (#181) and the auto-derived value is already
visible alongside the override (FR-005). The revert affordance is a
small UX completion, not a foundational capability. Without it,
analysts can set overrides but not unset them.

**Independent Test**: Open a feature with an explicit override on at
least one per-platform field. Confirm a "revert" control appears next
to the overridden field, click it, and verify that the field returns
to the auto-derived value and the dirty indicator reflects the change.
Save and reload; confirm the override is gone from the saved plot
file.

**Acceptance Scenarios**:

1. **Given** a feature has an explicit override on a per-platform
   field, **When** the analyst views the feature editor, **Then** a
   "revert" control appears next to that field showing the auto-
   derived value that would replace it.
2. **Given** the revert control is visible, **When** the analyst
   clicks it, **Then** the staged edit reverts to the auto-derived
   value (the override is removed, not replaced with a different
   explicit value), the dirty indicator updates accordingly, and the
   field's visual treatment switches back to "auto-derived".
3. **Given** a reverted feature has been saved, **When** the plot is
   reloaded, **Then** the saved file no longer carries the override
   for that field; the form re-renders the auto-derived value with no
   "revert" affordance.

---

### User Story 7 - Sub-feature editing for annotation shapes (Priority: P2)

Analysts annotate plots not only with tracks but also with shapes
drawn via the existing drawing toolbar (#093) — polygons (e.g.,
exclusion zones), polylines (e.g., transit corridors), and points
(markers). These features carry per-vertex geographic geometry but
have no per-vertex metadata slot today. This story generalises the
track-point pattern from US-2 to non-track features so analysts can
attach `label`, `tags`, and `note` to a single vertex of an annotation
in the same way they would to a track point.

**Why this priority**: P2 because the track-point pattern (US-2) is
the headline new sub-feature workflow; annotations are an extension of
the same idea to a different geometry family. Including it now (rather
than as a follow-up) avoids designing the schema slot twice and
ensures the panel's mode-resolution logic handles all geometry types
from day one.

**Independent Test**: Open a plot with at least one drawn annotation
that has more than one vertex (e.g., a 5-vertex polygon). Click a
single vertex (selection emits a vertex path appropriate to the
geometry). Confirm the Properties Panel switches to a sub-feature
editor for that vertex, populated with the same `label` / `tags` /
`note` fields. Save and reload; confirm the per-vertex annotation
persists.

**Acceptance Scenarios**:

1. **Given** a plot is open and the primary selection is a vertex
   path on a Polygon / LineString / MultiPoint feature, **When** the
   analyst opens the Properties Panel, **Then** the panel shows a
   sub-feature editor for that vertex with the same field set
   (`label`, `tags`, `note`) as the track-point editor.
2. **Given** vertex-level edits have been made, **When** the analyst
   saves the plot, **Then** the per-vertex metadata persists in the
   parent feature, a provenance entry records the vertex path, and
   the dirty indicator clears.
3. **Given** a vertex path that is well-formed but does not
   correspond to an existing vertex (e.g., out-of-range index in a
   Polygon ring), **When** the panel renders, **Then** the form shows
   an "out-of-range" notice and save is disabled until a valid vertex
   is selected (mirrors the track-point out-of-range edge case).
4. **Given** a Point feature (single-vertex), **When** the analyst
   selects the underlying point, **Then** they MAY edit metadata on
   the single implicit vertex; behaviour is consistent with the
   per-vertex pattern on multi-vertex features.

---

### Edge Cases

- **Selection points to a deleted feature**: When the selection references a
  feature ID that no longer exists in the open plot (e.g., undo, external
  edit), the panel falls back to the plot-level editor and the stale selection
  is cleared.
- **Track-point index out of range**: When a track-point path references an
  index beyond the track's current point count, the panel shows an empty
  sub-feature form with an explanatory message and disables save until a valid
  point is selected.
- **Schema field added between sessions**: When a new editable field is added
  to the LinkML schema and an existing plot is opened, the new field appears
  blank in the form and is editable; saving stores the value without modifying
  unrelated fields.
- **Switching feature with unsaved point-level edits**: When the analyst has
  unsaved edits on a track-point and selects a different feature entirely, the
  point-level edits remain staged in session-state (consistent with the
  feature-level "stash on selection change" rule) and are flushed on the next
  plot save.
- **Concurrent plot save while form is open**: When a plot save is triggered
  (e.g., autosave or another action) while the form has staged edits, those
  edits are included in the save and the dirty indicator clears.
- **Read-only plots** (now in scope — US-5): When the open plot is read-only
  (e.g., from a locked catalog item or a non-writable filesystem), every mode
  of the panel renders inputs as disabled, the Save action is unavailable, and
  a banner identifies the read-only reason.
- **Sub-feature editing on non-track features** (now in scope — US-7):
  Selecting a vertex on a Polygon / LineString / MultiPoint annotation
  switches the panel to sub-feature mode with the same field set as track
  points. The mode resolver MUST handle all geometry types in scope; vertex
  paths that are well-formed but point at non-existent vertices fall to an
  "out-of-range" notice (mirrors the track-point edge case above).
- **Selection emitted from Layers panel vs. map** (now in scope — US-4):
  Identical modifier+click semantics MUST apply whether the click originates
  on the map canvas or on a Layers panel row; the resulting `selection`
  shape is identical regardless of emission source.
- **Reverting an override on a field that has no auto-derived value** (now
  in scope — US-6): When the analyst tries to revert an override on a field
  whose registry resolution returns no auto-derived value (e.g., unknown
  platform), the revert control is disabled with a tooltip explaining why;
  the field's value cannot be silently cleared because there is nothing to
  fall back to.

## Requirements *(mandatory)*

### Functional Requirements

#### Selection-driven panel mode

- **FR-001**: The Properties Panel MUST determine its editing mode from the
  current session-state selection on every selection change, using the
  following rules in order:
  1. If `selection.primary` is a **vertex/sub-feature path** addressing a
     single position within a feature's geometry (the family includes track-
     point paths from #053 and vertex paths on Polygon / LineString /
     MultiPoint annotations from US-7) → **sub-feature editor** mode.
  2. Else if exactly one feature is selected (`selection.featureIds` length
     == 1) → **feature editor** mode.
  3. Else if two or more features are selected → **multi-select read-only
     summary** mode.
  4. Else (no selection) → **plot editor** mode (the existing #447 behaviour).

  The mode resolver MUST recognise vertex paths on every geometry type in
  the open plot; an unknown or malformed path MUST resolve to **stale** and
  the panel MUST fall back to plot-editor mode while clearing the selection.
- **FR-002**: The panel MUST update its mode and contents within one render
  cycle of any selection change, with no perceptible delay to the analyst.
- **FR-003**: The panel header MUST identify the editing target unambiguously:
  the plot title in plot-editor mode; the feature display name in
  feature-editor mode; the parent track name and point index in sub-feature
  mode; and the selected count in multi-select mode.

#### Feature editor

- **FR-004**: In feature-editor mode, the form MUST render inputs for every
  schema-defined editable field on the selected feature's properties, driven
  by the LinkML-generated JSON Schema (no per-feature-type hand-coded forms).
- **FR-005**: For per-platform override fields on `TrackProperties` (those
  introduced by #181 such as nationality, vessel class, type, role), the form
  MUST visually distinguish auto-derived values from explicit overrides so the
  analyst can see at a glance which fields they have customised.
- **FR-006**: The form MUST stage edits in an in-memory buffer owned by the
  panel's host controller, keyed by the selected feature's ID (or by the
  feature-ID + vertex-address pair for sub-feature mode — see FR-009).
  Staged edits MUST persist across selection changes within the same
  session and MUST be flushed to the plot file on save. The buffer is
  panel-local — implementation MUST NOT introduce a separate cross-package
  store for this state.

#### Sub-feature editor & schema extension

- **FR-007**: This feature MUST extend the LinkML schema to define a
  vertex-level metadata slot carrying at minimum: a free-text `label`, a tag
  list, and a free-text `note` field. The slot MUST be reachable from every
  geometry-bearing feature class in scope — at minimum `TrackProperties`
  (track points) and the annotation feature classes from #093 (Polygon,
  LineString, MultiPoint). Generated Pydantic and TypeScript types MUST flow
  from this schema change. The cross-geometry shape (single shared class,
  per-geometry classes, or polymorphic address slot) is a design decision
  resolved in research.md (see R-008 in the plan).
- **FR-008**: In sub-feature-editor mode, the form MUST render inputs driven
  by the new vertex-metadata schema, populated with any previously-saved
  values for the selected vertex and empty otherwise. The same field set
  (`label`, `tags`, `note`) MUST appear regardless of geometry type, so the
  analyst sees a consistent editor.
- **FR-009**: Edits to vertex-level metadata MUST stage in session-state
  under a key combining the feature ID and the vertex address (a position
  index for tracks; a ring+vertex address for polygons; a vertex index for
  LineString / MultiPoint), and MUST be flushed to the parent feature on
  plot save such that round-tripping the plot file preserves every edit.
- **FR-010**: A vertex with no metadata MUST NOT add empty fields to the
  saved plot file — only vertices with at least one set value carry a
  metadata payload (storage stays sparse, on every geometry type).

#### Multi-select & empty selection

- **FR-011**: In multi-select read-only summary mode, the panel MUST display
  the count of selected features and, for each schema field shared across all
  selected features, either the common value or a clear "(differs)" indicator;
  all input controls MUST be disabled.
- **FR-012**: In plot-editor mode (no selection), the panel MUST behave
  exactly as delivered in #447 — this feature MUST NOT regress that
  behaviour.

#### Persistence, provenance, and offline

- **FR-013**: Every save that includes feature- or sub-feature-level edits
  MUST append a provenance entry to the plot's narrative log identifying the
  source as a user edit, the method as `properties-panel@`, and listing the
  edited field paths (consistent with #447's pattern, per Constitution
  Article III).
- **FR-014**: All editing flows MUST work fully offline — no network calls
  are required for selection, form rendering, edit staging, save, or
  provenance recording.
- **FR-015**: When the open plot is read-only (see FR-018), the form MUST
  render in a disabled state across every mode (plot, feature, sub-feature,
  multi-select), the save action MUST be unavailable, no provenance entry
  MUST be appended on any failed-save code path, and a clear explanation
  MUST be shown.

#### Behavioural contracts

- **FR-016**: The form widget set MUST follow the same `ParameterEditor`
  pattern used by #447 — no new form library is introduced.
- **FR-017**: The selection model MUST remain the existing session-state
  `features` slice (`selection.featureIds`, `selection.primary`); this feature
  MUST NOT introduce a new selection store.

#### Read-only plot detection (US-5)

- **FR-018**: The system MUST surface a read-only signal for the currently
  open plot via session-state. The signal MUST be sourced from at least the
  following inputs: catalog-item lock state (if the STAC item is marked
  locked) and filesystem write-permission for the item's storage location.
  Where multiple sources disagree, the most restrictive wins.
- **FR-019**: The Properties Panel MUST consume the read-only signal and
  apply it to every mode of the form (see FR-015). The signal MUST also be
  visible to other panels that might offer write affordances (Layers panel,
  drawing toolbar), via the same session-state field, so those panels can
  disable their own write controls. Wiring those other panels' UX is **out
  of scope** for this feature; exposing the signal where they can read it
  is in scope.
- **FR-020**: Attempted writes against a read-only plot MUST fail explicitly
  (Constitution Article I.3 — no silent failures): no plot file change, no
  provenance entry, one user-visible notice identifying the reason. The
  staging buffer MUST NOT be cleared by a failed save.

#### Multi-feature selection emission (US-4)

- **FR-021**: The map click handler and the Layers panel row click handler
  MUST emit multi-feature selections when the user clicks with the platform
  modifier (Ctrl on Windows/Linux, Cmd on macOS, or the local equivalent in
  the web-shell). Behaviour: modifier+click toggles the clicked feature in
  the current `selection.featureIds`; plain click replaces the selection
  with the clicked feature.
- **FR-022**: Emitted multi-feature selections MUST set `selection.primary`
  to the most-recently-toggled feature ID when the selection contains two
  or more features, and to that lone ID when the selection collapses back
  to one. When the selection becomes empty, `selection.primary` MUST be
  `null`.

#### Override → auto-derived revert (US-6)

- **FR-023**: For every per-platform override field on `TrackProperties`
  (those introduced by #181), the feature editor MUST render a per-field
  "revert" control whenever the field carries an explicit override value
  AND the registry resolution returns a non-null auto-derived value.
- **FR-024**: Activating a revert control MUST remove the explicit
  override from the staged edits (re-establishing the auto-derived value
  as the effective value) and MUST update the field's visual treatment to
  the "auto-derived" presentation defined by FR-005. After save, the
  underlying override slot on the saved feature MUST be absent (not set to
  an empty/null sentinel), preserving the sparse-storage invariant
  (FR-010 family). When the registry resolution returns no auto-derived
  value, the revert control MUST be disabled with an explanatory tooltip.

#### Vertex-metadata generalisation to annotations (US-7)

- **FR-025**: The vertex-metadata schema slot defined by FR-007 MUST be
  reachable from every annotation feature class in scope (at minimum: the
  shapes producible via the drawing toolbar shipped by #093 — Polygon,
  LineString, MultiPoint, and Point). The mapping between geometry kind
  and vertex-address shape MUST be documented in the data model and the
  schema fixtures.
- **FR-026**: The sub-feature editor MUST present an identical field set
  (`label`, `tags`, `note`) regardless of the parent feature's geometry
  type; the editor's behaviour MUST NOT branch on geometry kind beyond
  what's required to parse the vertex address.
- **FR-027**: Vertex paths emitted by the map click handlers MUST be
  well-formed for every geometry type in scope; out-of-range paths MUST
  surface the "out-of-range" notice and disable save (mirroring the
  track-point edge case).
- **FR-028**: When a feature's geometry has only one vertex (a Point), the
  sub-feature editor MAY be reached from selecting the feature directly;
  the editor's behaviour MUST be consistent with multi-vertex features.

### Key Entities *(include if feature involves data)*

- **Feature (existing)**: A single map feature in an open plot. For tracks,
  has editable schema-defined properties including `debrief:feature_tags`,
  display name, nationality, vessel class, type, and role. Identified by a
  feature ID stable within the plot.
- **Vertex (existing geometry, new metadata slot)**: A single position
  within a feature's geometry — a track fix for `Track`, a ring vertex
  for `Polygon`, a path vertex for `LineString`, a single point for
  `MultiPoint` / `Point`. Addressed by a structured vertex path. Today
  carries only geometric and (for tracks) kinematic data; this feature
  adds an optional `label` / `tags` / `note` payload defined by a new
  LinkML extension reachable from every in-scope feature class.
- **Selection state (existing shape, extended emitters)**: The
  session-state slice tracking `selection.featureIds` (array) and
  `selection.primary` (string — feature ID, or a structured vertex path
  from #053 for sub-feature edits). Shape is unchanged; emitters (map +
  Layers panel click handlers) gain modifier-aware multi-select
  semantics (FR-021, FR-022).
- **Staged edits (panel-local, in-memory)**: React-state buffer held by
  the panel's host controller, keyed by feature ID for feature-level
  edits and by feature-ID + vertex-address for vertex-level edits.
  Flushed on plot save; cleared after a successful write; preserved
  across selection changes and across failed saves.
- **Read-only signal (new)**: A boolean derived in session-state from
  catalog-item lock state and filesystem write-permission. Consumed by
  the Properties Panel (FR-015, FR-019) and exposed for other write-
  capable panels to consume in subsequent work.
- **Provenance entry (existing)**: Narrative-log record appended on
  successful save, carrying source, method, and the list of edited
  field paths. Vertex-level paths use the appropriate geometry-aware
  prefix in `inputs[]`.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Edit metadata on a single feature, on a single vertex
  within any geometry-bearing feature (track point, polygon vertex, line
  vertex, point), or compare across multiple selected features — without
  leaving the plot view.
- **Key Decision(s)**:
  1. Which feature (or which vertex of a feature) the analyst wants to
     annotate; whether to compare two or more features.
  2. Which field(s) to set, override, or revert and to what value.
  3. Whether to commit by saving the plot or to abandon by reloading.
  4. Whether the plot is editable at all (read-only state surfaces before
     the analyst attempts an edit).
- **Decision Inputs**: The selected feature's existing values; for per-
  platform overrides, the auto-derived value beneath the override (so the
  analyst can see what they're departing from **and** can revert to it
  with one click — US-6); the schema definition (which surfaces field
  labels, allowed values, and help text); the dirty indicator (so the
  analyst knows they have unsaved work); the read-only banner (so the
  analyst knows up-front whether edits are accepted at all).

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Plot open, Properties Panel visible, no selection — **plot-editor mode** (from #447) | Click a single feature on the map or in the Layers panel | Panel header changes to the feature name; form re-renders with that feature's editable fields populated |
| 2 | **Feature-editor mode**, single feature selected | Edit one or more fields | Inputs reflect new values; dirty indicator appears on the panel |
| 3 | Feature-editor mode with staged edits | Click a single point on the same track | Header changes to "Track X — point N"; form re-renders with point-level metadata fields; the feature-level edits remain staged but hidden from view |
| 4 | **Sub-feature-editor mode** | Set a label and add a tag | Inputs reflect new values; dirty indicator persists |
| 5 | Sub-feature-editor mode with staged edits | Save the plot | Plot is written, both feature-level and point-level edits are flushed, provenance entry appended, dirty indicator clears |
| 6 | Saved | Click empty space to clear selection | Panel returns to plot-editor mode |

### UI States

- **Empty State** (no selection): Plot-editor form from #447 — already
  delivered; no change.
- **Single-feature State**: Header shows feature display name and type;
  schema-driven form region with editable inputs; per-platform overrides
  visually distinguished (e.g., chip or icon) from auto-derived values; save
  status reflected in the panel's existing dirty indicator.
- **Sub-feature State**: Header shows parent feature name and a vertex
  identifier appropriate to the geometry (track point N; polygon ring R
  vertex V; line vertex V; etc.) plus a small breadcrumb back to the
  parent feature; schema-driven form region for vertex-level metadata
  (`label`, `tags`, `note`) regardless of geometry type.
- **Multi-select State**: Header shows "N features selected"; read-only
  summary listing shared fields with their common values or "(differs)";
  inputs disabled; an inline note explains that bulk edit is not supported
  in this version. Reachable in normal use via Ctrl/Cmd-click on map or
  Layers panel (US-4).
- **Loading State**: When a selection change requires re-rendering the form
  (e.g., switching from feature to point), a brief skeleton placeholder
  occupies the form region; under normal conditions this is imperceptible.
- **Error State**: When a staged edit cannot be flushed on save (e.g., schema
  validation rejects a value), an inline error appears next to the offending
  field, the dirty indicator persists, and unrelated edits are not lost.
- **Read-only State** (reachable per US-5): Header shows a lock indicator
  identifying the read-only reason (locked catalog item, non-writable
  filesystem, etc.); form is rendered with inputs disabled across every
  mode; Save action unavailable; banner above the form explains the plot
  is read-only and why.
- **Stale-selection State**: When the selected feature or point no longer
  exists in the plot, the panel falls back to plot-editor mode and (silently)
  the selection is cleared.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can locate, edit, save, and verify a single
  schema-defined field on one selected feature in under 30 seconds, starting
  from an open plot with the feature visible.
- **SC-002**: An analyst can locate, edit, save, and verify point-level
  metadata (label, tag, or note) on a single track point in under 45 seconds,
  starting from an open plot with the parent track visible.
- **SC-003**: 100% of editable fields defined in the LinkML schema for the
  feature/point types in scope render automatically in the form without
  per-field UI changes; adding one new schema field surfaces it in the form
  without modifying the panel component.
- **SC-004**: 100% of saves that include feature- or point-level edits produce
  a provenance entry capturing source, method, and edited field paths.
- **SC-005**: Round-tripping a plot (save → close → reopen) preserves 100% of
  feature-level and point-level edits with no data loss across at least 100
  edits in a single session.
- **SC-006**: Selection-driven mode swap is imperceptible to analysts in
  user-acceptance testing — no participant reports a stale form, lost edits,
  or wrong header during a five-task scripted session.
- **SC-007**: All editing flows complete successfully in offline mode,
  verified by running the full acceptance scenario set with the network
  disabled.
- **SC-008**: The plot-level editor delivered in #447 continues to pass its
  existing acceptance tests — zero regressions.
- **SC-009** (US-5, read-only): On a read-only plot, 0% of save attempts
  result in a file change, 0% append a provenance entry, and 100% surface a
  user-visible notice identifying the read-only reason. Verified across all
  four panel modes.
- **SC-010** (US-4, multi-select): An analyst can build a 2-feature
  selection via Ctrl/Cmd-click on the map and via Ctrl/Cmd-click on the
  Layers panel; both paths produce an identical `selection` shape, verified
  in user-acceptance testing across at least the two platforms (macOS, the
  web-shell on a desktop browser).
- **SC-011** (US-6, revert): An analyst can revert any per-platform override
  to its auto-derived value in under 5 seconds from a feature already open
  in the panel, including the save round-trip. 100% of revert actions
  produce a saved plot file with no residual override entry for the
  reverted slot.
- **SC-012** (US-7, annotations): An analyst can attach `label` / `tags` /
  `note` to a single vertex of a Polygon, LineString, MultiPoint, or Point
  feature with the same workflow steps as a track point (US-2), in under
  60 seconds end-to-end. Round-tripping a plot preserves 100% of vertex-
  level edits regardless of geometry type, across at least 50 edits in a
  single session covering all four geometry kinds.

## Assumptions

- **A-1**: Issue #447 is shipped and provides the `ActivityPanel` Properties
  Panel shell, the schema-driven form renderer (`PropertiesForm`), and the
  widget library (`ParameterEditor`, `ArrayWidget`, `BboxWidget`,
  `DateTimeWidget`, `PlatformArrayWidget`). The dirty indicator, the
  staging buffer, the save→flush wiring, and the per-save provenance call
  site are **NOT** part of #447 and are introduced here (corrected after
  `/speckit.review` — see review notes in the implementation plan).
- **A-2**: The structured vertex-path convention delivered by #053 is
  extended to cover annotation geometries (Polygon, LineString,
  MultiPoint, Point) by this feature; the path shape for non-track
  geometries is captured in research.md (R-008).
- **A-3**: The existing `features` slice in session-state is sufficient to
  carry the selection state for every mode (plot, feature, sub-feature,
  multi-select); no new selection store. Staged edits live in panel-
  local React state, not in the session-state store.
- **A-4**: Bulk-edit affordances across multi-feature selections remain
  deferred to a follow-up. Multi-feature **selection emission** (US-4) is
  in scope; multi-feature **simultaneous editing** is not.
- **A-5**: The new LinkML vertex-metadata extension ships as part of this
  feature (not a separate backlog row); the schema-test strategy
  (`CONSTITUTION.md`) applies to the new slots, on every geometry type
  in scope.
- **A-6**: Read-only plot detection ships as part of this feature
  (formerly deferred — pulled in after `/speckit.review`). The detection
  signal is sourced from catalog-item lock state and filesystem write-
  permission; richer lock semantics (e.g., per-field locks, multi-user
  optimistic locking) remain out of scope.
- **A-7**: Reverting an explicit override back to its auto-derived value
  (US-6) ships as part of this feature (formerly deferred). The
  affordance is per-field and per-feature — bulk revert is out of scope.

## Dependencies

- **#447** — Properties Panel shell, schema-driven form renderer, widget
  library, and plot-editor mode (prerequisite, shipped). Note: the
  staging buffer, save-time flush, and provenance call site are **not**
  part of #447 — they ship here.
- **#181** — per-platform override fields on `TrackProperties` (shipped —
  the fields the feature editor exposes and US-6's revert acts on).
- **#053** — nested-child selection providing the structured vertex-path
  format for tracks (shipped — drives sub-feature mode detection; US-7
  extends the convention to annotation geometries).
- **#093** — drawing toolbar / shape palette providing the annotation
  feature classes (Polygon, LineString, MultiPoint, Point) that US-7
  generalises to.
- **#135** — auto-populated STAC extension props on save (complementary;
  the feature editor surfaces auto-derived values that #135 produces and
  that US-6's revert restores).

## Out of Scope

- **Bulk edits** across multiple selected features. Multi-feature
  *selection emission* (US-4) and the read-only *summary* view are in
  scope; simultaneously writing the same field to all selected features
  is not.
- **Editing geometry or coordinates** of features or vertices. Vertex-
  level metadata (label/tags/note) is in scope; moving, inserting, or
  deleting a vertex is not.
- **Vertex re-mapping under geometry mutation.** If a future feature
  edits geometry, the rule for how `vertex_metadata` follows insertions
  and deletions is out of scope here and will be defined alongside that
  geometry-editing feature.
- **Catalog-browser editing surface** — already delivered in #447 and
  unchanged here.
- **Richer read-only semantics** beyond catalog lock + filesystem
  permission (e.g., per-field locks, multi-user optimistic locking).
- **Wiring other panels** (Layers panel write controls, drawing toolbar)
  to the read-only signal — the signal is exposed in session-state
  (FR-019) so subsequent features can pick it up, but updating those
  panels' UX is not in scope here.
- **Bulk revert** of multiple overrides at once. Per-field revert
  (US-6) is in scope; "revert all overrides on this feature" is not.
