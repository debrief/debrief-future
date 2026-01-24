/**
 * MCP tool: session.setSelection
 * Feature: 024-document-session-state
 */

import type { SessionStoreApi } from '../../store/index.js';
import type { FeatureSelection } from '../../types/index.js';

export interface SetSelectionInput {
  featureIds?: string[];
  primary?: string | null;
  clear?: boolean;
}

export interface SetSelectionOutput {
  success: boolean;
  selection?: FeatureSelection;
  error?: string;
}

/**
 * Set the feature selection.
 */
export function setSelection(
  store: SessionStoreApi,
  input: SetSelectionInput
): SetSelectionOutput {
  try {
    if (input.clear) {
      store.getState().clearSelection();
    } else if (input.featureIds !== undefined) {
      store.getState().setSelection(
        input.featureIds,
        input.primary ?? undefined
      );
    } else {
      return {
        success: false,
        error: 'Either featureIds or clear must be provided',
      };
    }

    return {
      success: true,
      selection: store.getState().selection,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
