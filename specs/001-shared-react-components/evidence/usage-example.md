# Usage Example: 5-Line Map Display

This example demonstrates Success Criteria SC-001: display a map with track features in 5 or fewer lines of code.

## Minimal Example (5 Lines)

```tsx
import { MapView } from '@debrief/components';
import trackData from './tracks.json';

function App() {
  return <MapView features={trackData} />;
}
```

## With Selection (Still Simple)

```tsx
import { useState } from 'react';
import { MapView, ThemeProvider } from '@debrief/components';
import trackData from './tracks.json';

function App() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <ThemeProvider>
      <MapView
        features={trackData}
        selectedIds={selected}
        onSelect={(id) => setSelected(prev => new Set(prev).add(id))}
      />
    </ThemeProvider>
  );
}
```

## Full Integration Example

```tsx
import { useState } from 'react';
import { MapView, Timeline, FeatureList, ThemeProvider } from '@debrief/components';
import data from './maritime-exercise.json';

function DebriefViewer() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <MapView
          features={data}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          height={500}
        />
        <FeatureList
          features={data}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          height={500}
        />
      </div>
      <Timeline
        features={data}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        height={150}
      />
    </ThemeProvider>
  );
}
```

## Using the useSelection Hook

```tsx
import { MapView, FeatureList, useSelection } from '@debrief/components';
import data from './data.json';

function App() {
  const selection = useSelection();

  return (
    <>
      <MapView
        features={data}
        selectedIds={selection.selectedIds}
        onSelect={(id) => selection.toggle(id)}
        onBackgroundClick={selection.clear}
      />
      <FeatureList
        features={data}
        selectedIds={selection.selectedIds}
        onSelect={(id) => selection.toggle(id)}
      />
    </>
  );
}
```

## Verification

The minimal example demonstrates:
1. **Line 1**: Import the component
2. **Line 2**: Import data (or inline it)
3. **Lines 3-5**: Render the component with data

Success Criteria SC-001 achieved.
