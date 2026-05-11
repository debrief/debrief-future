import { LatLngTuple } from 'leaflet';
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
export declare function SceneRectangleLayer({ scenes, activeStoryboardId, currentSceneId, onSceneRectangleClick, }: SceneRectangleLayerProps): JSX.Element | null;
//# sourceMappingURL=SceneRectangleLayer.d.ts.map