/**
 * BrowserMapAdapter (T044) — fly the Leaflet map to a target viewport.
 *
 * The adapter holds a ref to the Leaflet `Map` instance. The driver
 * invokes `flyToViewport(viewport, 0)` for per-frame scrubbing inside
 * `runTimeRangeTween` and `flyToViewport(viewport, > 0)` for inter-Scene
 * animated transitions.
 *
 * Viewport center order is `[lon, lat]` (per the Scene schema). Leaflet
 * expects `[lat, lon]` — the conversion happens here so the rest of the
 * SPA stays on the canonical schema convention.
 */

import type { Map as LeafletMap } from 'leaflet';

export interface ViewportLike {
  center: [number, number]; // [lon, lat]
  zoom: number;
  bearing?: number;
}

export interface BrowserMapAdapter {
  setMap(map: LeafletMap | null): void;
  flyToViewport(viewport: ViewportLike, durationMs: number): void;
}

export function createBrowserMapAdapter(): BrowserMapAdapter {
  let map: LeafletMap | null = null;
  return {
    setMap(next) {
      map = next;
    },
    flyToViewport(viewport, durationMs) {
      if (!map) return;
      // [lon, lat] → [lat, lon] for Leaflet.
      const target: [number, number] = [viewport.center[1], viewport.center[0]];
      if (durationMs > 0) {
        map.flyTo(target, viewport.zoom, { duration: durationMs / 1000 });
      } else {
        map.setView(target, viewport.zoom, { animate: false });
      }
    },
  };
}
