import { LineProperties, PointProperties, PolygonProperties, ReferenceLocation, RectangleAnnotation, PolyAnnotation, LineAnnotation } from '../../../../schemas/src/generated/typescript/index.ts';
import { DrawingMode } from '../LeafletToolbar';

/** Provenance metadata for a user-drawn feature (FR-012) */
export interface DrawnFeatureProvenance {
    source: string;
    timestamp: string;
    operator: string;
    action: string;
}
export interface CreateDrawnFeatureOptions {
    /** Override default point style */
    pointStyle?: Partial<PointProperties>;
    /** Override default rectangle style */
    rectangleStyle?: Partial<PolygonProperties>;
    /** Override default polygon style */
    polygonStyle?: Partial<PolygonProperties>;
    /** Override default polyline style */
    polylineStyle?: Partial<LineProperties>;
    /** Custom name for the feature (point only) */
    name?: string;
    /** Custom label for the feature (rectangle, polygon, polyline) */
    label?: string;
    /** Provenance metadata to embed in the feature (FR-012) */
    provenance?: DrawnFeatureProvenance;
}
/**
 * Converts raw GeoJSON output from Geoman into a schema-compliant Debrief feature.
 *
 * - For point mode: returns a ReferenceLocation (kind=POINT) with default name and styling
 * - For rectangle mode: returns a RectangleAnnotation (kind=RECTANGLE) with default styling
 * - For polygon mode: returns a PolyAnnotation (kind=POLY) with vertex_count and default styling
 * - For polyline mode: returns a LineAnnotation (kind=LINE) with default styling
 * - Returns null if geometry validation fails or mode is unsupported
 *
 * Pure function — no side effects, no DOM access, no state mutations.
 */
export declare function createDrawnFeature(geojson: GeoJSON.Feature, mode: DrawingMode, options?: CreateDrawnFeatureOptions): ReferenceLocation | RectangleAnnotation | PolyAnnotation | LineAnnotation | null;
//# sourceMappingURL=createDrawnFeature.d.ts.map