import { LogEntry, Viewport, WasGeneratedBy } from '../../../schemas/src/generated/typescript/index.ts';
import { Plot, SceneFeature, StoryboardFeature } from './types';

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
export type { LogEntry, WasGeneratedBy };
//# sourceMappingURL=crud.d.ts.map