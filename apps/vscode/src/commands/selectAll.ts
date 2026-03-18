/**
 * Selection Commands - Select all and clear selection
 */

import type { MapPanel } from '../webview/mapPanel';
import type { DebriefFeature } from '@debrief/components';

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

    const features: DebriefFeature[] = panel.getFeatures();

    // Select all features
    const featureIds = features.map((f: DebriefFeature) => String(f.id));
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
