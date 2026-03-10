/**
 * MCP tool: session.setCurrentTime
 * Feature: 024-document-session-state
 */

import type { SessionStoreApi } from '../../store/index.js';
import type { TimeInstant } from '../../types/index.js';
import { createTimeInstant, isoToEpoch } from '../../types/index.js';

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
    let epoch: number;

    if (input.epoch !== undefined) {
      epoch = input.epoch;
    } else if (input.iso !== undefined) {
      epoch = isoToEpoch(input.iso);
    } else {
      return {
        success: false,
        error: 'Either epoch or iso must be provided',
      };
    }

    store.getState().setCurrentTime(epoch);

    return {
      success: true,
      currentTime: createTimeInstant(epoch),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
