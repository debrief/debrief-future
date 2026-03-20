/**
 * Results state slice implementation.
 * Feature: 109-unify-result-layer-lifecycle, 110-tool-level-undo-gap
 */

import type { StateCreator } from 'zustand';
import type {
  ResultsSlice,
  ResultsActions,
  LastToolExecution,
  SessionStore,
} from '../../types/index.js';
import type { GeoJSONFeature } from '@debrief/utils';
import { DEFAULT_RESULTS_SLICE } from '../../types/index.js';

export type ResultsSliceWithActions = ResultsSlice & ResultsActions;

/**
 * Create the results slice for the session store.
 */
export const createResultsSlice: StateCreator<
  SessionStore,
  [],
  [],
  ResultsSliceWithActions
> = (set, get) => ({
  ...DEFAULT_RESULTS_SLICE,

  addResultLayers: (features: GeoJSONFeature[]) => {
    set({ resultLayers: [...get().resultLayers, ...features] });
  },

  removeResultLayers: (featureIds: string[]) => {
    const removeSet = new Set(featureIds);
    set({
      resultLayers: get().resultLayers.filter(
        (f) => !removeSet.has(String(f.id ?? ''))
      ),
    });
  },

  clearResultLayers: () => {
    set({ resultLayers: [], lastToolExecution: null });
  },

  setLastToolExecution: (execution: LastToolExecution) => {
    set({ lastToolExecution: execution });
  },

  clearLastToolExecution: () => {
    set({ lastToolExecution: null });
  },
});
