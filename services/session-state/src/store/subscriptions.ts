/**
 * Subscription helpers for session state store.
 * Feature: 024-document-session-state
 *
 * Provides utilities for fine-grained subscriptions (FR-003, FR-004, SC-006).
 */

import type { SessionStoreApi } from './index.js';
import type { ViewportPolygon } from '@debrief/schemas';
import type {
  TemporalSlice,
  SpatialSlice,
  FeaturesSlice,
  DocumentSlice,
  FeatureSelection,
} from '../types/index.js';

/**
 * Selector function type for extracting state slices.
 */
export type Selector<T> = (state: ReturnType<SessionStoreApi['getState']>) => T;

/**
 * Equality function type for comparing state values.
 */
export type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Subscribe to a specific part of the state with optional equality function.
 * Uses Zustand's subscribeWithSelector middleware (FR-003, FR-004).
 */
export function subscribeToSlice<T>(
  store: SessionStoreApi,
  selector: Selector<T>,
  listener: (value: T, prevValue: T) => void,
  equalityFn?: EqualityFn<T>
): () => void {
  return store.subscribe(selector, listener, { equalityFn });
}

/**
 * Pre-defined selectors for common state slices.
 */
export const selectors = {
  // Full slices
  temporal: (state: ReturnType<SessionStoreApi['getState']>): TemporalSlice => ({
    currentTime: state.currentTime,
    timeRange: state.timeRange,
    timeFilter: state.timeFilter,
    stepSize: state.stepSize,
    playbackRate: state.playbackRate,
    playbackState: state.playbackState,
    displayMode: state.displayMode,
  }),

  spatial: (state: ReturnType<SessionStoreApi['getState']>): SpatialSlice => ({
    viewport: state.viewport,
    rotation: state.rotation,
    drawingMode: state.drawingMode,
    drawingPaletteIndex: state.drawingPaletteIndex,
    viewportLocked: state.viewportLocked,
  }),

  features: (state: ReturnType<SessionStoreApi['getState']>): FeaturesSlice => ({
    featureCollectionUri: state.featureCollectionUri,
    selection: state.selection,
    hiddenFeatureIds: state.hiddenFeatureIds,
    styleVersion: state.styleVersion,
  }),

  document: (state: ReturnType<SessionStoreApi['getState']>): DocumentSlice => ({
    dirty: state.dirty,
    savePath: state.savePath,
  }),

  // Individual fields
  currentTime: (state: ReturnType<SessionStoreApi['getState']>): number | null =>
    state.currentTime,

  viewport: (state: ReturnType<SessionStoreApi['getState']>): ViewportPolygon | null =>
    state.viewport,

  selection: (state: ReturnType<SessionStoreApi['getState']>): FeatureSelection =>
    state.selection,

  selectedFeatureIds: (state: ReturnType<SessionStoreApi['getState']>): string[] =>
    state.selection.featureIds,

  hiddenFeatureIds: (state: ReturnType<SessionStoreApi['getState']>): string[] =>
    state.hiddenFeatureIds,

  dirty: (state: ReturnType<SessionStoreApi['getState']>): boolean =>
    state.dirty,

  playbackState: (state: ReturnType<SessionStoreApi['getState']>) =>
    state.playbackState,
};

/**
 * Subscribe to the temporal state slice.
 */
export function subscribeToTemporal(
  store: SessionStoreApi,
  listener: (temporal: TemporalSlice, prev: TemporalSlice) => void
): () => void {
  return subscribeToSlice(store, selectors.temporal, listener);
}

/**
 * Subscribe to the spatial state slice.
 */
export function subscribeToSpatial(
  store: SessionStoreApi,
  listener: (spatial: SpatialSlice, prev: SpatialSlice) => void
): () => void {
  return subscribeToSlice(store, selectors.spatial, listener);
}

/**
 * Subscribe to the features state slice.
 */
export function subscribeToFeatures(
  store: SessionStoreApi,
  listener: (features: FeaturesSlice, prev: FeaturesSlice) => void
): () => void {
  return subscribeToSlice(store, selectors.features, listener);
}

/**
 * Subscribe to the document state slice.
 */
export function subscribeToDocument(
  store: SessionStoreApi,
  listener: (document: DocumentSlice, prev: DocumentSlice) => void
): () => void {
  return subscribeToSlice(store, selectors.document, listener);
}

/**
 * Subscribe to current time changes only.
 */
export function subscribeToCurrentTime(
  store: SessionStoreApi,
  listener: (time: number | null, prev: number | null) => void
): () => void {
  return subscribeToSlice(store, selectors.currentTime, listener);
}

/**
 * Subscribe to viewport changes only.
 */
export function subscribeToViewport(
  store: SessionStoreApi,
  listener: (viewport: ViewportPolygon | null, prev: ViewportPolygon | null) => void
): () => void {
  return subscribeToSlice(store, selectors.viewport, listener);
}

/**
 * Subscribe to selection changes only.
 */
export function subscribeToSelection(
  store: SessionStoreApi,
  listener: (selection: FeatureSelection, prev: FeatureSelection) => void
): () => void {
  return subscribeToSlice(store, selectors.selection, listener);
}

/**
 * Subscribe to dirty flag changes only.
 */
export function subscribeToDirty(
  store: SessionStoreApi,
  listener: (dirty: boolean, prev: boolean) => void
): () => void {
  return subscribeToSlice(store, selectors.dirty, listener);
}

/**
 * Shallow equality check for arrays (useful for feature IDs).
 */
export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Shallow equality check for objects (useful for slices).
 */
export function shallowObjectEqual<T extends Record<string, unknown>>(
  a: T,
  b: T
): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
