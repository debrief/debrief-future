/**
 * SceneRectangleLayer — presentational react-leaflet layer that renders
 * the active Storyboard's Scene viewport Polygons as faint rectangles on
 * the map (Feature 217 — FR-PLAY-015/016/018).
 *
 * Zero VS Code imports; works unchanged in Storybook, web-shell, and the
 * VS Code webview host. See
 * `specs/217-storyboarding-playback/contracts/scene-rectangle-layer.md`
 * for the authoritative contract.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Polygon, useMap } from 'react-leaflet';
import L, {
  type LatLngTuple,
  type LeafletMouseEvent,
  type Map as LeafletMap,
  type Polygon as LeafletPolygon,
} from 'leaflet';
import type { SceneFeature } from '@debrief/schemas';
import { useTheme } from '../hooks/useTheme';
import { getThemeTokens, mergeThemeTokens } from '../ThemeProvider/defaultTheme';

export interface SceneRectangleLayerProps {
  /**
   * Scene Features to render. The caller (the playback service, via
   * `MapPanel.setSceneRectangles`) is responsible for pre-filtering to
   * the active Storyboard's Scenes. Empty array renders nothing.
   */
  readonly scenes: ReadonlyArray<SceneFeature>;

  /**
   * Scopes rendering. If `null`, the layer renders nothing even if
   * `scenes` is non-empty (defence-in-depth against render drift during
   * dropdown transitions).
   */
  readonly activeStoryboardId: string | null;

  /** The Scene whose rectangle should draw with the "current" visual
   *  treatment. `null` when the Storyboard is empty. */
  readonly currentSceneId: string | null;

  /** Fires on rectangle click. */
  onSceneRectangleClick(sceneId: string): void;
}

/**
 * Convert GeoJSON Polygon coordinates (lon,lat) into react-leaflet's
 * expected LatLngTuple (lat,lon) array. Uses only the outer ring —
 * storyboard viewports are always simple rectangles.
 *
 * The outer ring's first and last points are identical (GeoJSON closing
 * rule); Leaflet handles the duplicate gracefully so no trim needed.
 */
export function geoJsonPolygonToLeafletCoords(
  coordinates: GeoJSON.Polygon['coordinates'],
): LatLngTuple[] {
  if (!coordinates || coordinates.length === 0) return [];
  const outerRing = coordinates[0];
  if (!outerRing) return [];
  return outerRing.map(([lon, lat]) => [lat, lon] as LatLngTuple);
}

/** Approximate centroid of a Scene's viewport Polygon, in [lon, lat] degrees. */
function sceneCentroid(scene: SceneFeature): [number, number] | null {
  const coords = (scene.geometry as GeoJSON.Polygon | undefined)?.coordinates;
  if (!coords || coords.length === 0) return null;
  const ring = coords[0];
  if (!ring || ring.length === 0) return null;
  let lonSum = 0;
  let latSum = 0;
  // GeoJSON ring repeats the first point as the last — skip the closing
  // duplicate so the centroid is not biased.
  const n = ring.length > 1 && ring[0]![0] === ring[ring.length - 1]![0]
    && ring[0]![1] === ring[ring.length - 1]![1]
    ? ring.length - 1
    : ring.length;
  for (let i = 0; i < n; i++) {
    lonSum += ring[i]![0]!;
    latSum += ring[i]![1]!;
  }
  return [lonSum / n, latSum / n];
}

/** Approximate "diagonal" of a Scene's viewport Polygon in degrees. */
function sceneDiagonal(scene: SceneFeature): number {
  const coords = (scene.geometry as GeoJSON.Polygon | undefined)?.coordinates;
  if (!coords || coords.length === 0) return 0;
  const ring = coords[0];
  if (!ring || ring.length < 2) return 0;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of ring) {
    if (!p) continue;
    const lon = p[0]!;
    const lat = p[1]!;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const dx = maxLon - minLon;
  const dy = maxLat - minLat;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute per-Scene overlap ranks. Two rectangles overlap if their
 * viewport centres are within 10% of the smaller viewport's diagonal.
 * Stable sort by timestamp; `overlapRank` = 0-based index of this Scene
 * among its overlap cluster (ascending timestamp).
 *
 * Cheap O(n²) scan — fine for ≤ 50 Scenes per Storyboard.
 */
export function computeOverlapRanks(scenes: ReadonlyArray<SceneFeature>): number[] {
  const n = scenes.length;
  const ranks = new Array<number>(n).fill(0);
  if (n <= 1) return ranks;
  // Precompute centroids + diagonals.
  const centroids: Array<[number, number] | null> = scenes.map(sceneCentroid);
  const diagonals = scenes.map(sceneDiagonal);
  // Stable sort indices by timestamp (ascending).
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const ta = scenes[a]!.properties.timestamp;
    const tb = scenes[b]!.properties.timestamp;
    if (ta < tb) return -1;
    if (ta > tb) return 1;
    return a - b;
  });
  // Walk in order; for each Scene count how many prior Scenes are in its cluster.
  for (let k = 0; k < order.length; k++) {
    const i = order[k]!;
    const ci = centroids[i];
    if (!ci) continue;
    let rank = 0;
    for (let j = 0; j < k; j++) {
      const p = order[j]!;
      const cj = centroids[p];
      if (!cj) continue;
      const dx = ci[0] - cj[0];
      const dy = ci[1] - cj[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const smallerDiag = Math.min(diagonals[i] ?? 0, diagonals[p] ?? 0);
      if (smallerDiag > 0 && dist <= smallerDiag * 0.1) {
        rank++;
      }
    }
    ranks[i] = rank;
  }
  return ranks;
}

