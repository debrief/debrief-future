/**
 * MCP tool: session.setViewport
 * Feature: 024-document-session-state
 */

import type { SessionStoreApi } from '../../store/index.js';
import type { ViewportPolygon, Coordinate } from '../../types/index.js';
import { calculateViewportCenter } from '../../types/index.js';

export interface SetViewportInput {
  coordinates: [Coordinate, Coordinate, Coordinate, Coordinate];
  rotation?: number;
}

export interface SetViewportOutput {
  success: boolean;
  viewport?: ViewportPolygon;
  center?: Coordinate;
  error?: string;
}

/**
 * Set the map viewport.
 */
export function setViewport(
  store: SessionStoreApi,
  input: SetViewportInput
): SetViewportOutput {
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
