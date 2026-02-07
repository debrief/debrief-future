/**
 * MCP tool: session.setRotation
 * Feature: 024-document-session-state
 */

import type { SessionStoreApi } from '../../store/index.js';

export interface SetRotationInput {
  rotation: number;
}

export interface SetRotationOutput {
  success: boolean;
  rotation?: number;
  error?: string;
}

/**
 * Set the map rotation.
 */
export function setRotation(
  store: SessionStoreApi,
  input: SetRotationInput
): SetRotationOutput {
  try {
    const { rotation } = input;

    if (typeof rotation !== 'number') {
      return {
        success: false,
        error: 'Rotation must be a number',
      };
    }

    // Normalize to 0-360 range
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    store.getState().setRotation(normalizedRotation);

    return {
      success: true,
      rotation: store.getState().rotation,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
