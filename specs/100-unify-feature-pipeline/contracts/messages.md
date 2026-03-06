# Message Protocol Contract: Unified Feature Pipeline

**Feature**: 100-unify-feature-pipeline
**Date**: 2026-02-24

## Extension → Webview Messages

### `loadPlot`

Sends the full plot data when a plot is opened or reloaded.

```typescript
interface LoadPlotMessage {
  type: 'loadPlot';
  plot: {
    id: string;
    title: string;
    features: DebriefFeature[];          // CHANGED: was tracks + locations + otherFeatures
    bbox: [number, number, number, number];
    timeExtent: [string, string];
  };
}
```

### `setSelection`

Propagates selection state to the webview.

```typescript
interface SetSelectionMessage {
  type: 'setSelection';
  featureIds: string[];                   // UNCHANGED
}
```

### `setHiddenIds`

Controls feature visibility.

```typescript
interface SetHiddenIdsMessage {
  type: 'setHiddenIds';
  hiddenIds: string[];                    // UNCHANGED
}
```

### `addResultLayer`

Adds tool result features to the map.

```typescript
interface AddResultLayerMessage {
  type: 'addResultLayer';
  layer: {
    id: string;
    features: DebriefFeatureCollection;   // UNCHANGED
    style: Record<string, unknown>;
  };
}
```

### `setCurrentTime`, `setDisplayMode`, `setViewport`

Temporal and spatial state messages — UNCHANGED.

### REMOVED: `updateTracks`

Previously used to send time-filtered tracks. Replaced by temporal rendering logic in `TemporalTrackLayer` which uses `setCurrentTime` + `setDisplayMode` to filter at render time.

---

## Webview → Extension Messages

### `selectionChanged`

Reports feature selection from user interaction.

```typescript
// BEFORE
interface SelectionChangedMessage {
  type: 'selectionChanged';
  trackIds: string[];
  locationIds: string[];
}

// AFTER
interface SelectionChangedMessage {
  type: 'selectionChanged';
  featureIds: string[];                   // CHANGED: unified
}
```

### `viewStateChanged`, `featureDrawn`, `repFileDrop`

UNCHANGED.

---

## Provider Method Contracts

### mapPanel.loadPlot()

```typescript
// BEFORE
loadPlot(plot: Plot, tracks: Track[], locations: ReferenceLocation[], otherFeatures: GeoJSONFeature[]): void

// AFTER
loadPlot(plot: Plot, features: DebriefFeature[]): void
```

### activityPanelView.setFeatures()

```typescript
// BEFORE
setFeatures(tracks: Track[], locations: ReferenceLocation[], otherFeatures: GeoJSONFeature[]): void

// AFTER
setFeatures(features: DebriefFeature[]): void
```

### layersTreeProvider

```typescript
// BEFORE
setTracks(tracks: Track[]): void
setLocations(locations: ReferenceLocation[]): void
setShapes(shapes: GeoJSONFeature[]): void

// AFTER
setFeatures(features: DebriefFeature[]): void
```

### stacService.loadPlotData()

```typescript
// BEFORE
loadPlotData(store: StacStore, itemPath: string): Promise<{ tracks: Track[]; locations: ReferenceLocation[]; otherFeatures: GeoJSONFeature[] } | null>

// AFTER
loadPlotData(store: StacStore, itemPath: string): Promise<DebriefFeatureCollection | null>
```
