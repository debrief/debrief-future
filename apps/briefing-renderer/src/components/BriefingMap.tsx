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

/**
 * Linear-interpolate a track's position at a given epoch-ms time.
 * Returns `null` if the time falls outside the track's recorded range
 * or the track is missing timestamps.
 */
function interpolateTrackPosition(
  track: FeatureLike,
  currentTimeMs: number,
): [number, number] | null {
  const coords = track.geometry?.coordinates as Array<[number, number]> | undefined;
  const times = (track.properties as { timestamps?: unknown } | null | undefined)?.timestamps;
  if (!coords || !Array.isArray(times) || coords.length < 2) return null;
  if (coords.length !== times.length) return null;
  const epochs = (times as string[]).map((iso) => Date.parse(iso));
  if (epochs.some((e) => Number.isNaN(e))) return null;
  if (currentTimeMs < epochs[0]! || currentTimeMs > epochs[epochs.length - 1]!) return null;
  for (let i = 1; i < epochs.length; i++) {
    const e0 = epochs[i - 1]!;
    const e1 = epochs[i]!;
    if (currentTimeMs <= e1) {
      const span = e1 - e0;
      const f = span > 0 ? (currentTimeMs - e0) / span : 0;
      const c0 = coords[i - 1]!;
      const c1 = coords[i]!;
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f];
    }
  }
  return null;
}

export const BriefingMap: FC<BriefingMapProps> = ({ onMapReady }) => {
  const config = useBriefingStore((s) => s.config);
  const features = useBriefingStore((s) => s.features);
  const scenes = useBriefingStore((s) => s.scenes);
  const currentSceneIndex = useBriefingStore((s) => s.currentSceneIndex);
  const currentTime = useBriefingStore((s) => s.currentTime);
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

  // Per-track "current time" markers. For tracks that carry per-position
  // timestamps, we interpolate the vessel's position at `currentTime`
  // and render a filled circle there. The slider drives `currentTime`;
  // so does the playback driver during time-range Scenes — both paths
  // make the marker visibly move.
  const timeMarkers = useMemo<
    Array<{ id: string; lat: number; lon: number; colour: string; name: string }>
  >(() => {
    const markers: Array<{ id: string; lat: number; lon: number; colour: string; name: string }> = [];
    for (const track of lineFeatures) {
      if (track.geometry?.type !== 'LineString') continue;
      const pos = interpolateTrackPosition(track, currentTime);
      if (!pos) continue;
      const fid = (track.properties?.id ?? track.id) as string | undefined;
      if (!fid) continue;
      markers.push({
        id: fid,
        lat: pos[1],
        lon: pos[0],
        colour: track.properties?.colour ?? DEFAULT_TRACK_COLOR,
        name: (track.properties?.name as string | undefined) ?? '',
      });
    }
    return markers;
  }, [lineFeatures, currentTime]);

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

  // React calls ref callbacks on EVERY render (when the callback identity
  // is a new closure). BriefingMap re-renders whenever `currentTime`
  // changes — and `setCurrentTime` fires every tween frame. If
  // `handleMapReady` ran on each ref-callback invocation it would
  // re-trigger `syncToCurrentScene`, cancelling and restarting the tween
  // every frame — producing the slider-oscillation symptom in #264.
  // Gate by comparing against the stable `mapRef` so the work only runs
  // the first time a new Leaflet map instance is attached.
  const handleMapReady = (map: LeafletMap): void => {
    if (mapRef.current === map) return;
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
        {timeMarkers.map((m) => (
          <CircleMarker
            key={`time-marker-${m.id}`}
            center={[m.lat, m.lon]}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: m.colour,
              fillOpacity: 1,
            }}
            radius={9}
          >
            {m.name ? <Popup>{m.name}</Popup> : null}
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};
