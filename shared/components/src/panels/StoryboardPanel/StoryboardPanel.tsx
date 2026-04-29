/**
 * Storyboard panel — Scene list (#216) + transport row (#217) + edit
 * suite (#218) + in-panel row affordances (#230).
 *
 * #230 adds:
 *   - SceneRow chevron + double-click + right-click triggers (FR-001..3).
 *   - SceneOverflowMenu rendered at document level when
 *     `overflowMenuOpenFor !== null` (US2).
 *   - Refresh-all-stale affordance on the Storyboard header when there
 *     are ≥1 stale Scene (FR-012).
 *   - Panel-local single-edit-form invariant via the shared reducer.
 *
 * No VS Code imports; theming flows through the existing `ThemeProvider`
 * tokens so the panel works unmodified in Storybook.
 */

import React, { useMemo } from 'react';
import { SceneList } from './SceneList';
import { TransportRow } from './TransportRow';
import { StoryboardHeader } from './StoryboardHeader';
import { UndoToast } from './UndoToast';
import { NamingRow } from './NamingRow';
import { CollisionBanner } from './CollisionBanner';
import {
  SceneOverflowMenu,
  type SceneOverflowAction,
  type SceneOverflowMenuItem,
} from './SceneOverflowMenu';
import type { StoryboardPanelProps } from './types';

const EMPTY_STATE_COPY = 'No storyboards yet.';

const EMPTY_STORYBOARD_COPY =
  'No Scenes yet. Press Ctrl/Cmd+Alt+C on the map to capture one.';

const OVERFLOW_MENU_ITEMS: readonly SceneOverflowMenuItem[] = [
  { id: 'edit-description', label: 'Edit description' },
  { id: 'update-to-current', label: 'Update to current' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'copy-to-other', label: 'Copy to other storyboard' },
  { id: 'delete', label: 'Delete' },
  { id: 'refresh-thumbnail', label: 'Refresh thumbnail' },
];

