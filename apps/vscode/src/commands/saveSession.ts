/**
 * Save Session Command - Persist the plot to features.geojson
 *
 * Feature: 029-session-state-vscode (Phase 7)
 * Feature: 174-thumbnail-capture (thumbnail generation on save)
 * Feature: 261-session-state-systemstate (sidecar retired — all view-state now
 *   rides in features.geojson as SystemState features + per-feature `visible`
 *   flags; the `.debrief-session` sidecar write is gone).
 *
 * Saves the current plot — geographic/storyboard features plus the analyst's
 * view-state (viewport, time window/playhead, selection) and per-feature
 * visibility — into `features.geojson`. An explicit save persists the current
 * view regardless of the dirty flag (FR-020). After saving, captures map
 * thumbnails and stores them as STAC assets.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { RawGeoJSONFeatureCollection } from '@debrief/schemas';
import type { StacWriter } from '@debrief/stac-writer';
import { StacWriterError } from '@debrief/stac-writer';
import type { SessionManager } from '../services/sessionManager';
import type { MapPanel } from '../webview/mapPanel';
import { parseStacUri } from '../types/stac';
import { applyStateToFeatures, type FeatureLike } from '../services/systemStateBridge';

/**
 * Write the in-memory FeatureCollection back to `<item-dir>/features.geojson`.
 *
 * Captured Storyboard/Scene features (and any other in-session mutations)
 * live only in the MapPanel until this point — there is no separate
 * persistence path. Mirrors the eager write that `writeSceneThumbnail`
 * already does for scene PNGs so the two stay in sync after a save.
 */
export function storeFeatureCollection(
  storePath: string,
  plotUri: string,
  features: ReadonlyArray<FeatureLike>,
): void {
  const parsed = parseStacUri(plotUri);
  if (!parsed) {
    return;
  }
  const itemDir = path.join(storePath, path.dirname(parsed.itemPath));
  const featuresPath = path.join(itemDir, 'features.geojson');
  const fc = {
    type: 'FeatureCollection' as const,
    features,
  };
  fs.writeFileSync(featuresPath, `${JSON.stringify(fc, null, 2)}\n`);
}

/**
 * Create the save session command handler.
 *
 * @param sessionManager - The session manager service
 * @param getStorePath - Function to get the store path for a store ID
 * @param getMapPanel - Function to get the current MapPanel (for thumbnail capture)
 * @param getStacWriter - Factory returning a StacWriter for the supplied store path
 * @returns The command handler function
 */
export function createSaveSessionCommand(
  sessionManager: SessionManager,
  getStorePath: (storeId: string) => string | undefined,
  getMapPanel?: () => MapPanel | undefined,
  getStacWriter?: (storePath: string) => StacWriter,
): () => Promise<void> {
  return async () => {
    const session = sessionManager.getActiveSession();
    const plotUri = sessionManager.getActiveDocumentUri();

    if (!session || !plotUri) {
      void vscode.window.showWarningMessage('No plot open to save');
      return;
    }

    const state = session.getState();
    const parsed = parseStacUri(plotUri);
    const storePath = parsed ? getStorePath(parsed.storeId) : undefined;
    const mapPanel = getMapPanel?.();

    // Feature 261 (FR-020): an explicit save persists the current view
    // REGARDLESS of the dirty flag — view-state changes (pan/zoom/scrub/select/
    // hide) are exploration and never raise dirty (FR-019), but the analyst can
    // still commit a view they have only looked at. No early-return on !dirty.
    if (!mapPanel || !parsed || !storePath) {
      void vscode.window.showWarningMessage('Cannot save: no writable plot context');
      return;
    }

    // Feature 261 (FR-009/FR-010): the FeatureCollection IS the plot. The
    // current view-state (viewport, time window/playhead, selection) is
    // upserted as SystemState features and per-feature visibility is set; the
    // whole collection is then committed. NO `.debrief-session` sidecar.
    let features: ReturnType<typeof applyStateToFeatures>;
    try {
      features = applyStateToFeatures(mapPanel.getCurrentFeatures(), state);
    } catch (err) {
      void vscode.window.showErrorMessage(
        `Failed to save plot: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    // Legacy fallback when no writer is wired (e.g. a minimal host). This is
    // the pre-#268 non-atomic path and has no thumbnail/STAC-asset write.
    if (!getStacWriter) {
      try {
        storeFeatureCollection(storePath, plotUri, features);
      } catch (err) {
        void vscode.window.showErrorMessage(
          `Failed to save plot: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
      session.getState().markClean();
      void vscode.window.showInformationMessage('Plot saved');
      return;
    }

    // #268 — capture thumbnails BEFORE the commit so they ride in the same
    // atomic save unit. Thumbnail *capture* stays best-effort: a capture
    // failure simply omits `thumbnails` from the commit (the spec's "capture
    // is best-effort and may legitimately be skipped" edge case). A capture
    // *write* that begins is part of the atomic unit and obeys atomicity.
    let thumbnails: { largePngBase64: string; smallPngBase64: string } | undefined;
    try {
      const captured = await mapPanel.requestThumbnailCapture(5000);
      if (captured.largePngBase64 && captured.smallPngBase64) {
        thumbnails = {
          largePngBase64: captured.largePngBase64,
          smallPngBase64: captured.smallPngBase64,
        };
      }
    } catch (err) {
      console.warn('[debrief] Thumbnail capture failed (non-blocking):', err);
    }

    // #268 / FR-002/FR-004 — commit the whole save unit (feature collection +
    // the item-metadata it implies + thumbnails) atomically through the shared
    // persistence boundary. The raw `fs.writeFileSync` of features.geojson is
    // gone; the FC write is now on the boundary (Article IV.2).
    // `features` is the loose host boundary shape (SystemState features folded
    // in); commitPlotSave only serialises the collection, so we cross the
    // RFC-7946 parse boundary here.
    const featureCollection = {
      type: 'FeatureCollection' as const,
      features,
    } as unknown as RawGeoJSONFeatureCollection;

    try {
      const writer = getStacWriter(storePath);
      await writer.commitPlotSave({
        ctx: { kind: 'fs', nowMs: () => Date.now(), randomId: () => '' },
        stacItemPath: parsed.itemPath,
        featureCollection,
        thumbnails,
      });
    } catch (err) {
      // FR-005/FR-006 — a save that cannot fully commit is reported as a
      // failure; the dirty flag is left set so the analyst can retry, and the
      // previously-persisted version is untouched. We do NOT markClean here.
      void vscode.window.showErrorMessage(
        `Failed to save plot: ${err instanceof StacWriterError || err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    // FR-005 — only now, after every write of the save unit has committed, is
    // the dirty flag cleared and success shown.
    session.getState().markClean();
    void vscode.window.showInformationMessage('Plot saved');
  };
}
