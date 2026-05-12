import { LatLngTuple, Map as LeafletMap } from 'leaflet';
import { SceneFeature } from '../../../schemas/src/generated/typescript/index.ts';

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
export declare function geoJsonPolygonToLeafletCoords(coordinates: GeoJSON.Polygon['coordinates']): LatLngTuple[];
/**
 * Compute per-Scene overlap ranks. Two rectangles overlap if their
 * viewport centres are within 10% of the smaller viewport's diagonal.
 * Stable sort by timestamp; `overlapRank` = 0-based index of this Scene
 * among its overlap cluster (ascending timestamp).
 *
 * Cheap O(n²) scan — fine for ≤ 50 Scenes per Storyboard.
 */
export declare function computeOverlapRanks(scenes: ReadonlyArray<SceneFeature>): number[];
/**
 * FR-PLAY-018: opacity decreases with overlap rank so multiple Scenes
 * with the same centroid remain individually visible.
 */
export declare function computeFillOpacity(_scene: SceneFeature, overlapRank: number, isCurrent: boolean): number;
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
export declare function recomputeFromViewport(viewport: SceneFeature['properties']['viewport'], map: LeafletMap): GeoJSON.Polygon;
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
export declare function pickPolygonForRender(scene: SceneFeature, map: LeafletMap | null): GeoJSON.Polygon;
export declare function SceneRectangleLayer({ scenes, activeStoryboardId, currentSceneId, onSceneRectangleClick, }: SceneRectangleLayerProps): JSX.Element | null;
//# sourceMappingURL=SceneRectangleLayer.d.ts.map