/**
 * MCP tool: session.getState
 * Feature: 024-document-session-state
 */

import type { SessionStoreApi } from '../../store/index.js';
import type {
  SessionState,
  TemporalSlice,
  SpatialSlice,
  FeaturesSlice,
  DocumentSlice,
} from '../../types/index.js';

export interface GetStateInput {
  slice?: 'temporal' | 'spatial' | 'features' | 'document';
}

export interface GetStateOutput {
  success: boolean;
  state?: SessionState | TemporalSlice | SpatialSlice | FeaturesSlice | DocumentSlice;
  error?: string;
}

/**
 * Get full state or a specific slice.
 */
export function getState(
  store: SessionStoreApi,
  input: GetStateInput
): GetStateOutput {
  const state = store.getState();

  if (!input.slice) {
    // Return full state
    return {
      success: true,
      state: {
        temporal: {
          currentTime: state.currentTime,
          timeRange: state.timeRange,
          timeFilter: state.timeFilter,
          stepSize: state.stepSize,
          playbackRate: state.playbackRate,
          playbackState: state.playbackState,
          displayMode: state.displayMode,
        },
        spatial: {
          viewport: state.viewport,
          rotation: state.rotation,
          drawingMode: state.drawingMode,
        },
        features: {
          featureCollectionUri: state.featureCollectionUri,
          selection: state.selection,
          hiddenFeatureIds: state.hiddenFeatureIds,
        },
        document: {
          dirty: state.dirty,
          savePath: state.savePath,
        },
      },
    };
  }

  switch (input.slice) {
    case 'temporal':
      return {
        success: true,
        state: {
          currentTime: state.currentTime,
          timeRange: state.timeRange,
          timeFilter: state.timeFilter,
          stepSize: state.stepSize,
          playbackRate: state.playbackRate,
          playbackState: state.playbackState,
          displayMode: state.displayMode,
        },
      };
    case 'spatial':
      return {
        success: true,
        state: {
          viewport: state.viewport,
          rotation: state.rotation,
          drawingMode: state.drawingMode,
        },
      };
    case 'features':
      return {
        success: true,
        state: {
          featureCollectionUri: state.featureCollectionUri,
          selection: state.selection,
          hiddenFeatureIds: state.hiddenFeatureIds,
        },
      };
    case 'document':
      return {
        success: true,
        state: {
          dirty: state.dirty,
          savePath: state.savePath,
        },
      };
    default:
      return {
        success: false,
        error: `Unknown slice: ${input.slice}`,
      };
  }
}
