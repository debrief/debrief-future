# Usage Example: Temporal Track Rendering

## Basic Integration

```tsx
import { MapView, TimeController } from '@debrief/components';
import { useState } from 'react';

function TemporalAnalysis({ features, timeExtent }) {
  const [currentTime, setCurrentTime] = useState(timeExtent[0]);
  const [displayMode, setDisplayMode] = useState<'full' | 'trail'>('full');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <MapView
        features={features}
        currentTime={currentTime}
        displayMode={displayMode}
        height="100%"
        autoFitBounds
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

## How It Works

1. Pass `currentTime` and `displayMode` props to `MapView`
2. Features with a `properties.times` array are rendered as temporal tracks
3. Features without `times` render as static features (unchanged behavior)
4. In **full** mode: entire track visible + highlight marker at current time
5. In **trail** mode: track draws from start to current time position
