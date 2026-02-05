/**
 * Message Contract: File Actions
 * Feature: 001-wire-file-actions
 *
 * This file documents the message types for webview-extension communication.
 * It is a contract specification, not implementation code.
 */

// ============================================================================
// Existing Types (imported from shared components)
// ============================================================================

/**
 * Represents a file associated with a plot (source or result).
 * @source shared/components/src/LayersToolbar/types.ts
 */
export interface AssociatedFile {
  /** Display name (e.g., "track_001.rep") */
  name: string;
  /** Path relative to STAC item root */
  path: string;
  /** Whether this is a source file or derived result */
  category: 'source' | 'result';
  /** Hint for UI about how to display (optional) */
  viewerType?: '2d' | 'table' | 'text';
  /** File format identifier (optional) */
  format?: string;
}

/**
 * Operations that can be performed on an associated file.
 * @source shared/components/src/LayersToolbar/types.ts
 */
export type FileAction = 'open' | 'openWith' | 'reveal' | 'delete';

// ============================================================================
// New Message Type
// ============================================================================

/**
 * Message sent from webview to extension when user performs a file action.
 *
 * @example
 * // User clicks "Open" on a source file
 * {
 *   type: 'file:action',
 *   payload: {
 *     file: { name: 'track.rep', path: 'sources/track.rep', category: 'source' },
 *     action: 'open'
 *   }
 * }
 *
 * @example
 * // User clicks "Delete" on a result file
 * {
 *   type: 'file:action',
 *   payload: {
 *     file: { name: 'analysis.geojson', path: 'results/analysis.geojson', category: 'result' },
 *     action: 'delete'
 *   }
 * }
 */
export interface FileActionMessage {
  type: 'file:action';
  payload: {
    file: AssociatedFile;
    action: FileAction;
  };
}

// ============================================================================
// Updated Union Type
// ============================================================================

/**
 * All messages that can be sent from ActivityPanel webview to extension host.
 *
 * Add FileActionMessage to the existing union:
 */
export type ActivityPanelMessage =
  // Temporal messages
  | { type: 'temporal:seek'; payload: { time: number } }
  | { type: 'temporal:play'; payload: { rate: number } }
  | { type: 'temporal:pause' }
  | { type: 'temporal:displayMode'; payload: { mode: 'full' | 'trail' } }
  // Tool messages
  | { type: 'tool:run'; payload: { toolId: string } }
  // Layer messages
  | { type: 'layer:toggleVisibility'; payload: { featureIds: string[] } }
  | { type: 'layer:delete'; payload: { featureIds: string[] } }
  | { type: 'layer:select'; payload: { featureIds: string[] } }
  // File messages (NEW)
  | FileActionMessage;
