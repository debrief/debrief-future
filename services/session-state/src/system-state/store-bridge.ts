/**
 * Store <-> FeatureCollection bridge (feature 261) — the host-agnostic glue
 * between the Zustand session store and the pure SystemState helper. Both hosts
 * (VS Code extension + web-shell) use this single module so the load/save
 * translation is defined once (FR-015).
 *
 * This module is store-aware (it calls the store's view-state actions) but does
 * NO I/O — persistence remains the host's concern. It is browser-safe (exported
 * from `browser.ts`).
 *
 * active_storyboard is intentionally NOT hydrated/extracted here: neither host
 * keeps it in the session store (VS Code: FC-managed via MapPanel; web-shell:
 * the StoryboardPanel manages the pin directly). On save the existing
 * `state.activestoryboard` feature is preserved untouched (the helper's upsert
 * leaves absent keys alone — FR-009).
 */
import { readSystemStateFromFeatureCollection } from './read.js';
import { writeSystemStateIntoFeatureCollection } from './write.js';
import {
  readHiddenFeatureIds,
  applyVisibilityToFeatureCollection,
  applyVisibilityWithProvenance,
  type VisibilityProvenanceOptions,
} from './visibility.js';
import {
  temporalSliceToInput,
  spatialSliceToInput,
  selectionSliceToInput,
  temporalVariantToSlice,
  spatialVariantToSlice,
  selectionVariantToSlice,
} from './mapping.js';
import type {
  PlayheadClampDiagnostic,
  PlotFeature,
  PlotFeatureCollection,
  SystemStateWriteInput,
} from './types.js';
import type { TemporalSlice } from '../types/temporal.js';
import type { SpatialSlice } from '../types/spatial.js';
import type { FeaturesSlice } from '../types/features.js';
import type {
  TemporalActions,
  SpatialActions,
  FeaturesActions,
} from '../types/index.js';

/**
 * Loose feature shape accepted at the host boundary. `geometry`/`properties`
 * are `unknown` so concrete feature types (DebriefFeature's `TrackProperties`
 * union, geojson's `Feature` with a `GeometryCollection` geometry, …) assign
 * without a cast at the call site; the narrow casts happen once in
 * `toPlotFeature`.
 */
export interface FeatureLike {
  type: string;
  id?: string | number;
  geometry?: unknown;
  properties: unknown;
}

/**
 * The minimal slice + action surface the bridge reads/writes. Both hosts'
 * full stores satisfy this structurally (the store is flattened —
 * TemporalSlice & SpatialSlice & FeaturesSlice & …).
 */
export type ViewStateStore = TemporalSlice &
  SpatialSlice &
  FeaturesSlice &
  Pick<TemporalActions, 'setTimeRange' | 'setCurrentTime' | 'setTimeFilter' | 'setStepSize' | 'setPlaybackRate' | 'setDisplayMode'> &
  Pick<SpatialActions, 'setViewport' | 'setRotation'> &
  Pick<FeaturesActions, 'setSelection' | 'setHiddenFeatures'>;

function toPlotFeature(f: FeatureLike): PlotFeature {
  return {
    type: 'Feature',
    id: f.id,
    geometry: (f.geometry ?? null) as PlotFeature['geometry'],
    properties: (f.properties ?? null) as Record<string, unknown> | null,
  };
}

function toFc(features: ReadonlyArray<FeatureLike>): PlotFeatureCollection {
  return { type: 'FeatureCollection', features: features.map(toPlotFeature) };
}

/** Build the SystemState write-input for the three view-state variants. */
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
 * Returns the augmented features (state.* upserted, visible flags set). Pure —
 * the input array is not mutated.
 *
 * When `provenance` is supplied (FR-013/FR-021), a visibility-change `LogEntry`
 * is appended to the `provenance[]` of every feature whose visibility actually
 * changes relative to the incoming FeatureCollection — the host passes this at
 * save time so the transition is recorded, bounded to saved states.
 */
export function applyStateToFeatures(
  features: ReadonlyArray<FeatureLike>,
  state: ViewStateStore,
  provenance?: VisibilityProvenanceOptions,
): PlotFeature[] {
  const withState = writeSystemStateIntoFeatureCollection(toFc(features), buildWriteInputFromStore(state));
  const withVisibility = provenance
    ? applyVisibilityWithProvenance(withState, state.hiddenFeatureIds, provenance)
    : applyVisibilityToFeatureCollection(withState, state.hiddenFeatureIds);
  return withVisibility.features;
}

/**
 * Mirror ONLY the view-state `state.*` features (viewport / temporal /
 * selection) into the FeatureCollection, leaving every other feature — and all
 * per-feature `visible` flags — untouched. Used by the web-shell, which manages
 * visibility directly on the FC (`properties.visible`) rather than through the
 * store's hidden set, so `applyStateToFeatures` (which rewrites visibility from
 * the store) is not appropriate there. Pure.
 */
export function mirrorViewStateIntoFeatures(
  features: ReadonlyArray<FeatureLike>,
  state: ViewStateStore,
): PlotFeature[] {
  return writeSystemStateIntoFeatureCollection(toFc(features), buildWriteInputFromStore(state)).features;
}

/**
 * Hydrate the store's temporal / spatial / selection slices and per-feature
 * hidden set from a loaded FeatureCollection (FR-007). Throws
 * `SystemStateLoadError` on malformed / duplicate / FATAL cross-field-invalid
 * SystemState features (strict-on-import, FR-011/FR-012). Absence of a variant
 * leaves the store at its current value (FR-008).
 *
 * Spec 267: returns the `PlayheadClampDiagnostic[]` produced when an orphaned
 * playhead was clamped to the window edge (the store's `currentTime` receives
 * the in-window value via the unchanged `temporalVariantToSlice`). `[]` when no
 * clamp occurred. The host renders a non-blocking notification for each entry
 * (Article IV.1 — the helper emits data, never UI). Both hosts call this single
 * function, so the tolerant rule is exercised identically (SC-007).
 */
export function hydrateStoreFromFeatures(
  state: ViewStateStore,
  features: ReadonlyArray<FeatureLike>,
): PlayheadClampDiagnostic[] {
  const fc = toFc(features);
  const { map, playheadClamps } = readSystemStateFromFeatureCollection(fc); // may throw SystemStateLoadError

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

  return playheadClamps;
}
