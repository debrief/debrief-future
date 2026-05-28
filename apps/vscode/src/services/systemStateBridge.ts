/**
 * Bridge between the VS Code session store and the FeatureCollection-based
 * SystemState persistence (feature 261). Keeps `openPlot.ts` / `saveSession.ts`
 * declarative and makes the load/save translation unit-testable without a
 * VS Code host.
 *
 * All SystemState read/write goes through the shared `@debrief/session-state`
 * helper (the single producer/consumer, FR-015). This module only adapts the
 * VS Code feature type at the boundary (explicit per-field mapping, mirroring
 * `openPlot.ts`'s `toSafeFC`) and applies the hydrated values to the store via
 * its existing actions.
 *
 * active_storyboard is intentionally NOT hydrated into the store here: VS Code
 * has no active-storyboard store slice (the pin is FC-managed via the MapPanel),
 * so on save the existing `state.activestoryboard` feature is preserved
 * untouched (the helper's upsert leaves absent keys alone — FR-009).
 */
import {
  readSystemStateFromFeatureCollection,
  writeSystemStateIntoFeatureCollection,
  readHiddenFeatureIds,
  applyVisibilityToFeatureCollection,
  temporalSliceToInput,
  spatialSliceToInput,
  selectionSliceToInput,
  temporalVariantToSlice,
  spatialVariantToSlice,
  selectionVariantToSlice,
  SystemStateLoadError,
  type SystemStatePlotFeature,
  type SystemStatePlotFeatureCollection,
  type SystemStateWriteInput,
} from '@debrief/session-state';
import type { SessionStore } from '@debrief/session-state';

/** Loose feature shape accepted at the boundary (DebriefFeature / SafeFeature). */
export interface FeatureLike {
  type: string;
  id?: string | number;
  geometry: unknown;
  properties: Record<string, unknown> | null;
}

/** The subset of session-store actions + view-state this bridge reads/writes. */
type ViewStateStore = Pick<
  SessionStore,
  | 'timeRange'
  | 'currentTime'
  | 'timeFilter'
  | 'stepSize'
  | 'playbackRate'
  | 'displayMode'
  | 'playbackState'
  | 'viewport'
  | 'rotation'
  | 'drawingMode'
  | 'drawingPaletteIndex'
  | 'viewportLocked'
  | 'selection'
  | 'hiddenFeatureIds'
  | 'featureCollectionUri'
  | 'styleVersion'
  | 'setTimeRange'
  | 'setCurrentTime'
  | 'setTimeFilter'
  | 'setStepSize'
  | 'setPlaybackRate'
  | 'setDisplayMode'
  | 'setViewport'
  | 'setRotation'
  | 'setSelection'
  | 'clearSelection'
  | 'setHiddenFeatures'
>;

function toPlotFeature(f: FeatureLike): SystemStatePlotFeature {
  return {
    type: 'Feature',
    id: f.id,
    geometry: f.geometry as SystemStatePlotFeature['geometry'],
    properties: f.properties,
  };
}

function toFc(features: ReadonlyArray<FeatureLike>): SystemStatePlotFeatureCollection {
  return { type: 'FeatureCollection', features: features.map(toPlotFeature) };
}

/**
 * Build the SystemState write-input for the three view-state variants VS Code
 * owns (active_storyboard is preserved as pass-through, see module note).
 */
export function buildWriteInputFromStore(state: ViewStateStore): SystemStateWriteInput {
  const input: SystemStateWriteInput = {};
  const temporal = temporalSliceToInput(state);
  if (temporal !== undefined) {
    input.temporal = temporal;
  }
  const spatial = spatialSliceToInput(state);
  if (spatial !== undefined) {
    input.spatial = spatial;
  }
  const selection = selectionSliceToInput(state);
  if (selection !== undefined) {
    input.selection = selection;
  }
  return input;
}

/**
 * Apply current view-state + per-feature visibility into the FeatureCollection.
 * Returns the augmented features (state.* features upserted, visible flags set).
 * Pure — the input array is not mutated.
 */
export function applyStateToFeatures(
  features: ReadonlyArray<FeatureLike>,
  state: ViewStateStore,
): SystemStatePlotFeature[] {
  const withState = writeSystemStateIntoFeatureCollection(toFc(features), buildWriteInputFromStore(state));
  const withVisibility = applyVisibilityToFeatureCollection(withState, state.hiddenFeatureIds);
  return withVisibility.features;
}

/**
 * Hydrate the store's temporal / spatial / selection slices and per-feature
 * hidden set from a loaded FeatureCollection (FR-007). Throws
 * `SystemStateLoadError` on malformed / duplicate / cross-field-invalid
 * SystemState features (strict-on-import, FR-011/FR-012). Absence of a variant
 * leaves the store at its defaults (FR-008).
 */
export function hydrateStoreFromFeatures(
  state: ViewStateStore,
  features: ReadonlyArray<FeatureLike>,
): void {
  const fc = toFc(features);
  const map = readSystemStateFromFeatureCollection(fc); // may throw SystemStateLoadError

  const temporal = temporalVariantToSlice(map.temporal);
  if (temporal.timeRange !== undefined) {
    state.setTimeRange(temporal.timeRange);
  }
  if (temporal.currentTime !== undefined) {
    state.setCurrentTime(temporal.currentTime);
  }
  if (temporal.timeFilter !== undefined) {
    state.setTimeFilter(temporal.timeFilter);
  }
  if (temporal.stepSize !== undefined) {
    state.setStepSize(temporal.stepSize);
  }
  if (temporal.playbackRate !== undefined) {
    state.setPlaybackRate(temporal.playbackRate);
  }
  if (temporal.displayMode !== undefined) {
    state.setDisplayMode(temporal.displayMode);
  }

  const spatial = spatialVariantToSlice(map.spatial);
  if (spatial.viewport !== undefined) {
    state.setViewport(spatial.viewport);
  }
  if (spatial.rotation !== undefined) {
    state.setRotation(spatial.rotation);
  }

  const selection = selectionVariantToSlice(map.selection);
  if (selection.selection !== undefined) {
    state.setSelection(selection.selection.featureIds, selection.selection.primary ?? undefined);
  }

  state.setHiddenFeatures(readHiddenFeatureIds(fc));
}

export { SystemStateLoadError };
