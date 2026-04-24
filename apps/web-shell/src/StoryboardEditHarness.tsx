/**
 * Storyboard edit harness page (Feature 230 US4).
 *
 * Drop-in browser surface that mounts `<StoryboardPanel>` against the
 * shared `useStoryboardEditReducer` hook + an in-memory mock extension
 * port, with initial state driven by URL search params so Playwright
 * can set up deterministic scenarios (stale flags, pending deletes,
 * missing-data rows) without a VS Code host.
 *
 * Supported query-string knobs:
 *   ?stale=sceneA,sceneC        — mark those Scenes stale on mount
 *   ?pendingDelete=sceneB       — mark that Scene pending-delete
 *   ?missingData=sceneC:f1,f2   — attach a missing-data descriptor
 *
 * Mock port parity: the port accepts every outbound action defined in
 * `contracts/postmessage-contract.md` and mirrors observable effects
 * via inbound reducer dispatches. It also records every outbound
 * message on `window.__harnessOutbound__` so Playwright can assert
 * against the outbound stream.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  StoryboardPanel,
  ThemeProvider,
  useStoryboardEditReducer,
} from '@debrief/components';
import type {
  Theme,
  SceneEditViewModel,
  StaleFlagEntry,
  UndoToastDescriptor,
} from '@debrief/components';
import {
  DEFAULT_STORYBOARD_EDIT_FIXTURE,
  type StoryboardEditFixture,
} from './storyboard-edit-fixtures';
import {
  parseHarnessQueryString,
  EMPTY_HARNESS_INITIAL as EMPTY_INITIAL,
  type StoryboardEditHarnessInitialState,
} from './storyboard-edit-harness-querystring';
export { parseHarnessQueryString };
export type { StoryboardEditHarnessInitialState };

/**
 * Apply the initial state to the fixture's SceneEditViewModel dict,
 * returning a derived dict the reducer's `sceneEditViewModels` field
 * should mirror from the first scenes-message.
 */
function applyInitialState(
  fixture: StoryboardEditFixture,
  initial: StoryboardEditHarnessInitialState,
): {
  sceneEditViewModels: Readonly<Record<string, SceneEditViewModel>>;
  staleFlags: readonly StaleFlagEntry[];
} {
  // Baseline VMs carry stale:false — the staleFlags message is the sole
  // source of truth for stale state (data-model §E3 — `staleFlags` is a
  // full-replacement inbound). Carrying `stale: true` on both the
  // baseline and the flag map leaves the baseline stuck in `stale` after
  // a refresh-all clears the map.
  const out: Record<string, SceneEditViewModel> = {};
  const staleFlags: StaleFlagEntry[] = [];
  for (const row of fixture.scenes) {
    const base = fixture.sceneEditViewModels[row.sceneId];
    const pendingDelete = initial.pendingDeleteSceneIds.includes(row.sceneId);
    const missingIds = initial.missingDataBySceneId[row.sceneId];
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
    if (initial.staleSceneIds.includes(row.sceneId)) {
      staleFlags.push({
        sceneId: row.sceneId,
        stale: true,
        unresolvedFeatureIds: ['track-alpha', 'track-bravo'],
      });
    }
  }
  return { sceneEditViewModels: out, staleFlags };
}

interface OutboundRecord {
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: number;
}

// Make the outbound message capture available on window for Playwright.
declare global {
  // eslint-disable-next-line no-var
  var __harnessOutbound__: OutboundRecord[] | undefined;
}

export interface StoryboardEditHarnessProps {
  readonly fixture?: StoryboardEditFixture;
  readonly initial?: StoryboardEditHarnessInitialState;
}

