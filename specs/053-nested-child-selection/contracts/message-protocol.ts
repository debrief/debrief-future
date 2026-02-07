/**
 * Webview ↔ Extension Message Protocol Changes
 *
 * Feature: 053-nested-child-selection
 * Module: apps/vscode
 *
 * Documents changes to the VS Code webview message protocol
 * to support selection paths.
 */

// ─── Existing Messages (semantics widened) ───────────────────────────

/**
 * Extension → Webview: Set selection.
 * featureIds now contains selection paths instead of flat IDs.
 * Webview must parse paths to determine which elements to highlight.
 */
export interface SetSelectionMessage {
  type: 'setSelection';
  featureIds: string[]; // Now: selection path strings
}

/**
 * Webview → Extension: Selection changed from map interaction.
 * Updated to report selection paths when child elements are clicked.
 */
export interface SelectionChangedMessage {
  type: 'selectionChanged';
  selection: {
    /** Full selection paths for all selected elements */
    paths: string[];
    /** Context determined from the deepest selection */
    contextType: SelectionContextType;
  };
}

export type SelectionContextType =
  | 'none'
  | 'single-track'
  | 'multi-track'
  | 'position'        // NEW: single position selected
  | 'multi-position'  // NEW: multiple positions selected
  | 'mixed';          // Mixed depths or mixed kinds

// ─── No New Messages Required ────────────────────────────────────────

/**
 * ClearSelectionMessage — unchanged.
 * Clearing selection removes all paths.
 */
export interface ClearSelectionMessage {
  type: 'clearSelection';
}
