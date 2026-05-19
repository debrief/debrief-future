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
export function applyClickToSelection({
  current,
  event,
}: ApplyClickArgs): NextSelection {
  const { target, modifier } = event;
  const { featureIds, primary } = current;

  // Plain click → replace selection with just `target`.
  if (!modifier) {
    return { featureIds: [target], primary: target };
  }

  // Modifier click → toggle membership of `target`.
  const alreadySelected = featureIds.includes(target);

  if (!alreadySelected) {
    // Append. The newly-clicked item becomes primary (most-recent action).
    return {
      featureIds: [...featureIds, target],
      primary: target,
    };
  }

  // Remove. If `target` was the primary, fall back to the last remaining
  // feature (or null when nothing remains).
  const next = featureIds.filter((id) => id !== target);
  if (next.length === 0) {
    return { featureIds: [], primary: null };
  }
  if (target === primary) {
    return { featureIds: next, primary: next[next.length - 1] ?? null };
  }
  // Primary still in `next`; keep it.
  return { featureIds: next, primary };
}

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
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform ?? '';
  return /Mac|iP(hone|od|ad)/.test(platform);
}

/**
 * The platform modifier key used to recognise multi-select clicks.
 * `metaKey` on macOS, `ctrlKey` everywhere else.
 */
export function getPlatformModifierKey(): PlatformModifierKey {
  return isMacPlatform() ? 'metaKey' : 'ctrlKey';
}

/**
 * Convenience: given a DOM mouse / keyboard event with `ctrlKey` and
 * `metaKey` booleans, return `true` iff the platform-appropriate
 * modifier is held. Centralised here so callers don't have to remember
 * the branch.
 */
export function isPlatformModifier(event: {
  ctrlKey?: boolean;
  metaKey?: boolean;
}): boolean {
  const key = getPlatformModifierKey();
  if (key === 'metaKey') return event.metaKey === true;
  return event.ctrlKey === true;
}
