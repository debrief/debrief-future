/**
 * Spatial state types for session state management.
 * Feature: 024-document-session-state
 * Updated: 203-spatial-types-linkml (Coordinate/ViewportPolygon consolidated
 * into @debrief/schemas; validators + centre moved to @debrief/utils).
 */

import type { ViewportPolygon, Coordinate } from '@debrief/schemas';

// Re-export canonical types for convenience of internal consumers that
// already import from services/session-state/types.
export type { Coordinate, ViewportPolygon };
export {
  validateCoordinate,
  validateViewportPolygon,
  calculateViewportCenter,
} from '@debrief/utils';

/**
 * Spatial state slice (FR-012 through FR-015).
 *
 * Schema equivalent: @debrief/schemas#SpatialSlice
 * Not migrated: generated SpatialSlice lacks drawingMode and drawingPaletteIndex
 * (ephemeral UI-only fields). The viewport field uses the canonical
 * object-form ViewportPolygon.
 */
export interface SpatialSlice {
  /** Visible map area as 4-corner polygon (FR-012) */
  viewport: ViewportPolygon | null;
  /** Map rotation in degrees 0-360 (FR-013) */
  rotation: number;
  /** Active drawing mode for shape creation (FR-093) — EPHEMERAL */
  drawingMode: DrawingMode;
  /** Index into the drawing colour palette — EPHEMERAL (FR-096) */
  drawingPaletteIndex: number;
  /**
   * When true, the map's viewport (centre + zoom) is frozen — see spec 260.
   * Disables Leaflet's six interaction handlers and the toolbar zoom/fit
   * buttons; banner is rendered. EPHEMERAL — never persisted into
   * .debrief.json (excluded via Omit on PersistentSessionState.spatial).
   */
  viewportLocked: boolean;
}

/**
 * Default spatial state values.
 */
export const DEFAULT_SPATIAL_SLICE: SpatialSlice = {
  viewport: null,
  rotation: 0,
  drawingMode: null,
  drawingPaletteIndex: 0,
  viewportLocked: false,
};

/**
 * Spatial slice actions for state updates.
 */
export interface SpatialActions {
  setViewport: (viewport: ViewportPolygon | null) => void;
  setRotation: (rotation: number) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  /** Increment the drawing palette colour index (FR-096) */
  incrementDrawingPaletteIndex: () => void;
  /** Toggle the viewport lock (spec 260 — FR-001..FR-006) */
  setViewportLocked: (locked: boolean) => void;
  /** Get the derived center point (not stored) */
  getCenter: () => Coordinate | null;
}

/**
 * Drawing mode for shape creation (FR-093).
 */
export type DrawingMode = 'point' | 'rectangle' | 'polygon' | 'polyline' | null;

/**
 * Normalize rotation to [0, 360) range.
 */
export function normalizeRotation(rotation: number): number {
  let normalized = rotation % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}