export function StoryboardEditHarness({
  fixture = DEFAULT_STORYBOARD_EDIT_FIXTURE,
  initial = EMPTY_INITIAL,
}: StoryboardEditHarnessProps): React.ReactElement {
  const reducer = useStoryboardEditReducer();
  const { state, dispatch, sceneEditViewModels, openOverflowMenu, closeOverflowMenu, dismissUndoToast } = reducer;
  const appliedInitialRef = useRef(false);

  // Seed initial state once on mount.
  useEffect(() => {
    if (appliedInitialRef.current) return;
    appliedInitialRef.current = true;
    const { sceneEditViewModels: seededVms, staleFlags } = applyInitialState(
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
          canGoBackward: false,
          canGoForward: true,
          sceneNumber: 1,
          sceneTotal: fixture.scenes.length,
          transitionInFlight: false,
        },
        sceneEditViewModels: seededVms,
        pendingUndoToast: null,
        storyboardEditViewModel: fixture.storyboardEditViewModel,
      },
    });
    if (staleFlags.length > 0) {
      dispatch({ type: 'scene-stale-flags-updated', flags: staleFlags });
    }
  }, [fixture, initial, dispatch]);

  // Shared outbound recorder — captures what the VS Code extension would
  // receive. Used by Playwright to assert against the message stream.
  const recordOutbound = useMemo(() => {
    if (typeof window !== 'undefined' && !globalThis.__harnessOutbound__) {
      globalThis.__harnessOutbound__ = [];
    }
    return (type: string, payload: Record<string, unknown>): void => {
      if (typeof window === 'undefined') return;
      globalThis.__harnessOutbound__?.push({
        type,
        payload,
        timestamp: Date.now(),
      });
    };
  }, []);

  // Simulate the extension acknowledging a delete by emitting the undo
  // toast descriptor back. A real extension would do this via postMessage.
  const simulateDelete = (sceneId: string): void => {
    recordOutbound('scene-delete-requested', { sceneId });
    const scene = state.sceneRows.find((s) => s.sceneId === sceneId);
    if (!scene) return;
    const toast: UndoToastDescriptor = {
      sceneId,
      sceneTitle: scene.title,
      deletedAt: new Date().toISOString(),
      canUndo: true,
    };
    dispatch({ type: 'scene-undo-toast-shown', toast });
    // Drop the row from the list — mimic the extension's post-delete
    // refresh by sending a scenes-message with the scene omitted.
    const nextScenes = state.sceneRows.filter((s) => s.sceneId !== sceneId);
    dispatch({
      type: 'scenes-message',
      payload: {
        scenes: nextScenes,
        activeStoryboardName: state.activeStoryboardName,
        activeStoryboardId: state.activeStoryboardId,
      },
    });
  };

  // Simulate undo — restore the deleted row by posting the original
  // scenes-message fixture and clearing the toast.
  const simulateUndo = (sceneId: string): void => {
    recordOutbound('scene-undo-delete-clicked', { sceneId });
    dispatch({ type: 'scene-undo-toast-shown', toast: null });
    dispatch({
      type: 'scenes-message',
      payload: {
        scenes: fixture.scenes,
        activeStoryboardName: fixture.activeStoryboardName,
        activeStoryboardId: fixture.activeStoryboardId,
      },
    });
  };

  // Simulate thumbnail refresh — clears the stale flag for the scene.
  const simulateRefresh = (sceneId: string): void => {
    recordOutbound('scene-refresh-thumbnail-clicked', { sceneId });
    // Keep other stale flags, drop this one.
    const nextFlags: StaleFlagEntry[] = [];
    for (const [id, flag] of state.staleFlags.entries()) {
      if (id !== sceneId) nextFlags.push(flag);
    }
    dispatch({ type: 'scene-stale-flags-updated', flags: nextFlags });
  };

  const simulateRefreshAllStale = (storyboardId: string): void => {
    recordOutbound('storyboard-refresh-all-stale-clicked', { storyboardId });
    dispatch({ type: 'scene-stale-flags-updated', flags: [] });
  };

  const handleOutboundOnly = (
    type: string,
    payload: Record<string, unknown>,
  ): void => {
    recordOutbound(type, payload);
  };

  const themeConfig: Theme = { variant: state.theme };

  return (
    <ThemeProvider theme={themeConfig}>
      <div
        data-testid="storyboard-edit-harness"
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--vscode-sideBar-background, #1e1e1e)',
          color: 'var(--vscode-foreground, #cccccc)',
        }}
      >
        <div style={{ width: 420, maxWidth: '100%', height: '100%' }}>
          <StoryboardPanel
            scenes={state.sceneRows}
            activeStoryboardName={state.activeStoryboardName}
            captureInFlight={false}
            onCaptureClick={(): void => handleOutboundOnly('capture-clicked', {})}
            onSceneRowClick={(sceneId): void =>
              handleOutboundOnly('scene-row-clicked', { sceneId })
            }
            storyboards={
              state.storyboards.length > 0 ? state.storyboards : undefined
            }
            activeStoryboardId={state.activeStoryboardId}
            currentSceneId={state.currentSceneId}
            transport={state.transport}
            onActiveStoryboardChange={(storyboardId): void =>
              handleOutboundOnly('active-storyboard-changed', { storyboardId })
            }
            onCreateStoryboard={(): void =>
              handleOutboundOnly('create-storyboard-requested', {})
            }
            onRenameStoryboard={(): void =>
              handleOutboundOnly('rename-storyboard-requested', {})
            }
            onDeleteStoryboard={(): void =>
              handleOutboundOnly('delete-storyboard-requested', {})
            }
            sceneEditViewModels={sceneEditViewModels}
            storyboardEditViewModel={state.storyboardEditViewModel ?? undefined}
            pendingUndoToast={state.pendingUndoToast}
            overflowMenuOpenFor={state.overflowMenuOpenFor}
            overflowMenuAnchorRect={state.overflowMenuAnchorRect}
            onSceneRowExpandToggle={(sceneId): void =>
              dispatch({ type: 'expand-row-toggle', sceneId })
            }
            onSceneOverflowMenuOpen={openOverflowMenu}
            onSceneOverflowMenuClose={closeOverflowMenu}
            onSceneEditFormCancel={(): void =>
              dispatch({ type: 'scene-edit-form-close' })
            }
            onSceneTitleRenameCommit={(sceneId, newTitle): void => {
              recordOutbound('scene-title-rename-committed', {
                sceneId,
                newTitle,
              });
              dispatch({ type: 'scene-edit-form-close' });
            }}
            onSceneDescriptionSubmit={(sceneId, description): void => {
              recordOutbound('scene-description-edit-submitted', {
                sceneId,
                description,
              });
              dispatch({ type: 'scene-edit-form-close' });
            }}
            onSceneDeleteRequested={simulateDelete}
            onSceneUndoDeleteClicked={simulateUndo}
            onSceneUpdateToCurrentClicked={(sceneId): void =>
              recordOutbound('scene-update-to-current-clicked', { sceneId })
            }
            onSceneDuplicateClicked={(sceneId): void =>
              recordOutbound('scene-duplicate-clicked', { sceneId })
            }
            onSceneCopyToOtherClicked={(sceneId): void =>
              recordOutbound('scene-copy-to-other-clicked', { sceneId })
            }
            onSceneRefreshThumbnailClicked={simulateRefresh}
            onStoryboardRefreshAllStaleClicked={simulateRefreshAllStale}
            onStoryboardNameRenameCommit={(storyboardId, newName): void =>
              recordOutbound('storyboard-name-rename-committed', {
                storyboardId,
                newName,
              })
            }
            onStoryboardDescriptionSubmit={(storyboardId, description): void =>
              recordOutbound('storyboard-description-edit-submitted', {
                storyboardId,
                description,
              })
            }
            onUndoToastDismiss={dismissUndoToast}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}
