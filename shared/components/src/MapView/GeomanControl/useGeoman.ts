/**
 * useGeoman — Hook to initialize Geoman drawing library on a Leaflet map.
 *
 * Geoman auto-attaches to Leaflet on import, adding `map.pm` to every L.Map.
 * This hook manages Geoman toolbar controls lifecycle (add on mount, remove on unmount).
 *
 * By default, no toolbar is shown. Pass `addControls: true` to display the Geoman toolbar.
 *
 * Usage:
 *   function MyMapComponent() {
 *     useGeoman(); // Geoman loaded but dormant
 *     return null;
 *   }
 *
 *   function MyDrawingComponent() {
 *     const { map } = useGeoman({ addControls: true });
 *     // Geoman toolbar visible; or use map.pm.enableDraw('Polygon') programmatically
 *     return null;
 *   }
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type L from 'leaflet';

export interface UseGeomanOptions {
  /** Show the Geoman toolbar on the map. Default: false. */
  addControls?: boolean;

  /** Options passed to map.pm.addControls() when addControls is true. */
  controlOptions?: L.PM.ToolbarOptions;
}

export interface UseGeomanReturn {
  /** The Leaflet map instance (same as useMap()). */
  map: L.Map;
}

/**
 * Initialize Geoman on the current react-leaflet map.
 *
 * Must be called inside a react-leaflet MapContainer context (uses useMap()).
 */
export function useGeoman(options: UseGeomanOptions = {}): UseGeomanReturn {
  const { addControls = false, controlOptions } = options;
  const map = useMap();
  const controlsAdded = useRef(false);

  useEffect(() => {
    if (!map.pm) return;

    if (addControls && !controlsAdded.current) {
      map.pm.addControls(controlOptions ?? {});
      controlsAdded.current = true;
    }

    return () => {
      if (controlsAdded.current && map.pm) {
        map.pm.removeControls();
        controlsAdded.current = false;
      }
    };
  }, [map, addControls, controlOptions]);

  return { map };
}
