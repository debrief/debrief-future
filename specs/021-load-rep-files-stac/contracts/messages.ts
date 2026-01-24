/**
 * WebView ↔ Extension Message Types for REP File Import
 *
 * Feature: 021-load-rep-files-stac
 *
 * These interfaces define the message protocol between the map webview
 * and the VS Code extension host for REP file import operations.
 */

// =============================================================================
// Webview → Extension Messages
// =============================================================================

/**
 * Sent when user drops a file onto the map panel.
 */
export interface RepFileDropMessage {
  type: 'repFileDrop';
  payload: {
    /** Absolute path to the dropped file */
    filePath: string;
    /** Original filename */
    fileName: string;
    /** File size in bytes */
    fileSize: number;
  };
}

/**
 * Sent when user drags a file over/out of the map panel.
 * Used to update drop zone visual state.
 */
export interface DragStateMessage {
  type: 'dragState';
  payload: {
    /** Whether a valid file is being dragged over the drop zone */
    isOver: boolean;
    /** Whether the dragged file is a valid .rep file */
    isValidFile: boolean;
    /** Filename being dragged (for display) */
    fileName?: string;
  };
}

// =============================================================================
// Extension → Webview Messages
// =============================================================================

/**
 * Sent to update the webview about import progress.
 */
export interface RepImportProgressMessage {
  type: 'repImportProgress';
  payload: {
    /** Current phase of the import */
    phase: 'validating' | 'parsing' | 'checking-duplicates' | 'storing-asset' | 'adding-features';
    /** Filename being imported */
    fileName: string;
    /** Progress percentage (0-100) */
    progress: number;
    /** Human-readable status message */
    message: string;
  };
}

/**
 * Sent when import completes (success or failure).
 */
export interface RepImportResultMessage {
  type: 'repImportResult';
  payload: {
    /** Whether import succeeded */
    success: boolean;
    /** Filename that was imported */
    fileName: string;
    /** Summary on success */
    summary?: {
      featureCount: number;
      tracks: number;
      shapes: number;
      annotations: number;
    };
    /** Bounds to zoom to on success [minLon, minLat, maxLon, maxLat] */
    bounds?: [number, number, number, number];
    /** Error details on failure */
    error?: {
      code: string;
      message: string;
      details?: string;
    };
  };
}

/**
 * Sent to show/hide the drop zone overlay.
 */
export interface DropZoneStateMessage {
  type: 'dropZoneState';
  payload: {
    /** Whether to show the drop zone overlay */
    visible: boolean;
    /** Message to display in overlay */
    message: string;
    /** Visual state of the overlay */
    state: 'default' | 'valid' | 'invalid';
  };
}

// =============================================================================
// Union Types
// =============================================================================

/** All messages from webview to extension */
export type WebviewToExtensionMessage =
  | RepFileDropMessage
  | DragStateMessage;

/** All messages from extension to webview */
export type ExtensionToWebviewMessage =
  | RepImportProgressMessage
  | RepImportResultMessage
  | DropZoneStateMessage;

// =============================================================================
// Type Guards
// =============================================================================

export function isRepFileDropMessage(msg: unknown): msg is RepFileDropMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as RepFileDropMessage).type === 'repFileDrop'
  );
}

export function isDragStateMessage(msg: unknown): msg is DragStateMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as DragStateMessage).type === 'dragState'
  );
}

export function isRepImportProgressMessage(msg: unknown): msg is RepImportProgressMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as RepImportProgressMessage).type === 'repImportProgress'
  );
}

export function isRepImportResultMessage(msg: unknown): msg is RepImportResultMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as RepImportResultMessage).type === 'repImportResult'
  );
}
