# API Diff: Before vs After

## stacService.loadPlotData()

| Aspect | Before | After |
|--------|--------|-------|
| Return type | `{ tracks: Track[], locations: ReferenceLocation[], otherFeatures: GeoJSONFeature[] } \| null` | `DebriefFeatureCollection \| null` |
| Feature classification | At data loading time | At render time (via type guards) |
| Track representation | Extension-local `Track` interface | Schema `TrackFeature` with `properties.kind = 'TRACK'` |
| Location representation | Extension-local `ReferenceLocation` interface | Schema `ReferenceLocation` with `properties.kind = 'POINT'` |
| Annotation representation | Untyped `GeoJSONFeature` | `AnnotationFeature` with `properties.kind` preserving original kind |

## mapPanel

| Method | Before | After |
|--------|--------|-------|
| `loadPlot()` | `(plot, tracks, locations, otherFeatures)` | `(plot, features: DebriefFeature[])` |
| State | `currentTracks`, `currentLocations`, `otherFeatures` | `currentFeatures: DebriefFeature[]` |
| `getFeatures()` | `getTracks()`, `getLocations()`, `getOtherFeatures()` | `getFeatures(): DebriefFeature[]` |
| `onSelectionChanged` | `(selection: { trackIds, locationIds })` | `(selection: { featureIds })` |

## layersTreeProvider

| Method | Before | After |
|--------|--------|-------|
| Set data | `setTracks()`, `setLocations()`, `setShapes()` | `setFeatures(features: DebriefFeature[])` |
| `LayerItem` type | `{ type: 'track' \| 'location' \| 'shape'; ... }` | `{ type: 'feature'; feature: DebriefFeature }` |

## activityPanelView

| Method | Before | After |
|--------|--------|-------|
| `setFeatures()` | `(tracks, locations, otherFeatures)` | `(features: DebriefFeature[])` |
| State | `_tracks`, `_locations`, `_otherFeatures` | `_features: DebriefFeature[]` |
| `_sendLayersUpdate()` | Manually transforms Track/Location to DebriefFeature | Passes features directly |

## Message Protocol

| Message | Before | After |
|---------|--------|-------|
| `loadPlot.plot` | `{ tracks, locations, otherFeatures }` | `{ features: DebriefFeature[] }` |
| `selectionChanged.selection` | `{ trackIds, locationIds, contextType }` | `{ featureIds, contextType }` |
| `updateTracks` | Existed | Removed |

## Exported Type Guards (new)

```typescript
// Now exported from @debrief/components
export { isTrackFeature, isReferenceLocation, isMultiPointFeature, isMultiPolygonFeature, isAnnotationFeature, isExpandableFeature } from './utils/types';
```
