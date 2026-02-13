import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { PathOptions, LatLngBoundsExpression } from 'leaflet';
import type { DebriefFeature, DebriefFeatureCollection, Bounds, DisplayMode } from '../utils/types';
import { calculateBounds, expandBounds } from '../utils/bounds';
import { getFeatureColor, getFeatureLabel } from '../utils/labels';
import { isTrackFeature } from '../utils/types';
import { extractTemporalData } from './temporal-utils';
import { TemporalTrackLayer } from './TemporalTrackLayer';
import { PositionSymbolsLayer } from './PositionSymbolsLayer';
import { LeafletToolbar } from './LeafletToolbar';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import './MapView.css';

// Import marker icons as modules so Vite bundles them with correct paths
// Icons bundled for offline support (CONSTITUTION.md)
import markerIcon from '../assets/marker-icon.png';
import markerIcon2x from '../assets/marker-icon-2x.png';
import markerShadow from '../assets/marker-shadow.png';

// Fix Leaflet marker icons not loading in bundled environments
// @ts-expect-error - Leaflet types don't include _getIconUrl
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

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

  /** Controlled viewport - when provided, map will update to this center/zoom.
   *  Use for programmatic viewport changes (e.g., setViewport messages from VS Code). */
  viewport?: { center: [number, number]; zoom: number };

  /** Programmatically trigger fit bounds. Increment to trigger a new fit. */
  fitBoundsTrigger?: number;

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

  /** Current time position for temporal rendering (epoch ms). Enables temporal track rendering when provided. */
  currentTime?: number;

  /** Track display mode: 'full' (entire track + marker) or 'trail' (snail-trail up to current time). */
  displayMode?: DisplayMode;

  /** Set of visible feature IDs. When provided, fit-to-window only considers these features. */
  visibleIds?: Set<string>;

  /** Whether to show the custom toolbar with zoom and fit buttons (default: true) */
  showToolbar?: boolean;

  /** Position of the toolbar (default: 'topleft') */
  toolbarPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
}

