/**
 * Browser filter state slice — manages metadata, spatial, and temporal
 * filter activation for the STAC browser.
 * Feature: 132-three-view-sync
 */

import type { StateCreator } from 'zustand';
import type {
  BrowserFilterSlice,
  BrowserFilterActions,
  SessionStore,
} from '../../types/index.js';
import { DEFAULT_BROWSER_FILTER_SLICE } from '../../types/index.js';

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

  setMetadataExpression: (expression: Record<string, unknown> | null) => {
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
