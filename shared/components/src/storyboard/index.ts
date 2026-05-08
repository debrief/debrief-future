/**
 * Public barrel for the storyboard CRUD module (Feature 215).
 *
 * This module is headless — no React, VS Code, or Leaflet imports on the
 * core path. Consumers (downstream specs #216 / #217 / #218) import from
 * `@debrief/components` and treat the module as a pure data-layer helper.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
// Note: `Plot` and `PlotTimeRange` are deliberately re-exported under
// `StoryboardPlot` / `StoryboardPlotTimeRange` names to avoid a collision
// with the unrelated `Plot` type in `apps/vscode/src/types/plot.ts` (which
// represents a STAC-item record, not a FeatureCollection). The
// `no-redeclare-schemas-exports` lint rule introduced in #214 would
// otherwise trip on every consumer that imported the VS Code `Plot`.
export type {
  Plot as StoryboardPlot,
  SceneFeature,
  StoryboardFeature,
  Ulid,
  StoryboardId,
  SceneId,
} from "./types";
export {
  isStoryboardFeature,
  isSceneFeature,
  asUlid,
  asStoryboardId,
  asSceneId,
} from "./types";

// ---------------------------------------------------------------------------
// Error vocabulary
// ---------------------------------------------------------------------------
export {
  StoryboardError,
  DuplicateTimestampError,
  OrphanSceneError,
  UnknownStoryboardError,
  UnknownSceneError,
  ReservedSlotViolationError,
  DuplicateStoryboardNameError,
  ThumbnailDeepCopyFailedError,
  SchemaMigrationFailedError,
  InvariantViolationError,
} from "./errors";
export type { StoryboardErrorCode } from "./errors";

// ---------------------------------------------------------------------------
// CRUD — Storyboards + Scenes (async)
// ---------------------------------------------------------------------------
export {
  createStoryboard,
  renameStoryboard,
  deleteStoryboard,
  createScene,
  updateScene,
  deleteScene,
  duplicateScene,
  copySceneToOtherStoryboard,
  // #218 additive extensions (review 2A + analyze patch I1)
  describeStoryboard,
  restoreScene,
  checkSceneTimestamp,
} from "./crud";
export type {
  CreateStoryboardInput,
  RenameStoryboardInput,
  DeleteStoryboardInput,
  CreateSceneInput,
  UpdateScenePatch,
  UpdateSceneInput,
  DeleteSceneInput,
  DuplicateSceneInput,
  CopySceneToOtherStoryboardInput,
  // #218 additive extensions
  DescribeStoryboardInput,
  RestoreSceneInput,
} from "./crud";

// ---------------------------------------------------------------------------
// Queries (sync)
// ---------------------------------------------------------------------------
export { listScenesOrdered } from "./ordering";
export {
  getStoryboard,
  getScene,
  getActiveStoryboardDefault,
  getMostRecentlyModifiedStoryboard,
  readSceneWithStaleness,
} from "./queries";
export type { StaleReadResult } from "./queries";

// ---------------------------------------------------------------------------
// Missing-data detector (sync, pure)
// ---------------------------------------------------------------------------
export { detectMissingDataForScene } from "./missing-data";
export type {
  MissingDataClassification,
  PlotTimeRange as StoryboardPlotTimeRange,
} from "./missing-data";

// ---------------------------------------------------------------------------
// Invariant helpers
// ---------------------------------------------------------------------------
export {
  canonicaliseVisibleFeatureIds,
  computeFeatureSetHash,
} from "./hash";
export { validatePlot } from "./validate";

// ---------------------------------------------------------------------------
// Active-storyboard selection persistence (#237)
// ---------------------------------------------------------------------------
export {
  isActiveStoryboardSelection,
  getActiveStoryboardSelection,
  setActiveStoryboardSelection,
  ACTIVE_STORYBOARD_FEATURE_ID,
  ACTIVE_STORYBOARD_STATE_TYPE,
} from "./activeStoryboardSelection";

// ---------------------------------------------------------------------------
// Migration hook
// ---------------------------------------------------------------------------
export { runPlotOpenMigrations, V1_MIGRATIONS } from "./migration";
export type { MigrationFn } from "./migration";

// ---------------------------------------------------------------------------
// DTG formatter
// ---------------------------------------------------------------------------
export { formatDtg } from "./dtg";

// ---------------------------------------------------------------------------
// Provenance helpers
// ---------------------------------------------------------------------------
export {
  buildStoryboardCrudLogEntry,
  readStoryboardCrudOp,
  getCreatedAt,
  getLastModifiedAt,
  getCreatedBy,
  getLastModifiedBy,
  STORYBOARD_CRUD_TOOL,
  STORYBOARD_CRUD_TOOL_VERSION,
} from "./provenance";
export type {
  StoryboardCrudOp,
  StoryboardCrudLogEntryInput,
} from "./provenance";

// #218 review 6A — alias the canonical op union as `StoryboardOp` so
// downstream recorders (session-state `StoryboardEditOp`) can `extend`
// rather than `duplicate`. Any future op added to `StoryboardCrudOp` is
// automatically visible to #218's recorder without a manual sync.
export type { StoryboardCrudOp as StoryboardOp } from "./provenance";
