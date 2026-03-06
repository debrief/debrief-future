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

    const features = panel.getFeatures();

    // Select all features
    const featureIds = features.map((f) => String(f.id));
    panel.setSelection(featureIds);
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
