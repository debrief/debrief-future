# Contract: LinkML schema delta for SystemState migration

**Feature**: `261-session-state-systemstate`
**File modified**: `shared/schemas/src/linkml/geojson.yaml`
**Type of change**: Article XIV.1 pre-release refactor (`bbox`/`center` removal) + additive `current_time` + per-variant required-rules formalisation.

This contract is the binding agreement on the LinkML schema change. The implementation may differ in YAML formatting but MUST match this contract in structure, field names, and semantic constraints.

This delta resolves a pre-existing Article II.1 violation in the schema itself: today `SpatialSlice.viewport` uses `ViewportPolygon` (coordinates + zoom) while `SystemStateProperties` with `state_type=spatial` uses parallel `bbox`/`zoom`/`center` fields. Both purport to model the same concept ("map viewport"). Since no runtime code reads the latter (the variant has zero producers/consumers today), this delta unifies them on `ViewportPolygon` — per review resolution 1B.

---

## Delta — pseudo-diff against current `SystemStateProperties`

```diff
 classes:
   SystemStateProperties:
     description: >-
       Properties for SystemState features. Discriminated by state_type.
     attributes:
       kind:
         range: SystemKindEnum
         required: true
         equals_string: SYSTEM
       state_type:
         range: SystemStateTypeEnum
         required: true
       provenance:
         range: LogEntry
         multivalued: true
         inlined_as_list: true
         required: true
       # ---- temporal variant ----
       start_time:
         range: datetime
         required: false
       end_time:
         range: datetime
         required: false
+      current_time:
+        description: >-
+          For temporal SystemState features, the analyst's playhead
+          position at save time (the moment the time-cursor was
+          scrubbed to). When absent on a temporal SystemState feature,
+          the playhead is assumed unset and falls back to the start
+          of the analytical window. Has no meaning for other
+          state_type values.
+        range: datetime
+        required: false
       # ---- spatial variant ----
-      bbox:
-        range: float
-        multivalued: true
-        exact_cardinality: 4
-        required: false
-      zoom:
-        range: float
-        required: false
-      center:
-        range: float
-        multivalued: true
-        exact_cardinality: 2
-        required: false
+      viewport:
+        description: >-
+          For spatial SystemState features, the saved map viewport as a
+          ViewportPolygon. Mirrors the in-memory SpatialSlice.viewport shape
+          exactly — no transformation at the persistence boundary.
+        range: ViewportPolygon
+        required: false
       # ---- selection variant ----
       selected_ids:
         range: string
         multivalued: true
         required: false
       # ---- active_storyboard variant ----
       active_storyboard_id:
         range: string
         required: false
     rules:
+      - description: temporal variant requires start_time and end_time
+        preconditions:
+          slot_conditions:
+            state_type:
+              equals_string: temporal
+        postconditions:
+          slot_conditions:
+            start_time:
+              required: true
+            end_time:
+              required: true
+      - description: spatial variant requires viewport
+        preconditions:
+          slot_conditions:
+            state_type:
+              equals_string: spatial
+        postconditions:
+          slot_conditions:
+            viewport:
+              required: true
+      - description: selection variant requires selected_ids
+        preconditions:
+          slot_conditions:
+            state_type:
+              equals_string: selection
+        postconditions:
+          slot_conditions:
+            selected_ids:
+              required: true
+      - description: active_storyboard variant requires active_storyboard_id
+        preconditions:
+          slot_conditions:
+            state_type:
+              equals_string: active_storyboard
+        postconditions:
+          slot_conditions:
+            active_storyboard_id:
+              required: true
```

---

## What this delta DOES

- Adds **one new optional attribute**: `current_time: datetime` (for the `temporal` variant).
- **Removes three attributes**: `bbox`, `zoom`, `center` on `SystemStateProperties`. Replaced by **one new optional attribute**: `viewport: ViewportPolygon` (for the `spatial` variant). Permitted under Article XIV.1 (pre-release breaking changes) — zero runtime blast radius (the removed fields have no producers or consumers).
- Adds **four `rules:` blocks** that pin per-variant required fields conditionally on `state_type`. This formalises constraints that have been implicit since #215; #237 did not codify them at the schema level. This work captures them now because the runtime helper relies on them being machine-checked.

## What this delta does NOT do

- Does not change `LogEntry`. Per review resolution 2A, provenance uses existing LogEntry fields (`agent`, `was_generated_by{tool, tool_version}`, `activity_type`, `timestamp`) with `tool` distinguishing host (`"vscode-extension"` | `"web-shell-session-state"`) — no `host` field is added.
- Does not introduce a new variant of `SystemStateTypeEnum`.
- Does not change `ViewportPolygon` itself — uses the existing class definition.

## What this delta REQUIRES from downstream

| Downstream | Action |
|---|---|
| `gen-typescript` | Run; produces an updated `shared/schemas/src/generated/typescript/types.ts` with `current_time?: string` on `SystemStateProperties`. |
| `gen-pydantic` | Run; produces an updated Python class with `current_time: Optional[datetime] = None`. |
| `gen-json-schema` | Run; produces an updated JSON Schema with the same. |
| Schema fixtures | New fixtures under `shared/schemas/fixtures/system-state/` exercise valid+invalid examples per variant (FR-002, R-006). |
| Schema adherence tests | Updated to cover the four `SystemState` variants. Article II.2. |

## Backward compatibility guarantee

A `SystemStateProperties` value written **before** this delta (i.e. an `active_storyboard` variant from #237) validates against the **post-delta** schema, because:

1. The new field `current_time` is optional.
2. The new `rules:` block for `active_storyboard` requires `active_storyboard_id`, which #237's writer always populates.
3. No existing field affecting the `active_storyboard` variant changed in required-ness. (The `bbox`/`zoom`/`center` removals only affect the `spatial` variant, which has no runtime producers today — zero plots in the wild contain spatial SystemState features.)

Conversely, no `SystemStateProperties` value written **after** this delta would fail under the **pre-delta** schema for the `active_storyboard` variant, since that variant gains nothing in this delta.

## Versioning

The LinkML schema file itself does **not** carry a version field (LinkML convention — schema files are atomic). The downstream `version` markers are:

- `shared/schemas/package.json` — bump minor.
- `services/session-state/src/persistence/load.ts` — `CURRENT_SESSION_FILE_VERSION` bumps `"1.1.0"` → `"1.2.0"` (per FR-015, R-004).
- The new sidecar `migration_lineage.schema_version_at_write` records the value at save time.
