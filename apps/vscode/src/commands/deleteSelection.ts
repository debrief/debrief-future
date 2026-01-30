/**
 * Delete Selection Command - Remove selected features from the in-memory plot
 */

import type { SessionManager } from '../services/sessionManager';
import type { MapPanel } from '../webview/mapPanel';
import type { LayersTreeProvider } from '../providers/layersTreeProvider';

/**
 * Create the delete selection command.
 *
 * Reads selected feature IDs from session state, removes them from the
 * map panel's in-memory data, clears selection, and refreshes the layers tree.
 */
export function createDeleteSelectionCommand(
  sessionManager: SessionManager,
  getMapPanel: () => MapPanel | undefined,
  layersTreeProvider: LayersTreeProvider
): () => void {
  return () => {
    const session = sessionManager.getActiveSession();
    if (!session) {
      return;
    }

    const state = session.getState();
    const selectedIds = state.selection.featureIds;
    if (selectedIds.length === 0) {
      return;
    }

    const panel = getMapPanel();
    if (!panel) {
      return;
    }

    // Remove features from map panel (re-sends loadPlot to webview)
    panel.removeFeatures(selectedIds);

    // Clear selection in session state
    state.clearSelection();

    // Refresh layers tree
    layersTreeProvider.refresh();
  };
}