export function StoryboardPanel({
  scenes,
  activeStoryboardName,
  captureInFlight,
  onCaptureClick,
  onSceneRowClick,
  storyboards,
  activeStoryboardId,
  currentSceneId,
  transport,
  onActiveStoryboardChange,
  onCreateStoryboard,
  onRenameStoryboard,
  onDeleteStoryboard,
  onTransportForward,
  onTransportBackward,
  // #218 edit-suite optional props
  sceneEditViewModels,
  pendingUndoToast,
  onSceneTitleRenameCommit,
  onSceneDescriptionSubmit,
  onSceneDeleteRequested,
  onSceneUndoDeleteClicked,
  onSceneUpdateToCurrentClicked,
  onSceneDuplicateClicked,
  onSceneCopyToOtherClicked,
  onSceneRefreshThumbnailClicked,
  onStoryboardRefreshAllStaleClicked,
  // #230 panel-local display state + event wiring
  overflowMenuOpenFor,
  overflowMenuAnchorRect,
  onSceneRowExpandToggle,
  onSceneOverflowMenuOpen,
  onSceneOverflowMenuClose,
  onSceneEditFormCancel,
  onUndoToastDismiss,
  // #235 first-capture naming row + collision banner
  namingRowViewModel,
  collisionBannerViewModel,
  onNamingRowTextChanged,
  onNamingRowConfirm,
  onNamingRowCancel,
  onCollisionReplace,
  onCollisionOffset,
  onCollisionCancel,
}: StoryboardPanelProps): React.ReactElement {
  const isEmptyNoStoryboard =
    activeStoryboardName === null && scenes.length === 0 && !captureInFlight;
  const isEmptyStoryboard =
    activeStoryboardName !== null && scenes.length === 0 && !captureInFlight;
  const sceneCount = scenes.length;
  const hasStoryboards = storyboards !== undefined && storyboards.length > 0;

  const staleCount = useMemo(() => {
    if (!sceneEditViewModels) return 0;
    let n = 0;
    for (const vm of Object.values(sceneEditViewModels)) {
      if (vm.stale) n += 1;
    }
    return n;
  }, [sceneEditViewModels]);

  const activeOverflowSceneTitle = useMemo(() => {
    if (overflowMenuOpenFor == null) return '';
    return (
      scenes.find((s) => s.sceneId === overflowMenuOpenFor)?.title ?? ''
    );
  }, [overflowMenuOpenFor, scenes]);

  const handleOverflowAction = (
    action: SceneOverflowAction,
    sceneId: string,
  ): void => {
    switch (action) {
      case 'edit-description':
        onSceneRowExpandToggle?.(sceneId);
        break;
      case 'update-to-current':
        onSceneUpdateToCurrentClicked?.(sceneId);
        break;
      case 'duplicate':
        onSceneDuplicateClicked?.(sceneId);
        break;
      case 'copy-to-other':
        onSceneCopyToOtherClicked?.(sceneId);
        break;
      case 'delete':
        onSceneDeleteRequested?.(sceneId);
        break;
      case 'refresh-thumbnail':
        onSceneRefreshThumbnailClicked?.(sceneId);
        break;
    }
  };

  return (
    <div
      data-testid="storyboard-panel"
      className="storyboard-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <header
        className="storyboard-panel__header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderBottom: '1px solid var(--vscode-panel-border, #3c3c3c)',
          gap: 8,
        }}
      >
        <div
          className="storyboard-panel__title"
          style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
        >
          <span
            data-testid="storyboard-name"
            style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {activeStoryboardName ?? 'Storyboard'}
          </span>
          {activeStoryboardName !== null && (
            <span
              data-testid="storyboard-scene-count"
              style={{ fontSize: 11, opacity: 0.7 }}
            >
              {sceneCount === 1 ? '1 scene' : `${sceneCount} scenes`}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {staleCount > 0 &&
            activeStoryboardId !== undefined &&
            activeStoryboardId !== null &&
            onStoryboardRefreshAllStaleClicked && (
              <button
                type="button"
                data-testid="refresh-all-stale"
                aria-label={`Refresh all stale scenes (${staleCount})`}
                onClick={(): void =>
                  onStoryboardRefreshAllStaleClicked(activeStoryboardId)
                }
                style={{ padding: '4px 10px' }}
              >
                {`Refresh all stale (${staleCount})`}
              </button>
            )}
          <button
            type="button"
            data-testid="capture-button"
            aria-label="Capture scene"
            onClick={onCaptureClick}
            className="storyboard-panel__capture"
            style={{ padding: '4px 10px' }}
          >
            Capture
          </button>
        </div>
      </header>

      {hasStoryboards && onActiveStoryboardChange && (
        <StoryboardHeader
          storyboards={storyboards!}
          activeStoryboardId={activeStoryboardId ?? null}
          onActiveStoryboardChange={onActiveStoryboardChange}
          onCreateStoryboard={onCreateStoryboard}
          onRenameStoryboard={onRenameStoryboard}
          onDeleteStoryboard={onDeleteStoryboard}
        />
      )}

      {namingRowViewModel?.visible &&
        onNamingRowTextChanged &&
        onNamingRowConfirm &&
        onNamingRowCancel && (
          <NamingRow
            viewModel={namingRowViewModel}
            onTextChange={onNamingRowTextChanged}
            onConfirm={onNamingRowConfirm}
            onCancel={onNamingRowCancel}
          />
        )}

      {collisionBannerViewModel?.visible &&
        onCollisionReplace &&
        onCollisionOffset &&
        onCollisionCancel && (
          <CollisionBanner
            viewModel={collisionBannerViewModel}
            onReplace={onCollisionReplace}
            onOffset={onCollisionOffset}
            onCancel={onCollisionCancel}
          />
        )}

      {isEmptyNoStoryboard ? (
        <div
          data-testid="storyboard-empty-state"
          className="storyboard-panel__empty"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 16,
            textAlign: 'center',
            opacity: 0.9,
          }}
        >
          <span>{EMPTY_STATE_COPY}</span>
          <button
            type="button"
            data-testid="capture-scene-button"
            aria-label="Capture scene"
            onClick={onCaptureClick}
            onKeyDown={(e): void => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCaptureClick();
              }
            }}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Capture Scene
          </button>
        </div>
      ) : isEmptyStoryboard ? (
        <div
          data-testid="storyboard-empty-storyboard"
          className="storyboard-panel__empty-storyboard"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            textAlign: 'center',
            opacity: 0.8,
          }}
        >
          {EMPTY_STORYBOARD_COPY}
        </div>
      ) : (
        <div
          className="storyboard-panel__body"
          style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
        >
          <SceneList
            scenes={scenes}
            captureInFlight={captureInFlight}
            currentSceneId={currentSceneId ?? null}
            onSceneRowClick={onSceneRowClick}
            sceneEditViewModels={sceneEditViewModels}
            onSceneTitleRenameCommit={onSceneTitleRenameCommit}
            onSceneDescriptionSubmit={onSceneDescriptionSubmit}
            onSceneDeleteRequested={onSceneDeleteRequested}
            onSceneUpdateToCurrentClicked={onSceneUpdateToCurrentClicked}
            onSceneDuplicateClicked={onSceneDuplicateClicked}
            onSceneCopyToOtherClicked={onSceneCopyToOtherClicked}
            onSceneRefreshThumbnailClicked={onSceneRefreshThumbnailClicked}
            onSceneEditFormCancel={onSceneEditFormCancel}
            onSceneRowExpandToggle={onSceneRowExpandToggle}
            onSceneOverflowMenuOpen={onSceneOverflowMenuOpen}
          />
        </div>
      )}

      {transport && (
        <TransportRow
          transport={transport}
          onForwardClick={onTransportForward ?? ((): void => undefined)}
          onBackwardClick={onTransportBackward ?? ((): void => undefined)}
        />
      )}

      {pendingUndoToast && (
        <UndoToast
          state={pendingUndoToast}
          onUndo={(): void =>
            onSceneUndoDeleteClicked?.(pendingUndoToast.sceneId)
          }
          onDismiss={(): void => onUndoToastDismiss?.()}
        />
      )}

      {overflowMenuOpenFor != null &&
        overflowMenuAnchorRect != null &&
        onSceneOverflowMenuClose && (
          <SceneOverflowMenu
            sceneId={overflowMenuOpenFor}
            anchorRect={overflowMenuAnchorRect}
            items={OVERFLOW_MENU_ITEMS}
            ariaLabel={`Actions for scene ${activeOverflowSceneTitle}`}
            onAction={handleOverflowAction}
            onClose={onSceneOverflowMenuClose}
          />
        )}
    </div>
  );
}
