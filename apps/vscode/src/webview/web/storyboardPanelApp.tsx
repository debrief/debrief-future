/**
 * Reusable Storyboard webview app (Features 216 + 217 + 218 + 230 + 235).
 *
 * Extracted from the former standalone `storyboardPanel.tsx` entry so it can
 * be embedded as the 5th "Storyboard" section of the Activity webview (UX
 * review: flatten the Debrief sidebar into a single list of collapsible
 * sections). It mounts the presentational `<StoryboardPanel/>` and wires its
 * handlers to VS Code's `postMessage` channel via `useStoryboardEditReducer`.
 *
 * Unlike the old entry, this module does NOT call `acquireVsCodeApi()` or
 * mount a React root — the host (`activityPanel.tsx`) owns the single
 * `acquireVsCodeApi()` instance and React root, and passes the API in. This
 * keeps a single VS Code API per webview (calling `acquireVsCodeApi()` twice
 * throws).
 */

import { useCallback, useEffect } from 'react';
import { useStoryboardEditReducer } from '@debrief/components';
import type {
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
  SceneEditViewModel,
  StoryboardEditViewModel,
  UndoToastDescriptor,
  StaleFlagEntry,
  NamingRowPushState,
  CollisionBannerPushState,
  StoryboardPanelProps,
} from '@debrief/components';

export interface StoryboardPanelVsCodeApi {
  postMessage(message: unknown): void;
}

interface ScenesMessage {
  type: 'scenes';
  scenes: SceneRowViewModel[];
  activeStoryboardName: string | null;
  activeStoryboardId: string | null;
  sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
  pendingUndoToast?: UndoToastDescriptor | null;
  storyboardEditViewModel?: StoryboardEditViewModel | null;
  namingRow?: NamingRowPushState | null;
  collisionBanner?: CollisionBannerPushState | null;
}

interface CaptureInFlightMessage {
  type: 'captureInFlight';
  inFlight: boolean;
}

interface ThemeMessage {
  type: 'theme';
  theme: 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark';
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
  namingRow?: NamingRowPushState | null;
  collisionBanner?: CollisionBannerPushState | null;
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

/**
 * Builds the live {@link StoryboardPanelProps} bundle for the VS Code host:
 * runs the edit reducer, processes inbound extension messages, and wires every
 * callback to `postMessage`. The shared `ActivityPanel` renders the actual
 * `<StoryboardPanel>` from these props (Storyboard is a child section of the
 * Activity panel, like Tools / Layers / Properties).
 */
export function useStoryboardPanelProps(
  vscode: StoryboardPanelVsCodeApi,
): StoryboardPanelProps {
  const {
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
              namingRow: msg.namingRow,
              collisionBanner: msg.collisionBanner,
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
              namingRow: msg.namingRow,
              collisionBanner: msg.collisionBanner,
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
  }, [dispatch, vscode]);

  const onCaptureClick = useCallback(() => {
    vscode.postMessage({ type: 'capture-clicked' });
  }, [vscode]);

  const onSceneRowClick = useCallback(
    (sceneId: string) => {
      vscode.postMessage({ type: 'scene-row-clicked', sceneId });
    },
    [vscode],
  );

  // #273 — live preview of the active storyboard. The active id travels
  // with the message so the host previews exactly what the panel shows.
  const activeStoryboardId = state.activeStoryboardId;
  const onPreview = useCallback(() => {
    if (activeStoryboardId === null) return;
    vscode.postMessage({
      type: 'preview-clicked',
      storyboardId: activeStoryboardId,
    });
  }, [activeStoryboardId, vscode]);

  const onTransportForward = useCallback(() => {
    vscode.postMessage({ type: 'transport-forward-clicked' });
  }, [vscode]);

  const onTransportBackward = useCallback(() => {
    vscode.postMessage({ type: 'transport-backward-clicked' });
  }, [vscode]);

  const onActiveStoryboardChange = useCallback(
    (storyboardId: string) => {
      vscode.postMessage({ type: 'active-storyboard-changed', storyboardId });
    },
    [vscode],
  );

