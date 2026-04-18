# Add RawGeoJSONFeature to LinkML; eliminate hand-typed duplicates

## Problem
`GeoJSONFeature` is defined twice in TypeScript with different shapes:

- `shared/utils/src/types.ts`: `id?: string`, typed coordinate arrays (`number[] | number[][] | number[][][]`)
- `services/session-state/src/types/results.ts`: `id?: string | number`, `coordinates: unknown`

Meanwhile the LinkML schema already defines the precise `DebriefFeature` discriminated union (`TrackFeature | PointFeature | ReferenceLocation | ...`), but there is no LinkML class describing the **loose "any GeoJSON Feature"** shape needed at parse boundaries — where a payload hasn't yet been narrowed to a specific `DebriefFeature` subtype. Both TS copies exist to fill that gap, and they've drifted.

## Proposed Solution
1. **LinkML:** add a `RawGeoJSONFeature` class matching the GeoJSON spec's structural minimum:
   - `type: "Feature"` literal
   - `id?: string | integer`
   - `geometry: RawGeoJSONGeometry` (or the existing schema geometry union, loosened)
   - `properties?: Record<string, Any>` (whatever LinkML's equivalent of `object` is)

   This is an exception to the "don't define types for unknown shapes" rule: the GeoJSON spec *is* a well-defined external contract, and having a LinkML class for it means the loose boundary type is still schema-rooted.

2. Regenerate Pydantic + TypeScript.

3. Delete both TS copies (`shared/utils/src/types.ts#GeoJSONFeature` and `services/session-state/src/types/results.ts#GeoJSONFeature`). All consumers import from `@debrief/schemas`.

4. Document the usage rule in a short header comment on the generated type: **"Use this only at parse boundaries. Code past the parse boundary should narrow to `DebriefFeature` (or a specific subtype) via the existing type guards."**

## Success Criteria
- `RawGeoJSONFeature` exists in LinkML and is generated into Pydantic + TS
- No hand-typed `GeoJSONFeature` interface exists in `apps/`, `shared/`, or `services/`
- All former consumers import from `@debrief/schemas`
- Schema round-trip tests pass

## Dependencies
None (independent LinkML edit).

## Parallelisation
Shares the LinkML-regen coordination concern with #199 and #201 (see #199's Parallelisation section). Independent of all non-LinkML items.

## Complexity
Medium

## Reference
Raised as part of the code-quality review pass; see PR #465 final report (Track 2 / Item 5) for discovery context.
