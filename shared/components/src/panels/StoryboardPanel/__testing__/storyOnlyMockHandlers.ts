/**
 * Shared story-only / harness-only mock handlers helper for the Storyboard
 * edit suite (Feature 234, US1 — FR-001/-002/-003 + ADR-027).
 *
 * Single behavioural source of truth: the four edit-suite Storybook
 * stories AND the web-shell harness import this helper. It owns the
 * reducer wiring + the "extension acknowledgement" simulations
 * (delete → undo toast, refresh → clear stale, etc.) so the four stories
 * become live walkthroughs of the polish loop without each story
 * re-implementing the wiring.
 *
 * **Architecture (post-ADR-027): callback adapter, not port.** This helper
 * does NOT introduce a `PortContext` or an `OutboundMessage` discriminated
 * union. `<StoryboardPanel>` stays purely presentational — its existing
 * callback-prop surface is the test seam. The helper returns
 * `{state, dispatch, handlers}` where `handlers` is a
 * `Pick<StoryboardPanelProps, ...>` spread directly onto the panel:
 *
 *     const { state, handlers } = useStoryOnlyMockHandlers(fixture, opts);
 *     return <StoryboardPanel {...stateProps} {...handlers} />;
 *
 * Knobs (`induceCopyFailure`, `induceRefreshFailure`) deterministically
 * route matching sceneIds through the failure branch — see
 * contracts/harness-knobs.md §2 for the full per-handler table.
 *
 * Constraints (contracts/harness-knobs.md §2):
 *   - Synchronous only: no setTimeout, no Promise.then deferral.
 *   - In-memory only: no window.postMessage, no cross-frame APIs.
 *   - No app-layer imports — this helper lives in shared/components/ and
 *     must not pull from apps/web-shell/ or apps/vscode/.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useStoryboardEditReducer,
  type StaleFlagEntry,
  type StoryboardEditAction,
  type StoryboardEditReducerState,
  type UndoToastDescriptor,
} from '../useStoryboardEditReducer';
import type {
  SceneEditViewModel,
  SceneRowViewModel,
  StoryboardEditViewModel,
  StoryboardOptionViewModel,
  StoryboardPanelProps,
  TransportViewModel,
} from '../types';

// ── Public types ────────────────────────────────────────────────────────

/**
 * Failure-injection knobs. Both fields are optional + independent. When
 * either is set, the matching sceneId routes through the failure branch
 * of the corresponding handler (see contracts/harness-knobs.md §2).
 *
 * Type retained as `MockPortKnobs` (rather than e.g. `MockHandlerKnobs`)
 * for continuity with the URL-knob contract in §1 of the same document
 * and the spec's existing references to this name. Post-ADR-027 there is
 * no port; the type name is a vestigial label, not an architectural claim.
 */
export interface MockPortKnobs {
  /** Route this sceneId's copy-to-other dispatch to the rollback branch. */
  readonly induceCopyFailure?: string;
  /** Route this sceneId's refresh-thumbnail / refresh-all-stale dispatch
   *  to the per-Scene failure branch. */
  readonly induceRefreshFailure?: string;
}

/**
 * The handler subset of `StoryboardPanelProps` the helper wires. Composed
 * via `Pick<>` so adding a new callback to `StoryboardPanelProps`
 * surfaces here as a TS compile error (helper must implement it).
 *
 * Required-only: each entry below MUST be implemented. Optional callbacks
 * on the panel that this helper does not own (e.g. `onActiveStoryboardChange`,
 * transport callbacks) are NOT part of this surface — callers wire those
 * directly.
 */
export type MockHandlers = Required<
  Pick<
    StoryboardPanelProps,
    | 'onCaptureClick'
    | 'onSceneRowClick'
    | 'onSceneRowExpandToggle'
    | 'onSceneOverflowMenuOpen'
    | 'onSceneOverflowMenuClose'
    | 'onSceneEditFormCancel'
    | 'onSceneTitleRenameCommit'
    | 'onSceneDescriptionSubmit'
    | 'onSceneDeleteRequested'
    | 'onSceneUndoDeleteClicked'
    | 'onSceneUpdateToCurrentClicked'
    | 'onSceneDuplicateClicked'
    | 'onSceneCopyToOtherClicked'
    | 'onSceneRefreshThumbnailClicked'
    | 'onStoryboardRefreshAllStaleClicked'
    | 'onStoryboardNameRenameCommit'
    | 'onStoryboardDescriptionSubmit'
    | 'onUndoToastDismiss'
  >
>;

