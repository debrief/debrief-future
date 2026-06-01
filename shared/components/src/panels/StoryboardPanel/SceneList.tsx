/**
 * Renders the list of Scene rows for the active Storyboard (Feature 216).
 * Prepends a pending row when `captureInFlight` is true.
 *
 * Per-Scene editing is no longer inline — the ⋯ overflow menu's "Edit" item
 * (and a double-click shortcut) opens a `SceneEditDialog` rendered by the
 * parent `StoryboardPanel`. This list only renders rows + the stale badge.
 */

import React from 'react';
import { SceneRow } from './SceneRow';
import { StaleBadge } from './StaleBadge';
import { OverlapBadge } from './OverlapBadge';
import type { SceneEditViewModel, SceneRowViewModel } from './types';

export interface SceneListProps {
  readonly scenes: readonly SceneRowViewModel[];
  readonly captureInFlight: boolean;
  /** ID of the current transport scene — that row gets `data-active="true"`. */
  readonly currentSceneId?: string | null;
  onSceneRowClick(sceneId: string): void;

  // ── edit-suite view-models (drive stale badge + dialog-open marker) ──
  readonly sceneEditViewModels?: Readonly<Record<string, SceneEditViewModel>>;
  onSceneRefreshThumbnailClicked?(sceneId: string): void;

  // ── row affordances (panel-driven) ───────────────────────────────
  /** Opens the per-Scene edit dialog (double-click shortcut). */
  onSceneRowExpandToggle?(sceneId: string): void;
  onSceneOverflowMenuOpen?(sceneId: string, anchorRect: DOMRect): void;

  // ── #271 overlap warning dismissal ────────────────────────────────
  onSceneOverlapDismiss?(sceneId: string, partnerSceneIds: readonly string[]): void;
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
  onSceneRefreshThumbnailClicked,
  onSceneRowExpandToggle,
  onSceneOverflowMenuOpen,
  onSceneOverlapDismiss,
}: SceneListProps): React.ReactElement {
  return (
    // 234 US3 fix (FR-022): role="list" was rejected by axe-core
    // (aria-required-children — critical) because the list interleaves
    // SceneRows with StaleBadge and SceneEditForm overlays, which are
    // not listitems. Drop the ARIA list semantics; the wrapper stays
    // a plain div with data-testid for tests + the existing keyboard
    // nav + accessible-name pattern on each row.
    <div
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
            {/* #271 overlap badge — kept. The inline SceneEditForm that
                main still renders here was replaced on this branch by the
                SceneEditDialog (opened by the parent), so it is intentionally
                not rendered inline. */}
            {editVm?.overlapsWith !== undefined &&
              editVm.overlapsWith.length > 0 && (
                <OverlapBadge
                  sceneId={scene.sceneId}
                  overlapsWith={editVm.overlapsWith}
                  onDismiss={(): void =>
                    onSceneOverlapDismiss?.(
                      scene.sceneId,
                      editVm.overlapsWith!.map((p) => p.sceneId),
                    )
                  }
                />
              )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
