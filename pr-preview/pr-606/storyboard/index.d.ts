/**
 * Public barrel for the storyboard CRUD module (Feature 215).
 *
 * This module is headless — no React, VS Code, or Leaflet imports on the
 * core path. Consumers (downstream specs #216 / #217 / #218) import from
 * `@debrief/components` and treat the module as a pure data-layer helper.
 */
export type { Plot as StoryboardPlot, SceneFeature, StoryboardFeature, Ulid, StoryboardId, SceneId, } from './types';
export { isStoryboardFeature, isSceneFeature, asUlid, asStoryboardId, asSceneId, } from './types';
export { StoryboardError, DuplicateTimestampError, OrphanSceneError, UnknownStoryboardError, UnknownSceneError, ReservedSlotViolationError, DuplicateStoryboardNameError, ThumbnailDeepCopyFailedError, SchemaMigrationFailedError, InvariantViolationError, } from './errors';
export type { StoryboardErrorCode } from './errors';
export { createStoryboard, renameStoryboard, deleteStoryboard, createScene, updateScene, deleteScene, duplicateScene, copySceneToOtherStoryboard, describeStoryboard, restoreScene, checkSceneTimestamp, } from './crud';
export type { CreateStoryboardInput, RenameStoryboardInput, DeleteStoryboardInput, CreateSceneInput, UpdateScenePatch, UpdateSceneInput, DeleteSceneInput, DuplicateSceneInput, CopySceneToOtherStoryboardInput, DescribeStoryboardInput, RestoreSceneInput, } from './crud';
export { listScenesOrdered } from './ordering';
export { getStoryboard, getScene, getActiveStoryboardDefault, getMostRecentlyModifiedStoryboard, readSceneWithStaleness, } from './queries';
export type { StaleReadResult } from './queries';
export { detectMissingDataForScene } from './missing-data';
export type { MissingDataClassification, PlotTimeRange as StoryboardPlotTimeRange, } from './missing-data';
export { canonicaliseVisibleFeatureIds, computeFeatureSetHash, } from './hash';
export { validatePlot } from './validate';
export { isActiveStoryboardSelection, getActiveStoryboardSelection, setActiveStoryboardSelection, ACTIVE_STORYBOARD_FEATURE_ID, ACTIVE_STORYBOARD_STATE_TYPE, } from './activeStoryboardSelection';
export { runPlotOpenMigrations, V1_MIGRATIONS } from './migration';
export type { MigrationFn } from './migration';
export { formatDtg } from './dtg';
export { buildStoryboardCrudLogEntry, readStoryboardCrudOp, getCreatedAt, getLastModifiedAt, getCreatedBy, getLastModifiedBy, STORYBOARD_CRUD_TOOL, STORYBOARD_CRUD_TOOL_VERSION, } from './provenance';
export type { StoryboardCrudOp, StoryboardCrudLogEntryInput, } from './provenance';
export type { StoryboardCrudOp as StoryboardOp } from './provenance';
//# sourceMappingURL=index.d.ts.map