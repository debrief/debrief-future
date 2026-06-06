# Contract: LinkML schema delta

**Feature**: `261-session-state-systemstate`
**Files modified**: `shared/schemas/src/linkml/{geojson.yaml, common.yaml, session-state.yaml, storyboard.yaml}`
**Type of change**: Article XIV.1 pre-release refactor (`bbox`/`zoom`/`center` removal) + additive fields + per-variant `rules:` + value-type consolidation.

This contract is the binding agreement on the schema change. YAML formatting may differ; field names, ranges, and constraints MUST match.

---

## 1. `common.yaml` — add `visible` to `BaseFeatureProperties`

```diff
 classes:
   BaseFeatureProperties:
     attributes:
+      visible:
+        description: >-
+          Whether this feature is shown on the map. Absent or true means
+          visible; false means hidden. Replaces the session sidecar's
+          hiddenFeatureIds denylist (feature 261). Per-feature visibility
+          travels with the feature inside features.geojson.
+        range: boolean
+        required: false
```

Propagates to every `is_a: BaseFeatureProperties` class (Track, ReferenceLocation, the annotations, MultiPoint/MultiPolygon results, etc.).

## 2. `common.yaml` — absorb consolidated value types (FR-002a)

Move these definitions into `common.yaml` as the single source, deleting the duplicates noted:

- `ViewportPolygon` — move from `session-state.yaml`.
- `Coordinate` — keep `common.yaml`'s copy; delete `session-state.yaml`'s duplicate.
- `TimeStep`, `TimeUnitEnum` — move from `session-state.yaml`.
- `DisplayModeEnum` — move from `session-state.yaml`; delete `storyboard.yaml`'s duplicate.
- `PlaybackStateEnum` — move from `session-state.yaml`.
- `TimeInstant`, `TimeRange`, `TimeFilter` — move from `session-state.yaml` (still consumed by the in-memory store).

`common.yaml` already imports `linkml:types` + `log-entry`; the moved types have no other cluster dependency. `geojson.yaml` already imports `common`, so `SystemStateProperties` can now reference `ViewportPolygon`/`TimeStep`/`DisplayModeEnum`.

> **Codegen invariant**: because the master aggregator `debrief.yaml` already imports every cluster, the *generated* TS/Pydantic symbol names are unchanged by moving a definition between cluster files. Only the authoring location moves; `git diff` on `src/generated/` should show no symbol renames (only field additions/removals from the SystemStateProperties/BaseFeatureProperties edits).

## 3. `geojson.yaml` — `SystemStateProperties` field delta

```diff
   SystemStateProperties:
     description: Properties for SYSTEM features storing application state
     attributes:
       kind:
         range: FeatureKindEnum
         required: true
         equals_string: "SYSTEM"
       state_type:
         range: SystemStateTypeEnum
         required: true
       # ---- temporal ----
       start_time:
         range: datetime
       end_time:
         range: datetime
+      current_time:
+        description: Playhead position at save (ISO-8601). When present, must lie within [start_time, end_time].
+        range: datetime
+      filter_start_time:
+        description: Visible-window filter start (ISO-8601). Absent = unbounded start.
+        range: datetime
+      filter_end_time:
+        description: Visible-window filter end (ISO-8601). Absent = unbounded end.
+        range: datetime
+      display_mode:
+        description: Track visualization mode for this plot.
+        range: DisplayModeEnum
+      step_size:
+        description: Playback step granularity for this plot.
+        range: TimeStep
+      playback_rate:
+        description: Playback speed multiplier for this plot (0.1–100).
+        range: float
+        minimum_value: 0.1
+        maximum_value: 100.0
       # ---- spatial ----
-      bbox:
-        range: float
-        multivalued: true
-      zoom:
-        range: float
-      center:
-        range: float
-        multivalued: true
+      viewport:
+        description: Saved map viewport (ViewportPolygon). Identity-mapped to SpatialSlice.viewport.
+        range: ViewportPolygon
+      rotation:
+        description: Map rotation in degrees (0–360).
+        range: float
+        minimum_value: 0
+        maximum_value: 360
       # ---- selection ----
       selected_ids:
         range: string
         multivalued: true
+      selected_primary:
+        description: Primary selection path for properties display.
+        range: string
       # ---- active_storyboard ----
       active_storyboard_id:
         range: string
       provenance:
         range: LogEntry
         multivalued: true
         inlined_as_list: true
+    rules:
+      - description: temporal variant requires start_time and end_time
+        preconditions: { slot_conditions: { state_type: { equals_string: temporal } } }
+        postconditions: { slot_conditions: { start_time: { required: true }, end_time: { required: true } } }
+      - description: spatial variant requires viewport
+        preconditions: { slot_conditions: { state_type: { equals_string: spatial } } }
+        postconditions: { slot_conditions: { viewport: { required: true } } }
+      - description: selection variant requires selected_ids
+        preconditions: { slot_conditions: { state_type: { equals_string: selection } } }
+        postconditions: { slot_conditions: { selected_ids: { required: true } } }
+      - description: active_storyboard variant requires active_storyboard_id
+        preconditions: { slot_conditions: { state_type: { equals_string: active_storyboard } } }
+        postconditions: { slot_conditions: { active_storyboard_id: { required: true } } }
```

