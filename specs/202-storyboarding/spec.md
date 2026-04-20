# Feature Specification: Storyboarding for Briefings

**Feature Branch**: `202-storyboarding`
**Created**: 2026-04-20
**Status**: Draft (schema section only — other sections pending)
**Input**: Backlog epic #024 — [Storyboarding Briefings](../../docs/ideas/017-storyboarding-briefings.md)

> **Note**: This spec is being built up section by section. Only the **Key Entities**
> section below is authoritative at this point. All other sections are stubs and
> will be filled in subsequent passes.

## User Scenarios & Testing *(mandatory)*

User stories are ordered by priority. Each is independently testable: a later
story can be developed and validated against fixture data even if the earlier
stories are not yet complete — though in practice **US1 (Capture) is the
critical path** because it is how the data model is exercised end-to-end.

### User Story 1 — Capture a scene from the current map state (Priority: P1)

An analyst reviewing a recorded exercise reaches a moment of interest — the
map viewport is framed, the time slider is on the right instant, and a
chosen set of tracks is toggled visible. They press a capture shortcut and
the current state is frozen as a named **Scene** inside a **Storyboard**
attached to the plot. The first capture on a plot also creates the
Storyboard itself; subsequent captures append.

**Why this priority**: Capture is the foundation. Without it, no
Storyboards or Scenes exist and no other story can run. It is also the
sole writer of the schema entities, so it exercises the full round-trip
path end-to-end.

**Independent Test**: With a plot open in the Map Viewer, press the capture
shortcut on a plot that has no Storyboard yet. Confirm: (a) the panel
prompts for a Storyboard name, (b) a Scene Feature with the expected
viewport / timestamp / visibility / thumbnail is persisted into the plot
FeatureCollection, (c) the plot is marked dirty, (d) re-opening the plot
restores the Scene unchanged (schema round-trip).

**Acceptance Scenarios**:

1. **Given** a plot open in the Map Viewer with no Storyboards, **When** the
   analyst triggers the capture shortcut, **Then** the panel prompts for a
   Storyboard name, and on confirmation persists one Storyboard Feature plus
   one Scene Feature whose viewport, timestamp, and `visible_feature_ids`
   match the current map state.
2. **Given** a plot with an active Storyboard, **When** the analyst captures
   again at a new timestamp, **Then** a new Scene is appended and ordered by
   `timestamp` (no explicit order field).
3. **Given** the #174 thumbnail pipeline returns an error, **When** capture
   is triggered, **Then** no Scene is persisted, an error toast is shown,
   and the plot is not marked dirty.
4. **Given** a capture at a timestamp that already has a Scene in the active
   Storyboard, **When** the analyst confirms capture, **Then** they are
   prompted **Replace / Offset (+1 s) / Cancel** and no write occurs until
   the prompt is resolved.
5. **Given** a successful capture, **When** the panel re-reads the plot,
   **Then** the default Scene title is the DTG of the captured timestamp
   (`DDHHmmZ MMM YY`, fallback ISO-8601) and is inline-editable.

---

### User Story 2 — Step through a storyboard to deliver a briefing (Priority: P2)

With Scenes captured, the analyst wants to walk a stakeholder through the
exercise in order. They open the Storyboard panel, pick a board from the
header dropdown, and step forward and backward through its Scenes using
on-screen transport buttons or scoped arrow keys. The map animates between
Scenes and the time slider moves with them; between Scenes the analyst can
scrub within the current segment.

**Why this priority**: This is the stated purpose of the feature —
"guided walkthroughs of recorded exercises." It delivers the end-user
value on top of P1.

**Independent Test**: Load a plot with a fixture Storyboard of at least
three Scenes. Confirm: (a) forward button and scoped Right-arrow advance to
the next Scene, (b) the map performs an animated `flyTo` and the time
slider tweens to the Scene's `timestamp`, (c) the time slider is scrubbable
only within `[current_scene.t, next_scene.t]` and is locked beyond the
last Scene, (d) Scene viewport rectangles render on the map only for the
active Storyboard.

**Acceptance Scenarios**:

1. **Given** an active Storyboard with multiple Scenes, **When** the analyst
   presses Forward (button or scoped Right arrow), **Then** the map
   animates to the next Scene's `viewport` and the time slider tweens to
   its `timestamp` over `transition_duration_ms`.
2. **Given** playback is sitting on Scene N, **When** the analyst scrubs the
   time slider, **Then** scrubbing is constrained to
   `[Scene[N].timestamp, Scene[N+1].timestamp]`; at the last Scene, scrub
   beyond `timestamp` is disabled.
