import { useCallback, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { Bounds } from '../../utils/types';

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
export function useMapInteraction(
  options: UseMapInteractionOptions = {}
): UseMapInteractionReturn {
  const { onZoomChange, onCenterChange, onBoundsChange } = options;

  const mapRef = useRef<LeafletMap | null>(null);
  const [zoom, setZoomState] = useState(10);

  const handleMapReady = useCallback((map: LeafletMap) => {
    mapRef.current = map;
    setZoomState(map.getZoom());
  }, []);

  const setZoom = useCallback((newZoom: number) => {
    if (mapRef.current) {
      mapRef.current.setZoom(newZoom);
      setZoomState(newZoom);
      onZoomChange?.(newZoom);
    }
  }, [onZoomChange]);

  const zoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const fitBounds = useCallback((bounds: Bounds, padding: number = 0.1) => {
    if (mapRef.current) {
      const [minLon, minLat, maxLon, maxLat] = bounds;
      mapRef.current.fitBounds(
        [[minLat, minLon], [maxLat, maxLon]],
        { padding: [padding * 100, padding * 100] }
      );
    }
  }, []);

  const centerOn = useCallback((lat: number, lon: number, targetZoom?: number) => {
    if (mapRef.current) {
      if (targetZoom !== undefined) {
        mapRef.current.setView([lat, lon], targetZoom);
      } else {
        mapRef.current.panTo([lat, lon]);
      }
    }
  }, []);

  const handleZoomEnd = useCallback(() => {
    if (mapRef.current) {
      const newZoom = mapRef.current.getZoom();
      setZoomState(newZoom);
      onZoomChange?.(newZoom);
    }
  }, [onZoomChange]);

  const handleMoveEnd = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      onCenterChange?.([center.lat, center.lng]);

      const bounds = mapRef.current.getBounds();
      onBoundsChange?.([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    }
  }, [onCenterChange, onBoundsChange]);

  return {
    mapRef,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    fitBounds,
    centerOn,
    handleMapReady,
    handleZoomEnd,
    handleMoveEnd,
  };
}
