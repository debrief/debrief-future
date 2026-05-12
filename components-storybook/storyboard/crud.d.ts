import { GeoJSONPolygon, LogEntry, PolygonSource, SceneProperties, Viewport, WasGeneratedBy } from '../../../schemas/src/generated/typescript/index.ts';
import { Plot, SceneFeature, StoryboardFeature } from './types';

/**
 * Structural bounds-shape used by Spec #258 scene capture. Keeps `crud.ts`
 * platform-agnostic — callers convert Leaflet's `LatLngBounds` (or any other
 * source) to this POJO before invoking `createScene` / `updateScene`.
 */
export interface SceneBounds {
    /** Western longitude in degrees (-180 to 180). */
    readonly west: number;
    /** Southern latitude in degrees (-90 to 90). */
    readonly south: number;
    /** Eastern longitude in degrees (-180 to 180). */
    readonly east: number;
    /** Northern latitude in degrees (-90 to 90). */
    readonly north: number;
}
/**
 * Convert a four-corner bounding box to a closed GeoJSON Polygon ring
 * `[SW, NW, NE, SE, SW]`. The `source` value is informational — callers
 * persist it on the scene's `_polygon_source` slot for render-side
 * provenance (Spec #258 / FR-006).
 */
export declare function bboxToPolygon(bounds: SceneBounds, source: PolygonSource): GeoJSONPolygon;
export interface CreateStoryboardInput {
    name: string;
    description?: string;
    actor: string;
    now?: string;
    idOverride?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function createStoryboard(plot: Plot, input: CreateStoryboardInput): Promise<{
    plot: Plot;
    storyboard: StoryboardFeature;
}>;
export interface RenameStoryboardInput {
    storyboardId: string;
    newName: string;
    actor: string;
    now?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function renameStoryboard(plot: Plot, input: RenameStoryboardInput): Promise<{
    plot: Plot;
    storyboard: StoryboardFeature;
}>;
export interface DeleteStoryboardInput {
    storyboardId: string;
    actor: string;
    now?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function deleteStoryboard(plot: Plot, input: DeleteStoryboardInput): Promise<{
    plot: Plot;
    removedSceneIds: string[];
}>;
export interface CreateSceneInput {
    storyboardId: string;
    title?: string;
    description?: string;
    viewport: Viewport;
    /**
     * Real map bounds at capture time (Spec #258 / FR-004). When supplied, the
     * scene's stored polygon is `bboxToPolygon(bounds, polygonSource ?? 'bounds')`
     * and `_polygon_source` is recorded so the renderer trusts the on-disk
     * geometry. When omitted, the scene falls back to the pre-#258 placeholder
     * polygon and `_polygon_source` defaults to `'placeholder'` — the renderer
     * then recomputes the rectangle from `(viewport, map dimensions)` at draw
     * time (FR-006).
     */
    bounds?: SceneBounds;
    /** Polygon provenance — defaults to `'bounds'` when `bounds` is provided,
     *  `'placeholder'` otherwise. Explicit override permitted for restore /
     *  migrate paths that preserve historical provenance. */
    polygonSource?: PolygonSource;
    /** Time-controller display mode at capture time (Spec #258 / FR-001).
     *  Optional — legacy capture call sites omit it; readers tolerate the
     *  slot being absent on playback (FR-003). */
    displayMode?: SceneProperties["display_mode"];
    timestamp: string;
    visibleFeatureIds: string[];
    thumbnailAssetRef: string;
    transitionDurationMs?: number;
    actor: string;
    now?: string;
    idOverride?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function createScene(plot: Plot, input: CreateSceneInput): Promise<{
    plot: Plot;
    scene: SceneFeature;
}>;
export interface UpdateScenePatch {
    title?: string;
    description?: string;
    viewport?: Viewport;
    /** Spec #258 — see {@link CreateSceneInput.bounds}. When supplied alongside
     *  a viewport change, the polygon is regenerated from these bounds and
     *  `_polygon_source` is set to `'bounds'`. */
    bounds?: SceneBounds;
    polygonSource?: PolygonSource;
    /** Spec #258 — see {@link CreateSceneInput.displayMode}. */
    displayMode?: SceneProperties["display_mode"];
    timestamp?: string;
    visibleFeatureIds?: string[];
    thumbnailAssetRef?: string;
    transitionDurationMs?: number;
}
export interface UpdateSceneInput {
    sceneId: string;
    patch: UpdateScenePatch;
    actor: string;
    now?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function updateScene(plot: Plot, input: UpdateSceneInput): Promise<{
    plot: Plot;
    scene: SceneFeature;
}>;
export interface DeleteSceneInput {
    sceneId: string;
    actor: string;
    now?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function deleteScene(plot: Plot, input: DeleteSceneInput): Promise<{
    plot: Plot;
}>;
export interface DuplicateSceneInput {
    sceneId: string;
    newTimestamp: string;
    actor: string;
    now?: string;
    idOverride?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function duplicateScene(plot: Plot, input: DuplicateSceneInput): Promise<{
    plot: Plot;
    scene: SceneFeature;
}>;
export interface CopySceneToOtherStoryboardInput {
    sceneId: string;
    destinationStoryboardId: string;
    newTimestamp?: string;
    deepCopyThumbnail: (sourceAssetRef: string, destStoryboardId: string) => Promise<string>;
    actor: string;
    now?: string;
    idOverride?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function copySceneToOtherStoryboard(plot: Plot, input: CopySceneToOtherStoryboardInput): Promise<{
    plot: Plot;
    scene: SceneFeature;
}>;
/**
 * Thin wrapper over the internal `findConflictingSceneTimestamp` helper so
 * `StoryboardEditService.updateSceneToCurrent` can pre-flight the
 * duplicate-timestamp check before invoking the thumbnail pipeline (review
 * 1A). Returns the conflicting Scene or `null`. Pass `excludingSceneId` to
 * skip self (required when checking an existing Scene's new timestamp);
 * pass `null` for new-Scene checks.
 */
export declare function checkSceneTimestamp(plot: Plot, storyboardId: string, timestamp: string, excludingSceneId: string | null): SceneFeature | null;
/**
 * Storyboard-level `describe` mutation — mirrors `renameStoryboard` in
 * shape and invariant. Added alongside #218's edit suite so
 * `StoryboardEditService.describeStoryboard` can delegate rather than
 * directly edit a Storyboard Feature from extension code (preserves
 * FR-EDIT-022 + SC-009; analyze patch I1).
 */
export interface DescribeStoryboardInput {
    storyboardId: string;
    description: string | null;
    actor: string;
    now?: string;
    activityIdOverride?: string;
    rationale?: string;
}
export declare function describeStoryboard(plot: Plot, input: DescribeStoryboardInput): Promise<{
    plot: Plot;
    storyboard: StoryboardFeature;
}>;
/**
 * `restoreScene` — byte-identical recreation of a previously-deleted Scene,
 * used exclusively by `StoryboardEditService.undoDeleteScene`. Strict
 * superset of `createScene`: behaves identically when `preservedProvenance`
 * is empty, and is the only function permitted to accept a pre-built
 * `provenance[]`. The restore entry is appended on top of the preserved
 * tail so `provenance[last].timestamp ≥ provenance[second-last].timestamp`
 * remains the module's monotonicity invariant (FR-EDIT-004, SC-003).
 */
export interface RestoreSceneInput extends CreateSceneInput {
    /** Full provenance[] from the pre-delete Scene, including the `{op:
     *  "delete"}` tail entry that #215's `deleteScene` appended before
     *  removal (crud.ts appends-before-remove — see `deleteScene`). */
    preservedProvenance: readonly LogEntry[];
}
export declare function restoreScene(plot: Plot, input: RestoreSceneInput): Promise<{
    plot: Plot;
    scene: SceneFeature;
}>;
export type { LogEntry, WasGeneratedBy };
//# sourceMappingURL=crud.d.ts.map