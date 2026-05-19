# Contract: LinkML schema delta for `current_time`

**Feature**: `261-session-state-systemstate`
**File modified**: `shared/schemas/src/linkml/geojson.yaml`
**Type of change**: Additive minor (Article II.3, FR-016).

This contract is the binding agreement on the LinkML schema change. The implementation may differ in YAML formatting but MUST match this contract in structure, field names, and semantic constraints.

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
       bbox:
         range: float
         multivalued: true
         exact_cardinality: 4
         required: false
       zoom:
         range: float
         required: false
       center:
         range: float
         multivalued: true
         exact_cardinality: 2
         required: false
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
+      - description: spatial variant requires bbox, zoom, and center
+        preconditions:
+          slot_conditions:
+            state_type:
+              equals_string: spatial
+        postconditions:
+          slot_conditions:
+            bbox:
+              required: true
+            zoom:
+              required: true
+            center:
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

- Adds **one new optional attribute**: `current_time: datetime`.
- Adds **four `rules:` blocks** that pin per-variant required fields conditionally on `state_type`. This formalises constraints that have been implicit since #215; #237 did not codify them at the schema level. This work captures them now because the runtime helper relies on them being machine-checked.

## What this delta does NOT do

- Does not rename any field.
- Does not change the type of any existing field.
- Does not remove any field.
- Does not introduce a new variant of `SystemStateTypeEnum`.
- Does not change `LogEntry` (a separate, scoped delta described in `data-model.md` § "Open issues" may add `host` to LogEntry — that's a downstream task, not part of this contract).

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
3. No existing field's required-ness changed (the `start_time` / `end_time` / `bbox` / etc. attributes remain class-level optional; per-variant required-ness is enforced by the new `rules:`).

Conversely, no `SystemStateProperties` value written **after** this delta would fail under the **pre-delta** schema for the `active_storyboard` variant, since that variant gains nothing in this delta.

## Versioning

The LinkML schema file itself does **not** carry a version field (LinkML convention — schema files are atomic). The downstream `version` markers are:

- `shared/schemas/package.json` — bump minor.
- `services/session-state/src/persistence/load.ts` — `CURRENT_SESSION_FILE_VERSION` bumps `"1.1.0"` → `"1.2.0"` (per FR-015, R-004).
- The new sidecar `migration_lineage.schema_version_at_write` records the value at save time.
