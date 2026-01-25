/**
 * Features state slice implementation.
 * Feature: 024-document-session-state
 */

import type { StateCreator } from 'zustand';
import type {
  FeaturesSlice,
  FeaturesActions,
  SessionStore,
} from '../../types/index.js';
import {
  DEFAULT_FEATURES_SLICE,
  createEmptySelection,
  createSelection,
} from '../../types/index.js';

export type FeaturesSliceWithActions = FeaturesSlice & FeaturesActions;

/**
 * Create the features slice for the session store.
 */
export const createFeaturesSlice: StateCreator<
  SessionStore,
  [],
  [],
  FeaturesSliceWithActions
> = (set, get) => ({
  ...DEFAULT_FEATURES_SLICE,

  setFeatureCollectionUri: (uri: string | null) => {
    set({ featureCollectionUri: uri });
  },

  setSelection: (featureIds: string[], primary?: string) => {
    set({ selection: createSelection(featureIds, primary) });
  },

  clearSelection: () => {
    set({ selection: createEmptySelection() });
  },

  addToSelection: (featureIds: string[]) => {
    const { selection } = get();
    const existingIds = new Set(selection.featureIds);
    const newIds = featureIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) return;

    const allIds = [...selection.featureIds, ...newIds];
    set({
      selection: createSelection(allIds, selection.primary ?? allIds[0]),
    });
  },

  removeFromSelection: (featureIds: string[]) => {
    const { selection } = get();
    const removeSet = new Set(featureIds);
    const remainingIds = selection.featureIds.filter((id) => !removeSet.has(id));

    // If primary was removed, pick new primary
    const newPrimary = removeSet.has(selection.primary ?? '')
      ? remainingIds[0] ?? null
      : selection.primary;

    set({ selection: createSelection(remainingIds, newPrimary ?? undefined) });
  },

  setHiddenFeatures: (featureIds: string[]) => {
    set({ hiddenFeatureIds: featureIds });
  },

  hideFeatures: (featureIds: string[]) => {
    const { hiddenFeatureIds } = get();
    const existingSet = new Set(hiddenFeatureIds);
    const newIds = featureIds.filter((id) => !existingSet.has(id));

    if (newIds.length === 0) return;

    set({ hiddenFeatureIds: [...hiddenFeatureIds, ...newIds] });
  },

  showFeatures: (featureIds: string[]) => {
    const { hiddenFeatureIds } = get();
    const showSet = new Set(featureIds);
    set({
      hiddenFeatureIds: hiddenFeatureIds.filter((id) => !showSet.has(id)),
    });
  },

  toggleFeatureVisibility: (featureId: string) => {
    const { hiddenFeatureIds } = get();
    const isHidden = hiddenFeatureIds.includes(featureId);

    if (isHidden) {
      set({
        hiddenFeatureIds: hiddenFeatureIds.filter((id) => id !== featureId),
      });
    } else {
      set({ hiddenFeatureIds: [...hiddenFeatureIds, featureId] });
    }
  },
});
