# Research: Unify Feature Pipeline

**Feature**: 100-unify-feature-pipeline
**Date**: 2026-02-24

## Summary

This research investigates how to refactor `stacService.loadPlotData()` from returning three separate arrays (`tracks: Track[]`, `locations: ReferenceLocation[]`, `otherFeatures: GeoJSONFeature[]`) to returning a single `DebriefFeatureCollection` — and how to update all downstream consumers.

---

## R1: Current Classification Logic

**Decision**: The current classification in `stacService.ts:338-389` uses two discriminators:

1. `geometry.type === 'LineString' && props.times` → Track
2. `geometry.type === 'Point' && (props.kind === 'POINT' || props.kind === 'LOCATION')` → ReferenceLocation
3. Everything else → otherFeatures (fallback)

**Finding**: Features already carry all the information needed for downstream classification via their `properties.kind` value (`FeatureKindEnum`) and geometry type. The `Track` and `ReferenceLocation` types in `apps/vscode/src/types/plot.ts` are **intermediate representations** that exist only because the service layer does classification — they duplicate information already present in the GeoJSON properties.

**Key insight**: The shared `@debrief/schemas` package defines `TrackFeature`, `ReferenceLocation`, `MultiPointFeature`, and `MultiPolygonFeature` with proper schema-derived types. The `DebriefFeature` union type in `shared/components/src/utils/types.ts:48` already represents the unified model:

```
DebriefFeature = TrackFeature | ReferenceLocation | MultiPointFeature | MultiPolygonFeature
```

Type guards already exist: `isTrackFeature()`, `isReferenceLocation()`, `isMultiPointFeature()`, `isMultiPolygonFeature()` — all based on `properties.kind`.

---

## R2: Existing Unified Type Downstream

**Decision**: Use `DebriefFeature` / `DebriefFeatureCollection` from `@debrief/schemas` as the unified pipeline type.

**Rationale**:
- Already defined at `shared/components/src/utils/types.ts:48-57`
- Already used by the shared `<MapView>` component
- Type guards already exist for classification at the render boundary
- `DebriefFeatureCollection` already has `{ type: 'FeatureCollection', features: DebriefFeature[] }`
- `mapView.tsx` already merges all three arrays into `DebriefFeature[]` before rendering — this refactoring simply moves that merge point upstream

**Alternatives considered**:
- Raw GeoJSON `FeatureCollection` with `unknown` properties → rejected, loses type safety
- New custom type → rejected, unnecessary when schema types already serve this purpose

---

## R3: Extension-Local Track Type vs Schema TrackFeature

**Decision**: The `Track` interface in `apps/vscode/src/types/plot.ts:102-149` will be replaced by `TrackFeature` from `@debrief/schemas`.

**Rationale**:

| Extension `Track` field | Schema `TrackFeature` equivalent |
|---|---|
| `id: string` | `id: string` |
| `name: string` | `properties.platform_name` |
| `platformType?: string` | `properties.track_type` |
| `geometry: LineString` | `geometry: GeoJSONLineString \| GeoJSONMultiLineString` |
| `times: number[]` | `properties.positions[].time` (ISO strings) |
| `positions?: TimestampedPosition[]` | `properties.positions: TimestampedPosition[]` |
| `startTime: string` | `properties.start_time` |
| `endTime: string` | `properties.end_time` |
| `color?: string` | `properties.style.line.color` |
| `visible: boolean` | **Session state** (not a data property) |
| `selected: boolean` | **Session state** (not a data property) |
| `defaultPositionStyle?` | `properties.default_position_style` |
| `symbolInterval?` | `properties.symbol_interval` |
| `labelInterval?` | `properties.label_interval` |
| `positionStyleOverrides?` | `properties.position_style_overrides` |

**Key finding**: `visible` and `selected` are UI state, not data properties. They are currently hardcoded to `true`/`false` at load time and managed by session state (`hiddenFeatureIds`, `selection.featureIds`). They don't belong on the data type.

**Alternatives considered**:
- Keep extension `Track` alongside schema types → rejected, creates type duplication and is the root cause of the current coupling

---

## R4: Extension-Local ReferenceLocation vs Schema ReferenceLocation

**Decision**: The `ReferenceLocation` interface in `apps/vscode/src/types/plot.ts:154-172` will be replaced by the schema's `ReferenceLocation`.

**Rationale**: Same as R3 — the extension type duplicates schema properties and adds UI state (`visible`/`selected`) that belongs in session state.

---

## R5: Consumer Impact Analysis

### 5a: `stacService.loadPlotData()` (source)

**Change**: Return `DebriefFeatureCollection` instead of `{ tracks, locations, otherFeatures }`.

The method must build schema-typed `TrackFeature` / `ReferenceLocation` objects directly from the GeoJSON properties, rather than building intermediate `Track` / `ReferenceLocation` objects. Features that don't match known kinds are wrapped as `DebriefFeature` with their original properties preserved.

### 5b: `openPlot.ts` (primary distributor)

**Change**: Receives single collection, passes it to each consumer.

Currently:
```
panel.loadPlot(plot, plotData.tracks, plotData.locations, plotData.otherFeatures)
layersTreeProvider.setTracks(plotData.tracks)
layersTreeProvider.setLocations(plotData.locations)
layersTreeProvider.setShapes(plotData.otherFeatures)
activityPanelProvider.setFeatures(plotData.tracks, plotData.locations, plotData.otherFeatures)
```

