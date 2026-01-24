/**
 * Session load logic.
 * Feature: 024-document-session-state
 */

import { readFile } from 'fs/promises';
import type { SessionStoreApi } from '../store/index.js';
import type { SessionState } from '../types/index.js';
import { DEFAULT_TEMPORAL_SLICE, DEFAULT_FEATURES_SLICE, createEmptySelection } from '../types/index.js';
import { isVersionCompatible, isFutureVersion, migrateSession } from './schema.js';

/**
 * Load result.
 */
export interface LoadResult {
  success: boolean;
  version?: string;
  state?: SessionState;
  error?: string;
}

/**
 * Parsed session file.
 */
interface SessionFile {
  version: string;
  savedAt: string;
  temporal: Record<string, unknown>;
  spatial: Record<string, unknown>;
  features: Record<string, unknown>;
}

/**
 * Load session state from a file.
 */
export async function loadSession(
  store: SessionStoreApi,
  path: string
): Promise<LoadResult> {
  try {
    // Read file
    const content = await readFile(path, 'utf-8');
    const data = JSON.parse(content) as SessionFile;

    // Check version compatibility
    if (isFutureVersion(data.version)) {
      return {
        success: false,
        error: `Incompatible schema version: ${data.version} is newer than supported version`,
      };
    }

    if (!isVersionCompatible(data.version)) {
      return {
        success: false,
        error: `Incompatible schema version: ${data.version}`,
      };
    }

    // Migrate if needed
    const migratedData = migrateSession(
      data as unknown as Record<string, unknown>,
      data.version
    ) as unknown as SessionFile;

    // Apply state to store
    const result = applySessionState(store, migratedData, path);

    return {
      success: true,
      version: data.version,
      state: result,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Apply loaded session state to the store.
 */
function applySessionState(
  store: SessionStoreApi,
  data: SessionFile,
  path: string
): SessionState {
  const { temporal, spatial, features } = data;

  // Reset store and apply loaded state
  store.getState().reset();

  // Apply temporal state
  if (temporal.currentTime) {
    store.getState().setCurrentTime(temporal.currentTime as never);
  }
  if (temporal.timeRange) {
    store.getState().setTimeRange(temporal.timeRange as never);
  }
  if (temporal.timeFilter) {
    store.getState().setTimeFilter(temporal.timeFilter as never);
  }
  if (temporal.stepSize) {
    store.getState().setStepSize(temporal.stepSize as never);
  }
  if (typeof temporal.playbackRate === 'number') {
    store.getState().setPlaybackRate(temporal.playbackRate);
  }
  if (temporal.displayMode) {
    store.getState().setDisplayMode(temporal.displayMode as never);
  }

  // Apply spatial state
  if (spatial.viewport) {
    store.getState().setViewport(spatial.viewport as never);
  }
  if (typeof spatial.rotation === 'number') {
    store.getState().setRotation(spatial.rotation);
  }

  // Apply features state
  if (features.featureCollectionUri) {
    store.getState().setFeatureCollectionUri(features.featureCollectionUri as string);
  }
  if (features.selection && (features.selection as { featureIds: string[] }).featureIds) {
    const selection = features.selection as { featureIds: string[]; primary?: string };
    store.getState().setSelection(selection.featureIds, selection.primary);
  }
  if (Array.isArray(features.hiddenFeatureIds)) {
    store.getState().setHiddenFeatures(features.hiddenFeatureIds);
  }

  // Set save path and mark clean
  store.getState().setSavePath(path);
  store.getState().markClean();

  // Return current state
  const state = store.getState();
  return {
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
  };
}

/**
 * Parse session JSON string (for in-memory operations).
 */
export function parseSessionJson(json: string): LoadResult {
  try {
    const data = JSON.parse(json) as SessionFile;

    if (isFutureVersion(data.version)) {
      return {
        success: false,
        error: `Incompatible schema version: ${data.version}`,
      };
    }

    return {
      success: true,
      version: data.version,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Parse error',
    };
  }
}
