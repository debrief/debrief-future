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

const OFFSET_CAP = 60;

/**
 * First-capture naming row reducer slice (#235 data-model §NamingRowState).
 *
 * Host owns `visible`, `defaultName`, and `knownNames`; the panel owns
 * `pendingName` locally as the analyst types. `collisionWith` is recomputed
 * on every keystroke against `knownNames`.
 */
export interface NamingRowReducerState {
  readonly visible: boolean;
  readonly pendingName: string;
  readonly defaultName: string;
  readonly knownNames: readonly string[];
}

/**
 * Duplicate-timestamp collision banner reducer slice (#235 data-model
 * §CollisionBannerState). All fields are host-pushed; the panel renders
 * the banner verbatim and forwards Replace / Offset / Cancel actions.
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

/**
 * Optional inline cascade-delete confirmation slice for storyboard delete.
 * Surfaced inside the rail header (no modal), per FR-MAINT-021. Host owns
 * the cascade count.
 */
export interface CascadeDeleteConfirmReducerState {
  readonly visible: boolean;
  readonly storyboardId: string;
  readonly storyboardName: string;
  readonly sceneCount: number;
}

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
  // ── #235 — first-capture naming row + collision banner slices ────
  // `null` when no flow is in flight. Host pushes a fresh slice at the
  // start of each flow and pushes `null` at the end (Confirm / Cancel /
  // Replace). Stateless action posts that arrive while the slice is
  // `null` or `visible:false` are dropped silently (stale-message
  // defence — see contracts/panel-messages.md §C).
  readonly namingRow: NamingRowReducerState | null;
  readonly collisionBanner: CollisionBannerReducerState | null;
  readonly cascadeDeleteConfirm: CascadeDeleteConfirmReducerState | null;
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
  // #235 — host-driven prompt slices (cleared by pushing `null`)
  readonly namingRow?: NamingRowReducerState | null;
  readonly collisionBanner?: CollisionBannerReducerState | null;
  readonly cascadeDeleteConfirm?: CascadeDeleteConfirmReducerState | null;
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
  // #235 — host-driven prompt slices (cleared by pushing `null`)
  readonly namingRow?: NamingRowReducerState | null;
  readonly collisionBanner?: CollisionBannerReducerState | null;
  readonly cascadeDeleteConfirm?: CascadeDeleteConfirmReducerState | null;
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
  // ── #235 — first-capture naming row actions ──────────────────────
  // `naming-row-text-changed` is panel-local: it updates `pendingName`
  // in the slice but does NOT round-trip through the host. The other
  // two are stateless action posts that the host handler should send
  // up the channel; the reducer applies them locally as a no-op so the
  // slice clears optimistically (the host's next push confirms).
  | { readonly type: 'naming-row-text-changed'; readonly text: string }
  | { readonly type: 'naming-row-confirm-requested' }
  | { readonly type: 'naming-row-cancel-requested' }
  // ── #235 — collision banner actions (all stateless) ──────────────
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
    cascadeDeleteConfirm: null,
    ...overrides,
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

/**
 * Apply a fresh host push of the naming-row slice while preserving the
 * panel-local `pendingName` whenever the host is opening a brand-new
 * row (host always pushes `pendingName === defaultName` on first push,
 * but the analyst may have started typing before the push round-trips).
 *
 * Rule: when transitioning from null/hidden → visible, accept the host's
 * `pendingName` verbatim. When the host re-pushes while the row is
 * already visible (e.g. `knownNames` updated), keep the panel's local
 * `pendingName` so the analyst's keystrokes are not clobbered.
 */
