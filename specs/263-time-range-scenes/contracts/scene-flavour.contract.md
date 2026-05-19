# Contract: Scene Flavour XOR

**Surface**: `shared/components/src/storyboard/{types,validate,errors}.ts` + LinkML `storyboard.yaml` rules + generated `@debrief/schemas` types.

**Stable consumers**: storyboard CRUD module, capture command, playback engine, briefing renderer (future #264), every reader that touches Scene properties.

## Invariants

1. **XOR coupling**. Exactly one of:
   - `properties.time_range == null/absent` AND `properties.viewport_end == null/absent` (instant flavour), OR
   - `properties.time_range` is a `TimeRange` value AND `properties.viewport_end` is a `Viewport` value (time-range flavour).
2. **Range validity**. If time-range flavour: `time_range.end > time_range.start`.
3. **Sort-anchor invariant**. If time-range flavour: `timestamp == time_range.start`.
4. **Bearing zero**. Both `viewport.bearing == 0` and (if present) `viewport_end.bearing == 0` (v1 reserved; unchanged by this feature).

## Validation outputs (errors)

A failing Scene MUST raise exactly one error per violated invariant, drawn from `errors.ts`:

| Invariant | Error code | Message structure |
|-----------|------------|-------------------|
| XOR | `SceneFlavourXorViolation` | "Scene {id} has `time_range` {present/absent} but `viewport_end` {absent/present}; both must be present (time-range flavour) or both absent (instant flavour)." |
| Range validity | `SceneTimeRangeEndNotAfterStartError` | "Scene {id} has `time_range.end` ({end}) not strictly greater than `time_range.start` ({start})." |
| Sort anchor | `SceneTimestampDoesNotEqualTimeRangeStartError` | "Scene {id} has `timestamp` ({timestamp}) not equal to `time_range.start` ({start})." |
| Bearing zero | `ReservedSlotViolationError` (existing) | unchanged from #215 |

Errors carry the `properties.id` (ULID) and the involved field paths; no other data leaks through.

## Narrowing predicate

```ts
isTimeRangeScene(scene: SceneFeature): scene is TimeRangeSceneFeature
```

- **MUST** be the only narrowing site in the codebase.
- **MUST** check `scene.properties.time_range !== undefined && scene.properties.time_range !== null` only — does not double-check `viewport_end`, because the validator has already enforced XOR.
- **MUST NOT** be inlined or re-implemented; callers depend on identity narrowing through this single function (lint rule to be added in a follow-up if needed).

## Contract tests

Each invariant has at least one valid and one invalid golden fixture (data-model.md §7). Tests live in:

- `shared/schemas/tests/test_storyboard_scene_flavour.py` (Pydantic + JSON Schema, pytest)
- `shared/components/src/storyboard/__tests__/validate.flavour.test.ts` (TS, vitest)
- `shared/components/src/storyboard/__tests__/types.flavour.test.ts` (narrowing predicate, vitest)
