/**
 * Selection Commands - Select all and clear selection
 */

import type { MapPanel } from '../webview/mapPanel';

/**
 * Create the select all command
 */
export function createSelectAllCommand(
  getMapPanel: () => MapPanel | undefined
): () => void {
  return () => {
    const panel = getMapPanel();
    if (!panel) {
      return;
    }

    const tracks = panel.getTracks();
    const locations = panel.getLocations();

    // Select all tracks
    const trackIds = tracks.map((t) => t.id);
    const locationIds: string[] = [];

    panel.setSelection(trackIds, locationIds);
  };
}

/**
 * Create the clear selection command
 */
export function createClearSelectionCommand(
  getMapPanel: () => MapPanel | undefined
): () => void {
  return () => {
    const panel = getMapPanel();
    if (panel) {
      panel.clearSelection();
    }
  };
}
