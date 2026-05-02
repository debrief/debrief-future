/**
 * Save Session Command - Persist session state to a .debrief-session file
 *
 * Feature: 029-session-state-vscode (Phase 7)
 * Feature: 174-thumbnail-capture (thumbnail generation on save)
 *
 * Saves the current session state (viewport, selection, time, visibility)
 * to a file adjacent to the plot data file. After saving, captures map
 * thumbnails and stores them as STAC assets.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { saveSession, type SessionStoreWithUndo } from '@debrief/session-state';
import type { DebriefFeature } from '@debrief/components';
import type { SessionManager } from '../services/sessionManager';
import type { MapPanel } from '../webview/mapPanel';
import { parseStacUri } from '../types/stac';
import { writePlotThumbnails } from '../services/plotThumbnailWriter';

/**
 * Derive a session file path from a plot URI.
 *
 * For a plot at stac://store/catalog/item.json,
 * creates path like: /path/to/store/catalog/item.debrief-session
 *
 * @param plotUri - The stac:// URI
 * @param storePath - The filesystem path of the STAC store
 * @returns The session file path, or null if unable to derive
 */
function deriveSessionPath(plotUri: string, storePath: string): string | null {
  const parsed = parseStacUri(plotUri);
  if (!parsed) {
    return null;
  }

  // Replace .json with .debrief-session
  const itemPath = parsed.itemPath.replace(/\.json$/, '.debrief-session');

  // Combine with store path
  return `${storePath}/${itemPath}`;
}

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
  features: DebriefFeature[],
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
 * Write plot thumbnails by delegating to the typed plotThumbnailWriter shim.
 *
 * Spec 241 (review decision 1B) — moves the actual file write + item.json
 * mutation behind a typed surface so the VS Code extension stays out of
 * STAC-shape decisions. The shim still runs in the extension process today;
 * follow-up #242 promotes it to a fully service-mediated path
 * (Article IV.1 closure).
 */
function storeThumbnails(
  storePath: string,
  plotUri: string,
  largePngBase64: string,
  smallPngBase64: string,
): void {
  const parsed = parseStacUri(plotUri);
  if (!parsed) {
    return;
  }

  writePlotThumbnails({
    storePath,
    itemPath: parsed.itemPath,
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
 * @returns The command handler function
 */
export function createSaveSessionCommand(
  sessionManager: SessionManager,
  getStorePath: (storeId: string) => string | undefined,
  getMapPanel?: () => MapPanel | undefined,
): () => Promise<void> {
  return async () => {
    const session = sessionManager.getActiveSession();
    const plotUri = sessionManager.getActiveDocumentUri();

    if (!session || !plotUri) {
      void vscode.window.showWarningMessage('No plot open to save session for');
      return;
    }

    // Check if session is dirty
    const state: SessionStoreWithUndo = session.getState();
    if (!state.dirty) {
      void vscode.window.showInformationMessage('Session has no unsaved changes');
      return;
    }

    // Get or derive save path
    let savePath = state.savePath;

    if (!savePath) {
      // Try to derive from plot URI
      const parsed = parseStacUri(plotUri);
      if (parsed) {
        const storePath = getStorePath(parsed.storeId);
        if (storePath) {
          savePath = deriveSessionPath(plotUri, storePath);
        }
      }

      // If still no path, ask user
      if (!savePath) {
        const result = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file('session.debrief-session'),
          filters: {
            'Debrief Session': ['debrief-session'],
          },
          saveLabel: 'Save Session',
          title: 'Save Debrief Session',
        });

        if (!result) {
          return; // User cancelled
        }

        savePath = result.fsPath;
      }
    }

    // Save the session
    const result = await saveSession(session, savePath);

    if (result.success) {
      void vscode.window.showInformationMessage(
        `Session saved to ${result.path}`
      );

      const mapPanel = getMapPanel?.();
      const parsed = parseStacUri(plotUri);
      const storePath = parsed ? getStorePath(parsed.storeId) : undefined;

      // Persist in-memory features back to features.geojson so captured
      // Storyboard/Scene features (and any other mutations) survive reload.
      if (mapPanel && parsed && storePath) {
        try {
          storeFeatureCollection(storePath, plotUri, mapPanel.getCurrentFeatures());
        } catch (err) {
          console.warn('[debrief] features.geojson write failed (non-blocking):', err);
        }
      }

      // Capture thumbnails after successful save (#174)
      if (mapPanel && parsed && storePath) {
        try {
          const { largePngBase64, smallPngBase64 } = await mapPanel.requestThumbnailCapture(5000);
          if (largePngBase64 && smallPngBase64) {
            storeThumbnails(storePath, plotUri, largePngBase64, smallPngBase64);
          }
        } catch (err) {
          console.warn('[debrief] Thumbnail capture failed (non-blocking):', err);
        }
      }
    } else {
      void vscode.window.showErrorMessage(
        `Failed to save session: ${result.error}`
      );
    }
  };
}
