/**
 * Storybook stories for TimeController component.
 *
 * Stories organized by user story for visual review during implementation:
 * - US1: Manual Time Navigation
 * - US2: Animated Playback
 * - US3: Playback Speed Control
 * - US4: Keyboard-Driven Control
 * - UI States: Empty, Loading, Ready
 * - Theming: Light and Dark modes
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { TimeController } from './TimeController';
import { PlaybackControls } from './PlaybackControls';
import type { TimeControllerProps, DisplayMode, PlaybackState } from './types';
import type { TimeExtent } from '../utils/types';
import { ThemeProvider } from '../ThemeProvider';

// Sample time ranges
const NOW = Date.now();
const HOUR = 60 * 60 * 1000;

const SHORT_RANGE: TimeExtent = [NOW, NOW + HOUR]; // 1 hour
const MEDIUM_RANGE: TimeExtent = [NOW, NOW + 8 * HOUR]; // 8 hours
const LONG_RANGE: TimeExtent = [NOW, NOW + 24 * HOUR]; // 24 hours

const meta: Meta<typeof TimeController> = {
  title: 'Components/TimeController',
  component: TimeController,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Time controller component for navigating through time-stamped track data.

## Features

- **Time Scrubber**: Drag or click to navigate to any point in time
- **Play/Pause**: Animate tracks forward through time
- **Speed Control**: 1x, 2x, 4x, 8x playback speeds
- **Keyboard Shortcuts**: Space (play/pause), Arrow keys (scrub)
- **Display Mode**: Toggle between Full track and Trail mode

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle play/pause |
| Right Arrow | Scrub forward |
| Left Arrow | Scrub backward |

## Usage

\`\`\`tsx
import { TimeController } from '@debrief/components';

<TimeController
  timeExtent={[startTime, endTime]}
  onTimeChange={(time) => updateMapToTime(time)}
  onDisplayModeChange={(mode) => setTrackDisplayMode(mode)}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    timeExtent: {
      description: 'Time range [start, end] in milliseconds since epoch',
      control: false,
    },
    initialSpeed: {
      description: 'Initial playback speed',
      control: { type: 'select' },
      options: [1, 2, 4, 8],
    },
    initialDisplayMode: {
      description: 'Initial display mode',
      control: { type: 'radio' },
      options: ['full', 'trail'],
    },
    uiState: {
      description: 'Override UI state for testing',
      control: { type: 'radio' },
      options: ['empty', 'loading', 'ready'],
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';
      return (
        <ThemeProvider theme={{ variant: theme }}>
          <div style={{ width: 300, padding: 16 }}>
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof TimeController>;

/**
 * Interactive wrapper that logs events
 */
function InteractiveTimeController(props: TimeControllerProps) {
  const [currentTime, setCurrentTime] = useState(props.timeExtent?.[0] ?? 0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
    console.log('Time changed:', new Date(time).toISOString());
  }, []);

  const handlePlaybackStateChange = useCallback((state: PlaybackState) => {
    setPlaybackState(state);
    console.log('Playback state:', state);
  }, []);

  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
    console.log('Display mode:', mode);
  }, []);

  return (
    <div>
      <TimeController
        {...props}
        onTimeChange={handleTimeChange}
        onPlaybackStateChange={handlePlaybackStateChange}
        onDisplayModeChange={handleDisplayModeChange}
      />
      <div style={{ marginTop: 16, fontSize: 12, color: '#808080' }}>
        <div>Time: {new Date(currentTime).toISOString()}</div>
        <div>Playback: {playbackState}</div>
        <div>Display: {displayMode}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Default Story
// =============================================================================

/**
 * Default time controller with an 8-hour time range.
 * Try dragging the scrubber, clicking play, and adjusting speed.
 */
export const Default: Story = {
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />,
};

// =============================================================================
// UI States
// =============================================================================

/**
 * Empty state shown when no track data is loaded.
 */
export const EmptyState: Story = {
  args: {
    timeExtent: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'When no track data is loaded, the controller shows a disabled state with "No data loaded" message.',
      },
    },
  },
};

/**
 * Loading state shown while track data is being processed.
 */
