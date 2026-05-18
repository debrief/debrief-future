/**
 * Spatial state slice implementation.
 * Feature: 024-document-session-state
 * Updated: 203-spatial-types-linkml (canonical schemas + @debrief/utils).
 */

import type { StateCreator } from 'zustand';
import type { Coordinate, ViewportPolygon } from '@debrief/schemas';
import {
  validateViewportPolygon,
  calculateViewportCenter,
} from '@debrief/utils';
import type {
  SpatialSlice,
  SpatialActions,
  SessionStore,
} from '../../types/index.js';
import { DEFAULT_SPATIAL_SLICE, normalizeRotation } from '../../types/index.js';

export type SpatialSliceWithActions = SpatialSlice & SpatialActions;

/**
 * Create the spatial slice for the session store.
 */
export const createSpatialSlice: StateCreator<
  SessionStore,
  [],
  [],
  SpatialSliceWithActions
> = (set, get) => ({
  ...DEFAULT_SPATIAL_SLICE,

  setViewport: (viewport: ViewportPolygon | null) => {
    if (viewport !== null && !validateViewportPolygon(viewport)) {
      throw new Error(
        'Invalid viewport coordinates: must be within [-180, 180] longitude and [-90, 90] latitude',
      );
    }
    set({ viewport });
  },

  setRotation: (rotation: number) => {
    set({ rotation: normalizeRotation(rotation) });
  },

  setDrawingMode: (mode) => {
    set({ drawingMode: mode });
  },

  incrementDrawingPaletteIndex: () => {
    set({ drawingPaletteIndex: get().drawingPaletteIndex + 1 });
  },

  setViewportLocked: (locked: boolean) => {
    set({ viewportLocked: locked });
  },

  getCenter: (): Coordinate | null => {
    const { viewport } = get();
    if (!viewport) return null;
    return calculateViewportCenter(viewport);
  },
});
