import { Plot, PlotFeature } from './types';

export declare const ACTIVE_STORYBOARD_FEATURE_ID = "state.activestoryboard";
export declare const ACTIVE_STORYBOARD_STATE_TYPE = "active_storyboard";
interface ActiveStoryboardSelectionFeature extends PlotFeature {
    properties: {
        kind: "SYSTEM";
        state_type: typeof ACTIVE_STORYBOARD_STATE_TYPE;
        active_storyboard_id?: string;
        [k: string]: unknown;
    };
}
export declare function isActiveStoryboardSelection(feature: PlotFeature | null | undefined): feature is ActiveStoryboardSelectionFeature;
/**
 * Scan the plot for the first `SystemState` feature with
 * `state_type: active_storyboard` and return its `active_storyboard_id`,
 * or null if no such feature exists.
 *
 * Defensive de-dup logging (V-5): if multiple matching features exist, the
 * first match is returned and a single non-fatal warning is emitted; the
 * next write through `setActiveStoryboardSelection` will collapse them.
 *
 * Does NOT validate that the recorded ID corresponds to a Storyboard present
 * in the plot — that cross-feature integrity check (V-2) is the host's
 * responsibility on read.
 */
export declare function getActiveStoryboardSelection(plot: Plot): string | null;
/**
 * Return a NEW FeatureCollection with the active-storyboard SystemState
 * feature upserted (V-3: at most one) or removed (V-4: when id is null).
 *
 * Pure — never mutates the input plot or any of its features.
 */
export declare function setActiveStoryboardSelection(plot: Plot, id: string | null): Plot;
export {};
//# sourceMappingURL=activeStoryboardSelection.d.ts.map