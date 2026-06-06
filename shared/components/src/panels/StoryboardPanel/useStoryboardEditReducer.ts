/**
 * Shared panel reducer hook for the Storyboard edit suite (Feature 230).
 *
 * One source of truth for the panel's ephemeral display state (which row's
 * form is open, which overflow menu anchor is visible, inbound stale flags,
 * pending undo toasts) consumed by:
 *
 *   - `apps/vscode/src/webview/web/storyboardPanel.tsx` (VS Code webview)
 *   - `apps/web-shell/src/StoryboardEditHarness.tsx` (web-shell harness)
 *   - `StoryboardPanel.stories.tsx` (interactive Storybook stories)
 *
 * The reducer is PURE — no side effects, no postMessage, no time reads.
 * Side effects (outbound postMessage) happen in the event handlers that
 * wrap a dispatch.
 *
 * Contract parity: data-model.md §E1 (state), §Action Union, and
 * postmessage-contract.md §Inbound + §Refresh Payload Extension.
 */

import { useCallback, useReducer } from 'react';
import type {
  CollisionBannerViewModel,
  NamingRowViewModel,
  SceneEditViewModel,
  SceneRowViewModel,
  StoryboardEditViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
} from './types';

export interface UndoToastDescriptor {
  readonly sceneId: string;
  readonly sceneTitle: string;
  readonly deletedAt: string;
  readonly canUndo: boolean;
}

export interface StaleFlagEntry {
  readonly sceneId: string;
  readonly stale: boolean;
  readonly unresolvedFeatureIds: readonly string[];
}

/**
 * Local theme variant for the Storyboard panel reducer state.
 *
 * Aligned with the project-wide flat union (#220) — the legacy `'vscode'`
 * value has been retired. Inside a VS Code webview the panel resolves to
 * one of the four explicit values via `vsCodeBodyClassSource`.
 */
export type ThemeVariant =
  | 'light'
  | 'dark'
  | 'high-contrast-light'
  | 'high-contrast-dark';

/**
 * Host-pushed first-capture naming-row state slice (#235 contract §A).
 *
 * Non-null + `visible:true` → host has a capture command in flight that
 * needs the analyst to confirm a Storyboard name. The reducer owns the
 * panel-local `pendingName` typing state on top of this push slice.
 */
export interface NamingRowReducerState {
  readonly visible: boolean;
  readonly defaultName: string;
  readonly knownNames: readonly string[];
  /** Panel-local typing state — initialised from `defaultName` when the
   *  slice first becomes visible, then driven by the analyst's keystrokes. */
  readonly pendingName: string;
}

/**
 * Host-pushed duplicate-timestamp collision-banner state slice
 * (#235 contract §A).
 */
export interface CollisionBannerReducerState {
  readonly visible: boolean;
  readonly conflictingSceneId: string;
  readonly conflictingSceneTitle: string;
  readonly originalTimestamp: string;
  readonly proposedTimestamp: string;
  readonly offsetCount: number;
  readonly offsetWouldExceedTimeRange: boolean;
  readonly cause: 'capture' | 'update-to-current';
}

export interface StoryboardEditReducerState {
  // Inbound scene list
  readonly sceneRows: readonly SceneRowViewModel[];
  readonly activeStoryboardId: string | null;
  readonly activeStoryboardName: string | null;
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly currentSceneId: string | null;
  readonly transport: TransportViewModel | undefined;
  readonly captureInFlight: boolean;
  readonly theme: ThemeVariant;
  // Inbound edit view-models (from refresh / snapshot)
  readonly sceneEditViewModelsFromExtension: Readonly<
    Record<string, SceneEditViewModel>
  >;
  readonly storyboardEditViewModel: StoryboardEditViewModel | null;
  // Inbound edit-suite state (from dedicated messages)
  readonly staleFlags: ReadonlyMap<string, StaleFlagEntry>;
  readonly pendingUndoToast: UndoToastDescriptor | null;
  // Panel-local display state
  readonly editFormOpenFor: string | null;
  readonly overflowMenuOpenFor: string | null;
  readonly overflowMenuAnchorRect: DOMRect | null;
  // #235 — first-capture naming row + collision banner (host-pushed)
  readonly namingRow: NamingRowReducerState | null;
  readonly collisionBanner: CollisionBannerReducerState | null;
}

