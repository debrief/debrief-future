/**
 * Storybook story demonstrating position styling capabilities.
 *
 * Shows:
 * - Default position style (no symbols/labels by default)
 * - Interval-based symbols (every 5 minutes)
 * - Interval-based labels (every 15 minutes)
 * - Per-position overrides (custom labels for significant events)
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { TrackFeature, PositionStyle, PositionStyleOverride } from '@debrief/schemas';
import { MapView } from './MapView';
import { TimeController } from '../TimeController/TimeController';
import type { DisplayMode } from '../TimeController/types';
import type { TimeExtent, DebriefFeature } from '../utils/types';

const BASE_TIME = new Date('2026-01-27T10:00:00Z').getTime();
const MINUTE = 60_000;

/**
 * Create a track with position styling.
 */
function createStyledTrack(
  id: string,
  name: string,
  color: string,
  coordinates: Array<[number, number]>,
  positions: Array<{ time: string; course: number; speed: number }>,
  defaultStyle: PositionStyle,
  symbolInterval?: string,
  labelInterval?: string,
  overrides?: Array<PositionStyleOverride | null>
): TrackFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      coordinates: coordinates as unknown as number[],
    },
    properties: {
      kind: 'TRACK',
      platform_id: id,
      platform_name: name,
      track_type: 'CONTACT',
      start_time: positions[0]?.time ?? '',
      end_time: positions[positions.length - 1]?.time ?? '',
      positions,
      style: {
        line: { color },
        point: { shape: 'circle', radius: 4, fill: true, fill_color: color, color },
      },
      default_position_style: defaultStyle,
      symbol_interval: symbolInterval,
      label_interval: labelInterval,
      position_style_overrides: overrides,
    },
  } as TrackFeature;
}

// Generate 30 positions over 2 hours
function generatePositions(startTime: number, count: number, startLon: number, startLat: number) {
  const coordinates: Array<[number, number]> = [];
  const positions: Array<{ time: string; course: number; speed: number }> = [];

  for (let i = 0; i < count; i++) {
    coordinates.push([
      startLon + i * 0.002 + Math.sin(i * 0.2) * 0.003,
      startLat + i * 0.001 + Math.cos(i * 0.2) * 0.002,
    ]);
    positions.push({
      time: new Date(startTime + i * 4 * MINUTE).toISOString(), // 4-minute intervals
      course: 45 + Math.sin(i * 0.3) * 10,
      speed: 12 + Math.cos(i * 0.2) * 2,
    });
  }

  return { coordinates, positions };
}

// Track 1: Symbols every 20 minutes (PT20M)
const track1Data = generatePositions(BASE_TIME, 30, -4.0, 50.3);
const track1 = createStyledTrack(
  'track-symbols-interval',
  'CONTACT ALPHA (symbols every 20m)',
  '#2196F3',
  track1Data.coordinates,
  track1Data.positions,
  { show_symbol: false, symbol: 'circle', show_label: false },
  'PT20M', // symbol every 20 minutes
  undefined, // no labels
  undefined
);

// Track 2: Labels every 30 minutes (PT30M)
const track2Data = generatePositions(BASE_TIME + 5 * MINUTE, 30, -3.95, 50.28);
const track2 = createStyledTrack(
  'track-labels-interval',
  'CONTACT BRAVO (labels every 30m)',
  '#4CAF50',
  track2Data.coordinates,
  track2Data.positions,
  { show_symbol: false, symbol: 'circle', show_label: false },
  undefined, // no symbols
  'PT30M', // label every 30 minutes
  undefined
);

// Track 3: Both symbols (PT15M) and labels (PT30M) + overrides
const track3Data = generatePositions(BASE_TIME + 10 * MINUTE, 30, -4.05, 50.25);
const track3Overrides: Array<PositionStyleOverride | null> = new Array(30).fill(null);
// Add custom labels at specific positions
track3Overrides[5] = { show_symbol: true, show_label: true, symbol: 'square', label: 'Contact detected' };
track3Overrides[15] = { show_symbol: true, show_label: true, symbol: 'triangle', label: 'Course change' };
track3Overrides[25] = { show_symbol: true, show_label: true, symbol: 'square', label: 'Lost contact' };

const track3 = createStyledTrack(
  'track-combined',
  'OWNSHIP (combined styling)',
  '#FF9800',
  track3Data.coordinates,
  track3Data.positions,
  { show_symbol: false, symbol: 'circle', show_label: false },
  'PT15M', // symbol every 15 minutes
  'PT60M', // label every hour
  track3Overrides
);

const styledTracks: DebriefFeature[] = [track1, track2, track3];

const timeExtent: TimeExtent = [
  BASE_TIME,
  BASE_TIME + 120 * MINUTE, // 2 hours
];

function PositionStylingDemo() {
  const [currentTime, setCurrentTime] = useState<number>(timeExtent[0]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 0 }}>
      <div style={{ padding: '8px', background: '#2d2d2d', color: '#fff', fontSize: '14px' }}>
        <strong>Position Styling Demo</strong>
        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
          <li>Blue track: Symbols every 20 minutes</li>
          <li>Green track: Labels every 30 minutes</li>
          <li>Orange track: Symbols every 15m, labels every 1h, plus custom overrides</li>
        </ul>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={styledTracks}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={timeExtent}
          initialTime={timeExtent[0]}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'MapView/Position Styling',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const IntervalBasedStyling: StoryObj = {
  render: () => <PositionStylingDemo />,
  parameters: {
    docs: {
      description: {
        story: `
Demonstrates the position styling cascade:

1. **Default style**: All positions start with no symbols/labels (show_symbol: false, show_label: false)
2. **Interval rules**: symbol_interval and label_interval specify ISO 8601 durations (e.g., PT20M = 20 minutes)
3. **Per-position overrides**: Custom labels and symbols for significant events

The orange track shows all three levels of the cascade working together.
        `,
      },
    },
  },
};
