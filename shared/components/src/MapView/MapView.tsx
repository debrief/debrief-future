import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import type { PathOptions, LatLngBoundsExpression } from 'leaflet';
import type { DebriefFeature, DebriefFeatureCollection, Bounds } from '../utils/types';
import { calculateBounds, expandBounds } from '../utils/bounds';
import { getFeatureColor, getFeatureLabel } from '../utils/labels';
import { isTrackFeature } from '../utils/types';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

export interface MapViewProps {
  /** GeoJSON features to display */
  features: DebriefFeatureCollection | DebriefFeature[];

  /** Set of selected feature IDs */
  selectedIds?: Set<string>;

  /** Callback when a feature is clicked */
  onSelect?: (featureId: string, event: React.MouseEvent) => void;

  /** Callback when clicking empty space (for clearing selection) */
  onBackgroundClick?: () => void;

  /** Callback when zoom level changes */
  onZoomChange?: (zoom: number) => void;

  /** Callback when map bounds change */
  onBoundsChange?: (bounds: Bounds) => void;

  /** Initial zoom level */
  initialZoom?: number;

  /** Initial center [lat, lon] */
  initialCenter?: [number, number];

  /** Whether to auto-fit bounds to features */
  autoFitBounds?: boolean;

  /** Tile layer URL (default: OpenStreetMap) */
  tileLayerUrl?: string;

  /** Tile layer attribution */
  tileLayerAttribution?: string;

  /** CSS class name */
  className?: string;

  /** Inline styles */
  style?: React.CSSProperties;

  /** Height of the map (default: 400px) */
  height?: number | string;
}

// Component to handle map events and auto-fit
function MapController({
  bounds,
  autoFitBounds,
  onZoomChange,
  onBoundsChange,
  onBackgroundClick,
}: {
  bounds: Bounds | null;
  autoFitBounds: boolean;
  onZoomChange?: (zoom: number) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  onBackgroundClick?: () => void;
}) {
  const map = useMap();

  // Auto-fit bounds on initial load or when features change
  useEffect(() => {
    if (autoFitBounds && bounds) {
      const [minLon, minLat, maxLon, maxLat] = expandBounds(bounds, 0.1);
      map.fitBounds([[minLat, minLon], [maxLat, maxLon]] as LatLngBoundsExpression);
    }
  }, [map, bounds, autoFitBounds]);

  // Handle map events
  useMapEvents({
    zoomend: () => {
      onZoomChange?.(map.getZoom());
    },
    moveend: () => {
      const mapBounds = map.getBounds();
      onBoundsChange?.([
        mapBounds.getWest(),
        mapBounds.getSouth(),
        mapBounds.getEast(),
        mapBounds.getNorth(),
      ]);
    },
    click: (e) => {
      // Only fire if clicking on the map itself, not a feature
      if ((e.originalEvent.target as HTMLElement).classList.contains('leaflet-container')) {
        onBackgroundClick?.();
      }
    },
  });

  return null;
}

/**
 * MapView component for displaying GeoJSON features on an interactive map.
 *
 * @example
 * ```tsx
 * import { MapView } from '@debrief/components/MapView';
 *
 * <MapView
 *   features={plotData}
 *   selectedIds={selection.selectedIds}
 *   onSelect={(id) => selection.toggle(id)}
 * />
 * ```
 */
export function MapView({
  features,
  selectedIds = new Set(),
  onSelect,
  onBackgroundClick,
  onZoomChange,
  onBoundsChange,
  initialZoom = 10,
  initialCenter = [50.0, -4.0],
  autoFitBounds = true,
  tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileLayerAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  className,
  style,
  height = 400,
}: MapViewProps) {
  // Normalize features to array
  const featureArray = useMemo(() => {
    return Array.isArray(features) ? features : features.features;
  }, [features]);

  // Calculate bounds for auto-fit
  const bounds = useMemo(() => calculateBounds(featureArray), [featureArray]);

  // Create GeoJSON data structure
  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: featureArray.map((f) => ({
      ...f,
      geometry: {
        ...f.geometry,
        // Ensure coordinates are proper arrays for GeoJSON
        coordinates: f.geometry.coordinates,
      },
    })),
  }), [featureArray]);

  // Style function for features
  const featureStyle = useMemo(() => {
    return (feature: GeoJSON.Feature | undefined): PathOptions => {
      if (!feature) return {};

      const debriefFeature = feature as unknown as DebriefFeature;
      const isSelected = selectedIds.has(debriefFeature.id);
      const color = getFeatureColor(debriefFeature);

      return {
        color: isSelected ? 'var(--debrief-selection-border)' : color,
        weight: isSelected ? 4 : isTrackFeature(debriefFeature) ? 3 : 2,
        opacity: 1,
        fillColor: color,
        fillOpacity: isSelected ? 0.4 : 0.2,
      };
    };
  }, [selectedIds]);

  // Event handlers for features
  const onEachFeature = useMemo(() => {
    return (feature: GeoJSON.Feature, layer: L.Layer) => {
      const debriefFeature = feature as unknown as DebriefFeature;
      const label = getFeatureLabel(debriefFeature);

      // Add tooltip
      layer.bindTooltip(label, {
        permanent: false,
        direction: 'top',
      });

      // Add click handler
      layer.on('click', (e) => {
        e.originalEvent.stopPropagation();
        onSelect?.(debriefFeature.id, e.originalEvent as unknown as React.MouseEvent);
      });
    };
  }, [onSelect]);

  const containerStyle: React.CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    minHeight: 'var(--debrief-map-min-height)',
    ...style,
  };

  return (
    <div className={`debrief-mapview ${className ?? ''}`} style={containerStyle}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="debrief-mapview__container"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={tileLayerUrl} attribution={tileLayerAttribution} />

        <MapController
          bounds={bounds}
          autoFitBounds={autoFitBounds}
          onZoomChange={onZoomChange}
          onBoundsChange={onBoundsChange}
          onBackgroundClick={onBackgroundClick}
        />

        {featureArray.length > 0 && (
          <GeoJSON
            key={JSON.stringify(selectedIds.size) + featureArray.length}
            data={geojsonData}
            style={featureStyle}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
