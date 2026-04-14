/**
 * Storybook stories for sensor rendering on the map.
 *
 * Demonstrates:
 * - BearingLines: basic bearing line rendering from sensor contacts
 * - AmbiguousBearings: primary + ambiguous bearing with darker shade
 * - SnailMode: time-trail fading with adjustable time slider
 * - Labels: label text at different positions and alignments
 * - LineStyles: SOLID, DASHED, DOT, DASH_DOT side by side
 * - SensorArcs: fan/wedge rendering with configurable angles and ranges
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MapView } from './MapView';
import { TimeController } from '../TimeController/TimeController';
import type { DisplayMode } from '../TimeController/types';
import {
  createTrackWithSensors,
  towedArraySensor,
  hullSonarSensor,
  performanceTrackWithSensors,
  sensorTimeExtent,
} from './__fixtures__/sampleSensors';
import type { SensorData, SensorContact } from '@debrief/schemas';

const meta: Meta = {
  title: 'Components/MapView/SensorRendering',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

// ── BearingLines ────────────────────────────────────────────────────

function BearingLinesDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sensorTimeExtent[0] + 30 * 60_000);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');
  const feature = createTrackWithSensors([towedArraySensor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={[feature]}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sensorTimeExtent}
          initialTime={currentTime}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

export const BearingLines: StoryObj = {
  render: () => <BearingLinesDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Basic sensor bearing lines rendered from towed array contacts. Lines extend from the host track\'s interpolated position at each contact time to the bearing/range endpoint. Contacts with has_bearing=false or visible=false are filtered out. Use the time slider to see contacts appear/disappear.',
      },
    },
  },
};

// ── AmbiguousBearings ───────────────────────────────────────────────

function AmbiguousBearingsDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sensorTimeExtent[0] + 25 * 60_000);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  // Create a sensor with realistic towed-array ambiguity.
  // A towed array cannot distinguish port from starboard — the ambiguous
  // bearing is the mirror image of the actual bearing across the vessel's
  // heading.  With the host track heading 045°, a target at bearing 090°
  // (45° to starboard) produces a ghost at bearing 000° (45° to port).
  // Formula: ambiguous = (2 * course - bearing + 360) % 360
  const vesselCourse = 45;
  const ambiguousSensor: SensorData = {
    name: 'AMBIGUOUS_ARRAY',
    color: '#FF4444',
    visible: true,
    line_thickness: 2,
    contacts: Array.from({ length: 8 }, (_, i): SensorContact => {
      const bearing = 70 + i * 5; // starboard of the 045 heading
      const ambiguous = (2 * vesselCourse - bearing + 360) % 360;
      return {
        time: new Date(sensorTimeExtent[0] + (10 + i * 3) * 60_000).toISOString(),
        bearing,
        has_bearing: true,
        ambiguous_bearing: ambiguous,
        has_ambiguous: true,
        range: 4000 + i * 200,
        visible: true,
        line_style: 'SOLID',
      };
    }),
  };

  const feature = createTrackWithSensors([ambiguousSensor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={[feature]}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sensorTimeExtent}
          initialTime={currentTime}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

export const AmbiguousBearings: StoryObj = {
  render: () => <AmbiguousBearingsDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Ambiguous bearing lines (towed array port/starboard ambiguity). Each contact renders two bearing lines: the primary bearing in the base colour and the ambiguous bearing in a darker shade (RGB * 0.7, matching Java Color.darker()).',
      },
    },
  },
};

// ── SnailMode ───────────────────────────────────────────────────────

function SnailModeDemo() {
  const midTime = sensorTimeExtent[0] + 40 * 60_000;
  const [currentTime, setCurrentTime] = useState<number>(midTime);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('trail');

  // Dense contacts for visible snail trail
  const snailSensor: SensorData = {
    name: 'SNAIL_DEMO',
    color: '#FF6600',
    visible: true,
    line_thickness: 2,
    contacts: Array.from({ length: 40 }, (_, i): SensorContact => ({
      time: new Date(sensorTimeExtent[0] + i * 60_000).toISOString(),
      bearing: 45 + i * 0.5,
      has_bearing: true,
      range: 3000 + Math.sin(i * 0.2) * 1000,
      visible: true,
      line_style: 'SOLID',
    })),
  };

  const feature = createTrackWithSensors([snailSensor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={[feature]}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sensorTimeExtent}
          initialTime={currentTime}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

export const SnailMode: StoryObj = {
  render: () => <SnailModeDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Snail mode (trail) rendering. Contacts within the trail window fade from full colour (newest) to black (oldest) using the formula: fadedColor = Color(R * proportion, G * proportion, B * proportion). Contacts beyond the trail window are hidden. Toggle between full and trail mode using the display mode switch.',
      },
    },
  },
};

// ── Labels ──────────────────────────────────────────────────────────

function LabelsDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sensorTimeExtent[0] + 55 * 60_000);

  // Contacts with labels at different positions
  const labelSensor: SensorData = {
    name: 'LABEL_DEMO',
    color: '#2196F3',
    visible: true,
    line_thickness: 2,
    contacts: [
      {
        time: new Date(sensorTimeExtent[0] + 10 * 60_000).toISOString(),
        bearing: 30, has_bearing: true, range: 5000, visible: true,
        label: 'START-LEFT', show_label: true, put_label_at: 'START', label_location: 'LEFT',
        line_style: 'SOLID',
      },
      {
        time: new Date(sensorTimeExtent[0] + 15 * 60_000).toISOString(),
        bearing: 60, has_bearing: true, range: 5000, visible: true,
        label: 'MIDDLE-CENTER', show_label: true, put_label_at: 'MIDDLE', label_location: 'CENTER',
        line_style: 'SOLID',
      },
      {
        time: new Date(sensorTimeExtent[0] + 20 * 60_000).toISOString(),
        bearing: 90, has_bearing: true, range: 5000, visible: true,
        label: 'END-RIGHT', show_label: true, put_label_at: 'END', label_location: 'RIGHT',
        line_style: 'SOLID',
      },
      {
        time: new Date(sensorTimeExtent[0] + 25 * 60_000).toISOString(),
        bearing: 120, has_bearing: true, range: 5000, visible: true,
        label: 'Hidden Label', show_label: false, put_label_at: 'END', label_location: 'RIGHT',
        line_style: 'SOLID',
      },
      {
        time: new Date(sensorTimeExtent[0] + 30 * 60_000).toISOString(),
        bearing: 150, has_bearing: true, range: 5000, visible: true,
        show_label: true, put_label_at: 'END', label_location: 'RIGHT',
        line_style: 'SOLID',
        // No label text — should not render
      },
    ] as SensorContact[],
  };

  const feature = createTrackWithSensors([labelSensor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={[feature]}
          currentTime={currentTime}
          displayMode="full"
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sensorTimeExtent}
          initialTime={currentTime}
          initialDisplayMode="full"
          onTimeChange={setCurrentTime}
        />
      </div>
    </div>
  );
}

export const Labels: StoryObj = {
  render: () => <LabelsDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Label rendering at configurable positions along bearing lines. Demonstrates put_label_at (START/MIDDLE/END) and label_location (LEFT/CENTER/RIGHT). Labels with show_label=false or no label text are not rendered.',
      },
    },
  },
};

// ── LineStyles ──────────────────────────────────────────────────────

function LineStylesDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sensorTimeExtent[0] + 50 * 60_000);

  // Contacts demonstrating each line style
  const styleSensor: SensorData = {
    name: 'STYLE_DEMO',
    color: '#9C27B0',
    visible: true,
    line_thickness: 3,
    contacts: [
      {
        time: new Date(sensorTimeExtent[0] + 10 * 60_000).toISOString(),
        bearing: 30, has_bearing: true, range: 6000, visible: true,
        label: 'SOLID', show_label: true, put_label_at: 'END', label_location: 'RIGHT',
        line_style: 'SOLID',
      },
      {
        time: new Date(sensorTimeExtent[0] + 15 * 60_000).toISOString(),
        bearing: 60, has_bearing: true, range: 6000, visible: true,
        label: 'DASHED', show_label: true, put_label_at: 'END', label_location: 'RIGHT',
        line_style: 'DASHED',
      },
      {
        time: new Date(sensorTimeExtent[0] + 20 * 60_000).toISOString(),
        bearing: 90, has_bearing: true, range: 6000, visible: true,
        label: 'DOT', show_label: true, put_label_at: 'END', label_location: 'RIGHT',
        line_style: 'DOT',
      },
      {
        time: new Date(sensorTimeExtent[0] + 25 * 60_000).toISOString(),
        bearing: 120, has_bearing: true, range: 6000, visible: true,
        label: 'DASH_DOT', show_label: true, put_label_at: 'END', label_location: 'RIGHT',
        line_style: 'DASH_DOT',
      },
    ] as SensorContact[],
  };

  const feature = createTrackWithSensors([styleSensor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={[feature]}
          currentTime={currentTime}
          displayMode="full"
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sensorTimeExtent}
          initialTime={currentTime}
          initialDisplayMode="full"
          onTimeChange={setCurrentTime}
        />
      </div>
    </div>
  );
}

export const LineStyles: StoryObj = {
  render: () => <LineStylesDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Bearing line style options: SOLID (continuous), DASHED (10,5), DOT (2,5), DASH_DOT (10,5,2,5). Line thickness is set at the sensor level.',
      },
    },
  },
};

// ── MultipleSensors ─────────────────────────────────────────────────

function MultipleSensorsDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sensorTimeExtent[0] + 30 * 60_000);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');
  const feature = createTrackWithSensors([towedArraySensor, hullSonarSensor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={[feature]}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sensorTimeExtent}
          initialTime={currentTime}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

export const MultipleSensors: StoryObj = {
  render: () => <MultipleSensorsDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Multiple sensors from the same track: TOWED_ARRAY (red, with ranges and ambiguous bearings) and HULL_SONAR (blue, bearings only). Each sensor\'s contacts use separate colours and line thicknesses.',
      },
    },
  },
};

// ── Performance ─────────────────────────────────────────────────────

function PerformanceDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sensorTimeExtent[0] + 60 * 60_000);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={[performanceTrackWithSensors]}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sensorTimeExtent}
          initialTime={currentTime}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

export const Performance: StoryObj = {
  render: () => <PerformanceDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 500 sensor contacts. Canvas rendering and viewport culling ensure smooth pan/zoom at interactive frame rates.',
      },
    },
  },
};

// ── Array Offset Comparison (feature 119) ──────────────────────────

/**
 * Builds the shared scenario exercised in
 * specs/119-array-offset-calc/evidence — a vessel sails north then turns
 * 90° east and reports five bearing cuts after the turn.
 */
