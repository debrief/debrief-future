# Research: Temporal Track Rendering

**Feature**: 030-temporal-track-rendering
**Date**: 2026-01-27
**Status**: Complete

## Research Topics

### 1. Nearest Point Algorithm for Timestamped Coordinates

**Decision**: Binary search on sorted timestamps

**Rationale**: Track coordinates are naturally ordered by time. Binary search provides O(log n) complexity which meets the 10fps performance target even for tracks with thousands of points.

**Alternatives Considered**:
- Linear scan: O(n) - too slow for playback with large tracks
- Pre-computed time index: Adds memory overhead and complexity for marginal gain
- R-tree spatial index: Overkill for 1D temporal search

**Implementation Notes**:
```typescript
function findNearestPointIndex(timestamps: number[], targetTime: number): number {
  // Binary search to find closest timestamp
  let low = 0;
  let high = timestamps.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (timestamps[mid] < targetTime) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  // Compare adjacent points to find truly nearest
  if (low > 0) {
    const prevDiff = Math.abs(timestamps[low - 1] - targetTime);
    const currDiff = Math.abs(timestamps[low] - targetTime);
    if (prevDiff < currDiff) return low - 1;
  }

  return low;
}
```

---

### 2. React-Leaflet Dynamic Track Updates

**Decision**: Use `useMemo` for computed geometry + `key` prop for GeoJSON re-render

**Rationale**: react-leaflet's `<GeoJSON>` component doesn't efficiently update when data changes. The established pattern is to use a `key` that changes when data changes, forcing a remount. Combined with `useMemo` for geometry computation, this provides acceptable performance.

**Alternatives Considered**:
- Direct Leaflet manipulation: Bypasses React, harder to maintain
- Custom Leaflet layer class: More complex, benefits don't justify for this use case
- react-leaflet PathOptions update: Only updates styling, not geometry

**Implementation Pattern**:
```typescript
// Memoize the sliced coordinates
const slicedCoordinates = useMemo(() => {
  if (displayMode === 'trail') {
    return sliceTrackToTime(coordinates, timestamps, currentTime);
  }
  return coordinates;
}, [coordinates, timestamps, currentTime, displayMode]);

// Force re-render when geometry changes
<GeoJSON
  key={`${trackId}-${displayMode}-${nearestIndex}`}
  data={geojsonData}
  style={trackStyle}
/>
```

---

### 3. Performance Optimization for Playback

**Decision**: Memoization + debounced updates for non-critical path

**Rationale**: During playback at 10fps, the component receives ~10 time updates per second. Key optimizations:
1. **Memoize sliced geometry**: Only recompute when time crosses a point boundary
2. **Stable references**: Prevent unnecessary React reconciliation
3. **Request animation frame**: Batch updates during playback

**Alternatives Considered**:
- Web Worker for computation: Adds complexity, latency exceeds benefit
- Canvas rendering: Would require abandoning react-leaflet, overkill
- Virtualized track points: Complexity not justified for expected data volumes

**Performance Budget**:
- Target: 10fps playback = 100ms per frame
- Binary search: <1ms for 10,000 points
- GeoJSON construction: ~5ms
- Leaflet render: ~30-50ms
- Buffer: ~44ms margin

---

### 4. Timestamp Storage in Track Data

**Decision**: Use existing Debrief schema convention - timestamps in feature properties with `times` array

**Rationale**: The Debrief schema defines track features with a `times` array in properties that corresponds to the coordinates array. This is the established pattern used by debrief-io when parsing REP files.

**Data Structure**:
```typescript
interface TrackFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];  // [lon, lat]
  };
  properties: {
    name?: string;
    times: number[];  // Epoch milliseconds, same length as coordinates
    // ... other properties
  };
}
```

---

### 5. Highlight Marker Styling

**Decision**: CircleMarker with distinct color and size

**Rationale**: CircleMarkers are lightweight (no icon loading), scale-independent, and visually distinct from track lines. Using a contrasting color (red/orange) against the track color ensures visibility.

**Alternatives Considered**:
- Custom icon: Requires asset loading, more complex
- Pulsing animation: Adds visual noise during playback
- Different marker per track: Harder to distinguish from track styling

**Styling Approach**:
```typescript
const highlightStyle = {
  radius: 8,
  fillColor: 'var(--debrief-highlight-marker)',
  fillOpacity: 1,
  color: 'white',
  weight: 2,
};
```

---

### 6. Edge Cases and Boundary Conditions

**Decision**: Handle all edge cases gracefully without errors

| Edge Case | Behavior |
|-----------|----------|
| Time before track start | Trail mode: show nothing; Full mode: show complete track, no marker |
| Time after track end | Trail mode: show complete track; Full mode: show complete track, marker at end |
| Empty track (no points) | Skip rendering entirely |
| Single point track | Show as marker only (no line) |
| Non-monotonic timestamps | Find nearest by timestamp value regardless of order |

---

### 7. Integration with Session State

**Decision**: Receive temporal state via props, not direct subscription

**Rationale**: The MapView component should remain a controlled component. The parent (VS Code webview panel) subscribes to session state and passes `currentTime` and `displayMode` as props. This maintains the "thick services, thin frontends" pattern and keeps components testable.

**Props Interface**:
```typescript
interface MapViewProps {
  // ... existing props

  /** Current time position for temporal rendering (epoch ms) */
  currentTime?: number;

  /** Track display mode */
  displayMode?: 'full' | 'trail';
}
```

---

## Summary

All technical decisions resolved. No blocking unknowns. Implementation can proceed with:

1. **Utility functions** in `temporal-utils.ts`:
   - `findNearestPointIndex(timestamps, targetTime)`
   - `sliceTrackToTime(coordinates, timestamps, targetTime)`

2. **Hook** in `useTemporalTrack.ts`:
   - Memoizes sliced geometry
   - Returns nearest point index
   - Manages render key for efficient updates

3. **Components**:
   - `TemporalTrackLayer`: Renders track with temporal awareness
   - `TrackHighlightMarker`: Position marker for full-track mode

4. **MapView enhancement**: Add `currentTime` and `displayMode` props
