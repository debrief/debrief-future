# Quickstart: Time Controller

**Feature**: 025-time-controller
**Date**: 2026-01-24

## Overview

The TimeController component provides temporal navigation for track data visualization. It enables users to scrub through time, play/pause animations, and adjust playback speed.

## Installation

The component is part of the `@debrief/shared-components` package:

```bash
pnpm add @debrief/shared-components
```

## Basic Usage

```tsx
import { TimeController } from '@debrief/shared-components';

function MyPanel() {
  const [currentTime, setCurrentTime] = useState('2024-01-15T09:00:00Z');

  const timeRange = {
    start: '2024-01-15T09:00:00Z',
    end: '2024-01-15T17:00:00Z'
  };

  return (
    <TimeController
      timeRange={timeRange}
      currentTime={currentTime}
      onTimeChange={setCurrentTime}
    />
  );
}
```

## Props Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `timeRange` | `{start: string, end: string}` | No | Time boundaries (ISO 8601) |
| `currentTime` | `string` | No | Current position (ISO 8601) |
| `onTimeChange` | `(time: string) => void` | No | Time change callback |
| `defaultSpeed` | `1 \| 2 \| 4 \| 8` | No | Initial playback speed |
| `disabled` | `boolean` | No | Disable all controls |
| `className` | `string` | No | Additional CSS class |

## States

### Empty State (no data)

When `timeRange` is undefined:
- Controller displays "No data loaded"
- All controls are disabled
- Scrubber shows empty track

### Ready State

When `timeRange` is provided:
- Scrubber shows full range with current position
- Play button enabled
- Speed selector shows current speed (default: 1x)

### Playing State

When playback is active:
- Play button shows pause icon
- Time display updates continuously
- Scrubber position advances

## Keyboard Shortcuts

When the controller has focus:

| Key | Action |
|-----|--------|
| `Space` | Toggle play/pause |
| `←` | Step backward |
| `→` | Step forward |

## Styling

The component uses CSS custom properties for theming:

```css
.time-controller {
  --tc-bg: var(--vscode-panel-background);
  --tc-fg: var(--vscode-foreground);
  --tc-accent: var(--vscode-focusBorder);
  --tc-track: var(--vscode-input-background);
  --tc-handle: var(--vscode-button-background);
}
```

## Integration with Map

Synchronize the time controller with your map display:

```tsx
function App() {
  const [currentTime, setCurrentTime] = useState(timeRange.start);

  // Map filters track positions based on currentTime
  const visiblePositions = useMemo(() =>
    tracks.flatMap(track =>
      track.positions.filter(p => p.timestamp <= currentTime)
    ),
    [tracks, currentTime]
  );

  return (
    <>
      <MapView positions={visiblePositions} />
      <TimeController
        timeRange={timeRange}
        currentTime={currentTime}
        onTimeChange={setCurrentTime}
      />
    </>
  );
}
```

## Testing

```tsx
import { render, fireEvent } from '@testing-library/react';
import { TimeController } from '@debrief/shared-components';

test('fires onTimeChange when scrubber moved', () => {
  const handleChange = vi.fn();
  const { getByRole } = render(
    <TimeController
      timeRange={{ start: '2024-01-01T00:00:00Z', end: '2024-01-01T12:00:00Z' }}
      currentTime="2024-01-01T00:00:00Z"
      onTimeChange={handleChange}
    />
  );

  const scrubber = getByRole('slider');
  fireEvent.change(scrubber, { target: { value: '50' } });

  expect(handleChange).toHaveBeenCalled();
});
```

## Storybook

Interactive examples available in Storybook:

```bash
pnpm storybook
# Navigate to Components > TimeController
```

Stories include:
- Default (with sample data)
- Empty State (no data)
- Playing State (animated)
- Various Speed Settings
- Keyboard Navigation
