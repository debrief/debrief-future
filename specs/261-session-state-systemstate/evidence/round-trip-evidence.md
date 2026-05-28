# Round-trip evidence (Article II.2)

Python → JSON → TypeScript → JSON → Python bit-equality for every `SystemState`
variant plus a `visible:false` feature. Produced by
`shared/schemas/tests/test_system_state_round_trip.py`, which loads each golden
fixture into Pydantic, dumps to JSON, pipes it through a Node helper that
asserts the generated TypeScript shape and re-serialises, then reparses into
Pydantic and asserts the two `model_dump_json(by_alias=True, exclude_none=True)`
outputs are byte-identical.

| Fixture | Variant | Pydantic model | Py→TS→Py byte-equal |
|---|---|---|---|
| `valid/spatial.json` | `state.spatial` (viewport + rotation) | `SystemState` | ✅ |
| `valid/temporal.json` | `state.temporal` (start/end/current/filter + display_mode/step/rate) | `SystemState` | ✅ |
| `valid/selection.json` | `state.selection` (selected_ids + selected_primary) | `SystemState` | ✅ |
| `valid/active-storyboard.json` | `state.activestoryboard` (#237 shape) | `SystemState` | ✅ |
| `valid/feature-visible-false.json` | geographic feature with `properties.visible:false` | `ReferenceLocation` | ✅ |

```
$ uv run pytest tests/test_system_state_round_trip.py -q
.....                                                                    [100%]
5 passed
```

## What this proves

- The LinkML delta (new `SystemStateProperties` fields, the `visible` flag on
  `BaseFeatureProperties`, and the value-type consolidation into `common.yaml`)
  generates **consistent** Pydantic, JSON Schema, and TypeScript bindings — no
  generator drift (SC-008).
- The on-the-wire JSON for every variant is stable across the language boundary,
  so a plot saved by one host's TypeScript code is read losslessly by the
  Python schema layer and vice-versa (SC-001 numeric/ISO tolerance).
- The `gen-json-schema` `ViewportPolygon.coordinates` multivalued-class-range
  risk (FR-006a) did **not** materialise: `SystemState.schema.json` emits a
  correct `{ items: { $ref: Coordinate }, minItems: 4, maxItems: 4 }` and the
  full schema build is clean — no post-processor was required.

## Pydantic-side adherence (companion)

```
$ uv run pytest tests/test_system_state_adherence.py -q
..............                                                           [100%]
14 passed
```

Covers: valid variants parse + round-trip; structural/type/enum invalids
rejected by Pydantic; the `spatial`-missing-`viewport` rules violation rejected
by the generated JSON Schema `if/then`; and the FC-level (duplicate `state_type`)
+ temporal cross-field invariants pinned as helper-enforced.
