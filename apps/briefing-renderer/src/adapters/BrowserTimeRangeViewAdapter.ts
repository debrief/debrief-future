/**
 * BrowserTimeRangeViewAdapter (T047) — implements the
 * `PlaybackTimeRangeView.setScrubbableRange(start, end)` port shipped
 * by #263.
 *
 * For time-range Scenes the driver passes the Scene's `time_range.start`
 * and `.end` as epoch ms; the `TimeSlider` component subscribes to these
 * bounds and clamps the slider input range accordingly. For instant
 * Scenes the driver passes `(null, null)` — the slider then disables.
 */

import { useBriefingStore } from '../store';

export interface BrowserTimeRangeViewAdapter {
  setScrubbableRange(start: number | null, end: number | null): void;
}

export function createBrowserTimeRangeViewAdapter(): BrowserTimeRangeViewAdapter {
  return {
    setScrubbableRange(start, end) {
      useBriefingStore.getState().setScrubbableRange(start, end);
    },
  };
}
