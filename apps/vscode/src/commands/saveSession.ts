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
 * Write plot thumbnails by delegating to the host-agnostic StacWriter.
 *
 * Spec 242 closure of Article IV.1 — saveSession is a frontend command, so
 * it must orchestrate persistence through the writer interface rather than
 * touching the filesystem itself. The earlier (spec 241) `plotThumbnailWriter.ts`
 * shim has been deleted; the FS-backed adaptor (`stacWriterFs`) now owns the
 * write path and produces the spec-241 STAC 1.1 shape authoritatively.
 */
async function storeThumbnails(
  writer: StacWriter,
  plotUri: string,
  largePngBase64: string,
  smallPngBase64: string,
): Promise<void> {
  const parsed = parseStacUri(plotUri);
  if (!parsed) {
    return;
  }
  await writer.writePlotThumbnailPair({
    ctx: { kind: 'fs', nowMs: () => Date.now(), randomId: () => '' },
    stacItemPath: parsed.itemPath,
    largePngBase64,
    smallPngBase64,
  });
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

    // Feature 261 (FR-009/FR-010): write exactly features.geojson. The current
    // view-state (viewport, time window/playhead, selection) is upserted as
    // SystemState features and per-feature visibility is set, then the whole
    // FeatureCollection is written. NO `.debrief-session` sidecar is written.
    //
    // FR-013/FR-021: visibility transitions are recorded on the affected
    // feature's own provenance, bounded to this saved state — passing the actor
    // makes `applyStateToFeatures` append a visibility-change LogEntry to every
    // feature whose visibility differs from the on-disk FeatureCollection.
    try {
      const features = applyStateToFeatures(mapPanel.getCurrentFeatures(), state, {
        actor: sessionManager.actor,
      });
      storeFeatureCollection(storePath, plotUri, features);
    } catch (err) {
      void vscode.window.showErrorMessage(
        `Failed to save plot: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    // The plot is now persisted; clear the dirty flag.
    session.getState().markClean();
    void vscode.window.showInformationMessage('Plot saved');

    // Capture thumbnails after successful save (#174)
    if (getStacWriter) {
      try {
        const { largePngBase64, smallPngBase64 } = await mapPanel.requestThumbnailCapture(5000);
        if (largePngBase64 && smallPngBase64) {
          const writer = getStacWriter(storePath);
          await storeThumbnails(writer, plotUri, largePngBase64, smallPngBase64);
        }
      } catch (err) {
        // Article I.3 — service-write failures must surface; capture
        // failures (non-StacWriterError) remain best-effort.
        if (err instanceof StacWriterError) {
          void vscode.window.showErrorMessage(`Thumbnail save failed: ${err.message}`);
        } else {
          console.warn('[debrief] Thumbnail capture failed (non-blocking):', err);
        }
      }
    }
  };
}
