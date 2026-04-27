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
  | { readonly type: 'overflow-menu-close' };

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

export interface StoryboardEditReducerHandle {
  readonly state: StoryboardEditReducerState;
  readonly dispatch: (action: StoryboardEditAction) => void;
  readonly sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
  // Convenience dispatchers for the webview/harness to wire handlers
  readonly toggleExpandRow: (sceneId: string) => void;
  readonly closeEditForm: () => void;
  readonly openOverflowMenu: (sceneId: string, anchorRect: DOMRect) => void;
  readonly closeOverflowMenu: () => void;
  readonly dismissUndoToast: () => void;
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

  const sceneEditViewModels = composeSceneEditViewModels(state);

  return {
    state,
    dispatch,
    sceneEditViewModels,
    toggleExpandRow,
    closeEditForm,
    openOverflowMenu,
    closeOverflowMenu,
    dismissUndoToast,
  };
}