/**
 * FR-PLAY-018: opacity decreases with overlap rank so multiple Scenes
 * with the same centroid remain individually visible.
 */
export function computeFillOpacity(
  _scene: SceneFeature,
  overlapRank: number,
  isCurrent: boolean,
): number {
  const base = isCurrent ? 0.28 : 0.18;
  const step = 0.04;
  return Math.max(0.10, base - step * overlapRank);
}

/**
 * Recompute a scene's rectangle polygon from its stored viewport + current
 * map dimensions (Spec #258 / FR-006). Used as a render-time fallback for
 * legacy scenes whose stored polygon predates the bounds-derived capture
 * path (`_polygon_source` absent or anything other than `'bounds'`).
 *
 * Mechanism: query the map for its current container size and project the
 * top-left and bottom-right pixels back to lat/lng. The polygon is
 * temporarily centred on the scene's stored viewport centre by panning the
 * map's projection origin — but Leaflet has no "project as if centred here"
 * primitive, so instead we project at the current centre and translate the
 * resulting bounds to the scene's viewport centre. This is correct in the
 * common-zoom case (pixels-per-degree latitude is constant at fixed zoom);
 * a small distortion appears at extreme latitudes which is acceptable for a
 * fallback that only fires for legacy scenes.
 */
export function recomputeFromViewport(
  viewport: SceneFeature['properties']['viewport'],
  map: LeafletMap,
): GeoJSON.Polygon {
  const size = map.getSize();
  // Project current bounds, then translate to the stored centre.
  const currentCentre = map.getCenter();
  const currentSW = map.containerPointToLatLng([0, size.y]);
  const currentNE = map.containerPointToLatLng([size.x, 0]);
  const dLat = currentNE.lat - currentSW.lat;
  const dLng = currentNE.lng - currentSW.lng;
  const sceneCentreLng = viewport.center[0] ?? currentCentre.lng;
  const sceneCentreLat = viewport.center[1] ?? currentCentre.lat;
  // The recompute path is approximate at this caller's zoom — use the
  // current half-extent rather than re-projecting at the stored zoom,
  // because Leaflet's projection helpers don't let us swap zoom without
  // mutating the map's state. For the legacy-recompute use case (close to
  // the user's current zoom) this is visually correct.
  const halfLat = Math.abs(dLat) / 2;
  const halfLng = Math.abs(dLng) / 2;
  const minLng = sceneCentreLng - halfLng;
  const maxLng = sceneCentreLng + halfLng;
  const minLat = sceneCentreLat - halfLat;
  const maxLat = sceneCentreLat + halfLat;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minLng, minLat],
        [minLng, maxLat],
        [maxLng, maxLat],
        [maxLng, minLat],
        [minLng, minLat],
      ],
    ],
  };
}

/**
 * Decide which polygon to render for a given scene (Spec #258).
 *
 * `'bounds'` provenance → trust the stored geometry (the post-#258 norm —
 * computed from real `map.getBounds()` at capture time).
 *
 * Absent / `'placeholder'` / `'manual'` → recompute on the fly from
 * `(viewport, current map dimensions)` so legacy ~100m placeholder squares
 * are never shown to the author. The on-disk geometry is NEVER rewritten
 * (Article III.2 — source preservation).
 */
export function pickPolygonForRender(
  scene: SceneFeature,
  map: LeafletMap | null,
): GeoJSON.Polygon {
  const stored = scene.geometry as GeoJSON.Polygon;
  const source = scene.properties._polygon_source;
  if (source === 'bounds') return stored;
  if (map === null) return stored;
  return recomputeFromViewport(scene.properties.viewport, map);
}

