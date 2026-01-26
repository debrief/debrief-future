# Usage Example: Time Controller

## Basic Usage

```tsx
import { TimeController } from '@debrief/components';

function MapPanel() {
  // Time range from your track data
  const timeExtent: [number, number] = [
    Date.UTC(2024, 0, 1, 9, 0, 0),  // 09:00:00
    Date.UTC(2024, 0, 1, 17, 0, 0), // 17:00:00
  ];

  // Update map when time changes
  const handleTimeChange = (time: number) => {
    console.log('New time:', new Date(time).toISOString());
    // Update your map to show tracks at this time
  };

  return (
    <TimeController
      timeExtent={timeExtent}
      onTimeChange={handleTimeChange}
    />
  );
}
```

## With All Callbacks

```tsx
import { TimeController, type PlaybackState, type DisplayMode } from '@debrief/components';

function DebriefSidebar() {
  const [currentTime, setCurrentTime] = useState(startTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  return (
    <TimeController
      timeExtent={[startTime, endTime]}
      initialTime={startTime}
      initialSpeed={1}
      initialDisplayMode="full"
      onTimeChange={(time) => {
        setCurrentTime(time);
        updateMapToTime(time);
      }}
      onPlaybackStateChange={(state) => {
        setIsPlaying(state === 'playing');
      }}
      onDisplayModeChange={(mode) => {
        setDisplayMode(mode);
        updateTrackRendering(mode);
      }}
    />
  );
}
```

## Using the Hook Directly

For custom UI layouts:

```tsx
import { useTimePlayback, TimeScrubber, PlaybackControls } from '@debrief/components';

function CustomTimeControls({ timeExtent }) {
  const playback = useTimePlayback({
    timeExtent,
    onTimeChange: (time) => updateMap(time),
  });

  return (
    <div className="custom-layout">
      {/* Custom time display */}
      <span className="big-time">{formatTime(playback.currentTime)}</span>

      {/* Use built-in scrubber */}
      <TimeScrubber
        timeExtent={timeExtent}
        currentTime={playback.currentTime}
        onTimeChange={playback.setCurrentTime}
      />

      {/* Custom controls */}
      <div className="controls">
        <button onClick={playback.togglePlayback}>
          {playback.playbackState === 'playing' ? '⏸' : '▶'}
        </button>
        <select
          value={playback.speed}
          onChange={(e) => playback.setSpeed(Number(e.target.value))}
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
          <option value={8}>8x</option>
        </select>
      </div>
    </div>
  );
}
```

## UI States

```tsx
// Empty state - no data loaded
<TimeController />

// Loading state
<TimeController timeExtent={timeExtent} uiState="loading" />

// Ready state (automatic when timeExtent provided)
<TimeController timeExtent={timeExtent} />
```

## Keyboard Shortcuts

When the TimeController has focus:

| Key | Action |
|-----|--------|
| `Space` | Toggle play/pause |
| `Right Arrow` | Scrub forward |
| `Left Arrow` | Scrub backward |

## VS Code Extension Integration

The TimeController is integrated into the VS Code extension's activity bar:

```
Debrief Activity Bar
├── Time Range (webview - TimeController)
├── Tools
└── Layers
```

### Architecture

The integration uses a React webview:

1. **timeController.tsx** - React entry point that:
   - Renders TimeController from @debrief/components
   - Handles message passing with extension
   - Persists state (currentTime, speed, displayMode)

2. **TimeRangeViewProvider** - VS Code webview provider that:
   - Loads the React webview bundle
   - Converts plot timeExtent (ISO strings) to timestamps
   - Applies VS Code theme CSS overrides

### Commands

| Command | Description |
|---------|-------------|
| `debrief.setTimeRange` | Set current time position |
| `debrief.resetTimeRange` | Reset to full data range |
| `debrief.setDisplayMode` | Toggle full/trail display |

### Theme Integration

The webview uses CSS variable overrides to match VS Code themes:

```css
.debrief-time-scrubber__progress {
  background: var(--vscode-progressBar-background);
}
.debrief-playback-button {
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
}
```

## Storybook Preview

View interactive demos at:
`https://debrief.github.io/debrief-future/storybook/?path=/story/components-timecontroller`

Stories available:
- Default
- Empty State
- Loading State
- Manual Navigation (US1)
- Animated Playback (US2)
- Speed Control (US3)
- Keyboard Control (US4)
- Display Mode
- Light Theme
- Dark Theme
- VS Code Theme
