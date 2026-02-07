/**
 * MCP tool: session.setCurrentTime
 * Feature: 024-document-session-state
 */

import type { SessionStoreApi } from '../../store/index.js';
import type { TimeInstant } from '../../types/index.js';
import { createTimeInstant, createTimeInstantFromISO } from '../../types/index.js';

export interface SetCurrentTimeInput {
  epoch?: number;
  iso?: string;
}

export interface SetCurrentTimeOutput {
  success: boolean;
  currentTime?: TimeInstant;
  error?: string;
}

/**
 * Set the current playback/display time.
 */
export function setCurrentTime(
  store: SessionStoreApi,
  input: SetCurrentTimeInput
): SetCurrentTimeOutput {
  try {
    let time: TimeInstant;

    if (input.epoch !== undefined) {
      time = createTimeInstant(input.epoch);
    } else if (input.iso !== undefined) {
      time = createTimeInstantFromISO(input.iso);
    } else {
      return {
        success: false,
        error: 'Either epoch or iso must be provided',
      };
    }

    store.getState().setCurrentTime(time);

    return {
      success: true,
      currentTime: time,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