/**
 * Fixture shape consumed by the helper. The web-shell harness's
 * `StoryboardEditFixture` matches this shape; stories construct one
 * inline.
 */
export interface MockHandlersFixture {
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly activeStoryboardId: string;
  readonly activeStoryboardName: string;
  readonly scenes: readonly SceneRowViewModel[];
  readonly sceneEditViewModels: Readonly<
    Record<string, SceneEditViewModel>
  >;
  readonly storyboardEditViewModel: StoryboardEditViewModel;
}

/**
 * Optional initial-state overlay applied on mount. Used by the harness
 * to honour URL knobs (`?stale=A,B`, `?pendingDelete=X`, `?missingData=...`).
 * Stories typically pass nothing.
 */
export interface MockHandlersInitial {
  readonly staleSceneIds?: readonly string[];
  readonly pendingDeleteSceneIds?: readonly string[];
  readonly missingDataBySceneId?: Readonly<Record<string, readonly string[]>>;
}

/** Outbound recorder used by the harness for Playwright assertions. */
export type MockOutboundRecorder = (
  type: string,
  payload: Record<string, unknown>,
) => void;

export interface UseStoryOnlyMockHandlersOptions {
  readonly knobs?: MockPortKnobs;
  readonly initial?: MockHandlersInitial;
  readonly recordOutbound?: MockOutboundRecorder;
}

export interface MockHandlersHandle {
  readonly state: StoryboardEditReducerState;
  readonly dispatch: (action: StoryboardEditAction) => void;
  readonly sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
  readonly handlers: MockHandlers;
}

// ── Internals ───────────────────────────────────────────────────────────

const DEFAULT_TRANSPORT: TransportViewModel = {
  canGoBackward: false,
  canGoForward: false,
  sceneNumber: 0,
  sceneTotal: 0,
  transitionInFlight: false,
};

/**
 * Apply the optional initial overlay to the fixture's
 * `sceneEditViewModels`, returning a derived dict + the matching
 * `staleFlags` to seed via `scene-stale-flags-updated`.
 *
 * Mirrors the harness's existing `applyInitialState` semantics, but
 * lives in the helper so stories share the path.
 */
function applyInitialOverlay(
  fixture: MockHandlersFixture,
  initial: MockHandlersInitial,
): {
  sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
  staleFlags: readonly StaleFlagEntry[];
} {
  const stale = initial.staleSceneIds ?? [];
  const pending = initial.pendingDeleteSceneIds ?? [];
  const missing = initial.missingDataBySceneId ?? {};
  const out: Record<string, SceneEditViewModel> = {};
  const staleFlags: StaleFlagEntry[] = [];
  for (const row of fixture.scenes) {
    const base = fixture.sceneEditViewModels[row.sceneId];
    const pendingDelete = pending.includes(row.sceneId);
    const missingIds = missing[row.sceneId];
    const missingData =
      missingIds && missingIds.length > 0
        ? ({ kind: 'missing-features' as const, ids: missingIds })
        : base?.missingData ?? ({ kind: 'ok' as const });
    out[row.sceneId] = {
      sceneId: row.sceneId,
      title: base?.title ?? row.title,
      description: base?.description ?? null,
      timestamp: base?.timestamp ?? row.timestampIso,
      titleIsEditing: false,
      editFormOpen: false,
      pendingDelete,
      stale: false,
      unresolvedFeatureIds: [],
      missingData,
    };
    if (stale.includes(row.sceneId)) {
      staleFlags.push({
        sceneId: row.sceneId,
        stale: true,
        unresolvedFeatureIds: ['track-alpha', 'track-bravo'],
      });
    }
  }
  return { sceneEditViewModels: out, staleFlags };
}

// ── Public hook ─────────────────────────────────────────────────────────

/**
 * Wire the StoryboardPanel callback surface to the reducer + a small
 * "extension acknowledgement" simulation layer, returning the spread
 * for the panel.
 */
