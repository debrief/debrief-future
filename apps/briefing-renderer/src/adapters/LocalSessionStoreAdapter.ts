/**
 * LocalSessionStoreAdapter (T045) — the briefing renderer's local
 * stand-in for `@debrief/session-state` (which we deliberately do NOT
 * pull into the SPA — the briefing surface is read-only and scoped to
 * one Storyboard playback).
 *
 * Exposes the minimal surface the playback driver needs:
 *   - `setCurrentTime(epochMs)` — write the slider position.
 *   - `getCurrentTime()` — read the current slider position.
 */

import { useBriefingStore } from '../store';

export interface BrowserSessionStoreAdapter {
  setCurrentTime(epochMs: number): void;
  getCurrentTime(): number;
}

export function createLocalSessionStoreAdapter(): BrowserSessionStoreAdapter {
  return {
    setCurrentTime(epochMs) {
      useBriefingStore.getState().setCurrentTime(epochMs);
    },
    getCurrentTime() {
      return useBriefingStore.getState().currentTime;
    },
  };
}
