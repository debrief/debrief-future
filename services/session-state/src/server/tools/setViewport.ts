/**
 * MCP tool: session.setViewport
 * Feature: 024-document-session-state
 * Updated: 203-spatial-types-linkml (object-form Coordinate + canonical types).
 */

import type { SessionStoreApi } from '../../store/index.js';
import type { ViewportPolygon, Coordinate } from '@debrief/schemas';
import { calculateViewportCenter } from '@debrief/utils';

export interface SetViewportInput {
  /**
   * Four corners in clockwise order [NW, NE, SE, SW], each in the canonical
   * object form `{ longitude, latitude }`.
   */
  coordinates: Coordinate[];
  rotation?: number;
}

export interface SetViewportOutput {
  success: boolean;
  viewport?: ViewportPolygon;
  center?: Coordinate;
  error?: string;
  /**
   * Machine-detectable error tag (spec 260 / FR-009). Present iff
   * `success === false` AND the cause is a known structural condition
   * (currently only the viewport lock). Callers MUST branch on this
   * field rather than parsing the free-text `error`.
   */
  errorCode?: 'VIEWPORT_LOCKED';
}

/**
 * Set the map viewport.
 *
 * Reject contract (spec 260 / FR-009): when `state.viewportLocked === true`
 * the call short-circuits BEFORE input validation and returns
 * `{ success: false, errorCode: 'VIEWPORT_LOCKED', error: ... }`. Locked is
 * the dominant signal — a locked rejection is independent of input quality
 * so coincidental validation diagnostics are suppressed. LLM/tool callers
 * SHOULD treat `errorCode === 'VIEWPORT_LOCKED'` as a terminal stop-retrying
 * condition and surface the reason to the user.
 */
export function setViewport(
  store: SessionStoreApi,
  input: SetViewportInput,
): SetViewportOutput {
  if (store.getState().viewportLocked === true) {
    return {
      success: false,
      error: 'Viewport is locked — unlock to change view.',
      errorCode: 'VIEWPORT_LOCKED',
    };
  }

  try {
    const viewport: ViewportPolygon = {
      coordinates: input.coordinates,
    };

    store.getState().setViewport(viewport);

    if (input.rotation !== undefined) {
      store.getState().setRotation(input.rotation);
    }

    const center = calculateViewportCenter(viewport);

    return {
      success: true,
      viewport,
      center,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