function buildArrayOffsetTrack(mode: 'PLAIN' | 'WORM' | 'MEASURED'): TrackFeature {
  const baseTime = new Date('2026-01-27T10:00:00Z').getTime();
  const minute = 60_000;

  const coordinates: [number, number][] = [];
  const positions: Array<{ time: string; course: number; speed: number }> = [];

  // Northbound leg (fixes 0-14)
  for (let i = 0; i < 15; i++) {
    coordinates.push([-5.0, 49.97 + i * 0.002]);
    positions.push({
      time: new Date(baseTime + i * minute).toISOString(),
      course: 0,
      speed: 12,
    });
  }
  // Eastbound leg (fixes 15-29)
  for (let i = 0; i < 15; i++) {
    coordinates.push([-5.0 + (i + 1) * 0.003, 50.0]);
    positions.push({
      time: new Date(baseTime + (15 + i) * minute).toISOString(),
      course: 90,
      speed: 12,
    });
  }

  const contacts: SensorContact[] = [16, 19, 22, 25, 28].map((t, idx) => ({
    time: new Date(baseTime + t * minute).toISOString(),
    bearing: 40 + idx * 15, // 40, 55, 70, 85, 100
    has_bearing: true,
    range: 3500,
    visible: true,
    label: `C${idx + 1}`,
    show_label: true,
    put_label_at: 'END',
    label_location: 'RIGHT',
    line_style: 'SOLID',
  }));

  const measuredPositions = [
    { time: new Date(baseTime + 14 * minute).toISOString(), location: [-4.975, 49.996] },
    { time: new Date(baseTime + 18 * minute).toISOString(), location: [-4.964, 49.996] },
    { time: new Date(baseTime + 22 * minute).toISOString(), location: [-4.953, 49.996] },
    { time: new Date(baseTime + 26 * minute).toISOString(), location: [-4.940, 49.996] },
  ];

  const colourByMode = {
    PLAIN: '#FF8F00',
    WORM: '#8E24AA',
    MEASURED: '#00838F',
  } as const;

  const sensor: SensorData = {
    name: `TOWED_ARRAY_${mode}`,
    color: colourByMode[mode],
    visible: true,
    line_thickness: 2,
    offset: 1500,
    array_centre_mode: mode,
    contacts,
    measured_positions: mode === 'MEASURED' ? measuredPositions : undefined,
  };

  return {
    type: 'Feature',
    id: `track-array-offset-${mode.toLowerCase()}`,
    geometry: {
      type: 'LineString',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: coordinates as unknown as number[],
    },
    properties: {
      kind: 'TRACK',
      platform_id: 'PLT-E07-119',
      platform_name: `HMS Turner (${mode})`,
      track_type: 'OWNSHIP',
      start_time: positions[0]!.time,
      end_time: positions[positions.length - 1]!.time,
      positions,
      style: {
        line: {
          color: '#4CAF50',
          weight: 2.5,
          opacity: 1,
        },
      },
      sensors: [sensor],
    },
    // eslint-disable-next-line no-restricted-syntax
  } as unknown as TrackFeature;
}

