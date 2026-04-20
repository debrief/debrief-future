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
export type {
  Plot,
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
} from "./crud";

// ---------------------------------------------------------------------------
// Queries (sync)
// ---------------------------------------------------------------------------
export { listScenesOrdered } from "./ordering";
export {
  getStoryboard,
  getScene,
  getActiveStoryboardDefault,
  readSceneWithStaleness,
} from "./queries";
export type { StaleReadResult } from "./queries";

// ---------------------------------------------------------------------------
// Missing-data detector (sync, pure)
// ---------------------------------------------------------------------------
export { detectMissingDataForScene } from "./missing-data";
export type {
  MissingDataClassification,
  PlotTimeRange,
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