  const onCreateStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'create-storyboard-requested' });
  }, [vscode]);

  const onRenameStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'rename-storyboard-requested' });
  }, [vscode]);

  const onDeleteStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'delete-storyboard-requested' });
  }, [vscode]);

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
    [closeEditForm, vscode],
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
    [closeEditForm, vscode],
  );

  const onSceneDeleteRequested = useCallback(
    (sceneId: string) => {
      vscode.postMessage({ type: 'scene-delete-requested', sceneId });
    },
    [vscode],
  );

  const onSceneUndoDeleteClicked = useCallback(
    (sceneId: string) => {
      vscode.postMessage({ type: 'scene-undo-delete-clicked', sceneId });
    },
    [vscode],
  );

  const onSceneUpdateToCurrentClicked = useCallback(
    (sceneId: string) => {
      vscode.postMessage({ type: 'scene-update-to-current-clicked', sceneId });
    },
    [vscode],
  );

  const onSceneDuplicateClicked = useCallback(
    (sceneId: string) => {
      vscode.postMessage({ type: 'scene-duplicate-clicked', sceneId });
    },
    [vscode],
  );

  const onSceneCopyToOtherClicked = useCallback(
    (sceneId: string) => {
      vscode.postMessage({ type: 'scene-copy-to-other-clicked', sceneId });
    },
    [vscode],
  );

  const onSceneRefreshThumbnailClicked = useCallback(
    (sceneId: string) => {
      vscode.postMessage({ type: 'scene-refresh-thumbnail-clicked', sceneId });
    },
    [vscode],
  );

  const onStoryboardRefreshAllStaleClicked = useCallback(
    (storyboardId: string) => {
      vscode.postMessage({
        type: 'storyboard-refresh-all-stale-clicked',
        storyboardId,
      });
    },
    [vscode],
  );

  const onStoryboardNameRenameCommit = useCallback(
    (storyboardId: string, newName: string) => {
      vscode.postMessage({
        type: 'storyboard-name-rename-committed',
        storyboardId,
        newName,
      });
    },
    [vscode],
  );

  const onStoryboardDescriptionSubmit = useCallback(
    (storyboardId: string, description: string | null) => {
      vscode.postMessage({
        type: 'storyboard-description-edit-submitted',
        storyboardId,
        description,
      });
    },
    [vscode],
  );

  // ─── #235 — naming row + collision banner handlers ───────────────────
  const onNamingRowTextChanged = useCallback(
    (pendingName: string) => setNamingRowPendingName(pendingName),
    [setNamingRowPendingName],
  );

  const onNamingRowConfirm = useCallback(() => {
    const slice = state.namingRow;
    if (slice === null || !slice.visible) return;
    vscode.postMessage({
      type: 'naming-row-confirm',
      name: slice.pendingName.trim(),
    });
  }, [state.namingRow, vscode]);

  const onNamingRowCancel = useCallback(() => {
    vscode.postMessage({ type: 'naming-row-cancel' });
  }, [vscode]);

  const onCollisionReplace = useCallback(
    (conflictingSceneId: string) => {
      vscode.postMessage({ type: 'collision-replace', conflictingSceneId });
    },
    [vscode],
  );

  const onCollisionOffset = useCallback(() => {
    vscode.postMessage({ type: 'collision-offset' });
  }, [vscode]);

  const onCollisionCancel = useCallback(() => {
    vscode.postMessage({ type: 'collision-cancel' });
  }, [vscode]);

  // #271 — overlap warning dismissal.
  const onSceneOverlapDismiss = useCallback(
    (sceneId: string, partnerSceneIds: readonly string[]) => {
      vscode.postMessage({
        type: 'scene-overlap-dismiss',
        sceneId,
        partnerSceneIds,
      });
    },
    [vscode],
  );

  return {
    scenes: state.sceneRows,
    activeStoryboardName: state.activeStoryboardName,
    captureInFlight: state.captureInFlight,
    onCaptureClick,
    onSceneRowClick,
    onPreview,
    canPreview:
      state.activeStoryboardId !== null && state.sceneRows.length > 0,
    storyboards:
      state.storyboards.length > 0 ? state.storyboards : undefined,
    activeStoryboardId: state.activeStoryboardId,
    currentSceneId: state.currentSceneId,
    transport: state.transport,
    onTransportForward,
    onTransportBackward,
    onActiveStoryboardChange,
    onCreateStoryboard,
    onRenameStoryboard,
    onDeleteStoryboard,
    sceneEditViewModels,
    storyboardEditViewModel: state.storyboardEditViewModel ?? undefined,
    pendingUndoToast: state.pendingUndoToast,
    overflowMenuOpenFor: state.overflowMenuOpenFor,
    overflowMenuAnchorRect: state.overflowMenuAnchorRect,
    onSceneRowExpandToggle,
    onSceneOverflowMenuOpen: openOverflowMenu,
    onSceneOverflowMenuClose: closeOverflowMenu,
    onSceneEditFormCancel,
    onSceneTitleRenameCommit,
    onSceneDescriptionSubmit,
    onSceneDeleteRequested,
    onSceneUndoDeleteClicked,
    onSceneUpdateToCurrentClicked,
    onSceneDuplicateClicked,
    onSceneCopyToOtherClicked,
    onSceneRefreshThumbnailClicked,
    onStoryboardRefreshAllStaleClicked,
    onStoryboardNameRenameCommit,
    onStoryboardDescriptionSubmit,
    onUndoToastDismiss: dismissUndoToast,
    namingRowViewModel,
    collisionBannerViewModel,
    onNamingRowTextChanged,
    onNamingRowConfirm,
    onNamingRowCancel,
    onCollisionReplace,
    onCollisionOffset,
    onCollisionCancel,
    onSceneOverlapDismiss,
  };
}
}