function ArrayOffsetComparisonDemo() {
  const baseTime = new Date('2026-01-27T10:00:00Z').getTime();
  const [currentTime, setCurrentTime] = useState<number>(baseTime + 28 * 60_000);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  const plainTrack = buildArrayOffsetTrack('PLAIN');
  const wormTrack = buildArrayOffsetTrack('WORM');
  const measuredTrack = buildArrayOffsetTrack('MEASURED');

  const panelStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #ccc',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={panelStyle}>
          <div style={{ padding: '6px 10px', background: '#FF8F00', color: 'white', fontWeight: 600 }}>
            PLAIN — backtrack along current heading
          </div>
          <div style={{ flex: 1 }}>
            <MapView
              features={[plainTrack]}
              currentTime={currentTime}
              displayMode={displayMode}
              height="100%"
              autoFitBounds
            />
          </div>
        </div>
        <div style={panelStyle}>
          <div style={{ padding: '6px 10px', background: '#8E24AA', color: 'white', fontWeight: 600 }}>
            WORM — walk backward along recorded track
          </div>
          <div style={{ flex: 1 }}>
            <MapView
              features={[wormTrack]}
              currentTime={currentTime}
              displayMode={displayMode}
              height="100%"
              autoFitBounds
            />
          </div>
        </div>
        <div style={{ ...panelStyle, borderRight: 'none' }}>
          <div style={{ padding: '6px 10px', background: '#00838F', color: 'white', fontWeight: 600 }}>
            MEASURED — interpolate measured positions (PLAIN fallback out of range)
          </div>
          <div style={{ flex: 1 }}>
            <MapView
              features={[measuredTrack]}
              currentTime={currentTime}
              displayMode={displayMode}
              height="100%"
              autoFitBounds
            />
          </div>
        </div>
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={[baseTime, baseTime + 30 * 60_000]}
          initialTime={currentTime}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

export const ArrayOffsetComparison: StoryObj = {
  render: () => <ArrayOffsetComparisonDemo />,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Three-panel comparison of PLAIN, WORM, and MEASURED array offset modes (feature 119). A vessel sails north, turns 90° east, and reports five bearing cuts after the turn. The towed-array sensor offset is a deliberately large 1500 m so the bearing-line origins are visibly displaced from the vessel position. WORM places the array centre on the pre-turn leg for contacts shortly after the manoeuvre; PLAIN places it 1500 m west along the new heading; MEASURED uses the sensor\'s measured position time-series and falls back to PLAIN for the final contact (outside the measured time range).',
      },
    },
  },
};
