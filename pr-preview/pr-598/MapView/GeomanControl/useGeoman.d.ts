import { default as L } from 'leaflet';

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
export declare function useGeoman(options?: UseGeomanOptions): UseGeomanReturn;
//# sourceMappingURL=useGeoman.d.ts.map