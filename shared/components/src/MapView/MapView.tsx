import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { PathOptions, LatLngBoundsExpression } from 'leaflet';
import type { DebriefFeature, DebriefFeatureCollection, Bounds, DisplayMode } from '../utils/types';
import { calculateBounds, expandBounds } from '@debrief/utils';
import { getFeatureColor, getFeatureLabel } from '../utils/labels';
import { isTrackFeature } from '../utils/types';
import { extractTemporalData } from './temporal-utils';
import { TemporalTrackLayer } from './TemporalTrackLayer';
import { PositionSymbolsLayer } from './PositionSymbolsLayer';
import { SensorBearingLayer } from './SensorBearingLayer';
import { LeafletToolbar } from './LeafletToolbar';
import type { DrawingMode } from './LeafletToolbar';
import { SceneRectangleLayer } from './SceneRectangleLayer';
import type { SceneRectangleLayerProps } from './SceneRectangleLayer';
import { DrawingGuidanceOverlay } from './DrawingGuidanceOverlay/DrawingGuidanceOverlay';
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

  /** Current drawing mode (null = no drawing active) (FR-009) */
  drawingMode?: DrawingMode;

  /** Callback when drawing mode changes (FR-004, FR-006, FR-007, FR-008) */
  onDrawingModeChange?: (mode: DrawingMode) => void;

  /** Callback when a shape is drawn via Geoman. Called with raw GeoJSON and the active drawing mode. */
  onShapeCreated?: (geojson: GeoJSON.Feature, mode: DrawingMode) => void;

  // ── NEW for #217 ─────────────────────────────────────────────────

  /**
   * Animated viewport target. When set, the MapView animates to this
   * viewport's centre + zoom via Leaflet `L.Map.flyTo`. `null` means
   * "no pending animation" (the typical idle state).
   *
   * Each time this prop transitions to a new `token`, the MapView
   * kicks off a new animation. The caller is responsible for generating
   * a fresh token per transition.
   */
  flyToTarget?: FlyToTarget | null;

  /** Fires when an in-flight flyTo animation completes (Leaflet `moveend`). */
  onFlyToComplete?: (token: number) => void;

  /**
   * The Scene Features to render as faint rectangles on the map. When
   * provided, a `SceneRectangleLayer` is rendered inside the `MapContainer`.
   */
  sceneRectangles?: SceneRectangleLayerProps;

  /** Fires when a Scene rectangle is clicked. Convenience re-export of
   *  `SceneRectangleLayerProps.onSceneRectangleClick`. */
  onSceneRectangleClick?: (sceneId: string) => void;

  /**
   * Predicate invoked for each feature before it is rendered in the
   * base GeoJSON layer. Return `false` to exclude the feature. Defaults
   * to excluding `STORYBOARD` and `STORYBOARD_SCENE` features (which
   * are either invisible or rendered by the dedicated
   * `SceneRectangleLayer`). See `map-view-flyto.md` §5 / FR-PLAY-015.
   */
  shouldRenderInBaseLayer?: (feature: GeoJSON.Feature) => boolean;
}

/**
 * Animated viewport target for the {@link MapView.flyToTarget} prop.
 */
export interface FlyToTarget {
  /** Monotonically-increasing identifier — each new transition gets a
   *  new token; repeated values are idempotent. */
  readonly token: number;

  /** Centre + zoom. Typically resolved from a Scene's `viewport`. */
  readonly center: readonly [number, number];  // [lat, lon]
  readonly zoom: number;

  /** Animation duration in ms. `0` means "jump without animation". */
  readonly durationMs: number;
}

