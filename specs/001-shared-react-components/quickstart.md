# Quickstart: Shared React Component Library

**Feature**: 001-shared-react-components
**Date**: 2026-01-16
**Purpose**: Get up and running with @debrief/components in under 5 minutes

## Installation

```bash
# Using pnpm (recommended for Debrief monorepo)
pnpm add @debrief/components

# Or npm
npm install @debrief/components
```

## Basic Usage

### Display a Map with Tracks (5 lines of code)

```tsx
import { MapView } from '@debrief/components/MapView';

function App() {
  const tracks = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'track-1',
        geometry: {
          type: 'LineString',
          coordinates: [[-1.1, 50.8], [-1.2, 50.9], [-1.3, 50.85]]
        },
        properties: { name: 'HMS Example', type: 'track' }
      }
    ]
  };

  return <MapView features={tracks} />;
}
```

That's it! The map renders with your track, zoom controls, and pan interaction.

### Add Selection

```tsx
import { useState } from 'react';
import { MapView } from '@debrief/components/MapView';

function App() {
  const [selected, setSelected] = useState(new Set());

  return (
    <MapView
      features={tracks}
      selectedIds={selected}
      onSelect={setSelected}
    />
  );
}
```

Click a track to select it. Click empty space to deselect.

## Complete Example: Map + Timeline + List

```tsx
import { useState } from 'react';
import { ThemeProvider } from '@debrief/components/ThemeProvider';
import { MapView } from '@debrief/components/MapView';
import { Timeline } from '@debrief/components/Timeline';
import { FeatureList } from '@debrief/components/FeatureList';
import type { DebriefFeatureCollection } from '@debrief/components';

// Sample data with temporal information
const sampleData: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'track-alpha',
      geometry: {
        type: 'LineString',
        coordinates: [[-1.1, 50.8], [-1.2, 50.9], [-1.3, 50.85]]
      },
      properties: {
        name: 'Alpha',
        type: 'track',
        startTime: '2024-03-15T08:00:00Z',
        endTime: '2024-03-15T12:00:00Z'
      }
    },
    {
      type: 'Feature',
      id: 'track-bravo',
      geometry: {
        type: 'LineString',
        coordinates: [[-1.0, 50.7], [-1.15, 50.75], [-1.25, 50.8]]
      },
      properties: {
        name: 'Bravo',
        type: 'track',
        startTime: '2024-03-15T09:30:00Z',
        endTime: '2024-03-15T14:00:00Z'
      }
    },
    {
      type: 'Feature',
      id: 'ref-1',
      geometry: {
        type: 'Point',
        coordinates: [-1.2, 50.85]
      },
      properties: {
        name: 'Portsmouth Harbour',
        type: 'reference'
      }
    }
  ]
};

function DebriefViewer() {
  // Shared selection state across all components
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <ThemeProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Left panel: Feature list */}
        <aside style={{ width: 250, borderRight: '1px solid var(--debrief-border)' }}>
          <FeatureList
            features={sampleData}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onFeatureDoubleClick={(id) => console.log('Zoom to:', id)}
          />
        </aside>

        {/* Main area: Map and Timeline */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MapView
            features={sampleData}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            style={{ flex: 1 }}
          />
          <Timeline
            features={sampleData}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            height={150}
          />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default DebriefViewer;
```

## Theming

### Override Theme Colors

```tsx
import { ThemeProvider } from '@debrief/components/ThemeProvider';

function App() {
  return (
    <ThemeProvider theme={{
      primary: '#0066cc',
      trackColor: '#10b981',
      selectionColor: '#f59e0b'
    }}>
      <MapView features={data} />
    </ThemeProvider>
  );
}
```

### Integrate with VS Code Theme

In VS Code webview, read the editor's theme and apply:

```tsx
import { ThemeProvider } from '@debrief/components/ThemeProvider';

function VSCodePanel() {
  // VS Code injects CSS variables we can read
  const computedStyle = getComputedStyle(document.documentElement);

  const theme = {
    primary: computedStyle.getPropertyValue('--vscode-button-background'),
    surface: computedStyle.getPropertyValue('--vscode-editor-background'),
    text: computedStyle.getPropertyValue('--vscode-editor-foreground'),
  };

  return (
    <ThemeProvider theme={theme}>
      <MapView features={data} />
    </ThemeProvider>
  );
}
```

## Offline Tiles

For classified or offline environments, specify a local tile server:

```tsx
<MapView
  features={data}
  tileUrl="http://localhost:8080/tiles/{z}/{x}/{y}.png"
  tileAttribution="Local tile server"
/>
```

## Tree Shaking

Import only what you need to minimize bundle size:

```tsx
// Good: Imports only MapView and its dependencies
import { MapView } from '@debrief/components/MapView';

// Avoid: Imports entire library
import { MapView, Timeline, FeatureList } from '@debrief/components';
```

## TypeScript Support

All props are fully typed:

```tsx
import type {
  DebriefFeatureCollection,
  MapViewProps,
  SelectionHandler
} from '@debrief/components';

// TypeScript catches errors
const handleSelect: SelectionHandler = (ids) => {
  console.log(`Selected ${ids.size} features`);
};
```

## Testing Components

### With Vitest / React Testing Library

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MapView } from '@debrief/components/MapView';

test('MapView renders features', () => {
  const features = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: 'test-1',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { name: 'Test Point' }
    }]
  };

  render(<MapView features={features} data-testid="map" />);
  expect(screen.getByTestId('map')).toBeInTheDocument();
});
```

### With Storybook

Preview components in isolation at:
`https://debrief.github.io/debrief-future/components/`

## Common Patterns

### Filter Features by Type

```tsx
<FeatureList
  features={data}
  filter={(feature) => feature.properties?.type === 'track'}
/>
```

### Custom Row Rendering

```tsx
<FeatureList
  features={data}
  renderRow={(feature, isSelected) => (
    <div className={isSelected ? 'selected' : ''}>
      <strong>{feature.properties?.name}</strong>
      <span>{feature.properties?.platform}</span>
    </div>
  )}
/>
```

### Synchronized Zoom

When user double-clicks a feature in the list, zoom the map to it:

```tsx
const mapRef = useRef<MapViewHandle>(null);

<FeatureList
  features={data}
  onFeatureDoubleClick={(id) => {
    const feature = data.features.find(f => f.id === id);
    if (feature) {
      mapRef.current?.fitBounds(calculateBounds({
        type: 'FeatureCollection',
        features: [feature]
      }));
    }
  }}
/>

<MapView ref={mapRef} features={data} />
```

## Next Steps

- [Data Model Documentation](./data-model.md) - Full interface specifications
- [Research Notes](./research.md) - Technical decision rationale
- [Storybook](https://debrief.github.io/debrief-future/components/) - Interactive component preview
- [GitHub Discussions](https://github.com/debrief/debrief-future/discussions) - Ask questions, give feedback