function applyNamingRowPush(
  prev: NamingRowReducerState | null,
  next: NamingRowReducerState | null,
): NamingRowReducerState | null {
  if (next === null) return null;
  if (prev === null || !prev.visible) return next;
  return { ...next, pendingName: prev.pendingName };
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
        cascadeDeleteConfirm,
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
          collisionBanner === undefined ? state.collisionBanner : collisionBanner,
        cascadeDeleteConfirm:
          cascadeDeleteConfirm === undefined
            ? state.cascadeDeleteConfirm
            : cascadeDeleteConfirm,
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
        cascadeDeleteConfirm,
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
          collisionBanner === undefined ? state.collisionBanner : collisionBanner,
        cascadeDeleteConfirm:
          cascadeDeleteConfirm === undefined
            ? state.cascadeDeleteConfirm
            : cascadeDeleteConfirm,
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
      // Stale-message defence: drop if the row isn't open (slice null
      // OR visible:false). The next legitimate host push will reset
      // any state that may have leaked.
      if (state.namingRow === null || !state.namingRow.visible) {
        return state;
      }
      return {
        ...state,
        namingRow: { ...state.namingRow, pendingName: action.text },
      };
    }

    case 'naming-row-confirm-requested':
    case 'naming-row-cancel-requested': {
      // Stale-message defence — drop if the slice isn't visible.
      if (state.namingRow === null || !state.namingRow.visible) {
        return state;
      }
      // Optimistically clear; the host's next snapshot push will be
      // authoritative. (If the host validates and rejects, it will
      // re-push a fresh `namingRow` slice.)
      return { ...state, namingRow: null };
    }

    case 'collision-replace-requested': {
      // Stale-message defence — drop if no banner OR if the conflicting
      // scene id mismatches the banner's id (panel-stale view-model).
      if (
        state.collisionBanner === null ||
        !state.collisionBanner.visible ||
        state.collisionBanner.conflictingSceneId !== action.conflictingSceneId
      ) {
        return state;
      }
      return { ...state, collisionBanner: null };
    }

    case 'collision-cancel-requested': {
      if (state.collisionBanner === null || !state.collisionBanner.visible) {
        return state;
      }
      return { ...state, collisionBanner: null };
    }

    case 'collision-offset-requested': {
      // Stale-message defence — drop if no banner OR if Offset would be
      // hidden (cap reached or out-of-range). The host re-pushes a
      // fresh banner state on success/failure of the next collision
      // check; this case does not mutate the slice locally.
      if (
        state.collisionBanner === null ||
        !state.collisionBanner.visible ||
        state.collisionBanner.offsetWouldExceedTimeRange ||
        state.collisionBanner.offsetCount >= OFFSET_CAP
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
 * Format an ISO-8601 instant as the panel's DTG label. Mirrors the
 * upstream `formatDtg` in #215's storyboard module without taking a
 * dep — the reducer must not import the storyboard module (#230 rule).
 *
 * Falls back to the raw ISO string if the input is malformed.
 */
function dtgFromIso(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0');
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  return `${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z ${
    months[d.getUTCMonth()]
  } ${pad(d.getUTCFullYear() % 100)}`;
}

/**
 * Project the host-pushed naming-row slice + the panel-local pendingName
 * into the presentational view-model the panel renders. Computes
 * `collisionWith` by case-insensitive match against `knownNames`, and
 * `canConfirm` from the trimmed name + null-collision invariant.
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
  const lower = trimmed.toLowerCase();
  const collisionWith =
    trimmed === ''
      ? null
      : (slice.knownNames.find((n) => n.toLowerCase() === lower) ?? null);
  return {
    visible: true,
    pendingName: slice.pendingName,
    defaultName: slice.defaultName,
    collisionWith,
    canConfirm: trimmed !== '' && collisionWith === null,
  };
}

/**
 * Project the host-pushed collision-banner slice into the presentational
 * view-model the panel renders. Derives `offsetCapReached` from
 * `offsetCount >= OFFSET_CAP` and `proposedTimestampDtg` via dtgFromIso.
 */
export function composeCollisionBannerViewModel(
  state: StoryboardEditReducerState,
): CollisionBannerViewModel {
  const slice = state.collisionBanner;
  if (slice === null || !slice.visible) {
    return {
      visible: false,
      conflictingSceneId: null,
      conflictingSceneTitle: null,
      originalTimestamp: null,
      proposedTimestamp: null,
      proposedTimestampDtg: null,
      offsetCount: 0,
      offsetCapReached: false,
      offsetWouldExceedTimeRange: false,
      cause: null,
    };
  }
  return {
    visible: true,
    conflictingSceneId: slice.conflictingSceneId,
    conflictingSceneTitle: slice.conflictingSceneTitle,
    originalTimestamp: slice.originalTimestamp,
    proposedTimestamp: slice.proposedTimestamp,
    proposedTimestampDtg: dtgFromIso(slice.proposedTimestamp),
    offsetCount: slice.offsetCount,
    offsetCapReached: slice.offsetCount >= OFFSET_CAP,
    offsetWouldExceedTimeRange: slice.offsetWouldExceedTimeRange,
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
  readonly setNamingRowText: (text: string) => void;
  readonly requestNamingRowConfirm: () => void;
  readonly requestNamingRowCancel: () => void;
  readonly requestCollisionReplace: (conflictingSceneId: string) => void;
  readonly requestCollisionOffset: () => void;
  readonly requestCollisionCancel: () => void;
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

  const setNamingRowText = useCallback((text: string): void => {
    dispatch({ type: 'naming-row-text-changed', text });
  }, []);

  const requestNamingRowConfirm = useCallback((): void => {
    dispatch({ type: 'naming-row-confirm-requested' });
  }, []);

  const requestNamingRowCancel = useCallback((): void => {
    dispatch({ type: 'naming-row-cancel-requested' });
  }, []);

  const requestCollisionReplace = useCallback(
    (conflictingSceneId: string): void => {
      dispatch({ type: 'collision-replace-requested', conflictingSceneId });
    },
    [],
  );

  const requestCollisionOffset = useCallback((): void => {
    dispatch({ type: 'collision-offset-requested' });
  }, []);

  const requestCollisionCancel = useCallback((): void => {
    dispatch({ type: 'collision-cancel-requested' });
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
    setNamingRowText,
    requestNamingRowConfirm,
    requestNamingRowCancel,
    requestCollisionReplace,
    requestCollisionOffset,
    requestCollisionCancel,
  };
}
