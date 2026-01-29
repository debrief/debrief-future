/**
 * Exercise Alpha — integrated demo with all supported shape/annotation types.
 *
 * Combines MapView with TimeController to verify rendering of every feature kind:
 *   TRACK (2), POINT (2), CIRCLE, RECTANGLE, LINE, VECTOR,
 *   TEXT, TIMETEXT, PERIODTEXT, POLY, POLYLINE,
 *   ELLIPSE, ELLIPSE2, WHEEL, DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY,
 *   SENSOR, SENSOR2, TMA_POS, NARRATIVE (3 — non-spatial, shown in sidebar)
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MapView } from './MapView';
import { TimeController } from '../TimeController/TimeController';
import type { DisplayMode } from '../TimeController/types';
import {
  exerciseAlphaFeatures,
  exerciseAlphaTimeExtent,
  exerciseAlphaNarratives,
} from './__fixtures__/exerciseAlpha';

const [TIME_START] = exerciseAlphaTimeExtent;

// Summarise feature kinds for docs
const kindCounts = exerciseAlphaFeatures.reduce(
  (acc: Record<string, number>, f: { properties?: { kind?: string } }) => {
    const kind = f.properties?.kind ?? 'unknown';
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);
const kindSummary = Object.entries(kindCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, n]) => `${k}: ${n}`)
  .join(', ');

// ---------- Demo components ----------

function IntegratedDemo() {
  const [currentTime, setCurrentTime] = useState<number>(TIME_START);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 0 }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={exerciseAlphaFeatures}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={exerciseAlphaTimeExtent}
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

  const visibleNarratives = exerciseAlphaNarratives.filter(
    (n) => new Date(n.time).getTime() <= currentTime,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MapView
            features={exerciseAlphaFeatures}
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
          timeExtent={exerciseAlphaTimeExtent}
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
Renders **all supported shape/annotation types** on a single map with an integrated TimeController.

**Renderable features (${exerciseAlphaFeatures.length}):** ${kindSummary}

**Non-spatial features:** ${exerciseAlphaNarratives.length} NARRATIVE entries (shown in the narrative panel variant)

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
  render: () => (
    <div style={{ height: '100vh' }}>
      <MapView features={exerciseAlphaFeatures} height="100%" autoFitBounds />
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