/**
 * Push slice for the first-capture naming row (#235 contract §A —
 * `NamingRowPushState`). Mirrors `NamingRowReducerState` minus the
 * panel-local `pendingName`, which is initialised by the reducer when the
 * slice first becomes visible.
 */
export interface NamingRowPushState {
  readonly visible: boolean;
  readonly defaultName: string;
  readonly knownNames: readonly string[];
}

/**
 * Push slice for the duplicate-timestamp collision banner (#235 contract
 * §A — `CollisionBannerPushState`).
 */
export interface CollisionBannerPushState {
  readonly visible: boolean;
  readonly conflictingSceneId: string;
  readonly conflictingSceneTitle: string;
  readonly originalTimestamp: string;
  readonly proposedTimestamp: string;
  readonly offsetCount: number;
  readonly offsetWouldExceedTimeRange: boolean;
  readonly cause: 'capture' | 'update-to-current';
}

/**
 * Payload shapes that the scenes / snapshot messages deliver. Keeping the
 * reducer decoupled from the webview message envelope keeps it testable
 * without importing VS Code types.
 */
export interface ScenesPayload {
  readonly scenes: readonly SceneRowViewModel[];
  readonly activeStoryboardName: string | null;
  readonly activeStoryboardId: string | null;
  readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
  readonly pendingUndoToast?: UndoToastDescriptor | null;
  readonly storyboardEditViewModel?: StoryboardEditViewModel | null;
  // #235 — host-driven first-capture naming row + collision banner.
  // `null` clears the slice; `undefined` (or absent) leaves it unchanged.
  readonly namingRow?: NamingRowPushState | null;
  readonly collisionBanner?: CollisionBannerPushState | null;
}

export interface SnapshotPayload {
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly scenes: readonly SceneRowViewModel[];
  readonly activeStoryboardId: string | null;
  readonly activeStoryboardName: string | null;
  readonly currentSceneId: string | null;
  readonly transport: TransportViewModel;
  readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
  readonly pendingUndoToast?: UndoToastDescriptor | null;
  readonly storyboardEditViewModel?: StoryboardEditViewModel | null;
  // #235 — same semantics as ScenesPayload.
  readonly namingRow?: NamingRowPushState | null;
  readonly collisionBanner?: CollisionBannerPushState | null;
}

export type StoryboardEditAction =
  // Inbound
  | { readonly type: 'scenes-message'; readonly payload: ScenesPayload }
  | { readonly type: 'snapshot-message'; readonly payload: SnapshotPayload }
  | { readonly type: 'scene-edit-form-open'; readonly sceneId: string }
  | {
      readonly type: 'scene-stale-flags-updated';
      readonly flags: readonly StaleFlagEntry[];
    }
  | {
      readonly type: 'scene-undo-toast-shown';
      readonly toast: UndoToastDescriptor | null;
    }
  | { readonly type: 'capture-in-flight'; readonly inFlight: boolean }
  | { readonly type: 'theme-changed'; readonly theme: ThemeVariant }
  // Local
  | { readonly type: 'expand-row-toggle'; readonly sceneId: string }
  | { readonly type: 'scene-edit-form-close' }
  | { readonly type: 'scene-undo-toast-dismissed' }
  | {
      readonly type: 'overflow-menu-open';
      readonly sceneId: string;
      readonly anchorRect: DOMRect;
    }
  | { readonly type: 'overflow-menu-close' }
  // #235 — naming row + collision banner panel-local + outbound actions.
  // `naming-row-text-changed` is panel-local typing state. The five
  // `*-requested` actions exist purely so the reducer can drop them when
  // the corresponding host slice is null/hidden (stale-message defence per
  // contracts/panel-messages.md §C). Components dispatching these actions
  // ALSO call the equivalent `onNamingRowConfirm` / `onCollisionReplace`
  // / etc. props so the host receives the stateless action post.
  | {
      readonly type: 'naming-row-text-changed';
      readonly pendingName: string;
    }
  | { readonly type: 'naming-row-confirm-requested' }
  | { readonly type: 'naming-row-cancel-requested' }
  | {
      readonly type: 'collision-replace-requested';
      readonly conflictingSceneId: string;
    }
  | { readonly type: 'collision-offset-requested' }
  | { readonly type: 'collision-cancel-requested' };

