/**
 * Webview entrypoint for the Storyboard panel (Features 216 + 217 + 218 + 230).
 *
 * Mounts the presentational `<StoryboardPanel/>` from `@debrief/components`
 * and wires its event handlers to VS Code's `postMessage` channel through
 * the shared `useStoryboardEditReducer` hook (feature 230). The hook is
 * the single source of truth for panel-local display state (which row's
 * edit form is open, which overflow menu is anchored where, inbound stale
 * flags, pending undo toasts).
 */

import React, { useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  StoryboardPanel,
  ThemeProvider,
  useStoryboardEditReducer,
} from '@debrief/components';
import type {
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
  SceneEditViewModel,
  StoryboardEditViewModel,
  Theme,
  UndoToastDescriptor,
  StaleFlagEntry,
} from '@debrief/components';

interface AcquiredVsCodeApi {
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): AcquiredVsCodeApi;

interface ScenesMessage {
  type: 'scenes';
  scenes: SceneRowViewModel[];
  activeStoryboardName: string | null;
  activeStoryboardId: string | null;
  sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
  pendingUndoToast?: UndoToastDescriptor | null;
  storyboardEditViewModel?: StoryboardEditViewModel | null;
}

interface CaptureInFlightMessage {
  type: 'captureInFlight';
  inFlight: boolean;
}

interface ThemeMessage {
  type: 'theme';
  theme: 'light' | 'dark' | 'vscode';
}

interface SnapshotMessage {
  type: 'snapshot';
  storyboards: readonly StoryboardOptionViewModel[];
  scenes: readonly SceneRowViewModel[];
  activeStoryboardId: string | null;
  activeStoryboardName: string | null;
  currentSceneId: string | null;
  transport: TransportViewModel;
  sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
  pendingUndoToast?: UndoToastDescriptor | null;
  storyboardEditViewModel?: StoryboardEditViewModel | null;
}

interface SceneEditFormOpenMessage {
  type: 'scene-edit-form-open';
  sceneId: string;
}

interface SceneStaleFlagsUpdatedMessage {
  type: 'scene-stale-flags-updated';
  flags: readonly StaleFlagEntry[];
}

interface SceneUndoToastShownMessage {
  type: 'scene-undo-toast-shown';
  toast: UndoToastDescriptor | null;
}

type ExtensionMessage =
  | ScenesMessage
  | CaptureInFlightMessage
  | ThemeMessage
  | SnapshotMessage
  | SceneEditFormOpenMessage
  | SceneStaleFlagsUpdatedMessage
  | SceneUndoToastShownMessage;

const vscode = acquireVsCodeApi();

