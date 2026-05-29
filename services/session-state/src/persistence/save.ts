/**
 * Session save logic.
 * Feature: 024-document-session-state
 * Extended (Feature: 192) — escalate read-only filesystem errors to the
 * plot slice's `isReadOnly` signal so panel UIs can react.
 */

import { writeFile } from 'fs/promises';
import type { SessionStoreApi } from '../store/index.js';
import type { PersistentSessionState } from '../types/index.js';
import { SCHEMA_VERSION } from '../types/index.js';
import { createSchemaHeader } from './schema.js';

/**
 * Detect Node fs read-only / permission errors by `.code`.
 * EACCES = permission denied; EPERM = operation not permitted;
 * EROFS = read-only filesystem.
 */
function isReadOnlyNodeError(
  err: unknown,
): err is NodeJS.ErrnoException {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === 'EACCES' || code === 'EPERM' || code === 'EROFS';
}

/**
 * Detect `ReadOnlyFilesystemError` from `@debrief/stac-writer` (re-exported
 * by `apps/vscode/src/services/stacService.ts`) without taking a runtime
 * dependency on that package — `@debrief/components` (transitively imported
 * by `@debrief/stac-writer`) depends on `@debrief/session-state`, so an
 * `import` here would form a workspace cycle. The `name` field is `as const`
 * on both class declarations, so a string check is precise.
 */
function isReadOnlyFilesystemError(err: unknown): err is Error {
  if (!(err instanceof Error)) return false;
  return err.name === 'ReadOnlyFilesystemError';
}

/**
 * Derive a human-readable read-only reason from a thrown error.
 * Mirrors the producer rule in `contracts/read-only-signal.md`.
 */
function deriveReadOnlyReason(err: unknown): string | null {
  if (isReadOnlyFilesystemError(err)) {
    return err.message || 'Storage location is read-only';
  }
  if (isReadOnlyNodeError(err)) {
    const code = err.code ?? 'EACCES';
    return `Save failed (${code}) — permission denied writing to the storage location`;
  }
  return null;
}

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
    // Spec #192 R-009 — escalate read-only filesystem errors to the plot
    // slice's isReadOnly signal so consumers (PropertiesPanel etc.) can
    // disable editing surfaces immediately. The staging buffer in the
    // panel is NOT cleared (US-5 AS-3); we only flip the signal.
    const readOnlyReason = deriveReadOnlyReason(err);
    if (readOnlyReason !== null) {
      store.getState().setReadOnly(true, readOnlyReason);
    }

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