3. **Given** the active Storyboard is selected, **When** the map renders,
   **Then** each Scene's viewport Polygon shows as a faint rectangle on the
   map, and clicking a rectangle selects that Scene in the panel and
   animates to it. Rectangles for non-active Storyboards are hidden.
4. **Given** a Scene references `visible_feature_ids` that are not present
   in the plot or a `timestamp` outside the plot's time range, **When** the
   analyst tries to step onto that Scene, **Then** playback is **hard-blocked**
   with a prompt to edit or remove the Scene; no partial animation occurs.

---

### User Story 3 — Refine a captured storyboard (edit suite) (Priority: P3)

After an initial capture pass, the analyst polishes the Storyboard: renames
Scenes, writes markdown descriptions, deletes mistakes (with an undo
window), re-snapshots a Scene to the current map state, inserts a Scene at
an intermediate timestamp, duplicates a Scene to a new timestamp, and
copies Scenes to another Storyboard on the same plot.

**Why this priority**: Refinement makes captured Storyboards presentation-
ready. It sits above the capture+playback loop because the loop is already
useful without it, but it is what turns a raw capture into a polished
briefing.

**Independent Test**: Starting from a fixture Storyboard, exercise each
edit op (rename, describe, delete+undo, update-to-current, duplicate,
insert-middle, copy-to-other-storyboard) and confirm: (a) the mutation
persists in the plot FeatureCollection, (b) provenance fields are updated
and a `HistoryEntry` is appended, (c) an entry appears in the Analysis Log
Panel (#176) with the Scene thumbnail.

**Acceptance Scenarios**:

1. **Given** a Scene, **When** the analyst renames it or edits its markdown
   description, **Then** the change is persisted, `last_modified_{by,at}`
   are updated, and a `HistoryEntry` (`rename` or `describe`) is appended.
2. **Given** a Scene, **When** the analyst deletes it, **Then** a toast
   offers undo for the remainder of the session; accepting undo restores
   the Scene exactly; dismissing the toast or ending the session finalises
   the delete.
3. **Given** a Scene, **When** the analyst triggers `update-to-current`,
   **Then** `viewport`, `timestamp`, `visible_feature_ids`,
   `feature_set_hash`, and `thumbnail_asset_ref` are all re-snapshotted
   from the current map state as a single atomic write.
4. **Given** a Scene, **When** the analyst triggers `duplicate`, **Then**
   they are prompted for a new timestamp (default: source + 1 s); on
   confirm a new Scene with a fresh `id` is persisted at that timestamp.
5. **Given** a Scene, **When** the analyst triggers
   `copy-to-other-storyboard` and selects a destination from the dropdown,
   **Then** a new Scene is created on the destination Storyboard with a
   fresh `id`, a new `storyboard_id`, and a **deep-copied** thumbnail
   asset (source and destination do not share the asset).
6. **Given** an edit op is performed, **When** the Analysis Log Panel is
   opened, **Then** the operation appears with its Scene thumbnail
   attached.

---

### User Story 4 — Maintain multiple storyboards per plot (Priority: P4)

A plot can support several narratives — e.g. "commander's view",
"ASW evidence", "training debrief." The analyst creates, renames, deletes,
and switches between Storyboards from the panel header dropdown. The
"active" Storyboard is an ephemeral UI selection (defaults to
most-recently-modified on plot open) and is not stored on disk.

**Why this priority**: Independent but layered on top of US1–US3. A user
could deliver a useful briefing with a single Storyboard; multi-Storyboard
support adds organisational flexibility.

**Independent Test**: With two Storyboards on a plot, switch between them
via the header dropdown and confirm: (a) the Scene list updates to the
selected Storyboard, (b) Scene viewport rectangles on the map update to
only those of the active Storyboard, (c) the selection is not persisted
across plot close/open — the most-recently-modified Storyboard is chosen
on re-open.

**Acceptance Scenarios**:

1. **Given** a plot with no Storyboards, **When** the analyst creates a
   new Storyboard from the panel overflow menu, **Then** it appears in the
   dropdown and becomes the active selection.
2. **Given** a plot with two or more Storyboards, **When** the analyst
   changes the dropdown selection, **Then** the Scene list, the playback
   transport, and the on-map Scene rectangles all update to the new
   active Storyboard within the same interaction.
3. **Given** a plot is re-opened, **When** the panel initialises, **Then**
   the active Storyboard defaults to the one with the most recent
   `last_modified_at`.
4. **Given** a Storyboard, **When** the analyst deletes it from the overflow
   menu, **Then** it is removed from the dropdown, all its Scenes and their
   thumbnail assets are deleted, and an Analysis Log entry records the
   cascade.

---

### User Story 5 — Detect and refresh stale Scene thumbnails (Priority: P5)

Between capture and briefing, the underlying plot features (tracks, points,
annotations) may change. The panel flags Scenes whose rendered thumbnail
no longer matches the current visible-feature set so the analyst can
decide whether to refresh or leave them.

**Why this priority**: Data-integrity guardrail rather than a new
interaction. Valuable for long-lived Storyboards, but a briefing can still
be delivered (with stale thumbnails) without it.

**Independent Test**: Load a fixture Storyboard, then mutate the underlying
plot so that at least one Scene's `visible_feature_ids` no longer fully
resolve. Reopen the plot and confirm: (a) affected Scenes are flagged as
stale in the panel, (b) a per-Scene "Refresh thumbnail" action regenerates
the thumbnail via the #174 pipeline and clears the flag, (c) the
`feature_set_hash` is recomputed and persisted.

**Acceptance Scenarios**:

1. **Given** a Scene whose `feature_set_hash` no longer matches a
   recomputation over its currently-resolvable `visible_feature_ids`,
   **When** the plot is opened, **Then** the Scene is marked **stale** in
   the panel with a visible indicator.
2. **Given** a stale Scene, **When** the analyst triggers the per-Scene
   refresh action, **Then** the thumbnail is re-captured via the #174
   pipeline, `feature_set_hash` and `last_modified_{by,at}` are updated,
   a `refresh-thumbnail` entry is appended to `history`, and the stale
   flag is cleared.

---

### Edge Cases

- **Thumbnail capture fails during a capture, duplicate, or update-to-current
  op.** No partial Scene is written; capture/duplicate/update aborts with
  an error toast; the plot is not marked dirty by the failed op.
- **Duplicate timestamp within a Storyboard.** On capture or
  copy-to-other-storyboard, the analyst is prompted **Replace / Offset
  (+1 s) / Cancel**; no write occurs until the prompt is resolved.
- **Missing referenced features at plot open.** Any Scene referencing a
  `visible_feature_ids` entry that no longer exists hard-blocks playback
  and editing of that Scene until the analyst edits or removes it. MVP
  applies this hard-block in all contexts (no "production mode" relaxation).
- **Timestamp outside plot time range.** Same hard-block as missing features.
- **Feature ID churn on re-import.** Re-imports that change stable feature
  IDs surface as the missing-features hard-block; scenes are not silently
  "fixed."
- **Antimeridian-crossing viewport.** Viewports spanning ±180° longitude
  emit a warning and store a best-effort Polygon in MVP; proper
  MultiPolygon splitting is deferred.
- **Bearing ≠ 0 at capture time.** Not reachable via the Leaflet renderer,
  but the schema rejects any attempt to persist a non-zero bearing in
  schema version 1.
- **Non-null `time_range` at capture time.** Schema rejects non-null
  `time_range` in schema version 1 (reserved slot).
- **Session-scoped undo window.** Toast-undo for Scene deletion is
  available only within the current VS Code session; closing and reopening
  the plot finalises all pending deletes.
- **Cross-Storyboard timestamp collisions on copy.** When copying a Scene
  to a destination Storyboard that already has a Scene at the same
  timestamp, the same Replace / Offset / Cancel prompt applies.
- **Very large Storyboards.** Soft target of ≤ ~50 Scenes per Storyboard
  is documented to the analyst but not enforced — no hard cap in MVP.
- **Deleting a Storyboard with Scenes.** Cascades to all child Scenes and
  their thumbnail assets; surfaced via a single Analysis Log entry
  summarising the cascade.

## Requirements *(mandatory)*

### Functional Requirements

Requirements are grouped by theme. Every requirement is testable; "System"
refers to the Storyboarding feature as a whole (panel + shared module +
schema validators), not a specific implementation layer.

#### Schema & persistence

- **FR-001**: System MUST define Storyboard and Scene entities in the LinkML
  master schema under `shared/schemas/`, and MUST generate Pydantic, JSON
  Schema, and TypeScript bindings from that single source.
- **FR-002**: Storyboard and Scene Features MUST persist inside the plot's
  GeoJSON FeatureCollection — no separate storage, no STAC API changes.
- **FR-003**: System MUST reject any persisted Scene whose
  `thumbnail_asset_ref` does not resolve to an existing STAC asset.
- **FR-004**: System MUST reject any persisted Scene with a non-null
  `time_range` in schema version 1 (reserved slot).
- **FR-005**: System MUST reject any persisted Scene with `viewport.bearing`
  ≠ 0 in schema version 1 (reserved slot).
- **FR-006**: System MUST reject two Scenes with the same `timestamp` in the
  same Storyboard.
- **FR-007**: System MUST reject any Scene whose `storyboard_id` does not
  reference an existing Storyboard in the same FeatureCollection.
- **FR-008**: System MUST pass all three Article II adherence tests
  enumerated under *Schema-first obligations* in Key Entities (golden
  fixtures, Python↔TS round-trip, Pydantic-vs-LinkML JSON Schema equality).
- **FR-009**: System MUST carry a `schema_version` integer on every
  Storyboard Feature and MUST run a plot-open migration hook; the hook
  MUST be a no-op at version 1 but MUST be wired so future versions can
  register migrations without touching the load path.
- **FR-010**: System MUST treat every edit to a Storyboard or Scene as
  dirtying the plot, requiring an explicit save by the analyst before
  changes are durable.

#### Capture

- **FR-011**: System MUST provide a capture shortcut `Ctrl/Cmd+Alt+C`
  scoped (via VS Code `when`-clause) to the Map Viewer.
- **FR-012**: System MUST also provide a capture button in the Storyboard
  panel with behaviour identical to the shortcut.
- **FR-013**: On the first capture for a plot with no Storyboards, System
  MUST prompt the analyst for a Storyboard name via an inline quick-pick
  before persisting anything.
- **FR-014**: On subsequent captures, System MUST append the new Scene to
  the currently active Storyboard.
- **FR-015**: At capture time System MUST snapshot: viewport
  (center / zoom / bearing=0), current time-slider `timestamp`, the set of
  currently visible plot feature IDs, and `feature_set_hash` over the
  sorted visible-feature-ID set.
- **FR-016**: At capture time System MUST request a thumbnail from the
  #174 pipeline **synchronously**; on pipeline failure System MUST NOT
  persist the Scene, MUST show an error toast, and MUST leave the plot
  undirtied by the failed op.
- **FR-017**: System MUST default the Scene `title` to the DTG of
  `timestamp` in `DDHHmmZ MMM YY` (ZULU) format, falling back to ISO-8601
  if the DTG format cannot be produced. The title MUST be inline-editable.
- **FR-018**: When capture would produce a Scene whose `timestamp`
  collides with an existing Scene in the active Storyboard, System MUST
  prompt **Replace / Offset (+1 s) / Cancel** and MUST NOT write until
  the prompt is resolved.

#### Playback (in-VS-Code preview)

- **FR-019**: System MUST provide forward and backward transport buttons
  in the panel.
- **FR-020**: System MUST bind scoped `Left` and `Right` arrow keys to the
  backward / forward transport, active only when the Storyboard panel (or
  the Map Viewer, when a Storyboard is active) has focus.
- **FR-021**: On transport advance, System MUST animate the map via
  `flyTo` to the target Scene's `viewport` and MUST tween the time slider
  to the Scene's `timestamp` over `transition_duration_ms`.
- **FR-022**: Default `transition_duration_ms` MUST be `500`; per-Scene
  overrides are allowed.
- **FR-023**: During playback, System MUST constrain time-slider scrubbing
  to `[current_scene.timestamp, next_scene.timestamp]`; beyond the last
  Scene, scrubbing past its `timestamp` MUST be disabled.
- **FR-024**: System MUST hard-block playback onto any Scene whose
  `visible_feature_ids` do not fully resolve in the current plot or whose
  `timestamp` is outside the plot's time range; the block MUST present a
  prompt to edit or remove the Scene.

#### Edit operations

- **FR-025**: System MUST support per-Scene **rename** (inline text edit).
- **FR-026**: System MUST support per-Scene **markdown description** edit.
- **FR-027**: System MUST support per-Scene **soft-delete with
  toast-undo**; the undo window MUST be session-scoped (it does not
  survive plot close/reopen).
- **FR-028**: System MUST support per-Scene **update-to-current** — a
  single atomic re-snapshot of viewport, timestamp, `visible_feature_ids`,
  `feature_set_hash`, and `thumbnail_asset_ref` from the current map state.
- **FR-029**: System MUST support per-Scene **duplicate**, prompting the
  analyst for a new `timestamp` (default: source `timestamp` + 1 s) and
  producing a new Scene with a fresh `id` on the same Storyboard.
- **FR-030**: System MUST support **insert-middle** as the natural
  consequence of capturing at an intermediate `timestamp` — no separate
  op is required.
- **FR-031**: System MUST support **copy-to-other-storyboard** via a
  dropdown quick-pick of destination Storyboards on the same plot;
  the copy MUST have a fresh `id`, the destination's `storyboard_id`, and
  a **deep-copied** thumbnail asset distinct from the source's.
- **FR-032**: System MUST NOT provide drag-reorder of Scenes; ordering
  is derived from `timestamp` only.
- **FR-033**: Every successful edit op MUST update `last_modified_by` and
  `last_modified_at` and MUST append a `HistoryEntry` to the Scene or
  Storyboard's `history` array.
- **FR-034**: Every successful edit op MUST emit an entry to the Analysis
  Log Panel (#176) with the Scene's thumbnail attached.

#### Multi-storyboard management

- **FR-035**: System MUST allow a plot to carry multiple Storyboards.
- **FR-036**: The Storyboard panel header MUST present a dropdown listing
  all Storyboards on the current plot.
- **FR-037**: The panel header MUST offer an overflow menu with
  **Create / Rename / Delete** actions for Storyboards.
- **FR-038**: The "active" Storyboard is ephemeral (panel selection only)
  and MUST NOT be persisted on disk.
- **FR-039**: On plot open, the active Storyboard MUST default to the
  one with the most recent `last_modified_at`; if no Storyboards exist,
  the panel MUST show an empty state.
- **FR-040**: Deleting a Storyboard MUST cascade to all its Scenes and
  their thumbnail assets, and MUST emit a single Analysis Log entry
  summarising the cascade.

#### Panel behaviour

- **FR-041**: The Storyboard panel MUST be hidden by default and opened
  via the Command Palette or view menu.
- **FR-042**: The first capture on a plot MUST auto-open the panel.
- **FR-043**: The panel MUST surface the active Storyboard's Scene list
  sorted by `timestamp` ascending, each row showing thumbnail, title, and
  DTG.
- **FR-044**: The panel MUST surface a **stale** indicator on each Scene
  whose `feature_set_hash` no longer matches a recomputation at open time.
- **FR-045**: The panel MUST provide a per-Scene **refresh thumbnail**
  action that re-captures the thumbnail via the #174 pipeline and
  recomputes `feature_set_hash`.

#### Map rendering

- **FR-046**: The parent Storyboard Feature MUST NOT render on the map
  layer (it exists for the panel and for downstream renderers only).
- **FR-047**: Scene viewport Polygons MUST render as faint rectangles on
  the map **only** when their parent Storyboard is the active panel
  selection.
- **FR-048**: Clicking a Scene rectangle on the map MUST select that
  Scene in the panel and animate the map to its viewport using the same
  transport used by Forward/Backward.

#### Provenance

- **FR-049**: Every Storyboard and Scene Feature MUST carry
  `created_by`, `created_at`, `last_modified_by`, `last_modified_at`, and
  a `history[]` array.
- **FR-050**: `history[]` MUST be append-only — existing entries MUST NOT
  be mutated or removed by any edit op.

#### Offline

- **FR-051**: All capture, edit, playback, panel, and schema-validation
  operations MUST work with no network access (Article I).

### Key Entities *(schema-first; authoritative)*

Storyboards capture an analyst's narrated walk-through of a plot. The data
model is **schema-first** (Article II): both entities below are added to the
LinkML master schema under `shared/schemas/` and generate Pydantic, JSON
Schema, and TypeScript bindings via the existing pipeline. Both entities are
carried as standard **GeoJSON Features** inside the plot's FeatureCollection,
so they round-trip through the existing plot-edit path with no STAC API
changes.

#### Entity 1 — Storyboard (parent Feature)

**Purpose**: A named, ordered collection of Scenes attached to a single plot.
A plot can carry multiple Storyboards; none are "active" on disk — active
selection is an ephemeral UI concern.

**GeoJSON shape**:
- `type`: `"Feature"`
- `geometry`: `Polygon` — computed hull covering the union of child Scene
  viewport bounds. Recomputed whenever the Scene set changes.
- `properties.debrief:type`: `"storyboard"` (discriminator)

**Attributes** (all on `properties`):

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `id` | ULID string | yes | Stable identifier; survives renames and re-imports. |
| `name` | string | yes | Display title shown in the panel header dropdown. |
| `description` | markdown string | no | Rendered in the panel; also available to downstream briefing renderers. |
| `schema_version` | integer | yes | Migration vector. Starts at `1`. Enables forward-compatible on-open migrations. |
| `created_by` | actor string | yes | Provenance — Article III. |
| `created_at` | ISO-8601 instant | yes | Provenance. |
| `last_modified_by` | actor string | yes | Provenance. |
| `last_modified_at` | ISO-8601 instant | yes | Provenance. |
| `history` | array of `HistoryEntry` | yes | Append-only mutation log (see Sub-Entity below). |

**Relationships**:
- **parent-of** → zero or more **Scene** features (via `Scene.storyboard_id → Storyboard.id`).
- Siblings (other Storyboards on the same plot) are independent; no cross-Storyboard references.

**Invariants**:
- `name` is unique within the owning plot's FeatureCollection.
- `id` is immutable after creation.
- `schema_version` is monotonically non-decreasing across edits.
- The parent Storyboard Feature is **not rendered on the map** (panel-only
  entity); this is enforced by the rendering layer, not by the schema.

---

#### Entity 2 — Scene (child Feature)

**Purpose**: A single captured moment in a Storyboard — the analyst's map
viewport, timestamp, and per-feature visibility at capture time, plus a
thumbnail produced by the #174 pipeline.

**GeoJSON shape**:
- `type`: `"Feature"`
- `geometry`: `Polygon` — the map viewport bounds at capture time.
- `properties.debrief:type`: `"storyboard_scene"` (discriminator)

**Attributes** (all on `properties`):

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `id` | ULID string | yes | Stable identifier; referenced by logs and undo records. |
| `storyboard_id` | ULID string | yes | Foreign key → `Storyboard.id`. |
| `title` | string | yes | Defaults to DTG of `timestamp` in `DDHHmmZ MMM YY` format; falls back to ISO-8601 if DTG cannot be formatted. Inline-editable. |
| `description` | markdown string | no | Optional per-scene narrative. |
| `viewport` | `Viewport` sub-record | yes | Camera state — see Sub-Entity below. |
| `timestamp` | ISO-8601 instant | yes | The plot-time the scene freezes on. Drives ordering. |
| `time_range` | `{start, end}` or `null` | no | **Reserved for future use** (animated time-window extension). MUST be `null` in MVP. |
| `visible_feature_ids` | array of stable feature IDs | yes | IDs of plot features that were visible at capture. Order-insensitive. |
| `feature_set_hash` | string | yes | Hash of the sorted `visible_feature_ids` at capture. Used for stale-thumbnail detection on plot open. |
| `thumbnail_asset_ref` | STAC asset reference | yes | Points to the PNG asset produced by the #174 pipeline. A Scene without a thumbnail is never persisted. |
| `transition_duration_ms` | integer | yes | Per-scene override for the playback tween into this scene. Default `500`. |
| `created_by` | actor string | yes | Provenance. |
| `created_at` | ISO-8601 instant | yes | Provenance. |
| `last_modified_by` | actor string | yes | Provenance. |
| `last_modified_at` | ISO-8601 instant | yes | Provenance. |
| `history` | array of `HistoryEntry` | yes | Per-scene mutation log. |

**Relationships**:
- **child-of** → exactly one **Storyboard** (via `storyboard_id`). Orphan
  Scenes are invalid.
- **references** → zero or more plot features by stable ID (non-owning
  reference — does not prevent deletion of the referenced feature, but
  triggers the missing-data hard-block at playback/edit time).

**Invariants**:
- `timestamp` is unique within a Storyboard. Attempting to persist a Scene
  with a duplicate timestamp requires an explicit Replace / Offset (+1 s) /
  Cancel resolution before the write.
- Scene ordering within a Storyboard is **derived** from `timestamp`
  ascending — no explicit `order` field exists.
- `thumbnail_asset_ref` MUST resolve to a real asset at persist time; capture
  aborts (no partial Scene written) if the #174 pipeline fails.
- `feature_set_hash` MUST match a recomputation over the sorted
  `visible_feature_ids` — mismatch marks the thumbnail as stale.
- `time_range` MUST be `null` in schema version `1` (reserved slot).

---

#### Sub-Entity — Viewport

Camera state captured per Scene.

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `center` | `[lon, lat]` pair | yes | Longitude / latitude of the viewport centre. |
| `zoom` | float | yes | Leaflet-compatible zoom (float, not integer). |
| `bearing` | float | yes | Rotation in degrees. **MUST be `0`** in MVP and is ignored by the current Leaflet renderer (reserved for a future rotating-map renderer). |

---

#### Sub-Entity — HistoryEntry

Append-only provenance log (Article III). Present on both Storyboard and
Scene features.

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `timestamp` | ISO-8601 instant | yes | When the mutation happened. |
| `actor` | string | yes | Who performed the mutation. |
| `op` | enum | yes | One of: `create`, `rename`, `describe`, `delete`, `restore`, `update-to-current`, `duplicate`, `copy-in`, `insert-middle`, `refresh-thumbnail`. |
| `summary` | short string | yes | Human-readable one-liner; mirrored into the Analysis Log Panel (#176). |

---

#### Derived / computed values (not stored)

- **Scene order** — derived from `timestamp` ascending at read time.
- **Storyboard geometry** — Polygon hull is recomputed from child viewport
  bounds whenever the Scene set changes; antimeridian-crossing hulls emit a
  warning and store a best-effort polygon in MVP (proper MultiPolygon
  splitting is out of scope).
- **Stale-thumbnail flag** — computed at plot open by recomputing
  `feature_set_hash` over the currently-resolvable subset of
  `visible_feature_ids` and comparing.

---

#### Cross-entity constraints

- Every Scene's `storyboard_id` MUST reference an existing Storyboard within
  the same plot FeatureCollection.
- Deleting a Storyboard cascades to all its Scenes (and their thumbnail
  assets) via the edit path; soft-delete semantics (toast-undo) apply at the
  Scene level only in MVP.
- `copy-to-other-storyboard` on a Scene produces a new Scene with a fresh
  `id`, a new `storyboard_id`, and a **deep-copied** thumbnail asset — the
  source and destination Scenes do not share the asset reference.
- The **parent Storyboard is hidden from the map layer**, and Scene viewport
  rectangles render **only when their parent Storyboard is the active panel
  selection** — these are rendering-layer rules, not schema invariants, but
  are called out here because they constrain downstream consumers.

---

#### Schema-first obligations (Article II)

The LinkML source and generated artefacts must satisfy all three adherence
tests defined in CLAUDE.md:

1. **Golden fixtures** — canonical valid and invalid Storyboard / Scene JSON
   under `shared/schemas/fixtures/`, covering: minimal valid, full-featured
   valid, duplicate-timestamp invalid, missing-thumbnail invalid, bearing ≠ 0
   invalid, non-null `time_range` invalid, orphan Scene invalid.
2. **Round-trip** — Python → JSON → TypeScript → JSON → Python preserves all
   fields (including nested `viewport`, `history`, and array ordering for
   `visible_feature_ids`).
3. **Schema comparison** — Pydantic-generated JSON Schema matches
   LinkML-generated JSON Schema field-for-field.

## User Interface Flow *(UI feature)*

### Decision Analysis

- **Primary Goal**: Build a replayable, narrated walk-through of a recorded
  exercise — a named sequence of captured moments that a stakeholder
  audience can be guided through in order, step by step.
- **Key Decisions**:
  1. **When to capture.** The analyst decides which combinations of map
     framing, plot-time, and visible-feature selection represent a "moment
     worth showing" and triggers capture at that moment.
  2. **How to annotate.** For each captured Scene, the analyst decides
     whether to rename it from its default DTG title and whether to write
     a markdown description that a briefing audience would read.
  3. **How to structure the narrative.** The analyst decides which Scenes
     belong together (same Storyboard), when to split a narrative into
     multiple Storyboards on one plot (e.g. commander's view vs. ASW
     evidence), and when to copy Scenes between Storyboards.
  4. **Whether a stale Scene needs attention.** When the panel flags a
     Scene's thumbnail as stale, the analyst decides whether to refresh
     (re-run the thumbnail pipeline) or leave it.
  5. **How to respond to missing-data hard-blocks.** If a referenced
     feature is gone or a timestamp is out of range, the analyst decides
     whether to edit the affected Scene (e.g. update-to-current) or
     remove it.
- **Decision Inputs** (what the UI shows to support each decision):
  - **Map + time slider + feature toggles** — the live state that capture
    freezes into a Scene.
  - **Panel Scene list** — ordered thumbnails with titles and DTG stamps;
    shows what has already been captured and where the new capture would
    slot in.
  - **Storyboard dropdown** — which Storyboard the next capture or edit
    will target.
  - **Stale indicator** — per-Scene flag showing whether the thumbnail
    still reflects the underlying plot.
  - **On-map Scene rectangles** — faint polygons showing each Scene's
    framing for the active Storyboard, giving spatial context for where
    in the narrative the analyst is.
  - **Hard-block prompt** — when a Scene cannot be stepped onto, the
    prompt names the specific missing features or time-range issue.

### Screen Progression

The table covers the critical "first-time capture → edit → preview
playback" happy path. Every step is observable in the panel or on the
map; no modal navigation is required beyond inline prompts.

| Step | Screen / State | User Action | Result |
|------|----------------|-------------|--------|
| 1 | Plot open, Storyboard panel hidden, no Storyboards yet | Press `Ctrl/Cmd+Alt+C` while focused on the Map Viewer | Inline quick-pick appears prompting for a Storyboard name |
| 2 | Quick-pick for new Storyboard name | Type a name and confirm | Storyboard created; first Scene captured from current viewport + time + visibility; thumbnail produced by #174 |
| 3 | Panel auto-opens, showing the new Storyboard in the header dropdown and its single Scene with DTG-default title | Click the Scene title to rename, optionally add a markdown description | Title / description persisted; `last_modified_*` bumped; Analysis Log entry appended |
| 4 | Panel showing a Storyboard with 2+ Scenes | Press the Forward button or scoped `Right` arrow | Map animates via `flyTo` to the next Scene's viewport; time slider tweens to its timestamp over `transition_duration_ms` |
| 5 | Mid-playback, sitting on Scene N | Drag the time slider | Scrub is constrained to `[Scene[N].timestamp, Scene[N+1].timestamp]`; locked beyond the last Scene's timestamp |
| 6 | Panel showing all captured Scenes; on-map rectangles visible for the active Storyboard | Click an on-map Scene rectangle | Panel selection jumps to that Scene and the map animates to its viewport using the same transport |
| 7 | A Scene the analyst wants to refine | Choose `update-to-current`, `duplicate`, or `copy-to-other-storyboard` from the Scene's overflow menu | Corresponding edit op runs atomically; provenance + history + Analysis Log all updated |

### UI States

- **Empty State (no Storyboards on plot).** Panel shows: *"No storyboards
  yet. Press Ctrl/Cmd+Alt+C on the map, or click Capture, to create your
  first scene."* The Storyboard dropdown is disabled; the capture button
  is primary.
- **Empty State (active Storyboard has no Scenes).** Panel shows the
  Storyboard name in the header dropdown and a secondary message: *"No
  scenes yet. Frame the map and capture."* Transport buttons and scoped
  arrow keys are disabled.
- **Loading State (capture in flight).** Capture button shows a spinner;
  keyboard shortcut is temporarily ignored; the panel shows an inline
  pending row with a placeholder thumbnail until the #174 pipeline
  returns. The plot is not marked dirty until the Scene is actually
  persisted.
- **Loading State (playback transition).** Forward / backward buttons
  are disabled during the `flyTo` + time-slider tween; scrub is locked
  until the transition completes.
- **Error State (thumbnail pipeline failure).** Error toast: *"Capture
  failed — could not produce thumbnail. Scene not saved."* No row is
  added to the Scene list; the panel remains in its pre-capture state.
- **Error State (missing-data hard-block).** Modal prompt naming the
  missing feature IDs or out-of-range timestamp, offering two actions:
  *"Edit scene"* (opens the Scene for `update-to-current` / description
  edit) and *"Delete scene"* (soft-delete with toast-undo).
- **Error State (duplicate timestamp on capture).** Inline prompt:
  *"A scene already exists at this timestamp. Replace / Offset (+1 s) /
  Cancel."* No write occurs until the prompt is resolved.
- **Stale State (per-Scene).** Scene row carries a small "stale" badge
  with a tooltip naming which `visible_feature_ids` no longer resolve.
  Row exposes a **Refresh thumbnail** action.
- **Success State (capture).** New Scene row appears in timestamp order
  with its thumbnail, the DTG-default title pre-selected for inline
  rename, a "Scene N of M" counter updates, and a brief toast confirms
  persistence. The Analysis Log Panel gains a corresponding entry.
- **Success State (playback step).** Map is centred on the target
  Scene's viewport, time slider is on its timestamp, the panel row is
  highlighted, and the transport counter updates to reflect position.

## Success Criteria *(mandatory)*

> _Pending — measurable, technology-agnostic._

## Assumptions

> _Pending — will capture Spec-Author Defaults from the idea doc (DTG format,
> transition defaults, toast-undo scope, ID scheme, etc.)._

## Dependencies

> _Pending — #174 (thumbnails), #176 (Analysis Log Panel), LinkML pipeline,
> stable feature IDs._

## Out of Scope

> _Pending — dedicated briefing renderer, animated time-range scenes,
> antimeridian MultiPolygon handling, sharing/collaboration, video export._