export function createInitialStoryboardEditState(
  overrides?: Partial<StoryboardEditReducerState>,
): StoryboardEditReducerState {
  return {
    sceneRows: [],
    activeStoryboardId: null,
    activeStoryboardName: null,
    storyboards: [],
    currentSceneId: null,
    transport: undefined,
    captureInFlight: false,
    theme: 'dark',
    sceneEditViewModelsFromExtension: {},
    storyboardEditViewModel: null,
    staleFlags: new Map(),
    pendingUndoToast: null,
    editFormOpenFor: null,
    overflowMenuOpenFor: null,
    overflowMenuAnchorRect: null,
    namingRow: null,
    collisionBanner: null,
    ...overrides,
  };
}

/**
 * Apply a `NamingRowPushState` to the existing reducer slice.
 *
 * - `null` clears the slice.
 * - A push that matches the current `defaultName` and the existing
 *   `pendingName` is preserved (non-clobbering — analyst keystrokes are
 *   not lost when the host re-pushes for an unrelated reason).
 * - A push with a different `defaultName` initialises `pendingName` to
 *   the new default.
 */
function applyNamingRowPush(
  current: NamingRowReducerState | null,
  push: NamingRowPushState | null,
): NamingRowReducerState | null {
  if (push === null) {
    return null;
  }
  if (current === null || current.defaultName !== push.defaultName) {
    return {
      visible: push.visible,
      defaultName: push.defaultName,
      knownNames: push.knownNames,
      pendingName: push.defaultName,
    };
  }
  return {
    visible: push.visible,
    defaultName: push.defaultName,
    knownNames: push.knownNames,
    pendingName: current.pendingName,
  };
}

function applyCollisionBannerPush(
  push: CollisionBannerPushState | null,
): CollisionBannerReducerState | null {
  if (push === null) {
    return null;
  }
  return {
    visible: push.visible,
    conflictingSceneId: push.conflictingSceneId,
    conflictingSceneTitle: push.conflictingSceneTitle,
    originalTimestamp: push.originalTimestamp,
    proposedTimestamp: push.proposedTimestamp,
    offsetCount: push.offsetCount,
    offsetWouldExceedTimeRange: push.offsetWouldExceedTimeRange,
    cause: push.cause,
  };
}

function buildStaleFlagsMap(
  flags: readonly StaleFlagEntry[],
): ReadonlyMap<string, StaleFlagEntry> {
  const m = new Map<string, StaleFlagEntry>();
  for (const f of flags) {
    m.set(f.sceneId, f);
  }
  return m;
}

