import { Plot, SceneFeature, StoryboardFeature } from './types';

export declare function getStoryboard(plot: Plot, storyboardId: string): StoryboardFeature | null;
export declare function getScene(plot: Plot, sceneId: string): SceneFeature | null;
/**
 * Return the plot's default "active" Storyboard (first by name ascending).
 * Null if the plot contains no Storyboards.
 */
export declare function getActiveStoryboardDefault(plot: Plot): StoryboardFeature | null;
export interface StaleReadResult {
    scene: SceneFeature;
    storedHash: string;
    canonicalVisibleIds: string[];
}
/**
 * Sync read that returns the Scene + stored hash + canonical feature IDs.
 * Consumers compute `await computeFeatureSetHash(result.canonicalVisibleIds)`
 * and compare against `storedHash` to detect staleness.
 */
export declare function readSceneWithStaleness(plot: Plot, sceneId: string): StaleReadResult | null;
//# sourceMappingURL=queries.d.ts.map