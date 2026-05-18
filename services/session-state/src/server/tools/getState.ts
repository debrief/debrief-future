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
  ResultsSlice,
} from '../../types/index.js';

export interface GetStateInput {
  slice?: 'temporal' | 'spatial' | 'features' | 'document' | 'results';
}

export interface GetStateOutput {
  success: boolean;
  state?: SessionState | TemporalSlice | SpatialSlice | FeaturesSlice | DocumentSlice | ResultsSlice;
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
          drawingPaletteIndex: state.drawingPaletteIndex,
          viewportLocked: state.viewportLocked,
        },
        features: {
          featureCollectionUri: state.featureCollectionUri,
          selection: state.selection,
          hiddenFeatureIds: state.hiddenFeatureIds,
          styleVersion: state.styleVersion,
        },
        document: {
          dirty: state.dirty,
          savePath: state.savePath,
        },
        results: {
          resultLayers: state.resultLayers,
          lastToolExecution: state.lastToolExecution,
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
          drawingPaletteIndex: state.drawingPaletteIndex,
          viewportLocked: state.viewportLocked,
        },
      };
    case 'features':
      return {
        success: true,
        state: {
          featureCollectionUri: state.featureCollectionUri,
          selection: state.selection,
          hiddenFeatureIds: state.hiddenFeatureIds,
          styleVersion: state.styleVersion,
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
    case 'results':
      return {
        success: true,
        state: {
          resultLayers: state.resultLayers,
          lastToolExecution: state.lastToolExecution,
        },
      };
    default:
      return {
        success: false,
        error: `Unknown slice: ${input.slice}`,
      };
  }
}
