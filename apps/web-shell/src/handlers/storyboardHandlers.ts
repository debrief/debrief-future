/**
 * Wired StoryboardPanel handlers for the web-shell live mount
 * (#235 — Phase 4 + Phase 5).
 *
 * Mirrors the VS Code panelView handler set: every panel callback
 * lands in #215's CRUD module against the live FeatureCollection
 * pulled from `App.tsx` state. Mutations push back via
 * `setFeatureCollection` and mark the session-state store dirty.
 *
 * Undo (FR-EDIT-003) — lightweight session-scoped buffer keyed by
 * sceneId. The full VS Code `storyboardEditService` undo path uses a
 * time-windowed buffer per documentUri; for the web-shell we keep
 * the last delete per sceneId in memory and route Undo through
 * `restoreScene` against the most-recently-buffered entry.
 */

import {
  renameStoryboard,
  deleteStoryboard,
  updateScene,
  deleteScene,
  duplicateScene,
  restoreScene,
  describeStoryboard,
  isSceneFeature,
  type StoryboardPlot,
  type SceneFeature,
} from '@debrief/components';
import { calculateViewportCenter } from '@debrief/utils';
import type { Feature, FeatureCollection } from 'geojson';
import type { SessionStoreApi } from '@debrief/session-state';
import {
  captureSceneThumbnail,
  getSceneThumbnailStore,
} from '../services/webSceneThumbnailAdapter';
import type { CapturePanelSurface } from '../services/webPanelHost';

type StoryboardPlotFeature = StoryboardPlot['features'][number];

function packagePlot(features: readonly Feature[]): StoryboardPlot {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    features: features as unknown as StoryboardPlotFeature[],
  };
}

function plotToFeatureCollection(plot: StoryboardPlot): FeatureCollection {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    features: plot.features as unknown as Feature[],
  };
}

interface DeletedSceneRecord {
  readonly scene: SceneFeature;
  readonly deletedAt: string;
}

/**
 * Builder for the wired handler set. Returned object is plain props ready
 * to spread onto `<StoryboardPanel>`.
 */
export interface StoryboardHandlersDeps {
  readonly sessionStore: SessionStoreApi;
  readonly getFeatureCollection: () => FeatureCollection;
  readonly setFeatureCollection: (fc: FeatureCollection) => void;
  readonly getMapContainer: () => HTMLElement | null;
  /** Panel surface for collision-banner round-trips during update-to-current. */
  readonly panelView: CapturePanelSurface;
  readonly actor: string;
  /** Surface a one-off non-blocking message to the user. Errors bubble here. */
  readonly notify: (message: string) => void;
  /** Optional: log entries for the Log panel can be written here. */
  readonly logError?: (line: string) => void;
}

export interface StoryboardHandlers {
  // Scene-level
  onSceneTitleRenameCommit(sceneId: string, newTitle: string): void;
  onSceneDescriptionSubmit(sceneId: string, description: string | null): void;
  onSceneDeleteRequested(sceneId: string): void;
  onSceneUndoDeleteClicked(sceneId: string): void;
  onSceneRefreshThumbnailClicked(sceneId: string): void;
  onSceneUpdateToCurrentClicked(sceneId: string): void;
  // Storyboard-level
  onStoryboardNameRenameCommit(storyboardId: string, newName: string): void;
  onStoryboardDescriptionSubmit(
    storyboardId: string,
    description: string | null,
  ): void;
  onDeleteStoryboard(storyboardId: string): void;
}

const stringifyError = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

