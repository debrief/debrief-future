/**
 * Document state types for session state management.
 * Feature: 024-document-session-state
 */

/**
 * Document state slice (FR-020 through FR-023).
 * Tracks editor lifecycle including dirty flag and undo history.
 *
 * Schema equivalent: @debrief/schemas#DocumentSlice
 * Close match: generated DocumentSlice has savePath as optional (savePath?)
 * while this type uses explicit null (savePath: string | null). Shape is
 * otherwise identical.
 */
export interface DocumentSlice {
  /** Unsaved changes exist - ephemeral (FR-020) */
  dirty: boolean;
  /** Last save location */
  savePath: string | null;
}

/**
 * Default document state values.
 */
export const DEFAULT_DOCUMENT_SLICE: DocumentSlice = {
  dirty: false,
  savePath: null,
};

/**
 * Document slice actions for state updates.
 */
export interface DocumentActions {
  setDirty: (dirty: boolean) => void;
  setSavePath: (path: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
}
