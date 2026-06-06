# Data Model: Retire the sidecar — all plot state in the FeatureCollection

**Feature**: `261-session-state-systemstate` | **Phase**: 1 | **Date**: 2026-05-27

Entity shapes, relationships, and state transitions. Wire/API surfaces are in `contracts/`. Field-level store↔variant mappings are in `contracts/slice-mappings.md`.

---

## Entity 1: `SystemStateProperties` (LinkML — extended)

**Source**: `shared/schemas/src/linkml/geojson.yaml` (existing class, modified).

**Shape post-this-work** (one flat class; per-variant required-ness enforced by `rules:`):

| Field | Type | Required | Variant | Notes |
|---|---|---|---|---|
| `kind` | `FeatureKindEnum` literal `"SYSTEM"` | yes | all | Discriminates SystemState features. |
| `state_type` | `SystemStateTypeEnum` | yes | all | `temporal` / `spatial` / `selection` / `active_storyboard`. |
| `start_time` | datetime (ISO-8601) | when `temporal` | temporal | Analytical window start. |
| `end_time` | datetime (ISO-8601) | when `temporal` | temporal | Analytical window end. |
| `current_time` | datetime (ISO-8601) | optional | temporal | Playhead at save. Cross-field: ∈ `[start_time, end_time]` when present. |
| `filter_start_time` | datetime (ISO-8601) | optional | temporal | Visible-window filter start (was epoch `timeFilter.start`). |
| `filter_end_time` | datetime (ISO-8601) | optional | temporal | Visible-window filter end (was epoch `timeFilter.end`). |
| `display_mode` | `DisplayModeEnum` | optional | temporal | `full` / `trail`. |
| `step_size` | `TimeStep` | optional | temporal | `{ value, unit }`. |
| `playback_rate` | float | optional | temporal | 0.1–100. |
| `viewport` | `ViewportPolygon` | when `spatial` | spatial | Identity map to `SpatialSlice.viewport`. Replaces removed `bbox`/`zoom`/`center`. |
| `rotation` | float | optional | spatial | Map rotation 0–360. |
| `selected_ids` | string[] | when `selection` | selection | May be empty (= explicit no-selection). |
| `selected_primary` | string | optional | selection | Primary selection path for properties display. |
| `active_storyboard_id` | string | when `active_storyboard` | active_storyboard | Unchanged from #237 (NG-002). |
| `provenance` | `LogEntry[]` | optional | — | **Not written** for `state.*` view features (FR-013, lean). Remains in the schema (it predates this work; other SYSTEM uses may exist). |

**Removed**: `bbox` (float[]), `zoom` (float), `center` (float[]) — Article XIV.1, zero runtime consumers (verified).

**Conditional-required** enforced by four LinkML `rules:` blocks keyed on `state_type` (see `contracts/linkml-delta.md`). Runtime narrowing is via the helper's Zod discriminated union (R-003), since `gen-typescript` emits a flat interface with `string`-typed `kind`/`state_type`.

---

## Entity 2: `BaseFeatureProperties.visible` (LinkML — new field)

**Source**: `shared/schemas/src/linkml/common.yaml:330` (base class — all feature-props classes `is_a` it, verified).

| Field | Type | Required | Semantics |
|---|---|---|---|
| `visible` | boolean | optional | **Absent or `true` ⇒ visible; `false` ⇒ hidden.** Replaces the sidecar `features.hiddenFeatureIds` denylist. |

Because every feature-properties class (`TrackProperties`, the annotations, `MultiPointFeatureProperties`, etc.) inherits from `BaseFeatureProperties`, one edit covers all feature types. Toggling appends a `LogEntry` to that feature's own `provenance` (FR-013/R-012).

---

## Entity 3: `SystemStateTypeEnum`

**Source**: `shared/schemas/src/linkml/common.yaml` (currently in `common.yaml`; permissible values unchanged). Values: `temporal`, `spatial`, `selection`, `active_storyboard`. The `spatial` value's description is updated from "(bbox, zoom)" → viewport (FR-002). No values added.

---

