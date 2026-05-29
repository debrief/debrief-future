/**
 * Shared SystemState helper (feature 261) — the sole producer/consumer of
 * SystemState read/write logic for all four variants across both hosts
 * (FR-015). Pure transformation layer: no I/O, no input mutation.
 *
 * Re-exported from `@debrief/session-state`.
 */
export {
  readSystemStateFromFeatureCollection,
} from './read.js';
export {
  writeSystemStateIntoFeatureCollection,
} from './write.js';
export {
  readHiddenFeatureIds,
  applyVisibilityToFeatureCollection,
} from './visibility.js';
export {
  temporalSliceToInput,
  temporalVariantToSlice,
  spatialSliceToInput,
  spatialVariantToSlice,
  selectionSliceToInput,
  selectionVariantToSlice,
  activeStoryboardIdToInput,
  activeStoryboardVariantToId,
} from './mapping.js';
export {
  temporalSchema,
  spatialSchema,
  selectionSchema,
  activeStoryboardSchema,
  checkTemporalCrossField,
} from './validate.js';
export {
  buildWriteInputFromStore,
  applyStateToFeatures,
  mirrorViewStateIntoFeatures,
  hydrateStoreFromFeatures,
} from './store-bridge.js';
export type { FeatureLike, ViewStateStore } from './store-bridge.js';
export { SystemStateLoadError } from './errors.js';
export type { SystemStateLoadErrorKind } from './errors.js';
export { STATE_FEATURE_ID } from './types.js';
export type {
  PlotFeature,
  PlotFeatureCollection,
  SystemStateType,
  TemporalVariant,
  SpatialVariant,
  SelectionVariant,
  ActiveStoryboardVariant,
  SystemStateMap,
  SystemStateWriteInput,
} from './types.js';
