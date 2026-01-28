/**
 * Integrated Storybook demo for temporal track rendering.
 *
 * Combines MapView with sample tracks and TimeController to verify:
 * - Full-track mode (complete path + highlight marker)
 * - Snail-trail mode (path grows to current time)
 * - Playback at multiple speeds
 * - Mode switching while maintaining time position
 */

import { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MapView } from './MapView';
import { TimeController } from '../TimeController/TimeController';
import type { DisplayMode } from '../TimeController/types';
import { sampleTracks, sampleTimeExtent } from './__fixtures__/sampleTracks';

function TemporalTrackDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sampleTimeExtent[0]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 0 }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={sampleTracks}
          currentTime={currentTime}
          displayMode={displayMode}
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sampleTimeExtent}
          initialTime={sampleTimeExtent[0]}
          initialDisplayMode={displayMode}
          onTimeChange={setCurrentTime}
          onDisplayModeChange={setDisplayMode}
        />
      </div>
    </div>
  );
}

function FullTrackOnlyDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sampleTimeExtent[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={sampleTracks}
          currentTime={currentTime}
          displayMode="full"
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sampleTimeExtent}
          initialTime={sampleTimeExtent[0]}
          initialDisplayMode="full"
          onTimeChange={setCurrentTime}
        />
      </div>
    </div>
  );
}

function SnailTrailOnlyDemo() {
  const [currentTime, setCurrentTime] = useState<number>(sampleTimeExtent[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MapView
          features={sampleTracks}
          currentTime={currentTime}
          displayMode="trail"
          height="100%"
          autoFitBounds
        />
      </div>
      <div style={{ padding: '8px', borderTop: '1px solid #ccc', background: '#1e1e1e' }}>
        <TimeController
          timeExtent={sampleTimeExtent}
          initialTime={sampleTimeExtent[0]}
          initialDisplayMode="trail"
          onTimeChange={setCurrentTime}
        />
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'MapView/Temporal Track Rendering',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const IntegratedDemo: StoryObj = {
  render: () => <TemporalTrackDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Full integrated demo with MapView + TimeController. Supports both display modes, playback, and mode switching.',
      },
    },
  },
};

export const FullTrackMode: StoryObj = {
  render: () => <FullTrackOnlyDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Full-track mode: complete track paths visible with highlight markers at current time position.',
      },
    },
  },
};

export const SnailTrailMode: StoryObj = {
  render: () => <SnailTrailOnlyDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Snail-trail mode: track paths grow from start to current time position.',
      },
    },
  },
};
