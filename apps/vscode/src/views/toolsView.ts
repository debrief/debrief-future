/**
 * Tools View - Additional tools view helpers
 *
 * Note: The main tools tree view is implemented in providers/toolsTreeProvider.ts
 * This file contains supplementary view utilities.
 */

import * as vscode from 'vscode';

/**
 * Show tools welcome message when no selection
 */
export function showToolsWelcome(): vscode.TreeItem {
  const item = new vscode.TreeItem('Select tracks to see tools');
  item.contextValue = 'toolsWelcome';
  return item;
}

/**
 * Show tools unavailable message when calc service is down
 */
export function showToolsUnavailable(): vscode.TreeItem {
  const item = new vscode.TreeItem('Analysis tools unavailable');
  item.description = 'debrief-calc not connected';
  item.contextValue = 'toolsUnavailable';
  item.iconPath = new vscode.ThemeIcon('warning');
  return item;
}

/**
 * Format selection context for display
 */
export function formatSelectionContext(
  trackCount: number,
  locationCount: number
): string {
  const parts: string[] = [];

  if (trackCount > 0) {
    parts.push(`${trackCount} track${trackCount === 1 ? '' : 's'}`);
  }

  if (locationCount > 0) {
    parts.push(`${locationCount} location${locationCount === 1 ? '' : 's'}`);
  }

  return parts.length > 0 ? `Selection: ${parts.join(', ')}` : 'No selection';
}
