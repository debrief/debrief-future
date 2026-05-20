/**
 * BriefingMap — Leaflet-backed map surface for the briefing renderer.
 *
 * Mounts a `<MapContainer>` + `<TileLayer>` directly (instead of routing
 * through `@debrief/components/MapView`) so the briefing SPA can be
 * iterated on without depending on the full MapView surface — many of
 * MapView's features (drawing toolbar, scene rectangles, sensor layers)
 * are unused inside the briefing context. The four file://-friendly
 * tile-layer props added to MapView by T-MAPVIEW-EXT remain available
 * for a future migration.
 *
 * For each Scene change, the map flies to the Scene's captured viewport
 * via Leaflet `map.flyTo`. The `time_range` interpolation path (#263)
 * lands when the playback driver wires `runTimeRangeTween` into this
 * component's exposed `mapRef`.
 */

import { type FC, useEffect, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { useBriefingStore } from '../store';

export interface BriefingMapProps {
  onMapReady?: (map: LeafletMap) => void;
}

export const BriefingMap: FC<BriefingMapProps> = ({ onMapReady }) => {
  const config = useBriefingStore((s) => s.config);
  const scenes = useBriefingStore((s) => s.scenes);
  const currentSceneIndex = useBriefingStore((s) => s.currentSceneIndex);
  const mapRef = useRef<LeafletMap | null>(null);

  const currentScene = scenes[currentSceneIndex] ?? scenes[0] ?? null;
  const initialCenter: [number, number] = currentScene?.properties.viewport
    ? // viewport.center is [lon, lat]; Leaflet wants [lat, lon]
      [
        (currentScene.properties.viewport.center?.[1] as number) ?? 50,
        (currentScene.properties.viewport.center?.[0] as number) ?? -4,
      ]
    : [50, -4];
  const initialZoom = currentScene?.properties.viewport?.zoom ?? 6;

  // Fly to the current Scene's viewport whenever the index changes.
  useEffect(() => {
    if (!mapRef.current || !currentScene) return;
    const v = currentScene.properties.viewport;
    if (!v) return;
    const center: [number, number] = [v.center?.[1] as number, v.center?.[0] as number];
    const duration =
      (currentScene.properties as { transition_duration_ms?: number }).transition_duration_ms ?? 1000;
    mapRef.current.flyTo(center, v.zoom, { duration: Math.max(0.25, duration / 1000) });
  }, [currentSceneIndex, currentScene]);

  const handleMapReady = (map: LeafletMap) => {
    mapRef.current = map;
    onMapReady?.(map);
  };

  return (
    <div data-testid="briefing-map" style={{ position: 'absolute', inset: 0 }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        maxZoom={config?.maxBundledZoom ?? 18}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        whenReady={() => {
          // `whenReady` doesn't pass the map; pull it from the container.
          // react-leaflet exposes the ref via `MapContainer` instance API.
        }}
        ref={(instance: LeafletMap | null) => {
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
      </MapContainer>
    </div>
  );
};
