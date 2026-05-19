/**
 * Session load logic.
 * Feature: 024-document-session-state
 */

import { readFile } from 'fs/promises';
import type { ViewportPolygon as SchemaViewportPolygon } from '@debrief/schemas';
import {
  DisplayModeEnum,
  PlaybackStateEnum,
  type DisplayMode,
  type PlaybackState,
} from '@debrief/schemas';
import type { SessionStoreApi } from '../store/index.js';
import type { SessionState } from '../types/index.js';
import type { TimeStep } from '../types/temporal.js';
import { isVersionCompatible, isFutureVersion, migrateSession } from './schema.js';

// Load-boundary membership check (Feature 205 / FR-023a — Article I.3).
// Returns a typed narrowing if the value is a permissible enum member, or
// null otherwise. The caller short-circuits `loadSession` with the canonical
// `LoadResult` shape when null is returned (R2-1A — no throw, no custom
// error class; conforms to the existing module contract).
function validateEnumMember<T extends string>(
  value: unknown,
  permissible: readonly T[]
): T | null {
  return typeof value === 'string' && (permissible as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

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

    // Apply state to store (may short-circuit with a validation error)
    const applyResult = applySessionState(store, migratedData, path);
    if (!applyResult.success) {
      return applyResult;
    }

    return {
      success: true,
      version: data.version,
      state: applyResult.state,
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
 *
 * Returns a narrowed result: `{ success: true, state }` on success, or
 * `{ success: false, error }` when a load-boundary validation fails
 * (Feature 205 / FR-023a). No throws — matches the module's
 * LoadResult-return convention (R2-1A).
 */
function applySessionState(
  store: SessionStoreApi,
  data: SessionFile,
  path: string
): { success: true; state: SessionState } | { success: false; error: string } {
  const { temporal, spatial, features } = data;

  // Load-boundary enum validation (Feature 205 / FR-023a — Article I.3).
  // Validate BEFORE mutating the store so a reject leaves state untouched.
  let displayMode: DisplayMode | undefined;
  if (temporal.displayMode !== undefined) {
    displayMode = validateEnumMember<DisplayMode>(
      temporal.displayMode,
      Object.values(DisplayModeEnum) as DisplayMode[]
    ) ?? undefined;
    if (displayMode === undefined) {
      return {
        success: false,
        error:
          `Invalid temporal.displayMode: ${JSON.stringify(temporal.displayMode)}. ` +
          `Expected one of ${Object.values(DisplayModeEnum).join(', ')}.`,
      };
    }
  }
  let playbackState: PlaybackState | undefined;
  if (temporal.playbackState !== undefined) {
    playbackState = validateEnumMember<PlaybackState>(
      temporal.playbackState,
      Object.values(PlaybackStateEnum) as PlaybackState[]
    ) ?? undefined;
    if (playbackState === undefined) {
      return {
        success: false,
        error:
          `Invalid temporal.playbackState: ${JSON.stringify(temporal.playbackState)}. ` +
          `Expected one of ${Object.values(PlaybackStateEnum).join(', ')}.`,
      };
    }
  }

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
    // Generated TimeFilter uses optional fields; missing/undefined means
    // unbounded. Legacy payloads may carry nulls, which are coerced to
    // undefined here (FR-021).
    const start = raw.start != null ? (coerceEpoch(raw.start) as number) : undefined;
    const end = raw.end != null ? (coerceEpoch(raw.end) as number) : undefined;
    store.getState().setTimeFilter({ start, end });
  }
  if (temporal.stepSize) {
    // Feature 205 / FR-023b: stepSize is a TimeStep object, not an enum;
    // the previous `as never` was an inherited bypass. The Zustand setter
    // accepts TimeStep directly.
    store.getState().setStepSize(temporal.stepSize as TimeStep);
  }
  if (typeof temporal.playbackRate === 'number') {
    store.getState().setPlaybackRate(temporal.playbackRate);
  }
  if (displayMode !== undefined) {
    store.getState().setDisplayMode(displayMode);
  }
  if (playbackState !== undefined) {
    store.getState().setPlaybackState(playbackState);
  }

  // Apply spatial state.
  // coerceViewport handles both the current object-form and the legacy
  // tuple-form coordinates from SCHEMA_VERSION 1.0.0 payloads (feature 203).
  if (spatial.viewport) {
    store.getState().setViewport(coerceViewport(spatial.viewport));
  }
  if (typeof spatial.rotation === 'number') {
    store.getState().setRotation(spatial.rotation);
  }
  // Spec 260 FR-011 / FR-012: session load is the canonical force-unlock
  // event. Reset already left this false, but emit an explicit setter call
  // as defence-in-depth — a future payload that smuggled viewportLocked back
  // in (e.g. via a pre-Omit save) still lands unlocked.
  store.getState().setViewportLocked(false);

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
        drawingPaletteIndex: state.drawingPaletteIndex ?? 0,
        viewportLocked: state.viewportLocked,
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
 * Coerce an arbitrary persisted value into a ViewportPolygon or null.
 *
 * Handles both the current object-form shape (`{ longitude, latitude }`) and
 * the legacy tuple-form shape that predates feature 203 (`[lon, lat]`).
 * Returns null when the input is not a recognisable viewport — callers leave
 * the viewport unset, which is loud enough to notice in the map UI but not
 * catastrophic.
 *
 * Sibling to `coerceEpoch` — same "sniff shape, convert inline" pattern.
 *
 * REMOVABLE: the legacy-tuple branch may be deleted once all production
 * sessions have rehydrated past SCHEMA_VERSION 1.1.0.
 */
export function coerceViewport(value: unknown): SchemaViewportPolygon | null {
  if (value == null || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const coordinates = raw.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 4) return null;

  const migrated = coordinates.map((c) => {
    // REMOVABLE: legacy tuple form (feature 203 SCHEMA_VERSION 1.0.0 → 1.1.0).
    if (isLegacyCoordinateTuple(c)) {
      return { longitude: c[0], latitude: c[1] };
    }
    if (
      c != null &&
      typeof c === 'object' &&
      'longitude' in c &&
      'latitude' in c &&
      typeof (c as { longitude: unknown }).longitude === 'number' &&
      typeof (c as { latitude: unknown }).latitude === 'number'
    ) {
      return c as { longitude: number; latitude: number };
    }
    return null;
  });

  if (migrated.some((c) => c == null)) return null;

  const result: SchemaViewportPolygon = {
    coordinates: migrated as SchemaViewportPolygon['coordinates'],
  };
  if (typeof raw.zoom === 'number') {
    result.zoom = raw.zoom;
  }
  return result;
}

function isLegacyCoordinateTuple(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
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