export function storyboardEditReducer(
  state: StoryboardEditReducerState,
  action: StoryboardEditAction,
): StoryboardEditReducerState {
  switch (action.type) {
    case 'scenes-message': {
      const {
        scenes,
        activeStoryboardName,
        activeStoryboardId,
        sceneEditViewModels,
        pendingUndoToast,
        storyboardEditViewModel,
        namingRow,
        collisionBanner,
      } = action.payload;
      // Invariant: if a form is open for a Scene no longer present,
      // close it (defensive — data-model §State Invariants).
      const editFormOpenFor =
        state.editFormOpenFor !== null &&
        scenes.some((s) => s.sceneId === state.editFormOpenFor)
          ? state.editFormOpenFor
          : null;
      return {
        ...state,
        sceneRows: scenes,
        activeStoryboardName,
        activeStoryboardId,
        sceneEditViewModelsFromExtension:
          sceneEditViewModels ?? state.sceneEditViewModelsFromExtension,
        pendingUndoToast:
          pendingUndoToast === undefined
            ? state.pendingUndoToast
            : pendingUndoToast,
        storyboardEditViewModel:
          storyboardEditViewModel === undefined
            ? state.storyboardEditViewModel
            : storyboardEditViewModel,
        editFormOpenFor,
        namingRow:
          namingRow === undefined
            ? state.namingRow
            : applyNamingRowPush(state.namingRow, namingRow),
        collisionBanner:
          collisionBanner === undefined
            ? state.collisionBanner
            : applyCollisionBannerPush(collisionBanner),
      };
    }

    case 'snapshot-message': {
      const {
        storyboards,
        scenes,
        activeStoryboardId,
        activeStoryboardName,
        currentSceneId,
        transport,
        sceneEditViewModels,
        pendingUndoToast,
        storyboardEditViewModel,
        namingRow,
        collisionBanner,
      } = action.payload;
      const editFormOpenFor =
        state.editFormOpenFor !== null &&
        scenes.some((s) => s.sceneId === state.editFormOpenFor)
          ? state.editFormOpenFor
          : null;
      return {
        ...state,
        storyboards,
        sceneRows: scenes,
        activeStoryboardId,
        activeStoryboardName,
        currentSceneId,
        transport,
        sceneEditViewModelsFromExtension:
          sceneEditViewModels ?? state.sceneEditViewModelsFromExtension,
        pendingUndoToast:
          pendingUndoToast === undefined
            ? state.pendingUndoToast
            : pendingUndoToast,
        storyboardEditViewModel:
          storyboardEditViewModel === undefined
            ? state.storyboardEditViewModel
            : storyboardEditViewModel,
        editFormOpenFor,
        namingRow:
          namingRow === undefined
            ? state.namingRow
            : applyNamingRowPush(state.namingRow, namingRow),
        collisionBanner:
          collisionBanner === undefined
            ? state.collisionBanner
            : applyCollisionBannerPush(collisionBanner),
      };
    }

    case 'scene-edit-form-open': {
      if (!state.sceneRows.some((s) => s.sceneId === action.sceneId)) {
        // Unknown sceneId — silently drop (defensive).
        return state;
      }
      return { ...state, editFormOpenFor: action.sceneId };
    }

    case 'scene-stale-flags-updated': {
      return { ...state, staleFlags: buildStaleFlagsMap(action.flags) };
    }

    case 'scene-undo-toast-shown': {
      return { ...state, pendingUndoToast: action.toast };
    }

    case 'capture-in-flight': {
      return { ...state, captureInFlight: action.inFlight };
    }

    case 'theme-changed': {
      return { ...state, theme: action.theme };
    }

    case 'expand-row-toggle': {
      if (!state.sceneRows.some((s) => s.sceneId === action.sceneId)) {
        return state;
      }
      const nextOpen =
        state.editFormOpenFor === action.sceneId ? null : action.sceneId;
      return { ...state, editFormOpenFor: nextOpen };
    }

    case 'scene-edit-form-close': {
      if (state.editFormOpenFor === null) {
        return state;
      }
      return { ...state, editFormOpenFor: null };
    }

    case 'scene-undo-toast-dismissed': {
      if (state.pendingUndoToast === null) {
        return state;
      }
      return { ...state, pendingUndoToast: null };
    }

    case 'overflow-menu-open': {
      if (!state.sceneRows.some((s) => s.sceneId === action.sceneId)) {
        return state;
      }
      return {
        ...state,
        overflowMenuOpenFor: action.sceneId,
        overflowMenuAnchorRect: action.anchorRect,
      };
    }

    case 'overflow-menu-close': {
      if (state.overflowMenuOpenFor === null) {
        return state;
      }
      return {
        ...state,
        overflowMenuOpenFor: null,
        overflowMenuAnchorRect: null,
      };
    }

    case 'naming-row-text-changed': {
      // Panel-local typing state — only meaningful while the host has
      // pushed `namingRow.visible: true`. Drop the action otherwise.
      if (state.namingRow === null || !state.namingRow.visible) {
        return state;
      }
      if (state.namingRow.pendingName === action.pendingName) {
        return state;
      }
      return {
        ...state,
        namingRow: {
          ...state.namingRow,
          pendingName: action.pendingName,
        },
      };
    }

    case 'naming-row-confirm-requested':
    case 'naming-row-cancel-requested': {
      // Stale-message defence (contracts/panel-messages.md §C):
      // drop the action when no naming-row slice is live. The host's
      // own state push remains authoritative.
      if (state.namingRow === null || !state.namingRow.visible) {
        return state;
      }
      return state;
    }

    case 'collision-replace-requested': {
      if (
        state.collisionBanner === null ||
        !state.collisionBanner.visible
      ) {
        return state;
      }
      // Stale-message defence: drop if conflictingSceneId mismatches.
      if (
        state.collisionBanner.conflictingSceneId !==
        action.conflictingSceneId
      ) {
        return state;
      }
      return state;
    }

    case 'collision-offset-requested':
    case 'collision-cancel-requested': {
      if (
        state.collisionBanner === null ||
        !state.collisionBanner.visible
      ) {
        return state;
      }
      return state;
    }
  }
}

