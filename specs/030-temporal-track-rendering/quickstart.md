# Quickstart: Temporal Track Rendering

**Feature**: 030-temporal-track-rendering
**Date**: 2026-01-27

## Overview

This guide explains how to use the temporal track rendering feature to display tracks with time-awareness on the map.

## Prerequisites

- `@debrief/components` package installed
- Track data with timestamps in the `properties.times` array
- TimeController for managing temporal state (optional but recommended)

## Basic Usage

### 1. Enable Temporal Rendering on MapView

Pass `currentTime` and `displayMode` props to MapView:

```tsx
import { MapView } from '@debrief/components';
import { useState } from 'react';

function TemporalMap() {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [displayMode, setDisplayMode] = useState<'full' | 'trail'>('full');

  return (
    <MapView
      features={trackFeatures}
      currentTime={currentTime}
      displayMode={displayMode}
      onSelect={handleSelect}
    />
  );
}
```

### 2. With TimeController Integration

For full playback functionality, integrate with the TimeController:

```tsx
import { MapView, TimeController } from '@debrief/components';
import { useState, useMemo } from 'react';

function TemporalAnalysis({ features }) {
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<'full' | 'trail'>('full');

  // Calculate time extent from features
  const timeExtent = useMemo(() => {
    const times = features.flatMap(f => f.properties.times || []);
    if (times.length === 0) return null;
    return [Math.min(...times), Math.max(...times)] as [number, number];
  }, [features]);

  return (
    <div className="temporal-analysis">
      <MapView
        features={features}
        currentTime={currentTime ?? timeExtent?.[0]}
        displayMode={displayMode}
        height="100%"
      />

      <TimeController
        timeExtent={timeExtent}
        onTimeChange={setCurrentTime}
        onDisplayModeChange={setDisplayMode}
      />
    </div>
  );
}
```

## Display Modes

### Full-Track Mode

Shows the complete track path with a highlight marker at the current time position.

```tsx
<MapView
  features={tracks}
  currentTime={currentTime}
  displayMode="full"  // Shows entire track + marker
/>
```

**Best for**:
- Understanding overall movement patterns
- Identifying the current position within context
- Static analysis at a specific point in time

### Snail-Trail Mode

Shows only the portion of the track from start up to the current time.

```tsx
<MapView
  features={tracks}
  currentTime={currentTime}
  displayMode="trail"  // Shows path up to current time
/>
```

**Best for**:
- Replaying scenarios chronologically
- Watching how situations develop
- Avoiding "spoilers" about future positions

## Data Format

Track features must include a `times` array in properties:

```json
{
  "type": "Feature",
  "id": "track-001",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-4.0, 50.0],
      [-4.1, 50.1],
      [-4.2, 50.2]
    ]
  },
  "properties": {
    "name": "OWNSHIP",
    "times": [
      1706352000000,
      1706352060000,
      1706352120000
    ]
  }
}
```

**Requirements**:
- `times` array length must equal `coordinates` array length
- Timestamps are epoch milliseconds
- Timestamps should be monotonically increasing

## Edge Cases

### Time Before Track Start

- **Full mode**: Shows complete track, no marker displayed
- **Trail mode**: Track not visible (nothing to show yet)

### Time After Track End

- **Full mode**: Shows complete track, marker at final position
- **Trail mode**: Shows complete track (trail has reached the end)

### Tracks Without Timestamps

Tracks without `properties.times` render as static features, unaffected by temporal controls.

## Customization

### Marker Style

The highlight marker can be customized via the theme:

```css
:root {
  --debrief-highlight-marker: #ff6b6b;
  --debrief-highlight-marker-border: #ffffff;
}
```

### Programmatic Style

```tsx
// In TemporalTrackLayer (advanced usage)
<TemporalTrackLayer
  feature={track}
  currentTime={currentTime}
  displayMode={displayMode}
  markerStyle={{
    radius: 10,
    fillColor: '#ff0000',
    fillOpacity: 0.8,
  }}
/>
```

## Performance Tips

1. **Memoize time extent calculation** - Avoid recalculating on every render
2. **Limit track count** - Performance is tested with up to 20 simultaneous tracks
3. **Reasonable playback speed** - 1x-8x speeds are supported; higher may cause dropped frames

## Common Issues

### Tracks Not Updating

Ensure `currentTime` is changing. Check that:
- TimeController is connected correctly
- Time extent is derived from your track data
- Timestamps are in milliseconds (not seconds)

### Marker Not Showing

The marker only appears in `'full'` mode. In `'trail'` mode, there's no marker.

### Performance Issues During Playback

- Reduce track count or simplify track geometry
- Use trail mode (less geometry to render)
- Lower playback speed
