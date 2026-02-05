import { Map as LeafletMap } from 'leaflet';
import { Bounds } from '../../utils/types';

export interface UseMapInteractionOptions {
    /** Callback when zoom changes */
    onZoomChange?: (zoom: number) => void;
    /** Callback when map center changes */
    onCenterChange?: (center: [number, number]) => void;
    /** Callback when bounds change */
    onBoundsChange?: (bounds: Bounds) => void;
}
export interface UseMapInteractionReturn {
    /** Reference to the Leaflet map instance */
    mapRef: React.MutableRefObject<LeafletMap | null>;
    /** Current zoom level */
    zoom: number;
    /** Set map zoom level */
    setZoom: (zoom: number) => void;
    /** Zoom in by one level */
    zoomIn: () => void;
    /** Zoom out by one level */
    zoomOut: () => void;
    /** Fit map to bounds */
    fitBounds: (bounds: Bounds, padding?: number) => void;
    /** Center map on a point */
    centerOn: (lat: number, lon: number, zoom?: number) => void;
    /** Handle map ready event */
    handleMapReady: (map: LeafletMap) => void;
    /** Handle zoom end event */
    handleZoomEnd: () => void;
    /** Handle move end event */
    handleMoveEnd: () => void;
}
/**
 * Hook for managing map interaction state and operations.
 */
export declare function useMapInteraction(options?: UseMapInteractionOptions): UseMapInteractionReturn;
//# sourceMappingURL=useMapInteraction.d.ts.map