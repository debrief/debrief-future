/**
 * Browser filter state slice implementation (#132).
 * Manages metadata filter axis; spatial/temporal axes read from existing slices.
 */

import type { StateCreator } from 'zustand';
import type {
  BrowserFilterSlice,
  BrowserFilterActions,
  FilterExpression,
} from '../../types/browser-filter.js';
import type { SessionStore } from '../../types/index.js';
import { DEFAULT_BROWSER_FILTER_SLICE } from '../../types/browser-filter.js';

export type BrowserFilterSliceWithActions = BrowserFilterSlice & BrowserFilterActions;

/**
 * Create the browser filter slice for the session store.
 */
export const createBrowserFilterSlice: StateCreator<
  SessionStore,
  [],
  [],
  BrowserFilterSliceWithActions
> = (set) => ({
  ...DEFAULT_BROWSER_FILTER_SLICE,

  setMetadataFilteredIds: (ids: ReadonlySet<string> | null) => {
    set({ metadataFilteredIds: ids });
  },

  setMetadataExpression: (expression: FilterExpression | null) => {
    set({ metadataExpression: expression });
  },

  setSpatialFilterActive: (active: boolean) => {
    set({ spatialFilterActive: active });
  },

  setTemporalFilterActive: (active: boolean) => {
    set({ temporalFilterActive: active });
  },

  clearAllBrowserFilters: () => {
    set({
      metadataFilteredIds: null,
      metadataExpression: null,
      spatialFilterActive: false,
      temporalFilterActive: false,
    });
  },
});