## Entity 4: Consolidated shared value types (LinkML — relocated, FR-002a)

These move into `common.yaml` (geojson's import graph) as their single definition, duplicates deleted:

| Type | Was in | Now in | Used by |
|---|---|---|---|
| `ViewportPolygon` | session-state.yaml | common.yaml | `SystemStateProperties.viewport`, `SpatialSlice.viewport`, store |
| `Coordinate` | common.yaml + session-state.yaml (dup) | common.yaml (single) | `ViewportPolygon`, store |
| `TimeStep` + `TimeUnitEnum` | session-state.yaml | common.yaml | `SystemStateProperties.step_size`, store |
| `DisplayModeEnum` | session-state.yaml + storyboard.yaml (dup) | common.yaml (single) | `SystemStateProperties.display_mode`, store, scenes |
| `PlaybackStateEnum` | session-state.yaml | common.yaml | store (ephemeral; not persisted) |
| `TimeInstant`, `TimeRange`, `TimeFilter` | session-state.yaml | common.yaml | store (the feature uses flat ISO fields, not these classes) |

`session-state.yaml`'s `SessionFile` / `SessionState` root classes are **deleted** (sidecar retired). Slice classes (`TemporalSlice`/`SpatialSlice`/`FeaturesSlice`/…) are deleted unless a runtime consumer remains; the TS store uses hand-authored interfaces in `services/session-state/src/types/`, not the generated slice classes (verified — "Not migrated" comments), so they are removal candidates.

---

## Entity 5: `SystemState` Feature (GeoJSON wire shape)

A GeoJSON `Feature`:

```json
{
  "type": "Feature",
  "id": "state.temporal",
  "geometry": { "type": "Point", "coordinates": [] },
  "properties": {
    "kind": "SYSTEM",
    "state_type": "temporal",
    "start_time": "2024-01-01T00:00:00Z",
    "end_time": "2024-01-07T00:00:00Z",
    "current_time": "2024-01-03T14:30:00Z",
    "filter_start_time": "2024-01-02T00:00:00Z",
    "filter_end_time": "2024-01-05T00:00:00Z",
    "display_mode": "trail",
    "step_size": { "value": 1, "unit": "hour" },
    "playback_rate": 2.0
  }
}
```

```json
{
  "type": "Feature",
  "id": "state.spatial",
  "geometry": { "type": "Point", "coordinates": [] },
  "properties": {
    "kind": "SYSTEM",
    "state_type": "spatial",
    "viewport": {
      "coordinates": [
        { "longitude": -3.5, "latitude": 51.5 },
        { "longitude":  2.5, "latitude": 51.5 },
        { "longitude":  2.5, "latitude": 50.0 },
        { "longitude": -3.5, "latitude": 50.0 }
      ],
      "zoom": 8
    },
    "rotation": 0
  }
}
```

**ID convention**: `state.<state_type>` — `state.temporal`, `state.spatial`, `state.selection`, `state.activestoryboard`. Deterministic → natural upsert key; matches schema id pattern `^state\.[a-z]+$`.
**Cardinality**: at most one per `state_type` (FR-003); two is a load error.
**No provenance array** on these features (FR-013).

---

## Entity 6: `SystemStateMap` (helper read output)

```typescript
export interface SystemStateMap {
  temporal?: TemporalVariant;
  spatial?: SpatialVariant;
  selection?: SelectionVariant;
  active_storyboard?: ActiveStoryboardVariant;
}
```

Each `*Variant` is the `z.infer` output of the corresponding Zod schema in `validate.ts` (R-003). Every key is **absent or fully-typed-and-validated** — parsing rejects partial/malformed features at the boundary. (Contrast the prior contract's `Extract<SystemStateProperties, …>`, which does not work against the flat generated interface.)

---

## Entity 7: The plot directory (post-this-work)

```text
<item-dir>/
├── item.json          # STAC item — catalog metadata only (unchanged role)
└── features.geojson   # FeatureCollection — sole source of truth for plot state
```

**Removed**: `item.debrief-session` (the sidecar). No third file.

---

## Entity 8: Zustand store (unchanged shape)

The in-memory store (`services/session-state/src/store/`) keeps its current slice shapes:
- `TemporalSlice` — `currentTime: number|null` (epoch), `timeRange: {start,end}|null` (epoch), `timeFilter: {start?,end?}` (epoch), `stepSize`, `playbackRate`, `playbackState` (ephemeral), `displayMode`.
- `SpatialSlice` — `viewport: ViewportPolygon|null`, `rotation`, `drawingMode` (ephemeral), `drawingPaletteIndex` (ephemeral), `viewportLocked` (ephemeral).
- `FeaturesSlice` — `featureCollectionUri` (derived at load), `selection: FeatureSelection`, `hiddenFeatureIds: string[]`, `styleVersion` (ephemeral).

Only the **persistence boundary** changes: hydrate-from-FeatureCollection on load, extract-to-FeatureCollection on save, in place of sidecar I/O.

---

## Relationships

```text
features.geojson (FeatureCollection)
 ├── geographic Features  ── properties.visible? ──► store.hiddenFeatureIds
 ├── Feature id=state.spatial          ─┐
 ├── Feature id=state.temporal          ├─ readSystemStateFromFeatureCollection() ─► SystemStateMap
 ├── Feature id=state.selection         │                                              │
 └── Feature id=state.activestoryboard ─┘                                              ▼
                                                                          reconcile → Zustand store
                                                                                       │
                                              writeSystemStateIntoFeatureCollection() ◄┘ (on save)
                                              + apply visible flags
                                                       │
                                                       ▼
                                          updated FeatureCollection ── existing writer ──► features.geojson
```

The helper is a pure transformer; it never performs I/O. The existing writer (VS Code STAC writer / web-shell IndexedDB plot store) persists the FeatureCollection (Article IV.4).

---

## State transitions

### SystemState feature per variant

```text
absent ── first explicit save with a non-default value ──► present
  ▲                                                          │
  │                                                          │ save with new value
  └──────────────────────────────────────────────── present (replaced in place, same id)
```

`absent → present`: insert a Feature with id `state.<type>`. `present → present`: replace the Feature's `properties` (id preserved). No `present → absent` transition in this work (no "reset SystemState" command; out of scope).

### Per-feature visibility

```text
visible (no flag / true) ── hide ──► visible:false (+ provenance LogEntry)
        ▲                                   │
        └──────────── reveal ───────────────┘ (+ provenance LogEntry)
```

Transitions update the store immediately (no dirty — FR-019) and are persisted on the next save (FR-021).

---

## Validation rules

| Rule | Enforcement point | Article |
|---|---|---|
| `kind === "SYSTEM"`, `state_type ∈ enum` | LinkML; Zod at load | II.1, XIV.4 |
| At most one feature per `state_type` | helper `read.ts` | FR-003 |
| Per-variant required fields (temporal⇒start/end; spatial⇒viewport; selection⇒selected_ids; active_storyboard⇒active_storyboard_id) | LinkML `rules:`; Pydantic at adherence gate; Zod at load | XIV.4 |
| `current_time ∈ [start_time, end_time]` when present | helper `validate.ts` cross-field | I.3, XIV.4 |
| `start_time ≤ end_time` | helper `validate.ts` cross-field | I.3, XIV.4 |
| `visible` absent ⇒ visible | helper `visibility.ts` | — |
| view-state features carry no provenance | helper `write.ts` (never appends) | FR-013 |
| visibility transitions append to the feature's provenance | host visibility action via `LogService` | III.1/III.3 |

---

## Open issues carried to `/speckit.tasks`

- Confirm whether the helper *delegates* `active_storyboard` to `shared/components/src/storyboard/activeStoryboardSelection.ts` or supersedes it (R-011 lean: delegate).
- Confirm `session-state.yaml` slice classes have no remaining runtime consumer before deleting them (grep generated-type imports).
- Confirm the `generate.py` post-processor approach for `ViewportPolygon` in the JSON Schema build (R-005), or fall back to Pydantic-only validation for SystemState fixtures.