/**
 * Compose the final `sceneEditViewModels` dictionary the panel renders.
 * Layers, in order:
 *   1. Baseline from `sceneEditViewModelsFromExtension` (from refresh).
 *   2. Overlay `stale` + `unresolvedFeatureIds` from inbound `staleFlags`.
 *   3. Overlay `editFormOpen: true` for the row matching `editFormOpenFor`.
 *
 * Rows without a baseline entry synthesise a minimal view-model so the
 * chevron/overflow affordances still work (fallback for fixtures that
 * don't provide per-row edit VMs).
 *
 * **Public API — see `./CONTRACTS.md` for the pinned signature, the
 * O(active-storyboard Scenes) invariant (FR-008), and the perf budget
 * (median ≤ 50 ms over 100 iterations on a 50-Scene active storyboard,
 * FR-030). The perf-regression guard is
 * `__tests__/composeSceneEditViewModels.perf.test.ts`.**
 */
export function composeSceneEditViewModels(
  state: StoryboardEditReducerState,
): Readonly<Record<string, SceneEditViewModel>> {
  const out: Record<string, SceneEditViewModel> = {};
  for (const row of state.sceneRows) {
    const base = state.sceneEditViewModelsFromExtension[row.sceneId];
    const flag = state.staleFlags.get(row.sceneId);
    const isOpen = state.editFormOpenFor === row.sceneId;
    if (base !== undefined) {
      out[row.sceneId] = {
        ...base,
        editFormOpen: isOpen || base.editFormOpen,
        stale: flag !== undefined ? flag.stale : base.stale,
        unresolvedFeatureIds:
          flag !== undefined
            ? flag.unresolvedFeatureIds
            : base.unresolvedFeatureIds,
      };
    } else {
      out[row.sceneId] = {
        sceneId: row.sceneId,
        title: row.title,
        description: null,
        timestamp: row.timestampIso,
        titleIsEditing: false,
        editFormOpen: isOpen,
        pendingDelete: false,
        stale: flag !== undefined ? flag.stale : false,
        unresolvedFeatureIds:
          flag !== undefined ? flag.unresolvedFeatureIds : [],
        missingData: { kind: 'ok' },
      };
    }
  }
  return out;
}

/**
 * Maximum Offset (+1 s) press count before the panel hides the Offset
 * button (FR-CAP-017a / data-model §CollisionBannerState invariants).
 */
export const COLLISION_OFFSET_CAP = 60;

/**
 * Project the reducer's `namingRow` slice into a presentational view-model.
 * Inline duplicate-name detection runs on the trimmed `pendingName`
 * against the host-supplied `knownNames`.
 */
export function composeNamingRowViewModel(
  state: StoryboardEditReducerState,
): NamingRowViewModel {
  const slice = state.namingRow;
  if (slice === null || !slice.visible) {
    return {
      visible: false,
      pendingName: '',
      defaultName: '',
      collisionWith: null,
      canConfirm: false,
    };
  }
  const trimmed = slice.pendingName.trim();
  let collisionWith: string | null = null;
  if (trimmed.length > 0) {
    for (const known of slice.knownNames) {
      if (known === trimmed) {
        collisionWith = known;
        break;
      }
    }
  }
  return {
    visible: true,
    pendingName: slice.pendingName,
    defaultName: slice.defaultName,
    collisionWith,
    canConfirm: trimmed.length > 0 && collisionWith === null,
  };
}