// Component to handle map events, auto-fit, and programmatic viewport control
function MapController({
  bounds,
  autoFitBounds,
  viewport,
  fitBoundsTrigger,
  onZoomChange,
  onBoundsChange,
  onBackgroundClick,
}: {
  bounds: Bounds | null;
  autoFitBounds: boolean;
  viewport?: { center: [number, number]; zoom: number };
  fitBoundsTrigger?: number;
  onZoomChange?: (zoom: number) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  onBackgroundClick?: () => void;
}) {
  const map = useMap();
  const prevBoundsRef = useRef<Bounds | null>(null);

  // Auto-fit bounds on initial load or when features change
  useEffect(() => {
    if (autoFitBounds && bounds) {
      // Skip if bounds values haven't actually changed (avoids viewport
      // jumping when features update without changing spatial extent)
      const prev = prevBoundsRef.current;
      if (
        prev &&
        prev[0] === bounds[0] &&
        prev[1] === bounds[1] &&
        prev[2] === bounds[2] &&
        prev[3] === bounds[3]
      ) {
        return;
      }
      prevBoundsRef.current = bounds;
      const [minLon, minLat, maxLon, maxLat] = expandBounds(bounds, 0.1);
      map.fitBounds([[minLat, minLon], [maxLat, maxLon]] as LatLngBoundsExpression);
    }
  }, [map, bounds, autoFitBounds]);

  // Handle programmatic viewport changes (for setViewport messages)
  useEffect(() => {
    if (viewport) {
      map.setView(viewport.center, viewport.zoom, { animate: false });
    }
  }, [map, viewport]);

  // Handle programmatic fit bounds trigger
  useEffect(() => {
    if (fitBoundsTrigger !== undefined && fitBoundsTrigger > 0 && bounds) {
      const [minLon, minLat, maxLon, maxLat] = expandBounds(bounds, 0.1);
      map.fitBounds([[minLat, minLon], [maxLat, maxLon]] as LatLngBoundsExpression);
    }
  }, [map, fitBoundsTrigger, bounds]);

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
  viewport,
  autoFitBounds = true,
  fitBoundsTrigger,
  tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileLayerAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  className,
  style,
  height = 400,
  currentTime,
  displayMode = 'full',
  visibleIds,
  showToolbar = true,
  toolbarPosition = 'topleft',
}: MapViewProps) {
  // Normalize features to array and filter out features that can't be rendered
  const featureArray = useMemo(() => {
    const arr = Array.isArray(features) ? features : features.features;
    // Filter out features with null geometry or empty coordinates
    return arr.filter((f) => {
      if (!f.geometry) return false;
      const coords = f.geometry.coordinates;
      if (Array.isArray(coords) && coords.length === 0) return false;
      return true;
    });
  }, [features]);

  // Separate temporal tracks from static features when temporal rendering is active
  const { temporalFeatures, staticFeatures } = useMemo(() => {
    if (currentTime === undefined) {
      return { temporalFeatures: [] as DebriefFeature[], staticFeatures: featureArray };
    }
    const temporal: DebriefFeature[] = [];
    const nonTemporal: DebriefFeature[] = [];
    for (const f of featureArray) {
      if (extractTemporalData(f)) {
        temporal.push(f);
      } else {
        nonTemporal.push(f);
      }
    }
    return { temporalFeatures: temporal, staticFeatures: nonTemporal };
  }, [featureArray, currentTime]);

  // Calculate bounds for auto-fit (use all features regardless)
  const bounds = useMemo(() => calculateBounds(featureArray), [featureArray]);

  // Calculate bounds for visible features only (for fit-to-window button)
  const visibleBounds = useMemo(() => {
    if (!visibleIds || visibleIds.size === 0) {
      // If no visibleIds provided, use all features
      return bounds;
    }
    const visibleFeatures = featureArray.filter((f) => visibleIds.has(f.id));
    return calculateBounds(visibleFeatures);
  }, [featureArray, visibleIds, bounds]);

  // Create GeoJSON data structure for static (non-temporal) features
  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: staticFeatures.map((f) => ({
      ...f,
      geometry: {
        ...f.geometry,
        // Ensure coordinates are proper arrays for GeoJSON
        coordinates: f.geometry.coordinates,
      },
    })),
  }), [staticFeatures]);

  // Style function for features — reads from properties.style when available
  const featureStyle = useMemo(() => {
    return (feature: GeoJSON.Feature | undefined): PathOptions => {
      if (!feature) return {};

      const debriefFeature = feature as unknown as DebriefFeature;
      const isSelected = selectedIds.has(debriefFeature.id);
      const props = debriefFeature.properties as unknown as Record<string, unknown>;
      const style = props.style as Record<string, unknown> | undefined;
      const color = getFeatureColor(debriefFeature);
      const fillColor = (style?.fill_color as string) ?? color;

      return {
        color: isSelected ? 'var(--debrief-selection-border)' : color,
        weight: isSelected ? 4 : (style?.weight as number) ?? (isTrackFeature(debriefFeature) ? 3 : 2),
        opacity: (style?.opacity as number) ?? 1,
        fillColor: isSelected ? 'var(--debrief-selection-border)' : fillColor,
        fillOpacity: isSelected ? 0.4 : (style?.fill_opacity as number) ?? 0.2,
        dashArray: (style?.dash_array as string) ?? undefined,
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

      // Apply per-ring styles for ZONE MultiPolygon features
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const featureProps = feature.properties as any;
      const zoneRingStyles: Array<{ style?: Record<string, unknown> }> | undefined =
        featureProps?.kind === 'ZONE' &&
        feature.geometry?.type === 'MultiPolygon' &&
        Array.isArray(featureProps?.zones)
          ? featureProps.zones
          : undefined;

      if (zoneRingStyles && 'getLayers' in layer) {
        const subLayers = (layer as unknown as { getLayers(): L.Layer[] }).getLayers();
        subLayers.forEach((subLayer, i) => {
          const s = zoneRingStyles[i]?.style;
          if (s && 'setStyle' in subLayer) {
            (subLayer as unknown as { setStyle(opts: PathOptions): void }).setStyle({
              color: (s.color as string) ?? '#999',
              fillColor: (s.fill_color as string) ?? (s.color as string),
              fillOpacity: (s.fill_opacity as number) ?? 0.2,
              weight: (s.weight as number) ?? 2,
              opacity: 1,
              dashArray: (s.dash_array as string) ?? undefined,
            });
          }
        });
      }
    };
  }, [onSelect]);

  // pointToLayer callback — renders Point and MultiPoint geometries as circle markers
  const pointToLayer = useMemo(() => {
    return (feature: GeoJSON.Feature, latlng: L.LatLng): L.Layer => {
      const debriefFeature = feature as unknown as DebriefFeature;
      const isSelected = selectedIds.has(debriefFeature.id);
      const props = debriefFeature.properties as unknown as Record<string, unknown>;
      const featureStyle = props.style as Record<string, unknown> | undefined;
      const color = (featureStyle?.color as string) ?? getFeatureColor(debriefFeature);
      const fillColor = (featureStyle?.fill_color as string) ?? color;

      return L.circleMarker(latlng, {
        radius: (featureStyle?.radius as number) ?? 6,
        fillColor: isSelected ? 'var(--debrief-selection-border)' : fillColor,
        fillOpacity: isSelected ? 0.6 : (featureStyle?.fill_opacity as number) ?? 0.7,
        color: isSelected ? 'var(--debrief-selection-border)' : color,
        weight: isSelected ? 3 : (featureStyle?.weight as number) ?? 2,
        opacity: (featureStyle?.opacity as number) ?? 1,
      });
    };
  }, [selectedIds]);

  // Track a revision counter for the GeoJSON key — react-leaflet's GeoJSON
  // component only renders on mount, so the key must change whenever data changes.
  const geojsonRevision = useRef(0);
  const prevGeojsonRef = useRef(geojsonData);
  if (prevGeojsonRef.current !== geojsonData) {
    geojsonRevision.current += 1;
    prevGeojsonRef.current = geojsonData;
  }

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
        zoomControl={!showToolbar}
      >
        <TileLayer url={tileLayerUrl} attribution={tileLayerAttribution} />

        {showToolbar && (
          <LeafletToolbar
            position={toolbarPosition}
            visibleBounds={visibleBounds}
          />
        )}

        <MapController
          bounds={bounds}
          autoFitBounds={autoFitBounds}
          viewport={viewport}
          fitBoundsTrigger={fitBoundsTrigger}
          onZoomChange={onZoomChange}
          onBoundsChange={onBoundsChange}
          onBackgroundClick={onBackgroundClick}
        />

        {staticFeatures.length > 0 && (
          <GeoJSON
            key={`geojson-${geojsonRevision.current}-${selectedIds.size}`}
            data={geojsonData}
            style={featureStyle}
            pointToLayer={pointToLayer}
            onEachFeature={onEachFeature}
          />
        )}

        {staticFeatures.filter(isTrackFeature).map((f) => (
          <PositionSymbolsLayer
            key={`pos-${String(f.id)}`}
            feature={f}
            isSelected={selectedIds.has(f.id)}
          />
        ))}

        {currentTime !== undefined && temporalFeatures.map((f) => (
          <TemporalTrackLayer
            key={String(f.id)}
            feature={f}
            currentTime={currentTime}
            displayMode={displayMode}
            isSelected={selectedIds.has(f.id)}
            onClick={onSelect}
          />
        ))}
      </MapContainer>
    </div>
  );
}
