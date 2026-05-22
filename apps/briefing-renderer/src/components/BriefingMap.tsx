/**
 * BriefingMap — Leaflet-backed map surface for the briefing renderer.
 *
 * Mounts a `<MapContainer>` + `<TileLayer>` + a per-Scene `<GeoJSON>`
 * layer that draws only the features `visible_feature_ids` of the
 * current Scene names. The four file://-friendly tile-layer props added
 * to MapView by T-MAPVIEW-EXT remain available for a future migration
 * (the briefing SPA uses react-leaflet directly to avoid pulling in
 * MapView's drawing toolbar, scene rectangles, and sensor layers — none
 * of which the briefing needs).
 *
 * For each Scene change, the map flies to the Scene's captured viewport
 * via Leaflet `map.flyTo`. The `time_range` interpolation path (#263)
 * lands when the playback driver wires `runTimeRangeTween` into this
 * component's exposed `mapRef`.
 */

import { type FC, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import type { Map as LeafletMap, PathOptions } from 'leaflet';
import { useBriefingStore } from '../store';
import { useBrowserMapAdapter, usePlaybackDriver } from '../playback/PlaybackProvider';

export interface BriefingMapProps {
  onMapReady?: (map: LeafletMap) => void;
}

interface FeatureLike {
  type?: string;
  id?: unknown;
  geometry?: { type?: string; coordinates?: unknown };
  properties?: {
    kind?: string;
    id?: string;
    name?: string;
    colour?: string;
    [k: string]: unknown;
  } | null;
}

const DEFAULT_TRACK_COLOR = '#1f77b4';
const DEFAULT_POINT_COLOR = '#2ca02c';

export const BriefingMap: FC<BriefingMapProps> = ({ onMapReady }) => {
  const config = useBriefingStore((s) => s.config);
  const features = useBriefingStore((s) => s.features);
  const scenes = useBriefingStore((s) => s.scenes);
  const currentSceneIndex = useBriefingStore((s) => s.currentSceneIndex);
  const mapRef = useRef<LeafletMap | null>(null);
  const mapAdapter = useBrowserMapAdapter();
  const driver = usePlaybackDriver();

  const currentScene = scenes[currentSceneIndex] ?? scenes[0] ?? null;
  const initialCenter: [number, number] = currentScene?.properties.viewport
    ? // viewport.center is [lon, lat]; Leaflet wants [lat, lon]
      [
        (currentScene.properties.viewport.center?.[1] as number) ?? 50,
        (currentScene.properties.viewport.center?.[0] as number) ?? -4,
      ]
    : [50, -4];
  const initialZoom = currentScene?.properties.viewport?.zoom ?? 6;

  // Compute the visible features for the current Scene. Tracks + line
  // features go through `<GeoJSON>`; reference points go through
  // `<CircleMarker>` so they show as obvious dots.
  const visibleFeatureIds = useMemo<Set<string>>(() => {
    const ids = (currentScene?.properties as { visible_feature_ids?: unknown })?.visible_feature_ids;
    if (Array.isArray(ids)) return new Set(ids.filter((x): x is string => typeof x === 'string'));
    return new Set<string>();
  }, [currentScene]);

  const { lineFeatures, pointFeatures } = useMemo(() => {
    const lines: FeatureLike[] = [];
    const points: FeatureLike[] = [];
    if (!features) return { lineFeatures: lines, pointFeatures: points };
    for (const f of (features.features as FeatureLike[]) ?? []) {
      const kind = f.properties?.kind;
      // Skip Storyboard / Scene wrappers.
      if (kind === 'STORYBOARD' || kind === 'STORYBOARD_SCENE') continue;
      // Honour the Scene's visibility set (when populated). An empty set
      // is treated as "show everything" — useful for the first Scene
      // before scoping kicks in.
      const fid = (f.properties?.id ?? f.id) as string | undefined;
      if (visibleFeatureIds.size > 0 && fid && !visibleFeatureIds.has(fid)) continue;
      const geomType = f.geometry?.type;
      if (geomType === 'Point') {
        points.push(f);
      } else if (
        geomType === 'LineString' ||
        geomType === 'MultiLineString' ||
        geomType === 'Polygon' ||
        geomType === 'MultiPolygon'
      ) {
        lines.push(f);
      }
    }
    return { lineFeatures: lines, pointFeatures: points };
  }, [features, visibleFeatureIds]);

  const geoJsonCollection = useMemo<FeatureCollection | null>(() => {
    if (lineFeatures.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features: lineFeatures as Feature[],
    };
  }, [lineFeatures]);

  const styleFeature = (feature?: Feature): PathOptions => {
    const colour =
      (feature?.properties as { colour?: string } | undefined)?.colour ??
      DEFAULT_TRACK_COLOR;
    return {
      color: colour,
      weight: 3,
      opacity: 0.85,
    };
  };

  // Once the map mounts, run the driver to land on Scene 0.
  useEffect(() => {
    if (!mapRef.current) return;
    void driver.syncToCurrentScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneIndex]);

  const handleMapReady = (map: LeafletMap): void => {
    mapRef.current = map;
    mapAdapter.setMap(map);
    onMapReady?.(map);
    void driver.syncToCurrentScene();
  };

  // Re-key the GeoJSON layer whenever the visibility set changes so
  // react-leaflet re-renders cleanly (the layer caches by reference).
  const geoJsonKey = useMemo(
    () => `${currentSceneIndex}:${Array.from(visibleFeatureIds).sort().join(',')}`,
    [currentSceneIndex, visibleFeatureIds],
  );

  return (
    <div data-testid="briefing-map" style={{ position: 'absolute', inset: 0 }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        maxZoom={config?.maxBundledZoom ?? 18}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        ref={(instance: LeafletMap | null): void => {
          if (instance) handleMapReady(instance);
        }}
      >
        <TileLayer
          url="./tiles/{z}/{x}/{y}.png"
          attribution={config?.tileLayerAttribution ?? ''}
          {...(config?.maxBundledZoom !== undefined ? { maxZoom: config.maxBundledZoom } : {})}
          noWrap
          errorTileUrl="./tiles/placeholder.png"
        />
        {geoJsonCollection ? (
          <GeoJSON key={geoJsonKey} data={geoJsonCollection} style={styleFeature} />
        ) : null}
        {pointFeatures.map((f) => {
          const coords = f.geometry?.coordinates as [number, number] | undefined;
          if (!coords) return null;
          const colour = f.properties?.colour ?? DEFAULT_POINT_COLOR;
          const name = (f.properties?.name as string | undefined) ?? '';
          const fid = (f.properties?.id ?? f.id) as string;
          return (
            <CircleMarker
              key={`${geoJsonKey}-${fid}`}
              center={[coords[1], coords[0]]}
              pathOptions={{ color: colour, fillColor: colour, fillOpacity: 0.85 }}
              radius={6}
            >
              {name ? <Popup>{name}</Popup> : null}
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};
