/**
 * MCP tool: session.setHiddenFeatures
 * Feature: 024-document-session-state
 */

import type { SessionStoreApi } from '../../store/index.js';

export interface SetHiddenFeaturesInput {
  featureIds?: string[];
  add?: string[];
  remove?: string[];
  clear?: boolean;
}

export interface SetHiddenFeaturesOutput {
  success: boolean;
  hiddenFeatureIds?: string[];
  error?: string;
}

/**
 * Set which features are hidden from display.
 */
export function setHiddenFeatures(
  store: SessionStoreApi,
  input: SetHiddenFeaturesInput
): SetHiddenFeaturesOutput {
  try {
    if (input.clear) {
      store.getState().setHiddenFeatures([]);
    } else if (input.featureIds !== undefined) {
      store.getState().setHiddenFeatures(input.featureIds);
    } else {
      if (input.add) {
        store.getState().hideFeatures(input.add);
      }
      if (input.remove) {
        store.getState().showFeatures(input.remove);
      }
    }

    return {
      success: true,
      hiddenFeatureIds: store.getState().hiddenFeatureIds,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
