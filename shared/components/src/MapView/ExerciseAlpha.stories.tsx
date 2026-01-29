/**
 * Exercise Alpha — integrated demo loading the extended test-data GeoJSON.
 *
 * Demonstrates all supported shape/annotation feature types rendered on the map
 * alongside temporal tracks controlled by the TimeController.
 *
 * Feature kinds included:
 *   TRACK (2), POINT (2), CIRCLE, RECTANGLE, LINE, VECTOR,
 *   TEXT, TIMETEXT, PERIODTEXT, POLY, POLYLINE,
 *   ELLIPSE, ELLIPSE2, WHEEL, DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY,
 *   SENSOR, SENSOR2, TMA_POS, NARRATIVE (3 — non-spatial, filtered)
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MapView } from './MapView';
import { TimeController } from '../TimeController/TimeController';
import type { DisplayMode } from '../TimeController/types';
import type { DebriefFeatureCollection } from '../utils/types';
import type { TimeExtent } from '../utils/types';

// Import the exercise-alpha test data directly
import exerciseAlphaRaw from '../../../../apps/vscode/test-data/local-store/items/exercise-alpha.geojson';

// Cast and filter non-renderable features (NARRATIVE has empty coordinates)
const rawData = exerciseAlphaRaw as unknown as DebriefFeatureCollection;
const exerciseAlpha: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: rawData.features.filter((f) => {
    if (!f.geometry) return false;
    const coords = f.geometry.coordinates;
    if (Array.isArray(coords) && coords.length === 0) return false;
    return true;
  }),
};

// Exercise time range: 2024-01-15 09:30 – 14:00 UTC
const TIME_START = new Date('2024-01-15T09:30:00Z').getTime();
const TIME_END = new Date('2024-01-15T14:00:00Z').getTime();
const timeExtent: TimeExtent = [TIME_START, TIME_END];

// Summarise feature kinds for docs
const kindCounts = exerciseAlpha.features.reduce(
  (acc, f) => {
    const kind = (f.properties as { kind?: string })?.kind ?? 'unknown';
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);
const kindSummary = Object.entries(kindCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, n]) => `${k}: ${n}`)
  .join(', ');

// Narrative entries (non-spatial) for the sidebar panel
const narratives = (exerciseAlphaRaw as unknown as DebriefFeatureCollection).features
  .filter((f) => (f.properties as { kind?: string })?.kind === 'NARRATIVE')
  .map((f) => f.properties as { time?: string; text?: string });

// ---------- Demo components ----------

function IntegratedDemo() {
  const [currentTime, setCurrentTime] = useState<number>(TIME_START);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 0 }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={exerciseAlpha}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={timeExtent}
          initialTime={TIME_START}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

function WithNarrativePanel() {
  const [currentTime, setCurrentTime] = useState<number>(TIME_START);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  // Show narratives whose time <= currentTime
  const visibleNarratives = narratives.filter(
    (n) => n.time && new Date(n.time).getTime() <= currentTime,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MapView
            features={exerciseAlpha}
            currentTime={currentTime}
            displayMode={displayMode}
            height="100%"
            autoFitBounds
          />
        </div>
        <div
          style={{
            width: 280,
            overflowY: 'auto',
            background: '#1e1e1e',
            color: '#ccc',
            padding: '8px 12px',
            fontSize: 12,
            fontFamily: 'monospace',
            borderLeft: '1px solid #333',
          }}
        >
          <h4 style={{ margin: '0 0 8px', color: '#fff' }}>Narrative Log</h4>
          {visibleNarratives.length === 0 && (
            <p style={{ color: '#666' }}>No entries yet — advance time</p>
          )}
          {visibleNarratives.map((n, i) => (
            <div key={i} style={{ marginBottom: 8, borderBottom: '1px solid #333', paddingBottom: 6 }}>
              <div style={{ color: '#888' }}>{n.time}</div>
              <div>{n.text}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={timeExtent}
          initialTime={TIME_START}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

// ---------- Storybook meta ----------

const meta: Meta = {
  title: 'Components/MapView/Exercise Alpha',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
Loads \`exercise-alpha.geojson\` from the VS Code test-data local store and renders
**all supported shape/annotation types** on a single map with an integrated TimeController.

**Renderable features (${exerciseAlpha.features.length}):** ${kindSummary}

**Non-spatial features:** ${narratives.length} NARRATIVE entries (shown in the narrative panel variant)

### Shape types demonstrated

| Category | Kinds |
|----------|-------|
| **Tracks** | TRACK (OWNSHIP, CONTACT) |
| **Reference** | POINT (WAYPOINT, REFERENCE) |
| **Basic annotations** | CIRCLE, RECTANGLE, LINE, VECTOR, TEXT |
| **Temporal text** | TIMETEXT, PERIODTEXT |
| **Extended shapes** | POLY, POLYLINE, ELLIPSE, ELLIPSE2, WHEEL |
| **Dynamic shapes** | DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY |
| **Sensor data** | SENSOR, SENSOR2, TMA_POS |
| **Non-spatial** | NARRATIVE |
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const AllShapesWithTimeController: StoryObj = {
  render: () => <IntegratedDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Full Exercise Alpha dataset with temporal tracks and all annotation shapes. ' +
          'Use the TimeController to scrub through the exercise timeline (09:30–14:00 UTC). ' +
          'Tracks render temporally; annotations render as static overlays.',
      },
    },
  },
};

export const WithNarrativeLog: StoryObj = {
  render: () => <WithNarrativePanel />,
  parameters: {
    docs: {
      description: {
        story:
          'Same as above but with a narrative log sidebar. ' +
          'NARRATIVE entries appear as time advances past their timestamp.',
      },
    },
  },
};

export const StaticOverview: StoryObj = {
  args: {
    features: exerciseAlpha,
    height: '100%',
    autoFitBounds: true,
  },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <MapView {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Static rendering (no temporal controls). All features rendered at once — ' +
          'useful for verifying shape styling without time-based filtering.',
      },
    },
  },
};
