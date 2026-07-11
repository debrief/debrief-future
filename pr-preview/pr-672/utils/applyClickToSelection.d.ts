/**
 * Multi-select emitter glue — pure function + modifier-key detection.
 *
 * Owns the click-to-selection-set transition that the map and the Layers
 * panel BOTH emit through. The transition table is documented in
 * `specs/192-properties-panel-feature-edit/contracts/multi-select-emitter.md`
 * and `specs/192-properties-panel-feature-edit/data-model.md` § 2.6.
 *
 *  - Plain click            → replace selection with `{ [target] }`
 *  - Modifier click (Ctrl/Cmd) on a target NOT in selection → append
 *  - Modifier click on a target already in selection         → toggle off
 *
 * When the modifier-toggle removes the currently-primary feature:
 *  - If the resulting list is non-empty: `primary` becomes the last
 *    remaining feature in the list (deterministic, matches the analyst's
 *    most-recent action).
 *  - If the resulting list is empty: `primary` becomes `null`.
 *
 * `shift` is reserved for future range-select and intentionally ignored
 * here (FeatureList keeps its own shift-range handling because its
 * row-indexed model is a property of list views, not the map).
 */
/**
 * The shared event shape emitted by both `MapView` and `FeatureList`
 * once the multi-select emitter is fully wired in.
 */
export interface SelectionClickEvent {
    /** Feature ID (or vertex path string) the user clicked. */
    target: string;
    /** Was the platform modifier (Ctrl on Win/Linux, Cmd on macOS) held? */
    modifier: boolean;
    /** Was Shift held? Reserved for future range-select; ignored by this helper. */
    shift: boolean;
}
/**
 * The selection-state slice this helper acts on. Keeps the type narrow
 * so the helper can be unit-tested without dragging in the full session
 * store.
 */
export interface SelectionState {
    /** Currently-selected feature IDs in click/selection order. */
    readonly featureIds: ReadonlyArray<string>;
    /** The "primary" feature — drives panel mode + form. */
    readonly primary: string | null;
}
/**
 * The next-selection result. Returned shape mirrors the dispatch
 * payload `setSelection({ featureIds, primary })` expects.
 */
export interface NextSelection {
    readonly featureIds: string[];
    readonly primary: string | null;
}
interface ApplyClickArgs {
    /** The current selection — usually read from the features slice. */
    readonly current: SelectionState;
    /** The incoming click event. */
    readonly event: SelectionClickEvent;
}
/**
 * Apply a `SelectionClickEvent` to the current selection and return the
 * next selection set. Pure: no store access, no DOM, no globals.
 */
export declare function applyClickToSelection({ current, event, }: ApplyClickArgs): NextSelection;
/**
 * The platform modifier key — `metaKey` on macOS, `ctrlKey` everywhere
 * else. Resolved once at app boot. Both `MapView` and `FeatureList`
 * MUST use this detection so analysts get a consistent shortcut.
 *
 * @see contracts/multi-select-emitter.md § "Modifier-key detection (R-010)"
 */
export type PlatformModifierKey = 'metaKey' | 'ctrlKey';
/**
 * Detect whether the platform is macOS by looking at `navigator.platform`.
 * Tests mock `navigator.platform` to flip this branch deterministically.
 */
export declare function isMacPlatform(): boolean;
/**
 * The platform modifier key used to recognise multi-select clicks.
 * `metaKey` on macOS, `ctrlKey` everywhere else.
 */
export declare function getPlatformModifierKey(): PlatformModifierKey;
/**
 * Convenience: given a DOM mouse / keyboard event with `ctrlKey` and
 * `metaKey` booleans, return `true` iff the platform-appropriate
 * modifier is held. Centralised here so callers don't have to remember
 * the branch.
 */
export declare function isPlatformModifier(event: {
    ctrlKey?: boolean;
    metaKey?: boolean;
}): boolean;
export {};
//# sourceMappingURL=applyClickToSelection.d.ts.map