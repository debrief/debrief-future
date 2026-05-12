# Feature Specification: Properties Panel — Feature & Sub-feature Editing

**Feature Branch**: `192-properties-panel-feature-edit`
**Created**: 2026-05-12
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
- **Read-only plots**: When the open plot is read-only (e.g., from a locked
  catalog item), the form renders in disabled state and shows a banner
  explaining why edits cannot be saved.
- **Sub-feature editing on non-track features**: Selecting a point on a
  non-track feature (e.g., an annotation shape) shows a "sub-feature editing
  not yet supported for this feature type" message rather than an empty form
  (explicitly out of scope for v1 — see Out of Scope).

## Requirements *(mandatory)*

### Functional Requirements

#### Selection-driven panel mode

- **FR-001**: The Properties Panel MUST determine its editing mode from the
  current session-state selection on every selection change, using the
  following rules in order:
  1. If `selection.primary` is a track-point path (e.g., `track-id/index`) →
     **sub-feature editor** mode.
  2. Else if exactly one feature is selected (`selection.featureIds` length
     == 1) → **feature editor** mode.
  3. Else if two or more features are selected → **multi-select read-only
     summary** mode.
  4. Else (no selection) → **plot editor** mode (the existing #447 behaviour).
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
- **FR-006**: The form MUST stage edits in the existing session-state store
  (Zustand) under the selected feature's ID; staged edits MUST persist across
  selection changes within the same session and be flushed to the plot file on
  save.

#### Sub-feature editor & schema extension

- **FR-007**: This feature MUST extend the LinkML schema to define a
  point-level metadata slot on track features carrying at minimum: a free-text
  `label`, a tag list, and a free-text `note` field. Generated Pydantic and
  TypeScript types MUST flow from this schema change.
- **FR-008**: In sub-feature-editor mode, the form MUST render inputs driven
  by the new point-metadata schema, populated with any previously-saved values
  for the selected point and empty otherwise.
- **FR-009**: Edits to point-level metadata MUST stage in session-state under
  a key combining the feature ID and point index, and MUST be flushed to the
  parent feature on plot save such that round-tripping the plot file preserves
  every edit.
- **FR-010**: A track point with no metadata MUST NOT add empty fields to the
  saved plot file — only points with at least one set value carry a metadata
  payload (storage stays sparse).

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
- **FR-015**: When the open plot is read-only, the form MUST render in a
  disabled state, the save action MUST be unavailable, and a clear
  explanation MUST be shown.

#### Behavioural contracts

- **FR-016**: The form widget set MUST follow the same `ParameterEditor`
  pattern used by #447 — no new form library is introduced.
- **FR-017**: The selection model MUST remain the existing session-state
  `features` slice (`selection.featureIds`, `selection.primary`); this feature
  MUST NOT introduce a new selection store.

### Key Entities *(include if feature involves data)*

- **Feature (existing)**: A single map feature in an open plot. For tracks,
  has editable schema-defined properties including `debrief:feature_tags`,
  display name, nationality, vessel class, type, and role. Identified by a
  feature ID stable within the plot.
- **Track point (existing geometry, new metadata slot)**: An individual fix on
  a track, addressed by `track-id/index`. Today carries only time and
  kinematic data; this feature adds an optional metadata payload (label, tags,
  note) defined by a new LinkML extension.
- **Selection state (existing)**: The session-state slice tracking
  `selection.featureIds` (array) and `selection.primary` (string — feature ID
  or `track-id/index` for nested-child paths from #053).
- **Staged edits (in-memory)**: Per-session Zustand store entries holding
  unsaved changes keyed by feature ID (for feature-level edits) or
  feature-ID + point-index (for point-level edits). Flushed on plot save.
- **Provenance entry (existing)**: Narrative-log record appended on save,
  carrying source, method, and the list of edited field paths.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Edit metadata on a single feature, or on a single point
  within a track, without leaving the plot view.
- **Key Decision(s)**:
  1. Which feature (or which point on a track) the analyst wants to annotate.
  2. Which field(s) to set or override and to what value.
  3. Whether to commit by saving the plot or to abandon by reloading.
- **Decision Inputs**: The selected feature's existing values; for per-platform
  overrides, the auto-derived value beneath the override (so the analyst can
  see what they're departing from); the schema definition (which surfaces field
  labels, allowed values, and help text); the dirty indicator (so the analyst
  knows they have unsaved work).

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
- **Sub-feature State**: Header shows parent track name and point index plus a
  small breadcrumb back to the parent feature; schema-driven form region for
  point-level metadata (label, tags, note in v1).
- **Multi-select State**: Header shows "N features selected"; read-only
  summary listing shared fields with their common values or "(differs)";
  inputs disabled; an inline note explains that bulk edit is not supported in
  this version.
- **Loading State**: When a selection change requires re-rendering the form
  (e.g., switching from feature to point), a brief skeleton placeholder
  occupies the form region; under normal conditions this is imperceptible.
- **Error State**: When a staged edit cannot be flushed on save (e.g., schema
  validation rejects a value), an inline error appears next to the offending
  field, the dirty indicator persists, and unrelated edits are not lost.
- **Read-only State**: Header shows a lock indicator; form is rendered with
  inputs disabled; banner above the form explains the plot is read-only and
  why.
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

## Assumptions

- **A-1**: Issue #447 is shipped and provides the `ActivityPanel` Properties
  Panel shell, the schema-driven form renderer, the dirty indicator, and the
  provenance wiring on plot save. This feature reuses all of them.
- **A-2**: Track-point selection paths follow the `track-id/index` convention
  delivered in #053; no change to that convention is needed here.
- **A-3**: The existing `features` slice in session-state is sufficient to
  carry per-feature and per-(feature, point) staged edits — implementation
  may extend the slice's shape but does not introduce a new store.
- **A-4**: A read-only "differs" indicator is acceptable for the multi-select
  summary in v1; bulk-edit affordances are deferred.
- **A-5**: The new LinkML point-metadata extension ships as part of this
  feature (not a separate backlog row); the schema-test strategy
  (`CONSTITUTION.md`) applies to the new slots.
- **A-6**: Reverting an explicit override back to the auto-derived value is
  out of scope here and may be picked up in a follow-up.

## Dependencies

- **#447** — Properties Panel shell, schema-driven form renderer, plot-editor
  behaviour, provenance wiring on save (prerequisite, shipped).
- **#181** — per-platform override fields on `TrackProperties` (shipped — the
  fields the feature editor exposes).
- **#053** — nested-child selection providing the `track-id/index` path
  format (shipped — drives sub-feature mode detection).
- **#135** — auto-populated STAC extension props on save (complementary; the
  feature editor surfaces auto-derived values that #135 produces).

## Out of Scope

- Bulk edits across multiple selected features (multi-select stays read-only
  in v1).
- Editing geometry or coordinates of features or points (metadata only).
- Sub-feature editing for non-track features (annotation shapes, etc.) —
  revisit after the track-point pattern proves out.
- Reverting an explicit override back to its auto-derived value (potential
  follow-up).
- Catalog-browser editing surface — already delivered in #447 and unchanged
  here.
