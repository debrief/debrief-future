# Consolidate spatial types in LinkML + add lat/lon ↔ GeoJSON converters

## Problem
Three spatial types — `Coordinate`, `ViewportPolygon`, `TimeFilter` — are each defined twice in TypeScript:

- `shared/components/src/utils/spatial-types.ts` (+ `TimeFilter`)
- `services/session-state/src/types/spatial.ts` and `temporal.ts`

The two TS copies use tuple `[number, number]` for coordinates (Leaflet / GeoJSON convention) and add a `zoom` field that the LinkML schema does not have. Meanwhile the schema itself defines `Coordinate = { longitude: number, latitude: number }` (object form) and `ViewportPolygon` without `zoom`. Three shapes for the same concept, spread across two TS packages plus a schema that matches neither runtime copy.

## Proposed Solution
Adopt the `{ longitude, latitude }` object form as canonical throughout the app; keep GeoJSON tuple representation contained at the interop boundary.

1. **LinkML (root of truth):**
   - Keep `Coordinate` as the object form `{ longitude: float, latitude: float }` (already present).
   - Add a `zoom` slot to `ViewportPolygon` (or define a sibling class `ViewState` if `zoom` is out of scope for a pure polygon).
   - Add `TimeFilter` to LinkML if absent (`{ start: number | null, end: number | null }` or equivalent).
   - Regenerate Pydantic + TypeScript.
2. **Runtime:**
   - Delete `shared/components/src/utils/spatial-types.ts` and the duplicate types in `services/session-state/src/types/`.
   - All consumers import from `@debrief/schemas`.
   - Move any validators (`validateCoordinate`, `validateViewportPolygon`) into `@debrief/utils`.
3. **GeoJSON interop:**
   - Add two pure helpers to `@debrief/utils`:
     - `toGeoJSONCoord(coord: Coordinate): [number, number]` — returns `[longitude, latitude]` (GeoJSON order).
     - `fromGeoJSONCoord([lon, lat]: [number, number]): Coordinate` — returns the object form.
   - Any code that needs the tuple form (Leaflet inputs, GeoJSON geometry round-trips) uses these helpers; tuple handling is confined to adapters.

## Success Criteria
- `Coordinate`, `ViewportPolygon`, `TimeFilter` each have exactly one definition, rooted in LinkML
- All runtime TypeScript consumers import from `@debrief/schemas`
- `toGeoJSONCoord` / `fromGeoJSONCoord` are the only places tuple form appears for new code; existing GeoJSON-facing code uses them at the boundary
- Schema tests pass (Python → JSON → TS → JSON round-trip)
- VS Code map viewport, web-shell map, and any other spatial consumer still render correctly (smoke-test set documented in spec)

## Dependencies
None (but implementation requires LinkML authoring care; coordinate with schema owner).

## Parallelisation
This is one of three LinkML-layer items (#203, #204, #205) that all edit `shared/schemas/src/*.yaml` and regenerate. To parallelise safely:
- If the LinkML source is modular (separate files per concern), each item can land independently.
- If the source is monolithic, serialise the three items OR coordinate on a single merge.
- Regenerated artefacts (Pydantic + TS) will conflict if two LinkML PRs land together without a clean rebase.

Fully parallel with #199, #200, #201, #202, #206 (none touch LinkML).

## Complexity
Medium

## Reference
Raised as part of the code-quality review pass; see PR #465 final report (Track 2 / Item 4) for discovery context.