// Component to handle map events, auto-fit, and programmatic viewport control
function MapController({
  bounds,
  autoFitBounds,
  viewport,
  fitBoundsTrigger,
  flyToTarget,
  onFlyToComplete,
  onZoomChange,
  onBoundsChange,
  onBackgroundClick,
}: {
  bounds: Bounds | null;
  autoFitBounds: boolean;
  viewport?: { center: [number, number]; zoom: number };
  fitBoundsTrigger?: number;
  flyToTarget?: FlyToTarget | null;
  onFlyToComplete?: (token: number) => void;
  onZoomChange?: (zoom: number) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  onBackgroundClick?: () => void;
}) {
  const map = useMap();
  const prevBoundsRef = useRef<Bounds | null>(null);

  // #230 FR-050 — emit an initial bounds report as soon as Leaflet is
  // ready, so downstream capture flows don't fail with "map has not
  // reported a viewport yet" before the user pans/zooms. The session-
  // store reducer is idempotent per field, so this double-emit with the
  // subsequent moveend report is safe.
  useEffect(() => {
    if (!onBoundsChange) return;
    const emitInitialBounds = (): void => {
      try {
        const mb = map.getBounds();
        onBoundsChange([
          mb.getWest(),
          mb.getSouth(),
          mb.getEast(),
          mb.getNorth(),
        ]);
      } catch {
        // Swallow — in test environments the map stub may not expose
        // `getBounds()` synchronously. The next real bounds event still
        // fires on moveend.
      }
    };
    // Cover both arms: immediate emit (map container is sized) + whenReady
    // (Leaflet's initial layout has settled).
    emitInitialBounds();
    if (typeof (map as { whenReady?: unknown }).whenReady === 'function') {
      (
        map as unknown as {
          whenReady: (cb: () => void) => void;
        }
      ).whenReady(emitInitialBounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Handle programmatic fit bounds trigger.
  //
  // PR #625: the previous implementation depended on `bounds` and only
  // gated on `fitBoundsTrigger > 0`, which meant that *any* feature-set
  // change (e.g. a new STORYBOARD_SCENE polygon during capture)
  // recomputed `bounds`, re-ran this effect, and re-fired `fitBounds` —
  // snapping the map back to fit-to-all-features even though the host
  // explicitly sent `refitBounds: false`. Track the last value we
  // fired on and only fire when the trigger has actually advanced.
  const lastFiredFitTrigger = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (fitBoundsTrigger === undefined) return;
    if (fitBoundsTrigger <= 0) return;
    if (fitBoundsTrigger === lastFiredFitTrigger.current) return;
    if (!bounds) return;
    lastFiredFitTrigger.current = fitBoundsTrigger;
    const [minLon, minLat, maxLon, maxLat] = expandBounds(bounds, 0.1);
    map.fitBounds([[minLat, minLon], [maxLat, maxLon]] as LatLngBoundsExpression);
  }, [map, fitBoundsTrigger, bounds]);

  // Handle animated flyTo (#217 FR-PLAY-004). Fires on token change so
  // repeated-value tokens are idempotent but fresh tokens trigger a new
  // animation, superseding any in-flight flight.
  useEffect(() => {
    if (!flyToTarget) return;
    const token = flyToTarget.token;
    if (flyToTarget.durationMs === 0) {
      // Jump without animation. Fire completion synchronously so the
      // caller's transport state machine is not blocked on moveend.
      map.setView(flyToTarget.center as [number, number], flyToTarget.zoom, { animate: false });
      onFlyToComplete?.(token);
      return;
    }
    map.flyTo(flyToTarget.center as [number, number], flyToTarget.zoom, {
      duration: flyToTarget.durationMs / 1000,
      easeLinearity: 0.25,
    });
    const handler = (): void => {
      map.off('moveend', handler);
      onFlyToComplete?.(token);
    };
    map.on('moveend', handler);
    return () => {
      map.off('moveend', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToTarget?.token]);

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
  drawingMode,
  onDrawingModeChange,
  onShapeCreated,
  flyToTarget,
  onFlyToComplete,
  sceneRectangles,
  onSceneRectangleClick,
  shouldRenderInBaseLayer,
}: MapViewProps) {
  // Base-layer filter — defaults to excluding Storyboard parent + Scene
  // features so they are never rendered in the main GeoJSON layer.
  // Scene features are rendered separately via `SceneRectangleLayer`,
  // and Storyboard parents are never rendered (FR-PLAY-015).
  const baseLayerFilter = useMemo(() => {
    if (shouldRenderInBaseLayer) return shouldRenderInBaseLayer;
    return (feature: GeoJSON.Feature): boolean => {
      const kind = (feature.properties as Record<string, unknown> | null | undefined)?.kind;
      return kind !== 'STORYBOARD' && kind !== 'STORYBOARD_SCENE';
    };
  }, [shouldRenderInBaseLayer]);

  // Normalize features to array and filter out features that can't be rendered
  const featureArray = useMemo(() => {
    const arr = Array.isArray(features) ? features : features.features;
    // Filter out features with null geometry or empty coordinates
    return arr.filter((f) => {
      if (!f.geometry) return false;
      const coords = f.geometry.coordinates;
      if (Array.isArray(coords) && coords.length === 0) return false;
      // Apply the base-layer filter (excludes STORYBOARD / STORYBOARD_SCENE
      // by default — see FR-PLAY-015).
      if (!baseLayerFilter(f as unknown as GeoJSON.Feature)) return false;
      return true;
    });
  }, [features, baseLayerFilter]);

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

  // Create GeoJSON data structure for static (non-temporal) features.
  // MultiPolygon features are decomposed into individual Polygon features
  // because Leaflet renders MultiPolygon as a single L.Polygon (not a
  // FeatureGroup), making per-sub-polygon selection/styling impossible.
  const geojsonData = useMemo(() => {
    const expanded: GeoJSON.Feature[] = [];
    for (const f of staticFeatures) {
      // eslint-disable-next-line no-restricted-syntax
      const fProps = f.properties as unknown as Record<string, unknown>;
      const isZone = fProps?.kind === 'ZONE' && f.geometry?.type === 'MultiPolygon';
      if (f.geometry?.type === 'MultiPolygon' && !isZone) {
        // Decompose MultiPolygon into individual Polygons
        // eslint-disable-next-line no-restricted-syntax
        const coords = f.geometry.coordinates as unknown as number[][][][];
        // eslint-disable-next-line no-restricted-syntax
        const overrides = fProps?.position_style_overrides as Record<string, Record<string, unknown>> | undefined;
        for (let i = 0; i < coords.length; i++) {
          // eslint-disable-next-line no-restricted-syntax
          const childStyle: Record<string, unknown> = { ...(fProps?.style as Record<string, unknown> ?? {}) };
          // eslint-disable-next-line no-restricted-syntax
          // Merge per-polygon overrides into the child style
          const ov = overrides?.[String(i)];
          if (ov) {
            for (const [k, v] of Object.entries(ov)) {
              childStyle[k] = v;
            }
          }
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          expanded.push({
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            type: 'Feature',
            id: `${f.id}/polygons/${i}`,
            geometry: { type: 'Polygon', coordinates: coords[i] },
            properties: {
              ...fProps,
              style: childStyle,
              _parentId: f.id,
              _childIndex: i,
            },
          } as GeoJSON.Feature);
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        expanded.push({
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          ...f,
          geometry: f.geometry ? { ...f.geometry, coordinates: f.geometry.coordinates } : { type: 'Point', coordinates: [0, 0] },
        } as GeoJSON.Feature);
      }
    }
    return { type: 'FeatureCollection' as const, features: expanded };
  }, [staticFeatures]);

  // Style function for features — reads from properties.style when available
  const featureStyle = useMemo(() => {
    return (feature: GeoJSON.Feature | undefined): PathOptions => {
      if (!feature) return {};

      // eslint-disable-next-line no-restricted-syntax
      const debriefFeature = feature as unknown as DebriefFeature;
      // eslint-disable-next-line no-restricted-syntax
      const isSelected = selectedIds.has(debriefFeature.id);
      // eslint-disable-next-line no-restricted-syntax
      const props = debriefFeature.properties as unknown as Record<string, unknown>;
      // eslint-disable-next-line no-restricted-syntax
      const style = props.style as Record<string, unknown> | undefined;
      // For tracks, style properties are nested under style.line.*
      // eslint-disable-next-line no-restricted-syntax
      const lineStyle = style?.line as Record<string, unknown> | undefined;
      const color = getFeatureColor(debriefFeature);
      const fillColor = (style?.fill_color as string) ?? color;

      return {
        color,
        weight: isSelected ? 4 : (lineStyle?.weight as number) ?? (style?.weight as number) ?? (isTrackFeature(debriefFeature) ? 3 : 2),
        opacity: (lineStyle?.opacity as number) ?? (style?.opacity as number) ?? 1,
        fillColor,
        fillOpacity: isSelected ? 0.4 : (style?.fill_opacity as number) ?? 0.2,
        dashArray: (lineStyle?.dash_array as string) ?? (style?.dash_array as string) ?? undefined,
      };
    };
  }, [selectedIds]);

  // Event handlers for features
  const onEachFeature = useMemo(() => {
    return (feature: GeoJSON.Feature, layer: L.Layer) => {
      // eslint-disable-next-line no-restricted-syntax
      const debriefFeature = feature as unknown as DebriefFeature;
      // eslint-disable-next-line no-restricted-syntax
      const featureId = debriefFeature.id;
      const label = getFeatureLabel(debriefFeature);

      // Apply selected CSS class on layer options before it's added to the DOM.
      // Leaflet's setStyle() ignores className, so we set it here in
      // onEachFeature (called before addLayer → _initPath reads options.className).
      if (selectedIds.has(featureId) && 'options' in layer) {
        const path = layer as L.Path;
        path.options.className = ((path.options.className ?? '') + ' debrief-map-feature--selected').trim();
      }

      // Add tooltip
      layer.bindTooltip(label, {
        permanent: false,
        direction: 'top',
      });

      // Add popup with feature details including ID
      // eslint-disable-next-line no-restricted-syntax
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      // eslint-disable-next-line no-restricted-syntax
      const popupLines = [`<b>id:</b> ${String(featureId)}`];
      for (const [k, v] of Object.entries(props)) {
        if (k === 'style' || k === 'position_style_overrides' || k === 'positions' || k === 'pointMetadata' || k === 'pointColors' || k === 'zones') continue;
        if (v !== null && v !== undefined && typeof v !== 'object') {
          popupLines.push(`<b>${k}:</b> ${String(v)}`);
        }
      }
      popupLines.push(`<b>geometry.type:</b> ${feature.geometry?.type ?? 'null'}`);
      layer.bindPopup(popupLines.join('<br/>'), { maxWidth: 400 });

      // Click handler — works for all features including decomposed
      // MultiPolygon child polygons (which now have IDs like "parent/polygons/0")
      layer.on('click', (e) => {
        e.originalEvent.stopPropagation();
        // eslint-disable-next-line no-restricted-syntax
        onSelect?.(featureId, e.originalEvent as unknown as React.MouseEvent);
      // eslint-disable-next-line no-restricted-syntax
      });

      // Apply per-ring styles for ZONE MultiPolygon features
      // (ZONEs are kept as MultiPolygon since they use a dedicated zones array)
      // eslint-disable-next-line no-restricted-syntax
      const featureProps = feature.properties as unknown as Record<string, unknown>;
      // eslint-disable-next-line no-restricted-syntax
      if (
        featureProps?.kind === 'ZONE' &&
        feature.geometry?.type === 'MultiPolygon' &&
        Array.isArray(featureProps?.zones) &&
        'getLayers' in layer
      ) {
        // eslint-disable-next-line no-restricted-syntax
        const subLayers = (layer as unknown as { getLayers(): L.Layer[] }).getLayers();
        // eslint-disable-next-line no-restricted-syntax
        const zones = featureProps.zones as Array<{ style?: Record<string, unknown> }>;
        subLayers.forEach((subLayer, i) => {
          const s = zones[i]?.style;
          if (s && 'setStyle' in subLayer) {
            // eslint-disable-next-line no-restricted-syntax
            (subLayer as unknown as { setStyle(opts: PathOptions): void }).setStyle({
              // eslint-disable-next-line no-restricted-syntax
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
  }, [onSelect, selectedIds]);

  // pointToLayer callback — renders Point and MultiPoint geometries as circle markers
  // For classified MultiPoint features, uses per-point colors from pointColors array.
  const pointToLayer = useMemo(() => {
    return (feature: GeoJSON.Feature, latlng: L.LatLng): L.Layer => {
      // eslint-disable-next-line no-restricted-syntax
      const debriefFeature = feature as unknown as DebriefFeature;
      // eslint-disable-next-line no-restricted-syntax
      const isSelected = selectedIds.has(debriefFeature.id);
      // eslint-disable-next-line no-restricted-syntax
      const props = debriefFeature.properties as unknown as Record<string, unknown>;
      // eslint-disable-next-line no-restricted-syntax
      const featureStyle = props.style as Record<string, unknown> | undefined;
      const defaultColor = (featureStyle?.color as string) ?? getFeatureColor(debriefFeature);
      const defaultFill = (featureStyle?.fill_color as string) ?? defaultColor;

      // Per-point color lookup for classified MultiPoint features:
      // Match latlng back to coordinate index to look up pointColors[i].
      let fillColor = defaultFill;
      let color = defaultColor;
      // eslint-disable-next-line react/prop-types -- dynamic GeoJSON property, not a React prop
      const pointColors = props.pointColors as string[] | undefined;
      if (pointColors && feature.geometry?.type === 'MultiPoint') {
        const coords = (feature.geometry as GeoJSON.MultiPoint).coordinates;
        for (let i = 0; i < coords.length; i++) {
          // Leaflet swaps lon/lat to lat/lng — match with tolerance
          if (
            Math.abs(coords[i]![1]! - latlng.lat) < 1e-9 &&
            Math.abs(coords[i]![0]! - latlng.lng) < 1e-9
          ) {
            fillColor = pointColors[i] ?? defaultFill;
            color = pointColors[i] ?? defaultColor;
            break;
          }
        }
      }

      const baseRadius = (featureStyle?.radius as number) ?? 6;
      return L.circleMarker(latlng, {
        radius: isSelected ? baseRadius + 2 : baseRadius,
        fillColor,
        fillOpacity: isSelected ? 0.6 : (featureStyle?.fill_opacity as number) ?? 0.7,
        color,
        weight: isSelected ? 3 : (featureStyle?.weight as number) ?? 2,
        opacity: (featureStyle?.opacity as number) ?? 1,
        className: isSelected ? 'debrief-map-feature--selected' : undefined,
      });
    };
  }, [selectedIds]);

  // Track revision counters for the GeoJSON key — react-leaflet's GeoJSON
  // component only renders on mount, so the key must change whenever data
  // or selection changes to force re-mount with updated styles.
  const geojsonRevision = useRef(0);
  const prevGeojsonRef = useRef(geojsonData);
  if (prevGeojsonRef.current !== geojsonData) {
    geojsonRevision.current += 1;
    prevGeojsonRef.current = geojsonData;
  }

  const selectionRevision = useRef(0);
  const prevSelectedRef = useRef(selectedIds);
  if (prevSelectedRef.current !== selectedIds) {
    selectionRevision.current += 1;
    prevSelectedRef.current = selectedIds;
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
        <TileLayer url={tileLayerUrl} attribution={tileLayerAttribution} crossOrigin="anonymous" />

        {showToolbar && (
          <LeafletToolbar
            position={toolbarPosition}
            visibleBounds={visibleBounds}
            drawingMode={drawingMode}
            onDrawingModeChange={onDrawingModeChange}
            onShapeCreated={onShapeCreated}
          />
        )}

        <MapController
          bounds={bounds}
          autoFitBounds={autoFitBounds}
          viewport={viewport}
          fitBoundsTrigger={fitBoundsTrigger}
          flyToTarget={flyToTarget}
          onFlyToComplete={onFlyToComplete}
          onZoomChange={onZoomChange}
          onBoundsChange={onBoundsChange}
          onBackgroundClick={onBackgroundClick}
        />

        {sceneRectangles && (
          <SceneRectangleLayer
            {...sceneRectangles}
            onSceneRectangleClick={(sceneId) => {
              sceneRectangles.onSceneRectangleClick(sceneId);
              onSceneRectangleClick?.(sceneId);
            }}
          />
        )}

        {staticFeatures.length > 0 && (
          <GeoJSON
            key={`geojson-${geojsonRevision.current}-sel-${selectionRevision.current}`}
            data={geojsonData}
            style={featureStyle}
            pointToLayer={pointToLayer}
            onEachFeature={onEachFeature}
          />
        )}

        {staticFeatures.filter(isTrackFeature).map((f) => (
          <PositionSymbolsLayer
            key={`pos-${String(f.id)}-sel-${selectionRevision.current}`}
            feature={f}
            isSelected={selectedIds.has(f.id)}
            selectedIds={selectedIds}
          />
        ))}

        {currentTime !== undefined && temporalFeatures.map((f) => (
          <TemporalTrackLayer
            key={String(f.id)}
            feature={f}
            currentTime={currentTime}
            displayMode={displayMode}
            isSelected={selectedIds.has(f.id)}
            selectedIds={selectedIds}
            onClick={onSelect}
          />
        ))}

        {currentTime !== undefined && temporalFeatures
          .filter(isTrackFeature)
          .filter((f) => {
            // eslint-disable-next-line no-restricted-syntax
            const sensors = (f.properties as unknown as Record<string, unknown>).sensors as unknown[] | undefined;
            return sensors && sensors.length > 0;
          })
          .map((f) => (
            <SensorBearingLayer
              key={`sensor-${String(f.id)}`}
              feature={f}
              currentTime={currentTime}
              displayMode={displayMode}
            />
          ))}
      </MapContainer>
      <DrawingGuidanceOverlay drawingMode={drawingMode ?? null} />
    </div>
  );
}
