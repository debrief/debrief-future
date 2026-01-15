/**
 * Layers View - Additional layers view helpers
 *
 * Note: The main layers tree view is implemented in providers/layersTreeProvider.ts
 * This file contains supplementary view utilities.
 */

import * as vscode from 'vscode';

/**
 * Show layers welcome message when no plot is open
 */
export function showLayersWelcome(): vscode.TreeItem {
  const item = new vscode.TreeItem('Open a plot to see layers');
  item.contextValue = 'layersWelcome';
  return item;
}

/**
 * Create a separator item for the layers view
 */
export function createSeparator(): vscode.TreeItem {
  const item = new vscode.TreeItem('─────────────────');
  item.contextValue = 'separator';
  return item;
}

/**
 * Get icon for track type
 */
export function getTrackIcon(platformType?: string): vscode.ThemeIcon {
  const iconMap: Record<string, string> = {
    Destroyer: 'symbol-method',
    Submarine: 'symbol-interface',
    Helicopter: 'symbol-event',
    Aircraft: 'symbol-constant',
    Merchant: 'package',
  };

  const icon = platformType ? iconMap[platformType] : undefined;
  return new vscode.ThemeIcon(icon ?? 'symbol-method');
}

/**
 * Format track description for display
 */
export function formatTrackDescription(
  pointCount: number,
  duration?: string
): string {
  const parts: string[] = [];

  parts.push(`${pointCount.toLocaleString()} pts`);

  if (duration) {
    parts.push(duration);
  }

  return parts.join(' | ');
}