export function SceneRectangleLayer({
  scenes,
  activeStoryboardId,
  currentSceneId,
  onSceneRectangleClick,
}: SceneRectangleLayerProps): JSX.Element | null {
  const { theme, resolvedVariant } = useTheme();
  const tokens = useMemo(
    () => mergeThemeTokens(getThemeTokens(resolvedVariant), theme.tokens),
    [resolvedVariant, theme.tokens],
  );

  // Spec #258 — `useMap` returns the parent MapContainer's Leaflet instance.
  // The hook is always called (React rules of hooks); when the component is
  // rendered outside a MapContainer (Storybook / unit tests can do this) the
  // hook returns null, and `pickPolygonForRender` falls back to the stored
  // geometry.
  const map = useMap() as LeafletMap | null;
  const mapZoom = map?.getZoom() ?? null;

  // Stable sort by timestamp so later-rendered (more recent) polygons
  // end up on top — Leaflet's default z-order guarantees the most recent
  // wins on overlapping clicks.
  const renderOrder = useMemo(() => {
    const arr = scenes.slice();
    arr.sort((a, b) => {
      const ta = a.properties.timestamp;
      const tb = b.properties.timestamp;
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });
    return arr;
  }, [scenes]);

  const overlapRanks = useMemo(() => computeOverlapRanks(scenes), [scenes]);
  const rankById = useMemo(() => {
    const m = new Map<string, number>();
    scenes.forEach((scene, i) => {
      m.set(scene.properties.id, overlapRanks[i] ?? 0);
    });
    return m;
  }, [scenes, overlapRanks]);

  // Memoise the polygon-for-render decision keyed on (scene.id, mapZoom) so
  // stable pan/zoom doesn't re-invoke the recompute path for legacy scenes
  // (Spec #258 — see SceneRectangleLayer notes in the plan).
  const polygonByScene = useMemo(() => {
    const m = new Map<string, GeoJSON.Polygon>();
    for (const scene of scenes) {
      m.set(scene.properties.id, pickPolygonForRender(scene, map));
    }
    return m;
    // mapZoom is the recompute-path's only dynamic dependency; spread
    // scenes & map across the memo key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, map, mapZoom]);

  // Gate — no active storyboard or no scenes: render nothing.
  if (activeStoryboardId === null || scenes.length === 0) {
    return null;
  }

  const strokeColor = tokens.sceneRectangleStroke;
  const fillColor = tokens.sceneRectangleFill;

  return (
    <>
      {renderOrder.map((scene) => {
        const sceneId = scene.properties.id;
        const isCurrent = sceneId === currentSceneId;
        const overlapRank = rankById.get(sceneId) ?? 0;
        const polygon =
          polygonByScene.get(sceneId) ?? (scene.geometry as GeoJSON.Polygon);
        const positions = geoJsonPolygonToLeafletCoords(polygon.coordinates);
        // Spec #258 / FR-007: the active scene reuses the same drop-shadow +
        // pulse halo as selected tracks (`debrief-map-feature--selected`).
        const className = [
          'debrief-scene-rect',
          isCurrent ? 'debrief-scene-rect--current' : null,
          isCurrent ? 'debrief-map-feature--selected' : null,
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <SceneRectanglePolygon
            key={sceneId}
            sceneId={sceneId}
            positions={positions}
            strokeColor={strokeColor}
            fillColor={fillColor}
            fillOpacity={computeFillOpacity(scene, overlapRank, isCurrent)}
            weight={isCurrent ? 2 : 1}
            opacity={isCurrent ? 0.9 : 0.5}
            className={className}
            onSceneRectangleClick={onSceneRectangleClick}
          />
        );
      })}
    </>
  );
}

interface SceneRectanglePolygonProps {
  sceneId: string;
  positions: LatLngTuple[];
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
  opacity: number;
  className: string;
  onSceneRectangleClick(sceneId: string): void;
}

/**
 * Inner component — owns the Leaflet `Polygon` ref so it can apply the
 * `className` directly to the SVG path element. Spec #258 fix: react-leaflet
 * v4's `pathOptions.className` is consumed by Leaflet's `setStyle()` which
 * does NOT propagate `className` to the rendered SVG (Leaflet honours it
 * only at construction time, but react-leaflet sets style post-construction).
 * Mutating `path.options.className` + the live SVG element's class attribute
 * gives the halo CSS something to attach to.
 */
function SceneRectanglePolygon({
  sceneId,
  positions,
  strokeColor,
  fillColor,
  fillOpacity,
  weight,
  opacity,
  className,
  onSceneRectangleClick,
}: SceneRectanglePolygonProps): JSX.Element {
  const polygonRef = useRef<LeafletPolygon | null>(null);

  useEffect(() => {
    const layer = polygonRef.current;
    if (!layer) return;
    // Persist the class via `layer.options.className` so subsequent Leaflet
    // redraws (e.g. on style updates) re-emit it.
    layer.options.className = className;
    // Apply directly to the rendered SVG path so the change is visible
    // without waiting for the next Leaflet redraw.
    const path = (layer as unknown as { _path?: SVGPathElement })._path;
    if (path) {
      const existing = path.getAttribute('class') ?? '';
      const interactive = existing.includes('leaflet-interactive')
        ? 'leaflet-interactive'
        : '';
      path.setAttribute('class', `${interactive} ${className}`.trim());
    }
  }, [className]);

  return (
    <Polygon
      ref={polygonRef}
      positions={positions}
      pathOptions={{
        color: strokeColor,
        fillColor,
        fillOpacity,
        weight,
        opacity,
        className,
      }}
      eventHandlers={{
        click: (event: LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(event);
          onSceneRectangleClick(sceneId);
        },
      }}
    />
  );
}
