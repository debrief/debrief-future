/**
 * Export PNG Command - Export current map view as PNG image
 */

import * as vscode from 'vscode';
import type { MapPanel } from '../webview/mapPanel';

/**
 * Create the export PNG command
 */
export function createExportPngCommand(
  getMapPanel: () => MapPanel | undefined
): () => Promise<void> {
  return async () => {
    const panel = getMapPanel();
    if (!panel) {
      void vscode.window.showWarningMessage('No plot open');
      return;
    }

    // Show save dialog
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('map-export.png'),
      filters: {
        'PNG Images': ['png'],
      },
      saveLabel: 'Export',
      title: 'Export Map as PNG',
    });

    if (!saveUri) {
      return;
    }

    // Request export from webview
    // Note: The actual export is handled by the webview using leaflet-image
    // For now, show a placeholder message
    void vscode.window.showInformationMessage(
      `Export functionality requires leaflet-image integration. Save path: ${saveUri.fsPath}`
    );
  };
}
