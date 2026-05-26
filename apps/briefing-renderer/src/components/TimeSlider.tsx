/**
 * TimeSlider — scrubs within the current Scene's time range. For instant
 * Scenes the slider rests at `timestamp` and has zero range; for
 * time-range Scenes the slider bounds come from
 * `scrubbableRangeStart` / `scrubbableRangeEnd` set by
 * `BrowserTimeRangeViewAdapter.setScrubbableRange(start, end)`.
 */

import type { ChangeEvent, FC } from 'react';
import { useBriefingStore } from '../store';

export interface TimeSliderProps {
  onSeek?: (timeMs: number) => void;
}

export const TimeSlider: FC<TimeSliderProps> = ({ onSeek }) => {
  const currentTime = useBriefingStore((s) => s.currentTime);
  const rangeStart = useBriefingStore((s) => s.scrubbableRangeStart);
  const rangeEnd = useBriefingStore((s) => s.scrubbableRangeEnd);
  const setCurrentTime = useBriefingStore((s) => s.setCurrentTime);

  const disabled = rangeStart === null || rangeEnd === null || rangeStart === rangeEnd;
  const min = rangeStart ?? currentTime;
  const max = rangeEnd ?? currentTime;
  const value = Math.min(Math.max(currentTime, min), max);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setCurrentTime(next);
    onSeek?.(next);
  };

  return (
    <div data-testid="briefing-time-slider" style={styles.wrapper}>
      <input
        type="range"
        data-testid="briefing-time-slider-input"
        min={min}
        max={max}
        step={1000}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        style={styles.input}
      />
      <span data-testid="briefing-time-slider-value" style={styles.value}>
        {disabled ? '—' : new Date(value).toISOString().replace('T', ' ').slice(0, 19) + 'Z'}
      </span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: 1,
  },
  input: {
    flex: 1,
    accentColor: '#0078d4',
  },
  value: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: '#cdcdcd',
    minWidth: '12rem',
  },
};