`provenance` stays **optional** (it predates this work). The helper never writes it for `state.*` features (FR-013) — leanness is a runtime-writer choice, not a schema constraint, so #237's existing fixtureless `active_storyboard` features remain valid.

## 4. `common.yaml` — `SystemStateTypeEnum.spatial` description (cosmetic, FR-002)

```diff
       spatial:
-        description: Map viewport state (bbox, zoom)
+        description: Map viewport state (ViewportPolygon)
```

## 5. `session-state.yaml` — remove vestigial sidecar classes

- Delete `SessionFile` and `SessionState` (sidecar retired — FR-016).
- Delete slice classes (`TemporalSlice`/`SpatialSlice`/`FeaturesSlice`/`DocumentSlice`/`ResultsSlice`/`BrowserFilterSlice`/`LastToolExecution`) **iff** no runtime consumer imports the generated form (the TS store uses its own hand-authored interfaces — verify before delete). Value types already moved to `common.yaml` (§2). If nothing remains, the file (and its entry in `debrief.yaml` imports) is removed entirely.

---

## What this delta DOES

- Adds `visible` to the shared base feature-props class (one edit, all feature types).
- Adds 8 optional fields to `SystemStateProperties` (temporal: `current_time`, `filter_start_time`, `filter_end_time`, `display_mode`, `step_size`, `playback_rate`; spatial: `viewport`, `rotation`; selection: `selected_primary`).
- Removes 3 fields (`bbox`, `zoom`, `center`) — Article XIV.1, zero runtime consumers (verified).
- Adds 4 per-variant `rules:` blocks.
- Consolidates shared value types into `common.yaml`; deletes duplicates; guts `session-state.yaml`.

## What this delta does NOT do

- Does not change `LogEntry` (review-resolution 2A carried forward — visibility provenance uses existing fields).
- Does not add a `SystemStateTypeEnum` value.
- Does not change `ViewportPolygon`'s own shape — only its authoring location.
- Does not change `active_storyboard`'s wire shape (NG-002).

## Downstream

| Downstream | Action |
|---|---|
| `gen-typescript` | Regenerate `types.ts`. `SystemStateProperties` gains the new fields, loses `bbox`/`zoom`/`center`. `BaseFeatureProperties` (and all `is_a` children) gain `visible?: boolean`. |
| `gen-pydantic` | Regenerate. Conditional required-ness via `rules:` reflected in validation. |
| `gen-json-schema` | Regenerate. **Risk (FR-006a / R-005)**: `viewport: ViewportPolygon` (multivalued `Coordinate`) may trip the known gen-json-schema bug now that it's in the JSON Schema build — resolve via `generate.py` post-processor or Pydantic-only fixture validation. |
| Fixtures | New `shared/schemas/fixtures/system-state/{valid,invalid}/*` + a `visible:false` feature fixture (FR-006). |
| Adherence tests | Cover all four variants + visibility (Article II.2). |

## Backward compatibility

Pre-release (Article XIV) — no compatibility obligation. The `active_storyboard` variant is unaffected (gains nothing, loses nothing), so #237's shipped features validate against the post-delta schema. The removed `bbox`/`zoom`/`center` fields have zero producers/consumers (verified), so no data in the wild is invalidated.
