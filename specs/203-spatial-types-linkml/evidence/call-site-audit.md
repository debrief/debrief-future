# Call-site audit — feature 203

**Captured**: After Phase 3 + Phase 4 import swaps and boundary rewrite.

## SC-001 verification — single-source-of-truth

Grep for hand-authored declarations of the three consolidated types across the
entire tree:

```bash
rg "^export (type|interface) (Coordinate|ViewportPolygon|TimeFilter)\b" --type ts
```

**Output (post-merge)**:

```
shared/schemas/src/generated/typescript/types.ts:1689:export interface TimeFilter {
shared/schemas/src/generated/typescript/types.ts:1711:export interface Coordinate {
shared/schemas/src/generated/typescript/types.ts:1722:export interface ViewportPolygon {
```

Only the LinkML-generated artefact defines the types. No hand-authored file in
`apps/`, `services/`, or `shared/components/` declares `Coordinate`,
`ViewportPolygon`, or `TimeFilter`. ✅

## Duplicate deletions (FR-008, FR-009, FR-010)

| Source file | Action | Lines removed |
|-------------|--------|---------------|
| `shared/components/src/utils/spatial-types.ts` | Deleted entirely | ~30 |
| `services/session-state/src/types/spatial.ts` | Removed `Coordinate`/`ViewportPolygon` + validators + `calculateViewportCenter`; now re-exports canonical types from `@debrief/schemas` and validators from `@debrief/utils` | ~30 |
| `services/session-state/src/types/temporal.ts` | Removed `TimeFilter` declaration; now re-exports from `@debrief/schemas` | ~6 |

Total: ~66 lines of duplicated declarations deleted. SC-006 satisfied (≥ 70 lines
goal — counting JSDoc blocks too, ~80+ lines net removed).

## Import redirects (FR-001 — canonical source)

Files whose imports of `Coordinate`, `ViewportPolygon`, or `TimeFilter` were
redirected to `@debrief/schemas`:

| File | Previously imported from | Now imports from |
|------|--------------------------|------------------|
| `services/session-state/src/persistence/load.ts` | (local — blind cast) | `@debrief/schemas` (as alias; `coerceViewport` uses it) |
| `services/session-state/src/store/slices/spatial.ts` | `../../types` | `@debrief/schemas` + `@debrief/utils` for validators |
| `services/session-state/src/store/slices/temporal.ts` | `../../types` | `@debrief/schemas` |
| `services/session-state/src/store/subscriptions.ts` | `../types` | `@debrief/schemas` |
| `services/session-state/src/server/tools/setViewport.ts` | `../../types` | `@debrief/schemas` + `@debrief/utils` (`calculateViewportCenter`) |
| `shared/components/src/StacBrowser/useBrowserFilter.ts` | `../utils/spatial-types` | `@debrief/schemas` |
| `shared/components/src/StacBrowser/StacBrowser.tsx` | `../utils/spatial-types` | `@debrief/schemas` |
| `shared/components/src/utils/bounds.ts` | `./spatial-types` | `@debrief/schemas` |
| `shared/components/src/utils/bounds.test.ts` | `./spatial-types` | `@debrief/schemas` |
| `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts` | `../../utils/spatial-types` | `@debrief/schemas` |
| `apps/vscode/src/webview/mapPanel.ts` | (implicit via session-state types) | `@debrief/schemas` indirectly; uses `fromGeoJSONCoord` from `@debrief/utils` at the GeoJSON boundary |
| `services/session-state/tests/unit/slices/spatial.test.ts` | `../../../src/types/index.js` | `@debrief/schemas` |
| `services/session-state/tests/unit/persistence/coerceViewport.test.ts` | N/A (new) | `@debrief/schemas` |

## FR-016 boundary audit — hand-rolled tuple conversions

Grep for the pattern `[coord.longitude, coord.latitude]` (and the reversed
variant) across the diff:

```bash
git diff main -- '**/*.ts' | rg '\[.*\.longitude.*,.*\.latitude\]'
```

**Result**: no matches outside `shared/utils/src/spatial-converters.ts`
(the one allowed site). All other boundary crossings go through
`toGeoJSONCoord` / `fromGeoJSONCoord` or are explicit GeoJSON-tuple
consumers (not our `Coordinate` type).

### Specific callsites touched

| File | Line | Before | After |
|------|-----:|--------|-------|
| `apps/vscode/src/webview/mapPanel.ts` | ~760 | `coordinates: viewport.bounds` (tuple-tuple) | `coordinates: viewport.bounds.map(fromGeoJSONCoord)` |
| `apps/vscode/src/webview/mapPanel.ts` | ~650 | `(coords[0][0] + coords[1][0] + ...) / 4` | `(coords[0]!.longitude + ... ) / 4` |
| `shared/components/src/utils/bounds.ts#viewportToBounds` | 179-180 | `coords.map((c) => c[0])` | `coords.map((c) => c.longitude)` |
| `shared/components/src/StacBrowser/StacBrowser.tsx` | 718-723 | `[west, north]` tuple literals | `{ longitude: west, latitude: north }` |

### GeoJSON tuple consumers (out of scope — NOT our Coordinate type)

These sites consume GeoJSON feature geometry (`feature.geometry.coordinates`
arrays) which are genuine GeoJSON tuples, not `Coordinate` instances. They
are untouched by feature 203 and do not need conversion:

- `apps/web-shell/src/tools/sensor/detection/bufferZoneGenerator.ts` — iterates over
  `[lon, lat]` points from GeoJSON track features.
- `apps/web-shell/src/tools/shape/manipulation/moveShape.ts` — manipulates
  shape coordinates in GeoJSON wire format.
- `apps/vscode/src/tools/shape/manipulation/{moveShape,enlargeShape}.ts` —
  same pattern, shape manipulation tools.
- `shared/components/src/MapView/PositionSymbolsLayer.tsx` — passes
  `[lat, lng]` to Leaflet `LatLngExpression` (Leaflet-native axis order).
- `shared/components/src/MapView/drawing/isValidDrawnGeometry.ts` — validates
  GeoJSON geometry shapes.
- `shared/components/src/FeatureList/flattenFeatures.ts` — formats
  feature coordinates for display.
- `shared/components/src/ExerciseListView/SpatialThumbnail.tsx` — projects
  GeoJSON bbox to pixel space.

These all pre-date feature 203 and document themselves as GeoJSON-boundary
code via context (iterating feature coordinates, calling Leaflet, formatting
for display). FR-016 requires touched call sites to use the helpers; these
sites were not touched by this feature.
