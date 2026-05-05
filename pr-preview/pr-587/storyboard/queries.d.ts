import { Plot, SceneFeature, StoryboardFeature } from './types';

export declare function getStoryboard(plot: Plot, storyboardId: string): StoryboardFeature | null;
export declare function getScene(plot: Plot, sceneId: string): SceneFeature | null;
/**
 * Return the plot's default "active" Storyboard (first by name ascending).
 * Null if the plot contains no Storyboards.
 */
export declare function getActiveStoryboardDefault(plot: Plot): StoryboardFeature | null;
/**
 * Return the plot's most-recently-modified Storyboard — the one whose
 * last provenance entry has the latest timestamp. Ties are broken by
 * `storyboard.properties.id` ascending (ULIDs sort lexicographically by
 * generation time, so this is a deterministic fallback consistent with
 * creation order within the same millisecond).
 *
 * Null if the plot contains no Storyboards or any candidate Storyboard
 * has an empty `provenance[]` (which would be a schema-invalid state
 * caught by #215's `validatePlot`).
 *
 * Used by #217's playback service to seed the active Storyboard on
 * plot-open (research R7 / FR-PLAY-002).
 */
export declare function getMostRecentlyModifiedStoryboard(plot: Plot): StoryboardFeature | null;
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