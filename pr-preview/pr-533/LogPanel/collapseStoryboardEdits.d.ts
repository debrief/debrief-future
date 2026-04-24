import { TimelineEntry } from './types';

export declare const STORYBOARD_EDIT_TOOL_NAME = "debrief.storyboardEdit";
export interface CollapsedRun {
    readonly kind: 'run';
    /** All entries in the collapsed run, in the same order as the input. */
    readonly entries: readonly TimelineEntry[];
    /** The shared op name (e.g. `rename`, `update-to-current`). */
    readonly op: string;
    /** The shared actor. */
    readonly actor: string;
}
export interface CollapsedSingle {
    readonly kind: 'entry';
    readonly entry: TimelineEntry;
}
export type CollapsedTimelineItem = CollapsedRun | CollapsedSingle;
export interface CollapseOptions {
    /** Rolling-window size in milliseconds (default: 120 000). */
    readonly windowMs?: number;
    /** Minimum run length to trigger collapse (default: 3). */
    readonly minRunLength?: number;
}
/**
 * Group consecutive storyboard-edit entries that share the same
 * (op, actor) within a rolling `windowMs`-millisecond gap between
 * adjacent entries. Runs with fewer than `minRunLength` entries stay
 * expanded (one `CollapsedSingle` per entry).
 *
 * Non-storyboard-edit entries always pass through as individual
 * `CollapsedSingle` items. They break a run the same way a
 * different-op storyboard-edit entry would.
 */
export declare function collapseStoryboardEdits(entries: readonly TimelineEntry[], options?: CollapseOptions): CollapsedTimelineItem[];
//# sourceMappingURL=collapseStoryboardEdits.d.ts.map