function StoryboardPanelApp(): React.ReactElement {
  const {
    state,
    dispatch,
    sceneEditViewModels,
    toggleExpandRow,
    closeEditForm,
    openOverflowMenu,
    closeOverflowMenu,
    dismissUndoToast,
  } = useStoryboardEditReducer();

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>): void => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'scenes':
          dispatch({
            type: 'scenes-message',
            payload: {
              scenes: msg.scenes,
              activeStoryboardName: msg.activeStoryboardName,
              activeStoryboardId: msg.activeStoryboardId,
              sceneEditViewModels: msg.sceneEditViewModels,
              pendingUndoToast: msg.pendingUndoToast,
              storyboardEditViewModel: msg.storyboardEditViewModel,
            },
          });
          break;
        case 'snapshot':
          dispatch({
            type: 'snapshot-message',
            payload: {
              storyboards: msg.storyboards,
              scenes: msg.scenes,
              activeStoryboardId: msg.activeStoryboardId,
              activeStoryboardName: msg.activeStoryboardName,
              currentSceneId: msg.currentSceneId,
              transport: msg.transport,
              sceneEditViewModels: msg.sceneEditViewModels,
              pendingUndoToast: msg.pendingUndoToast,
              storyboardEditViewModel: msg.storyboardEditViewModel,
            },
          });
          break;
        case 'captureInFlight':
          dispatch({ type: 'capture-in-flight', inFlight: msg.inFlight });
          break;
        case 'theme':
          dispatch({ type: 'theme-changed', theme: msg.theme });
          break;
        case 'scene-edit-form-open':
          dispatch({ type: 'scene-edit-form-open', sceneId: msg.sceneId });
          break;
        case 'scene-stale-flags-updated':
          dispatch({ type: 'scene-stale-flags-updated', flags: msg.flags });
          break;
        case 'scene-undo-toast-shown':
          dispatch({ type: 'scene-undo-toast-shown', toast: msg.toast });
          break;
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, [dispatch]);

  const onCaptureClick = useCallback(() => {
    vscode.postMessage({ type: 'capture-clicked' });
  }, []);

  const onSceneRowClick = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'scene-row-clicked', sceneId });
  }, []);

  const onTransportForward = useCallback(() => {
    vscode.postMessage({ type: 'transport-forward-clicked' });
  }, []);

  const onTransportBackward = useCallback(() => {
    vscode.postMessage({ type: 'transport-backward-clicked' });
  }, []);

  const onActiveStoryboardChange = useCallback((storyboardId: string) => {
    vscode.postMessage({ type: 'active-storyboard-changed', storyboardId });
  }, []);

  const onCreateStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'create-storyboard-requested' });
  }, []);

  const onRenameStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'rename-storyboard-requested' });
  }, []);

  const onDeleteStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'delete-storyboard-requested' });
  }, []);

  // ─── #230 — edit-suite outbound postMessage handlers ─────────────
  const onSceneRowExpandToggle = useCallback(
    (sceneId: string) => toggleExpandRow(sceneId),
    [toggleExpandRow],
  );

  const onSceneEditFormCancel = useCallback(
    (_sceneId: string) => closeEditForm(),
    [closeEditForm],
  );

  const onSceneTitleRenameCommit = useCallback(
    (sceneId: string, newTitle: string) => {
      vscode.postMessage({
        type: 'scene-title-rename-committed',
        sceneId,
        newTitle,
      });
      closeEditForm();
    },
    [closeEditForm],
  );

  const onSceneDescriptionSubmit = useCallback(
    (sceneId: string, description: string | null) => {
      vscode.postMessage({
        type: 'scene-description-edit-submitted',
        sceneId,
        description,
      });
      closeEditForm();
    },
    [closeEditForm],
  );

  const onSceneDeleteRequested = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'scene-delete-requested', sceneId });
  }, []);

  const onSceneUndoDeleteClicked = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'scene-undo-delete-clicked', sceneId });
  }, []);

  const onSceneUpdateToCurrentClicked = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'scene-update-to-current-clicked', sceneId });
  }, []);

  const onSceneDuplicateClicked = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'scene-duplicate-clicked', sceneId });
  }, []);

  const onSceneCopyToOtherClicked = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'scene-copy-to-other-clicked', sceneId });
  }, []);

  const onSceneRefreshThumbnailClicked = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'scene-refresh-thumbnail-clicked', sceneId });
  }, []);

  const onStoryboardRefreshAllStaleClicked = useCallback(
    (storyboardId: string) => {
      vscode.postMessage({
        type: 'storyboard-refresh-all-stale-clicked',
        storyboardId,
      });
    },
    [],
  );

  const onStoryboardNameRenameCommit = useCallback(
    (storyboardId: string, newName: string) => {
      vscode.postMessage({
        type: 'storyboard-name-rename-committed',
        storyboardId,
        newName,
      });
    },
    [],
  );

  const onStoryboardDescriptionSubmit = useCallback(
    (storyboardId: string, description: string | null) => {
      vscode.postMessage({
        type: 'storyboard-description-edit-submitted',
        storyboardId,
        description,
      });
    },
    [],
  );

  const themeConfig: Theme = { variant: state.theme };

  return (
    <ThemeProvider theme={themeConfig}>
      <StoryboardPanel
        scenes={state.sceneRows}
        activeStoryboardName={state.activeStoryboardName}
        captureInFlight={state.captureInFlight}
        onCaptureClick={onCaptureClick}
        onSceneRowClick={onSceneRowClick}
        storyboards={
          state.storyboards.length > 0 ? state.storyboards : undefined
        }
        activeStoryboardId={state.activeStoryboardId}
        currentSceneId={state.currentSceneId}
        transport={state.transport}
        onTransportForward={onTransportForward}
        onTransportBackward={onTransportBackward}
        onActiveStoryboardChange={onActiveStoryboardChange}
        onCreateStoryboard={onCreateStoryboard}
        onRenameStoryboard={onRenameStoryboard}
        onDeleteStoryboard={onDeleteStoryboard}
        sceneEditViewModels={sceneEditViewModels}
        storyboardEditViewModel={state.storyboardEditViewModel ?? undefined}
        pendingUndoToast={state.pendingUndoToast}
        overflowMenuOpenFor={state.overflowMenuOpenFor}
        overflowMenuAnchorRect={state.overflowMenuAnchorRect}
        onSceneRowExpandToggle={onSceneRowExpandToggle}
        onSceneOverflowMenuOpen={openOverflowMenu}
        onSceneOverflowMenuClose={closeOverflowMenu}
        onSceneEditFormCancel={onSceneEditFormCancel}
        onSceneTitleRenameCommit={onSceneTitleRenameCommit}
        onSceneDescriptionSubmit={onSceneDescriptionSubmit}
        onSceneDeleteRequested={onSceneDeleteRequested}
        onSceneUndoDeleteClicked={onSceneUndoDeleteClicked}
        onSceneUpdateToCurrentClicked={onSceneUpdateToCurrentClicked}
        onSceneDuplicateClicked={onSceneDuplicateClicked}
        onSceneCopyToOtherClicked={onSceneCopyToOtherClicked}
        onSceneRefreshThumbnailClicked={onSceneRefreshThumbnailClicked}
        onStoryboardRefreshAllStaleClicked={
          onStoryboardRefreshAllStaleClicked
        }
        onStoryboardNameRenameCommit={onStoryboardNameRenameCommit}
        onStoryboardDescriptionSubmit={onStoryboardDescriptionSubmit}
        onUndoToastDismiss={dismissUndoToast}
      />
    </ThemeProvider>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<StoryboardPanelApp />);
}