export function createStoryboardHandlers(
  deps: StoryboardHandlersDeps,
): StoryboardHandlers {
  // Session-scoped undo buffer keyed by sceneId. The most recent delete
  // wins per scene; a Phase-4 follow-up can extend to FIFO if multiple
  // simultaneous undo toasts are needed.
  const undoBuffer = new Map<string, DeletedSceneRecord>();

  function findScene(sceneId: string): SceneFeature | null {
    const fc = deps.getFeatureCollection();
    for (const f of fc.features) {
      // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
      const t = f as unknown as Parameters<typeof isSceneFeature>[0];
      if (isSceneFeature(t) && t.properties.id === sceneId) {
        // eslint-disable-next-line no-restricted-syntax -- as above.
        return t as unknown as SceneFeature;
      }
    }
    return null;
  }

  async function applyAndPush(
    op: () => Promise<{ plot: StoryboardPlot }>,
    successMessage?: string,
  ): Promise<void> {
    try {
      const result = await op();
      deps.setFeatureCollection(plotToFeatureCollection(result.plot));
      deps.sessionStore.getState().markDirty();
      if (successMessage !== undefined) {
        deps.notify(successMessage);
      }
    } catch (err) {
      deps.logError?.(`[storyboardHandlers] op failed: ${stringifyError(err)}`);
      deps.notify(`Storyboard edit failed: ${stringifyError(err)}`);
    }
  }

  return {
    // ─── Scene-level ─────────────────────────────────────────────────

    onSceneTitleRenameCommit(sceneId: string, newTitle: string): void {
      const trimmed = newTitle.trim();
      if (trimmed === '') {
        deps.notify('Scene title cannot be empty.');
        return;
      }
      void applyAndPush(async () => {
        const plot = packagePlot(deps.getFeatureCollection().features);
        return updateScene(plot, {
          sceneId,
          patch: { title: trimmed },
          actor: deps.actor,
        });
      });
    },

    onSceneDescriptionSubmit(
      sceneId: string,
      description: string | null,
    ): void {
      void applyAndPush(async () => {
        const plot = packagePlot(deps.getFeatureCollection().features);
        return updateScene(plot, {
          sceneId,
          patch: { description: description ?? '' },
          actor: deps.actor,
        });
      });
    },

    onSceneDeleteRequested(sceneId: string): void {
      const scene = findScene(sceneId);
      if (scene === null) return;
      // Buffer the deleted scene for undo *before* mutating.
      undoBuffer.set(sceneId, {
        scene,
        deletedAt: new Date().toISOString(),
      });
      void applyAndPush(async () => {
        const plot = packagePlot(deps.getFeatureCollection().features);
        return deleteScene(plot, { sceneId, actor: deps.actor });
      });
    },

    onSceneUndoDeleteClicked(sceneId: string): void {
      const buffered = undoBuffer.get(sceneId);
      if (buffered === undefined) {
        deps.notify('Cannot restore — undo window has expired.');
        return;
      }
      const { scene } = buffered;
      undoBuffer.delete(sceneId);
      void applyAndPush(async () => {
        const plot = packagePlot(deps.getFeatureCollection().features);
        return restoreScene(plot, {
          storyboardId: scene.properties.storyboard_id,
          viewport: scene.properties.viewport,
          timestamp: scene.properties.timestamp,
          visibleFeatureIds: [...scene.properties.visible_feature_ids],
          thumbnailAssetRef: scene.properties.thumbnail_asset_ref,
          actor: deps.actor,
          idOverride: scene.properties.id,
          // RestoreSceneInput requires the pre-delete provenance trail
          // (including the `{op:"delete"}` tail entry). The buffered
          // scene snapshot was taken *before* the delete CRUD call,
          // so it doesn't carry that tail entry. Use the snapshot's
          // provenance as-is — #215's restoreScene appends a fresh
          // `{op:"restore"}` entry, preserving the audit trail.
          preservedProvenance: scene.properties.provenance ?? [],
        });
      });
    },

    onSceneRefreshThumbnailClicked(sceneId: string): void {
      const container = deps.getMapContainer();
      if (container === null) {
        deps.notify('Refresh failed — map element not available.');
        return;
      }
      void (async (): Promise<void> => {
        try {
          await captureSceneThumbnail(container, sceneId);
          // The thumbnail store fires its own subscribers; the rail
          // re-renders automatically. No FeatureCollection mutation
          // is needed because the asset ref on the Scene Feature is
          // unchanged (web-shell stores by sceneId, not by hash).
          getSceneThumbnailStore(); // ensure module is referenced
          deps.notify('Thumbnail refreshed.');
        } catch (err) {
          deps.logError?.(
            `[storyboardHandlers] refresh thumbnail failed: ${stringifyError(err)}`,
          );
          deps.notify(
            'Refresh failed — could not produce thumbnail. Existing thumbnail kept.',
          );
        }
      })();
    },

    /**
     * T060 — Update Scene to current viewport / time / visibility.
     *
     * Reads the live session-state, builds a partial UpdateScenePatch
     * with the new viewport / timestamp / visibleFeatureIds /
     * thumbnailAssetRef, calls #215's `updateScene`. If the new
     * timestamp collides with another Scene in the same Storyboard,
     * routes through the same panel collision banner the capture
     * command uses (FR-MAINT-019 + reused banner).
     */
    onSceneUpdateToCurrentClicked(sceneId: string): void {
      const scene = findScene(sceneId);
      if (scene === null) {
        deps.notify('Update failed — scene no longer exists.');
        return;
      }
      const sessionState = deps.sessionStore.getState();
      const viewport = sessionState.viewport;
      const currentTime = sessionState.currentTime;
      const timeRange = sessionState.timeRange;
      if (viewport === null || viewport.zoom === undefined) {
        deps.notify(
          'Update failed — map has not reported a viewport yet.',
        );
        return;
      }
      if (currentTime === null) {
        deps.notify('Update failed — the time slider is not set.');
        return;
      }
      if (
        timeRange !== null &&
        (currentTime < timeRange.start || currentTime > timeRange.end)
      ) {
        deps.notify(
          "Update failed — time slider is outside this plot's time range.",
        );
        return;
      }
      const container = deps.getMapContainer();
      if (container === null) {
        deps.notify('Update failed — map element not available.');
        return;
      }
      const newTimestamp = new Date(currentTime).toISOString();
      const center = calculateViewportCenter(viewport);
      const newViewport = {
        center: [center.longitude, center.latitude] as [number, number],
        zoom: viewport.zoom,
        bearing: 0,
      };
      // Re-derive visible feature ids from the live hidden set + plot.
      const fc = deps.getFeatureCollection();
      const hidden = new Set(sessionState.hiddenFeatureIds);
      const visibleIds: string[] = [];
      for (const f of fc.features) {
        const props = f.properties as { id?: string | number | null } | null;
        const rawId = props?.id;
        if (typeof rawId !== 'string' || rawId.length === 0) continue;
        if (hidden.has(rawId)) continue;
        visibleIds.push(rawId);
      }

      void (async (): Promise<void> => {
        // Re-capture the thumbnail at the live map state.
        try {
          await captureSceneThumbnail(container, sceneId);
        } catch (err) {
          deps.logError?.(
            `[storyboardHandlers] update-to-current thumbnail failed: ${stringifyError(err)}`,
          );
          deps.notify(
            'Update failed — could not produce thumbnail. Scene not changed.',
          );
          return;
        }

        // #259 — updateScene no longer throws DuplicateTimestampError; the
        // update always succeeds at the timestamp level.
        const plot = packagePlot(deps.getFeatureCollection().features);
        try {
          const result = await updateScene(plot, {
            sceneId,
            patch: {
              viewport: newViewport,
              timestamp: newTimestamp,
              visibleFeatureIds: visibleIds,
              thumbnailAssetRef: `scene-thumbnail-${sceneId}`,
            },
            actor: deps.actor,
          });
          deps.setFeatureCollection(plotToFeatureCollection(result.plot));
          deps.sessionStore.getState().markDirty();
          deps.notify('Scene updated.');
        } catch (err) {
          deps.logError?.(
            `[storyboardHandlers] updateScene failed: ${stringifyError(err)}`,
          );
          deps.notify(`Update failed: ${stringifyError(err)}`);
        }
      })();
    },

    // ─── Storyboard-level ───────────────────────────────────────────

    onStoryboardNameRenameCommit(
      storyboardId: string,
      newName: string,
    ): void {
      const trimmed = newName.trim();
      if (trimmed === '') {
        deps.notify('Storyboard name cannot be empty.');
        return;
      }
      void applyAndPush(async () => {
        const plot = packagePlot(deps.getFeatureCollection().features);
        return renameStoryboard(plot, {
          storyboardId,
          newName: trimmed,
          actor: deps.actor,
        });
      });
    },

    onStoryboardDescriptionSubmit(
      storyboardId: string,
      description: string | null,
    ): void {
      void applyAndPush(async () => {
        const plot = packagePlot(deps.getFeatureCollection().features);
        return describeStoryboard(plot, {
          storyboardId,
          description: description ?? '',
          actor: deps.actor,
        });
      });
    },

    onDeleteStoryboard(storyboardId: string): void {
      // Confirmation is handled inline by the StoryboardPanel header's
      // two-step "Delete storyboard?" confirm before this fires, so the
      // cascade runs immediately here and surfaces the count via notify().
      // The undo path for cascade delete is tracked as a follow-up —
      // analysts who need it should re-import the plot from disk.
      void applyAndPush(async () => {
        const plot = packagePlot(deps.getFeatureCollection().features);
        const result = await deleteStoryboard(plot, {
          storyboardId,
          actor: deps.actor,
        });
        deps.notify(
          result.removedSceneIds.length === 0
            ? 'Storyboard deleted.'
            : `Storyboard + ${result.removedSceneIds.length} scene${
                result.removedSceneIds.length === 1 ? '' : 's'
              } deleted.`,
        );
        return { plot: result.plot };
      });
    },
  };

  // duplicateScene is exported by the CRUD module but the panel doesn't
  // directly call it — duplicate-scene flow goes through the inline
  // duplicate prompt (deferred). Reference here for tree-shaking visibility.
  void duplicateScene;
}