/**
 * Project the reducer's `collisionBanner` slice into a presentational
 * view-model. The DTG label is computed lazily when a non-null formatter
 * is supplied; callers that don't care (e.g. the test suite) can pass
 * `undefined` and read `proposedTimestamp` directly.
 */
export function composeCollisionBannerViewModel(
  state: StoryboardEditReducerState,
  formatDtg?: (iso: string) => string,
): CollisionBannerViewModel {
  const slice = state.collisionBanner;
  if (slice === null || !slice.visible) {
    return {
      visible: false,
      conflictingSceneId: null,
      conflictingSceneTitle: null,
      proposedTimestamp: null,
      proposedTimestampDtg: null,
      offsetCount: 0,
      offsetCapReached: false,
      offsetWouldExceedTimeRange: false,
      offsetButtonHidden: false,
      cause: null,
    };
  }
  const offsetCapReached = slice.offsetCount >= COLLISION_OFFSET_CAP;
  return {
    visible: true,
    conflictingSceneId: slice.conflictingSceneId,
    conflictingSceneTitle: slice.conflictingSceneTitle,
    proposedTimestamp: slice.proposedTimestamp,
    proposedTimestampDtg:
      formatDtg !== undefined ? formatDtg(slice.proposedTimestamp) : null,
    offsetCount: slice.offsetCount,
    offsetCapReached,
    offsetWouldExceedTimeRange: slice.offsetWouldExceedTimeRange,
    offsetButtonHidden:
      offsetCapReached || slice.offsetWouldExceedTimeRange,
    cause: slice.cause,
  };
}

export interface StoryboardEditReducerHandle {
  readonly state: StoryboardEditReducerState;
  readonly dispatch: (action: StoryboardEditAction) => void;
  readonly sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
  readonly namingRowViewModel: NamingRowViewModel;
  readonly collisionBannerViewModel: CollisionBannerViewModel;
  // Convenience dispatchers for the webview/harness to wire handlers
  readonly toggleExpandRow: (sceneId: string) => void;
  readonly closeEditForm: () => void;
  readonly openOverflowMenu: (sceneId: string, anchorRect: DOMRect) => void;
  readonly closeOverflowMenu: () => void;
  readonly dismissUndoToast: () => void;
  readonly setNamingRowPendingName: (pendingName: string) => void;
}

export function useStoryboardEditReducer(
  initialOverrides?: Partial<StoryboardEditReducerState>,
): StoryboardEditReducerHandle {
  const [state, dispatch] = useReducer(
    storyboardEditReducer,
    initialOverrides,
    createInitialStoryboardEditState,
  );

  const toggleExpandRow = useCallback((sceneId: string): void => {
    dispatch({ type: 'expand-row-toggle', sceneId });
  }, []);

  const closeEditForm = useCallback((): void => {
    dispatch({ type: 'scene-edit-form-close' });
  }, []);

  const openOverflowMenu = useCallback(
    (sceneId: string, anchorRect: DOMRect): void => {
      dispatch({ type: 'overflow-menu-open', sceneId, anchorRect });
    },
    [],
  );

  const closeOverflowMenu = useCallback((): void => {
    dispatch({ type: 'overflow-menu-close' });
  }, []);

  const dismissUndoToast = useCallback((): void => {
    dispatch({ type: 'scene-undo-toast-dismissed' });
  }, []);

  const setNamingRowPendingName = useCallback((pendingName: string): void => {
    dispatch({ type: 'naming-row-text-changed', pendingName });
  }, []);

  const sceneEditViewModels = composeSceneEditViewModels(state);
  const namingRowViewModel = composeNamingRowViewModel(state);
  const collisionBannerViewModel = composeCollisionBannerViewModel(state);

  return {
    state,
    dispatch,
    sceneEditViewModels,
    namingRowViewModel,
    collisionBannerViewModel,
    toggleExpandRow,
    closeEditForm,
    openOverflowMenu,
    closeOverflowMenu,
    dismissUndoToast,
    setNamingRowPendingName,
  };
}
