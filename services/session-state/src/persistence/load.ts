/**
 * Session load logic.
 * Feature: 024-document-session-state
 */

import { readFile } from 'fs/promises';
import type { SessionStoreApi } from '../store/index.js';
import type { SessionState } from '../types/index.js';
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
  // Backward compat: old format used { epoch, iso } objects; new format uses plain numbers.
  if (temporal.currentTime != null) {
    store.getState().setCurrentTime(coerceEpoch(temporal.currentTime) as number);
  }
  if (temporal.timeRange) {
    const raw = temporal.timeRange as Record<string, unknown>;
    store.getState().setTimeRange({
      start: coerceEpoch(raw.start) as number,
      end: coerceEpoch(raw.end) as number,
    });
  }
  if (temporal.timeFilter) {
    const raw = temporal.timeFilter as Record<string, unknown>;
    store.getState().setTimeFilter({
      start: raw.start != null ? coerceEpoch(raw.start) as number : null,
      end: raw.end != null ? coerceEpoch(raw.end) as number : null,
    });
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
      drawingMode: state.drawingMode,
      drawingPaletteIndex: state.drawingPaletteIndex ?? 0,
    },
    features: {
      featureCollectionUri: state.featureCollectionUri,
      selection: state.selection,
      hiddenFeatureIds: state.hiddenFeatureIds,
      styleVersion: state.styleVersion ?? 0,
    },
    document: {
      dirty: state.dirty,
      savePath: state.savePath,
    },
    results: {
      resultLayers: state.resultLayers ?? [],
      lastToolExecution: state.lastToolExecution ?? null,
    },
  };
}

/**
 * Coerce a temporal value to a plain epoch number.
 * Handles both new format (number) and legacy format ({ epoch, iso }).
 */
function coerceEpoch(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (value != null && typeof value === 'object' && 'epoch' in value) {
    return (value as { epoch: number }).epoch;
  }
  return null;
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
