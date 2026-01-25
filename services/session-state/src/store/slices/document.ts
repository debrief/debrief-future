/**
 * Document state slice implementation.
 * Feature: 024-document-session-state
 */

import type { StateCreator } from 'zustand';
import type {
  DocumentSlice,
  DocumentActions,
  SessionStore,
} from '../../types/index.js';
import { DEFAULT_DOCUMENT_SLICE } from '../../types/index.js';

export type DocumentSliceWithActions = DocumentSlice & DocumentActions;

/**
 * Create the document slice for the session store.
 */
export const createDocumentSlice: StateCreator<
  SessionStore,
  [],
  [],
  DocumentSliceWithActions
> = (set) => ({
  ...DEFAULT_DOCUMENT_SLICE,

  setDirty: (dirty: boolean) => {
    set({ dirty });
  },

  setSavePath: (path: string | null) => {
    set({ savePath: path });
  },

  markDirty: () => {
    set({ dirty: true });
  },

  markClean: () => {
    set({ dirty: false });
  },
});
