/**
 * Renders the list of Scene rows for the active Storyboard (Feature 216).
 * Prepends a pending row when `captureInFlight` is true. Feature 218
 * additions: renders `<SceneEditForm>` inline beneath a row when
 * `sceneEditViewModels[sceneId]?.editFormOpen === true`.
 */

import React from 'react';
import { SceneRow } from './SceneRow';
import { SceneEditForm } from './SceneEditForm';
import { StaleBadge } from './StaleBadge';
import type { SceneEditViewModel, SceneRowViewModel } from './types';

export interface SceneListProps {
  readonly scenes: readonly SceneRowViewModel[];
  readonly captureInFlight: boolean;
  /** ID of the current transport scene — that row gets `data-active="true"`. */
  readonly currentSceneId?: string | null;
  onSceneRowClick(sceneId: string): void;

  // ── #218 edit-suite optional props (panel-driven) ────────────────
  readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
  onSceneTitleRenameCommit?(sceneId: string, newTitle: string): void;
  onSceneDescriptionSubmit?(sceneId: string, description: string | null): void;
  onSceneDeleteRequested?(sceneId: string): void;
  onSceneUpdateToCurrentClicked?(sceneId: string): void;
  onSceneDuplicateClicked?(sceneId: string): void;
  onSceneCopyToOtherClicked?(sceneId: string): void;
  onSceneRefreshThumbnailClicked?(sceneId: string): void;
  onSceneEditFormCancel?(sceneId: string): void;

  // ── #230 chevron + right-click affordances (panel-driven) ─────────
  onSceneRowExpandToggle?(sceneId: string): void;
  onSceneOverflowMenuOpen?(sceneId: string, anchorRect: DOMRect): void;
}

const PENDING_SCENE: SceneRowViewModel = {
  sceneId: '__capturing__',
  title: 'Capturing…',
  timestampIso: '',
  dtgLabel: 'Capturing…',
  thumbnailHref: '',
  state: { kind: 'pending' },
};

export function SceneList({
  scenes,
  captureInFlight,
  currentSceneId,
  onSceneRowClick,
  sceneEditViewModels,
  onSceneTitleRenameCommit,
  onSceneDescriptionSubmit,
  onSceneDeleteRequested,
  onSceneUpdateToCurrentClicked,
  onSceneDuplicateClicked,
  onSceneCopyToOtherClicked,
  onSceneRefreshThumbnailClicked,
  onSceneEditFormCancel,
  onSceneRowExpandToggle,
  onSceneOverflowMenuOpen,
}: SceneListProps): React.ReactElement {
  return (
    <div
      role="list"
      data-testid="scene-list"
      className="storyboard-scene-list"
      style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}
    >
      {captureInFlight && (
        <SceneRow scene={PENDING_SCENE} onClick={onSceneRowClick} />
      )}
      {scenes.map((scene) => {
        const editVm = sceneEditViewModels?.[scene.sceneId];
        // Rows flagged pendingDelete are hidden until the analyst acts
        // on the undo toast (#218 data-model §3 rendering rule).
        if (editVm?.pendingDelete) {
          return null;
        }
        return (
          <React.Fragment key={scene.sceneId}>
            <SceneRow
              scene={scene}
              active={currentSceneId === scene.sceneId}
              editFormOpen={editVm?.editFormOpen ?? false}
              onClick={onSceneRowClick}
              onExpandToggle={onSceneRowExpandToggle}
              onOverflowMenuOpen={onSceneOverflowMenuOpen}
            />
            {editVm?.stale && (
              <StaleBadge
                sceneId={scene.sceneId}
                unresolvedFeatureIds={editVm.unresolvedFeatureIds}
                onRefreshThumbnail={(): void =>
                  onSceneRefreshThumbnailClicked?.(scene.sceneId)
                }
              />
            )}
            {editVm?.editFormOpen && (
              <SceneEditForm
                sceneId={scene.sceneId}
                title={editVm.title}
                description={editVm.description}
                timestamp={editVm.timestamp}
                missingData={editVm.missingData}
                onTitleRenameCommit={(newTitle): void =>
                  onSceneTitleRenameCommit?.(scene.sceneId, newTitle)
                }
                onDescriptionSubmit={(description): void =>
                  onSceneDescriptionSubmit?.(scene.sceneId, description)
                }
                onUpdateToCurrent={(): void =>
                  onSceneUpdateToCurrentClicked?.(scene.sceneId)
                }
                onDuplicate={(): void =>
                  onSceneDuplicateClicked?.(scene.sceneId)
                }
                onCopyToOther={(): void =>
                  onSceneCopyToOtherClicked?.(scene.sceneId)
                }
                onDelete={(): void => onSceneDeleteRequested?.(scene.sceneId)}
                onRefreshThumbnail={(): void =>
                  onSceneRefreshThumbnailClicked?.(scene.sceneId)
                }
                onCancel={(): void => onSceneEditFormCancel?.(scene.sceneId)}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
