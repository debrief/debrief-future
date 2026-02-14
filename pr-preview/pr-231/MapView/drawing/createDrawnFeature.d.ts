import { PointProperties, PolygonProperties, ReferenceLocation, RectangleAnnotation } from '@debrief/schemas';
import { DrawingMode } from '../LeafletToolbar';

export interface CreateDrawnFeatureOptions {
    /** Override default point style */
    pointStyle?: Partial<PointProperties>;
    /** Override default rectangle style */
    rectangleStyle?: Partial<PolygonProperties>;
    /** Custom name for the feature (point only) */
    name?: string;
    /** Custom label for the feature (rectangle only) */
    label?: string;
}
/**
 * Converts raw GeoJSON output from Geoman into a schema-compliant Debrief feature.
 *
 * - For point mode: returns a ReferenceLocation (kind=POINT) with default name and styling
 * - For rectangle mode: returns a RectangleAnnotation (kind=RECTANGLE) with default styling
 * - Returns null if geometry validation fails or mode is not point/rectangle
 *
 * Pure function — no side effects, no DOM access, no state mutations.
 */
export declare function createDrawnFeature(geojson: GeoJSON.Feature, mode: DrawingMode, options?: CreateDrawnFeatureOptions): ReferenceLocation | RectangleAnnotation | null;
//# sourceMappingURL=createDrawnFeature.d.ts.map