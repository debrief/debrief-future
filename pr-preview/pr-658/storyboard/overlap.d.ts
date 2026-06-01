import { Plot } from './types';

/** A Scene that a given Scene overlaps with — just what the warning renders. */
export interface OverlapPartner {
    /** The partner Scene's id (used for dismissal pair keys). */
    readonly sceneId: string;
    /** The partner's current title (display). */
    readonly title: string;
}
/**
 * Stable, order-independent key for an unordered Scene pair. Used by hosts
 * to track session-scoped dismissals: `overlapPairKey(a, b) === overlapPairKey(b, a)`.
 */
export declare function overlapPairKey(a: string, b: string): string;
/**
 * Pairwise overlap among the time-range Scenes of one Storyboard.
 *
 * @param plot          The plot FeatureCollection.
 * @param storyboardId  Detection is scoped to this Storyboard only (FR-007).
 * @param dismissedPairs Optional set of `overlapPairKey` values to suppress.
 *                       A pair in this set is dropped from both Scenes' lists;
 *                       a Scene whose every overlap is dismissed is absent.
 * @returns sceneId → partners it overlaps with (post-dismissal). A sceneId
 *          absent from the map, or mapped to `[]`, carries no warning.
 *          The result is symmetric: B ∈ result(A) ⇔ A ∈ result(B).
 */
export declare function detectSceneOverlaps(plot: Plot, storyboardId: string, dismissedPairs?: ReadonlySet<string>): ReadonlyMap<string, readonly OverlapPartner[]>;
//# sourceMappingURL=overlap.d.ts.map