export const LoadingState: Story = {
  args: {
    timeExtent: MEDIUM_RANGE,
    uiState: 'loading',
  },
  parameters: {
    docs: {
      description: {
        story: 'While track data is loading, the controller shows a "Loading..." message.',
      },
    },
  },
};

/**
 * Ready state with all controls active.
 */
export const ReadyState: Story = {
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'When track data is loaded, all controls become active and usable.',
      },
    },
  },
};

// =============================================================================
// User Story 1: Manual Time Navigation
// =============================================================================

/**
 * **User Story 1: Manual Time Navigation (P1)**
 *
 * An analyst can manually navigate to specific points in time by:
 * - Dragging the time scrubber
 * - Clicking anywhere on the scrubber track
 *
 * The time display updates immediately to show the current position.
 */
export const ManualNavigation: Story = {
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: `
### User Story 1: Manual Time Navigation (Priority: P1)

**Goal**: Analysts can manually navigate to specific points in time.

**How to test**:
1. Drag the time scrubber thumb left or right
2. Click anywhere on the scrubber track
3. Observe the time display updates immediately

**Acceptance Criteria**:
- Time display shows HH:MM:SS format
- Scrubber responds to drag and click
- Time range boundaries (start/end) are visible
        `,
      },
    },
  },
};

/**
 * Short time range (1 hour) - tests granular scrubbing.
 */
export const ShortTimeRange: Story = {
  render: () => <InteractiveTimeController timeExtent={SHORT_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'With a short time range (1 hour), the scrubber still functions with appropriate granularity.',
      },
    },
  },
};

/**
 * Long time range (24 hours) - tests navigation across large spans.
 */
export const LongTimeRange: Story = {
  render: () => <InteractiveTimeController timeExtent={LONG_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'With a long time range (24 hours), the scrubber allows navigation across the full range.',
      },
    },
  },
};

// =============================================================================
// User Story 2: Animated Playback
// =============================================================================

/**
 * **User Story 2: Animated Playback (P2)**
 *
 * An analyst can watch tracks evolve over time by:
 * - Clicking the Play button to start animation
 * - Clicking Pause to stop at any point
 *
 * Playback automatically pauses when reaching the end of the time range.
 */
export const AnimatedPlayback: Story = {
  render: () => <InteractiveTimeController timeExtent={SHORT_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: `
### User Story 2: Animated Playback (Priority: P2)

**Goal**: Analysts can watch tracks evolve over time.

**How to test**:
1. Click the Play button (triangle icon)
2. Watch the time advance and scrubber move
3. Click Pause to stop playback
4. Let it play to the end - it auto-pauses

**Acceptance Criteria**:
- Play button starts time progression
- Pause button stops immediately
- Auto-pause at end of range
        `,
      },
    },
  },
};

// =============================================================================
// User Story 3: Playback Speed Control
// =============================================================================

/**
 * **User Story 3: Playback Speed Control (P3)**
 *
 * An analyst can adjust playback speed to:
 * - Speed up through uneventful periods (4x, 8x)
 * - Slow down for detailed observation (1x, 2x)
 *
 * Speed options: 1x, 2x, 4x, 8x real-time.
 */
export const SpeedControl: Story = {
  render: () => (
    <InteractiveTimeController
      timeExtent={SHORT_RANGE}
      initialSpeed={4}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: `
### User Story 3: Playback Speed Control (Priority: P3)

**Goal**: Analysts can adjust playback speed.

**How to test**:
1. Click the speed dropdown (shows "4x" initially)
2. Select a different speed (1x, 2x, 4x, 8x)
3. Start playback and observe the speed change

**Acceptance Criteria**:
- Dropdown shows current speed
- All speed options available
- Speed change takes effect immediately
        `,
      },
    },
  },
};

// =============================================================================
// User Story 4: Keyboard-Driven Control
// =============================================================================

/**
 * **User Story 4: Keyboard-Driven Control (P4)**
 *
 * Power users can control playback without leaving the keyboard:
 * - Space: Toggle play/pause
 * - Right Arrow: Scrub forward
 * - Left Arrow: Scrub backward
 *
 * Click the controller first to give it focus.
 */
