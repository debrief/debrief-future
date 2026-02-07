/**
 * MCP tool: session.setPlaybackRate
 * Feature: 024-document-session-state
 */

import type { SessionStoreApi } from '../../store/index.js';

export interface SetPlaybackRateInput {
  rate: number;
}

export interface SetPlaybackRateOutput {
  success: boolean;
  playbackRate?: number;
  error?: string;
}

/**
 * Set the playback rate.
 */
export function setPlaybackRate(
  store: SessionStoreApi,
  input: SetPlaybackRateInput
): SetPlaybackRateOutput {
  try {
    const { rate } = input;

    if (typeof rate !== 'number' || rate < 0.1 || rate > 100.0) {
      return {
        success: false,
        error: 'Rate must be a number between 0.1 and 100.0',
      };
    }

    store.getState().setPlaybackRate(rate);

    return {
      success: true,
      playbackRate: store.getState().playbackRate,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