After:
```
panel.loadPlot(plot, plotData.features)
layersTreeProvider.setFeatures(plotData.features)
activityPanelProvider.setFeatures(plotData.features)
```

### 5c: `mapPanel.ts` (map webview provider)

**Change**:
- Store `features: DebriefFeature[]` instead of three separate arrays
- `loadPlot()` takes single `features` parameter
- `loadPlot` message sends `features` array instead of three arrays
- REP import handler receives and forwards single collection
- `removeFeatures()`, `addToolResult()` operate on single collection

### 5d: `activityPanelView.ts` (activity panel provider)

**Change**:
- `setFeatures(features: DebriefFeature[])` instead of three params
- `_sendLayersUpdate()` already transforms to `DebriefFeature`-like format — this simplifies since input is already `DebriefFeature[]`

### 5e: `layersTreeProvider.ts` (native tree view)

**Change**:
- Single `setFeatures(features: DebriefFeature[])` method replaces three setters
- `getChildren()` classifies features by `properties.kind` for tree grouping
- `LayerItem` type updated to wrap `DebriefFeature` instead of `Track | ReferenceLocation | GeoJSONFeature`

### 5f: `mapView.tsx` (webview React component)

**Change**:
- Single `features` state instead of three separate arrays
- `trackToFeature()` and `locationToFeature()` transforms become unnecessary — features arrive already as `DebriefFeature`
- `useMemo` merge simplifies to `[...features, ...resultFeatures, ...drawnFeatures]`
- `loadPlot` message handler sets single `features` state

### 5g: `messages.ts` (webview message protocol)

**Change**:
- `LoadPlotMessage.plot.tracks/locations/otherFeatures` → `LoadPlotMessage.plot.features: DebriefFeature[]`
- `UpdateTracksMessage` → `UpdateFeaturesMessage` (or remove if temporal filtering can be handled by time-filtering the single collection)

### 5h: Session state (session-state service)

**Change**: Minimal. Session state already manages selection and visibility by feature ID strings. The `SessionManager.createSession()` call currently receives `tracks` and `locations` — it will receive the feature collection and derive metadata as needed.

---

## R6: Annotation/Shape Feature Handling

**Decision**: Features with kinds `CIRCLE`, `RECTANGLE`, `LINE`, `TEXT`, `VECTOR`, `POLY` (the current "otherFeatures") need to be represented as `DebriefFeature`.

**Finding**: The current `DebriefFeature` union is `TrackFeature | ReferenceLocation | MultiPointFeature | MultiPolygonFeature`. It does not include annotation types (CIRCLE, RECTANGLE, LINE, etc.).

**Options**:
1. Add annotation types to the `DebriefFeature` union in `@debrief/schemas`
2. Use a generic fallback type (e.g., `GeoJSONFeature` with `Record<string, unknown>` properties)
3. Extend `DebriefFeature` to include a generic catch-all variant

**Decision**: Option 2 for now — use a broader `PlotFeature` type that is `DebriefFeature | GenericFeature` where `GenericFeature` handles annotation kinds. This preserves the current behavior where annotations pass through with their original properties intact.

**Rationale**: The schema will eventually add proper annotation feature types, but that's outside the scope of this refactoring (it's a schema change, not a pipeline change). A generic catch-all ensures forward compatibility.

---

## R7: Temporal Filtering Impact

**Decision**: Temporal filtering (time slider) currently operates on `Track[]` via `UpdateTracksMessage`. After unification, filtering applies to the full collection by filtering features that have temporal properties.

**Finding**: Only features with `properties.kind === 'TRACK'` and `properties.positions[].time` have temporal data. The time controller sends `setCurrentTime` and `setDisplayMode` messages — the rendering layer already handles temporal display via `TemporalTrackLayer` which receives `DebriefFeature[]` and renders only track features.

**Conclusion**: The `UpdateTracksMessage` can be removed. Temporal filtering will work through `setCurrentTime` + display mode on the full collection.

---

## R8: Selection Protocol Impact

**Decision**: The selection protocol uses feature IDs (strings). Currently `selectionChanged` message sends `trackIds[]` and `locationIds[]` separately.

**Change needed**: Unify to `featureIds[]`. The `Selection` type in `plot.ts:177-189` currently has `trackIds` and `locationIds` — this should become `featureIds: string[]` with the `contextType` derived from feature properties when needed.

**Finding**: Session state's `FeatureSelection` already uses `featureIds: string[]` — it's already unified. The split is only in the webview ↔ extension message protocol.

---

## R9: Test Strategy

**Existing tests**:
- `apps/vscode/tests/unit/stacService.test.ts` — 13 tests for `loadPlotData()` classification
- `apps/vscode/tests/unit/stacService.shapes.test.ts` — shape feature classification tests
- Integration tests for plot loading workflow
- E2E Playwright tests for full VS Code workflows

**Strategy**:
1. Update `stacService.test.ts` to assert single collection return type with `properties.kind` classification
2. Update integration tests for new consumer signatures
3. E2E tests should pass without changes (they test user-visible behavior which is preserved)
4. Add new tests for type guard classification at render boundary