export function useStoryOnlyMockHandlers(
  fixture: MockHandlersFixture,
  options: UseStoryOnlyMockHandlersOptions = {},
): MockHandlersHandle {
  const reducer = useStoryboardEditReducer();
  const {
    state,
    dispatch,
    sceneEditViewModels,
    openOverflowMenu,
    closeOverflowMenu,
    dismissUndoToast,
  } = reducer;

  const knobs = options.knobs ?? {};
  const initial = options.initial ?? {};
  const recordOutbound = options.recordOutbound ?? noopRecorder;

  // Hold a live ref to the latest state so the simulation closures don't
  // capture a stale snapshot. (Reducer return is referentially stable
  // across renders, but state is not.)
  const stateRef = useRef(state);
  stateRef.current = state;

  const fixtureRef = useRef(fixture);
  fixtureRef.current = fixture;

  const knobsRef = useRef(knobs);
  knobsRef.current = knobs;

  const recordRef = useRef(recordOutbound);
  recordRef.current = recordOutbound;

  // Seed initial state once on mount.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const { sceneEditViewModels: seededVms, staleFlags } = applyInitialOverlay(
      fixture,
      initial,
    );
    dispatch({
      type: 'snapshot-message',
      payload: {
        storyboards: fixture.storyboards,
        scenes: fixture.scenes,
        activeStoryboardId: fixture.activeStoryboardId,
        activeStoryboardName: fixture.activeStoryboardName,
        currentSceneId: null,
        transport: {
          ...DEFAULT_TRANSPORT,
          sceneTotal: fixture.scenes.length,
          canGoForward: fixture.scenes.length > 1,
        },
        sceneEditViewModels: seededVms,
        pendingUndoToast: null,
        storyboardEditViewModel: fixture.storyboardEditViewModel,
      },
    });
    if (staleFlags.length > 0) {
      dispatch({ type: 'scene-stale-flags-updated', flags: staleFlags });
    }
    // Run-once on mount; subsequent prop changes don't re-seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Simulation handlers ────────────────────────────────────────────

  const simulateDelete = useCallback((sceneId: string): void => {
    recordRef.current('scene-delete-requested', { sceneId });
    const scene = stateRef.current.sceneRows.find((s) => s.sceneId === sceneId);
    if (!scene) return;
    const toast: UndoToastDescriptor = {
      sceneId,
      sceneTitle: scene.title,
      deletedAt: new Date().toISOString(),
      canUndo: true,
    };
    dispatch({ type: 'scene-undo-toast-shown', toast });
    const nextScenes = stateRef.current.sceneRows.filter(
      (s) => s.sceneId !== sceneId,
    );
    dispatch({
      type: 'scenes-message',
      payload: {
        scenes: nextScenes,
        activeStoryboardName: stateRef.current.activeStoryboardName,
        activeStoryboardId: stateRef.current.activeStoryboardId,
      },
    });
  }, [dispatch]);

  const simulateUndo = useCallback((sceneId: string): void => {
    recordRef.current('scene-undo-delete-clicked', { sceneId });
    dispatch({ type: 'scene-undo-toast-shown', toast: null });
    dispatch({
      type: 'scenes-message',
      payload: {
        scenes: fixtureRef.current.scenes,
        activeStoryboardName: fixtureRef.current.activeStoryboardName,
        activeStoryboardId: fixtureRef.current.activeStoryboardId,
      },
    });
  }, [dispatch]);

  const simulateRefresh = useCallback((sceneId: string): void => {
    // FR-043: per-scene refresh-failure knob.
    if (knobsRef.current.induceRefreshFailure === sceneId) {
      recordRef.current('scene-refresh-failed', { sceneId });
      // Failure branch — keep the stale flag (no clear).
      return;
    }
    recordRef.current('scene-refresh-thumbnail-clicked', { sceneId });
    const nextFlags: StaleFlagEntry[] = [];
    for (const [id, flag] of stateRef.current.staleFlags.entries()) {
      if (id !== sceneId) nextFlags.push(flag);
    }
    dispatch({ type: 'scene-stale-flags-updated', flags: nextFlags });
  }, [dispatch]);

  const simulateRefreshAllStale = useCallback((storyboardId: string): void => {
    // FR-043: bulk refresh partial-failure — any scene matching the knob
    // retains its stale flag; the rest clear. Mirrors the spec's
    // "bulk refresh partial failure" scenario.
    const failureSceneId = knobsRef.current.induceRefreshFailure;
    if (failureSceneId !== undefined) {
      recordRef.current('storyboard-refresh-all-stale-partial-failure', {
        storyboardId,
        failedSceneIds: [failureSceneId],
      });
      const nextFlags: StaleFlagEntry[] = [];
      for (const [id, flag] of stateRef.current.staleFlags.entries()) {
        if (id === failureSceneId) {
          nextFlags.push(flag);
        }
      }
      dispatch({ type: 'scene-stale-flags-updated', flags: nextFlags });
      return;
    }
    recordRef.current('storyboard-refresh-all-stale-clicked', { storyboardId });
    dispatch({ type: 'scene-stale-flags-updated', flags: [] });
  }, [dispatch]);

  const simulateCopyToOther = useCallback((sceneId: string): void => {
    // FR-043: copy-to-other deep-copy failure knob.
    if (knobsRef.current.induceCopyFailure === sceneId) {
      recordRef.current('scene-copy-to-other-failed', { sceneId });
      return;
    }
    recordRef.current('scene-copy-to-other-clicked', { sceneId });
  }, []);

  // ── Outbound-only handlers (no state change) ───────────────────────

  const recordOnly = useCallback(
    (type: string, payload: Record<string, unknown>): void => {
      recordRef.current(type, payload);
    },
    [],
  );

  // ── The handlers spread ────────────────────────────────────────────

  const handlers: MockHandlers = useMemo(
    () => ({
      onCaptureClick: () => recordOnly('capture-clicked', {}),
      onSceneRowClick: (sceneId) =>
        recordOnly('scene-row-clicked', { sceneId }),
      onSceneRowExpandToggle: (sceneId) =>
        dispatch({ type: 'expand-row-toggle', sceneId }),
      onSceneOverflowMenuOpen: openOverflowMenu,
      onSceneOverflowMenuClose: closeOverflowMenu,
      onSceneEditFormCancel: () =>
        dispatch({ type: 'scene-edit-form-close' }),
      onSceneTitleRenameCommit: (sceneId, newTitle) => {
        recordOnly('scene-title-rename-committed', { sceneId, newTitle });
        // Mirror what the extension would do: close the form, persist via
        // a synthesised scenes-message that updates the row's title.
        const nextScenes = stateRef.current.sceneRows.map((s) =>
          s.sceneId === sceneId ? { ...s, title: newTitle } : s,
        );
        const nextEditVms: Record<string, SceneEditViewModel> = {};
        for (const [id, vm] of Object.entries(
          stateRef.current.sceneEditViewModelsFromExtension,
        )) {
          nextEditVms[id] = id === sceneId ? { ...vm, title: newTitle } : vm;
        }
        dispatch({ type: 'scene-edit-form-close' });
        dispatch({
          type: 'scenes-message',
          payload: {
            scenes: nextScenes,
            activeStoryboardName: stateRef.current.activeStoryboardName,
            activeStoryboardId: stateRef.current.activeStoryboardId,
            sceneEditViewModels: nextEditVms,
          },
        });
      },
      onSceneDescriptionSubmit: (sceneId, description) => {
        recordOnly('scene-description-edit-submitted', {
          sceneId,
          description,
        });
        const nextEditVms: Record<string, SceneEditViewModel> = {};
        for (const [id, vm] of Object.entries(
          stateRef.current.sceneEditViewModelsFromExtension,
        )) {
          nextEditVms[id] =
            id === sceneId ? { ...vm, description } : vm;
        }
        dispatch({ type: 'scene-edit-form-close' });
        dispatch({
          type: 'scenes-message',
          payload: {
            scenes: stateRef.current.sceneRows,
            activeStoryboardName: stateRef.current.activeStoryboardName,
            activeStoryboardId: stateRef.current.activeStoryboardId,
            sceneEditViewModels: nextEditVms,
          },
        });
      },
      onSceneDeleteRequested: simulateDelete,
      onSceneUndoDeleteClicked: simulateUndo,
      onSceneUpdateToCurrentClicked: (sceneId) =>
        recordOnly('scene-update-to-current-clicked', { sceneId }),
      onSceneDuplicateClicked: (sceneId) =>
        recordOnly('scene-duplicate-clicked', { sceneId }),
      onSceneCopyToOtherClicked: simulateCopyToOther,
      onSceneRefreshThumbnailClicked: simulateRefresh,
      onStoryboardRefreshAllStaleClicked: simulateRefreshAllStale,
      onStoryboardNameRenameCommit: (storyboardId, newName) =>
        recordOnly('storyboard-name-rename-committed', {
          storyboardId,
          newName,
        }),
      onStoryboardDescriptionSubmit: (storyboardId, description) =>
        recordOnly('storyboard-description-edit-submitted', {
          storyboardId,
          description,
        }),
      onUndoToastDismiss: dismissUndoToast,
    }),
    [
      dispatch,
      openOverflowMenu,
      closeOverflowMenu,
      dismissUndoToast,
      simulateDelete,
      simulateUndo,
      simulateRefresh,
      simulateRefreshAllStale,
      simulateCopyToOther,
      recordOnly,
    ],
  );

  return { state, dispatch, sceneEditViewModels, handlers };
}

function noopRecorder(): void {
  // intentional no-op — stories don't need outbound capture
}