export const KeyboardControl: Story = {
  render: () => (
    <div>
      <p style={{ marginBottom: 8, fontSize: 12, color: '#808080' }}>
        Click the controller, then use keyboard shortcuts:
        <br />
        <strong>Space</strong> = Play/Pause | <strong>Arrow keys</strong> = Scrub
      </p>
      <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
### User Story 4: Keyboard-Driven Control (Priority: P4)

**Goal**: Power users can control playback via keyboard.

**How to test**:
1. Click the controller to give it focus
2. Press Space to toggle play/pause
3. Press Right Arrow to scrub forward
4. Press Left Arrow to scrub backward

**Keyboard Shortcuts**:
| Key | Action |
|-----|--------|
| Space | Toggle play/pause |
| Right Arrow | Scrub forward |
| Left Arrow | Scrub backward |
        `,
      },
    },
  },
};

// =============================================================================
// Display Mode Toggle
// =============================================================================

/**
 * **Display Mode: Full vs Trail**
 *
 * Toggle between track display modes:
 * - **Full**: Shows entire track regardless of time position
 * - **Trail**: Shows track history from start up to current time
 */
export const DisplayMode: Story = {
  render: () => (
    <InteractiveTimeController
      timeExtent={MEDIUM_RANGE}
      initialDisplayMode="trail"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: `
### Display Mode Toggle

**Full mode**: Shows the entire track path regardless of current time position.

**Trail mode**: Shows only the track history from the start up to the current time position (like a "snail trail").

The toggle switch in the center of the controls row switches between modes.
        `,
      },
    },
  },
};

// =============================================================================
// Theming
// =============================================================================

/**
 * Light theme variant.
 */
export const LightTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'light' }}>
      <div style={{ width: 300, padding: 16, background: '#f5f5f5' }}>
        <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Time controller styled for light theme environments.',
      },
    },
  },
};

/**
 * Dark theme variant (default).
 */
export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ width: 300, padding: 16, background: '#1e1e1e' }}>
        <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Time controller styled for dark theme environments (default).',
      },
    },
  },
};

/**
 * VS Code theme variant (dark with VS Code colors).
 */
export const VSCodeTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ width: 300, padding: 16, background: '#1e1e1e' }}>
        <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Time controller styled for VS Code sidebar integration.',
      },
    },
  },
};

// =============================================================================
// Sub-components (Advanced Usage)
// =============================================================================

/**
 * Individual sub-components can be used for custom layouts.
 * This shows the TimeScrubber component in isolation.
 */
export const TimeScrubberOnly: Story = {
  render: () => {
    const [time, setTime] = useState(MEDIUM_RANGE[0]);
    return (
      <div>
        <div style={{ marginBottom: 8, fontSize: 12, color: '#808080' }}>
          Current: {new Date(time).toISOString()}
        </div>
        <div style={{ padding: '0 8px' }}>
          {/* Import TimeScrubber directly for custom usage */}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Sub-components like TimeScrubber, PlaybackControls, and SpeedSelector can be imported individually for custom layouts.',
      },
    },
  },
};

/**
 * Feature 205 / FR-025: visual regression guard for the stopped ≡ paused
 * rendering rule. The PlaybackState vocabulary widened from two states
 * ('playing' | 'paused') to three ('stopped' | 'playing' | 'paused') when
 * session-state and component-side enums were consolidated into LinkML.
 * The `stopped` state is rendered identically to `paused` — same play
 * glyph, same aria-label="Play", same enabled onClick — so existing
 * `'playing' ?  : 'paused'` branches work unchanged.
 *
 * Stopped and Paused should be visually indistinguishable below; Playing
 * differs (pause glyph + "Pause" aria-label).
 */
export const PlaybackStateStoppedEquivPaused: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, padding: 16 }}>
      {(['stopped', 'paused', 'playing'] as const).map((state) => (
        <div key={state} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#808080' }}>playbackState = &quot;{state}&quot;</div>
          <PlaybackControls playbackState={state} onToggle={() => undefined} />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Regression guard for Feature 205 FR-023 / FR-025 — `stopped` renders identically to `paused`. ' +
          'If this story visually diverges between the first two buttons, revisit the `stopped ≡ paused` rule ' +
          'documented in ADR-NN (`docs/project_notes/decisions.md`).',
      },
    },
  },
};
