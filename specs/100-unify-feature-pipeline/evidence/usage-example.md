# Usage Example: Unified Feature Pipeline

## Before: Three Separate Arrays

### stacService.loadPlotData()
```typescript
// OLD: Returns three separate arrays
const data = await stacService.loadPlotData(store, itemPath);
// data = { tracks: Track[], locations: ReferenceLocation[], otherFeatures: GeoJSONFeature[] }
```

### View Provider (activityPanelView.ts)
```typescript
// OLD: Three state variables, three parameters
private _tracks: Track[] = [];
private _locations: ReferenceLocation[] = [];
private _otherFeatures: GeoJSONFeature[] = [];

public setFeatures(tracks: Track[], locations: ReferenceLocation[], otherFeatures: GeoJSONFeature[] = []): void {
  this._tracks = tracks;
  this._locations = locations;
  this._otherFeatures = otherFeatures;
  this._sendLayersUpdate();
}
```

### Webview (mapView.tsx)
```typescript
// OLD: Three state vars, manual transform functions
const [tracks, setTracks] = useState<Track[]>([]);
const [locations, setLocations] = useState<ReferenceLocation[]>([]);
const [otherFeatures, setOtherFeatures] = useState<GeoJSONFeature[]>([]);

function trackToFeature(track: Track): DebriefFeature { /* 15 lines */ }
function locationToFeature(loc: ReferenceLocation): DebriefFeature { /* 10 lines */ }

const features = useMemo(() => {
  const trackFeatures = tracks.map(t => trackToFeature(t, trackColors[t.id]));
  const locationFeatures = locations.map(locationToFeature);
  const otherDebriefFeatures = otherFeatures.map(f => ({...})) as DebriefFeature[];
  return [...trackFeatures, ...locationFeatures, ...otherDebriefFeatures, ...resultFeatures, ...drawnFeatures];
}, [tracks, locations, otherFeatures, resultFeatures, drawnFeatures, trackColors, hiddenIds]);
```

### Message Protocol
```typescript
// OLD: Separate fields
interface LoadPlotMessage {
  plot: { tracks: Track[]; locations: ReferenceLocation[]; otherFeatures: GeoJSONFeature[]; };
}

interface SelectionChangedMessage {
  selection: { trackIds: string[]; locationIds: string[]; };
}
```

---

## After: Single Unified Array

### stacService.loadPlotData()
```typescript
// NEW: Returns DebriefFeatureCollection
const data = await stacService.loadPlotData(store, itemPath);
// data = { type: 'FeatureCollection', features: DebriefFeature[] }
// Each feature has properties.kind = 'TRACK' | 'POINT' | 'CIRCLE' | 'RECTANGLE' | ...
```

### View Provider (activityPanelView.ts)
```typescript
// NEW: Single state variable, single parameter
private _features: DebriefFeature[] = [];

public setFeatures(features: DebriefFeature[]): void {
  this._features = features;
  this._sendLayersUpdate();
}
```

### Webview (mapView.tsx)
```typescript
// NEW: Single state var, no transforms needed
const [plotFeatures, setPlotFeatures] = useState<DebriefFeature[]>([]);

// No trackToFeature() or locationToFeature() functions needed

const features = useMemo(() => {
  const allFeatures = [...plotFeatures, ...resultFeatures, ...drawnFeatures];
  if (hiddenIds.size === 0) return allFeatures;
  return allFeatures.filter(f => !hiddenIds.has(String(f.id)));
}, [plotFeatures, resultFeatures, drawnFeatures, hiddenIds]);
```

### Message Protocol
```typescript
// NEW: Single features array
interface LoadPlotMessage {
  plot: { features: DebriefFeature[]; };
}

interface SelectionChangedMessage {
  selection: { featureIds: string[]; };
}
```

---

## Key Benefits

1. **213 fewer lines of code** — removed duplicate transform logic
2. **Single data path** — features flow from stacService through providers to webview unchanged
3. **Type-safe classification** — `isTrackFeature()`, `isReferenceLocation()`, `isAnnotationFeature()` guards at render boundaries
4. **Extensible** — new feature kinds (e.g., MULTI_POINT) automatically flow through without provider changes
