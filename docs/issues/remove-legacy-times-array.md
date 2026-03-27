# Remove legacy `times[]` array — use schema-standard `positions[].time`

## Summary

The codebase has two incompatible strategies for storing per-position timestamps on track features:

| Strategy | Format | Schema-defined | Producers | Real data |
|----------|--------|---------------|-----------|-----------|
| `positions[].time` | ISO 8601 strings | Yes (LinkML `TrackProperties`) | REP handler, DPF handler | 100% (485/485 tracks) |
| `times[]` | epoch-ms numbers | No | None (runtime-only) | 0% |

The `times[]` array is a legacy wire format that is **not in the schema**, **not produced by any importer**, and **not present in any real data**. It exists only in runtime code, test fixtures, and Storybook stories. This violates Constitution Article XIV (strict typing) — the property is injected at runtime via `as` casts that bypass the type system.

## Root cause

The `times[]` pattern was introduced for temporal rendering before the schema standardised on `positions[].time`. Code was never migrated.

## Impact

- Time controller showed collapsed range for tracks with `start_time`/`end_time` but no `times[]` (fixed in #TBD)
- `temporal-utils.ts` throws at runtime if `times[]` is missing or contains non-numbers — but real data never has it
- Analysis tools (`rangeBearing`, `trackStats`) silently fail or return wrong results when `times[]` is absent
- Untyped `as unknown` casts throughout the codebase to access a property the schema doesn't define

## Files to migrate

### Consumers (read `times[]`)

| File | Lines | What it does | Difficulty |
|------|-------|-------------|------------|
| `shared/components/src/MapView/temporal-utils.ts` | 108-128 | `extractTemporalData()` — reads `times[]`, validates numeric, enforces parallel-array constraint with `coordinates`. Core of snail-trail rendering. | **Moderate** — must parse `positions[].time` ISO strings to epoch-ms instead |
| `shared/components/src/utils/time.ts` | 30-46 | `calculateTimeExtent()` — fallback when `start_time`/`end_time` absent | **Trivial** — fallback path can use `positions` array |
| `apps/web-shell/src/tools/track/analysis/trackStats.ts` | 118-124 | Reads `times[0]` and `times[last]` for duration | **Trivial** — use `start_time`/`end_time` or `positions` |
| `apps/web-shell/src/tools/track/analysis/rangeBearing.ts` | 87-98 | `getLegacyProps()` helper reads `times[]` for time-series | **Trivial** — read `positions[].time` instead |
| `services/calc/debrief_calc/tools/range_bearing.py` | 52-58, 148-168 | `_extract_times()` and `_is_track()` — Python equivalent | **Trivial** — read `positions[].time` instead |

### Producers (create `times[]` at runtime)

| File | Lines | What it does | Difficulty |
|------|-------|-------------|------------|
| `apps/vscode/src/services/stacService.ts` | ~352-374 | `loadPlot()` — extends TrackFeature type at runtime to add `times: number[]`. Converts positions to epoch-ms array. | **Moderate** — remove runtime injection, let consumers read `positions[].time` directly |

### Test fixtures & stories

| File | What to do |
|------|-----------|
| `shared/components/src/MapView/__fixtures__/sampleTracks.ts` | Replace `times[]` with `positions[]` |
| `shared/components/src/MapView/__fixtures__/exerciseAlpha.ts` | Replace `times[]` with `positions[]` |
| `shared/components/src/MapView/PositionStyling.stories.tsx` | Remove `times[]`, use `positions[]` only |
| `shared/components/src/MapView/__tests__/temporal-utils.test.ts` | Rewrite to test `positions[].time` extraction |
| `apps/vscode/tests/unit/stacService.shapes.test.ts` | Remove `times` from mock track data |
| `apps/vscode/tests/unit/temporalConversion.test.ts` | Remove or rewrite — tests ISO→epoch conversion for `times[]` |
| `apps/vscode/tests/unit/sessionManager.test.ts` | Remove `times` from mock data |
| `apps/vscode/tests/unit/stacService.test.ts` | Already updated (this PR) |

### Documentation & specs to update

| File | What to do |
|------|-----------|
| `specs/030-temporal-track-rendering/data-model.md` | Remove `times[]` as valid format, document `positions[].time` as sole source |
| `specs/030-temporal-track-rendering/quickstart.md` | Update example JSON |
| `specs/005-e2e-workflow-tests/contracts/io-to-stac.md` | Remove `times` from contract |

## Migration approach

1. **Update `temporal-utils.ts`** — the critical consumer. Change `extractTemporalData()` to read `positions[].time` (ISO strings), parse to epoch-ms internally. Keep the parallel-array validation (positions.length === coordinates.length).

2. **Update analysis tools** — `trackStats.ts`, `rangeBearing.ts`, `range_bearing.py`. Replace `times[i]` access with `positions[i].time` parsing.

3. **Remove runtime injection** in `stacService.ts` — stop creating `times[]` at load time. Consumers now read `positions` directly.

4. **Update `calculateTimeExtent()`** in `time.ts` — remove `times[]` fallback, add `positions` fallback.

5. **Update fixtures, stories, tests** — replace all `times[]` mock data with `positions[]`.

6. **Update specs** — remove `times[]` from data model docs.

## Acceptance criteria

- [ ] Zero references to `properties.times` or `props.times` in source code (excluding git history)
- [ ] `temporal-utils.ts` reads from `positions[].time` only
- [ ] Analysis tools read from `positions[].time` or `start_time`/`end_time`
- [ ] `stacService.ts` does not inject `times[]` at runtime
- [ ] All test fixtures use `positions[]` format
- [ ] Specs updated to document `positions[].time` as sole temporal source
- [ ] All existing tests pass
- [ ] Snail-trail rendering works with real sample data
