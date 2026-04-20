# Feature Specification: Storyboarding for Briefings

**Feature Branch**: `202-storyboarding`
**Created**: 2026-04-20
**Status**: Draft (schema section only — other sections pending)
**Input**: Backlog epic #024 — [Storyboarding Briefings](../../docs/ideas/017-storyboarding-briefings.md)

> **Note**: This spec is being built up section by section. Only the **Key Entities**
> section below is authoritative at this point. All other sections are stubs and
> will be filled in subsequent passes.

## User Scenarios & Testing *(mandatory)*

> _Pending — to be drafted next._

## Requirements *(mandatory)*

### Functional Requirements

> _Pending — will reference the Key Entities defined below._

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

## User Interface Flow *(optional — UI feature)*

> _Pending — panel, capture shortcut, dropdown, playback transport, quick-picks._

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
