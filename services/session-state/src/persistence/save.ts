/**
 * Session save logic.
 * Feature: 024-document-session-state
 */

import { writeFile } from 'fs/promises';
import type { SessionStoreApi } from '../store/index.js';
import type { PersistentSessionState } from '../types/index.js';
import { SCHEMA_VERSION } from '../types/index.js';
import { createSchemaHeader } from './schema.js';

/**
 * Save result.
 */
export interface SaveResult {
  success: boolean;
  path?: string;
  savedAt?: string;
  error?: string;
}

/**
 * Extract persistent state from the store.
 */
export function extractPersistentState(store: SessionStoreApi): PersistentSessionState {
  const state = store.getState();

  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    temporal: {
      currentTime: state.currentTime,
      timeRange: state.timeRange,
      timeFilter: state.timeFilter,
      stepSize: state.stepSize,
      playbackRate: state.playbackRate,
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
      styleVersion: 0, // Ephemeral — always reset to 0 on load
    },
  };
}

/**
 * Save session state to a file.
 */
export async function saveSession(
  store: SessionStoreApi,
  path?: string
): Promise<SaveResult> {
  try {
    // Use provided path or existing save path
    const savePath = path ?? store.getState().savePath;

    if (!savePath) {
      return {
        success: false,
        error: 'No save path provided and no existing save path',
      };
    }

    // Create session file content
    const header = createSchemaHeader();
    const persistentState = extractPersistentState(store);

    const sessionFile = {
      ...header,
      temporal: persistentState.temporal,
      spatial: persistentState.spatial,
      features: persistentState.features,
    };

    // Write to file
    const content = JSON.stringify(sessionFile, null, 2);
    await writeFile(savePath, content, 'utf-8');

    // Update store state
    store.getState().setSavePath(savePath);
    store.getState().markClean();

    return {
      success: true,
      path: savePath,
      savedAt: header.savedAt,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Serialize state to JSON string (for in-memory operations).
 */
export function serializeState(store: SessionStoreApi): string {
  const header = createSchemaHeader();
  const persistentState = extractPersistentState(store);

  const sessionFile = {
    ...header,
    temporal: persistentState.temporal,
    spatial: persistentState.spatial,
    features: persistentState.features,
  };

  return JSON.stringify(sessionFile, null, 2);
}
