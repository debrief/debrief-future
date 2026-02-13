import type {
  PointProperties,
  PolygonProperties,
  ReferenceLocation,
  RectangleAnnotation,
} from '@debrief/schemas';
import type { DrawingMode } from '../LeafletToolbar';
import { DEFAULT_DRAWN_POINT_STYLE, DEFAULT_DRAWN_RECTANGLE_STYLE } from './drawingDefaults';
import { isValidDrawnGeometry } from './isValidDrawnGeometry';

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
export function createDrawnFeature(
  geojson: GeoJSON.Feature,
  mode: DrawingMode,
  options?: CreateDrawnFeatureOptions,
): ReferenceLocation | RectangleAnnotation | null {
  if (!mode || !isValidDrawnGeometry(geojson, mode)) {
    return null;
  }

  const id = crypto.randomUUID();

  if (mode === 'point') {
    const pointGeometry = geojson.geometry as GeoJSON.Point;
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'Point',
        coordinates: pointGeometry.coordinates,
      },
      properties: {
        kind: 'POINT',
        name: options?.name ?? 'Drawn Point',
        location_type: 'REFERENCE',
        style: {
          ...DEFAULT_DRAWN_POINT_STYLE,
          ...options?.pointStyle,
        },
      },
    } as ReferenceLocation;
  }

  if (mode === 'rectangle') {
    const polygonGeometry = geojson.geometry as GeoJSON.Polygon;
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'Polygon',
        coordinates: polygonGeometry.coordinates,
      },
      properties: {
        kind: 'RECTANGLE',
        label: options?.label ?? 'Drawn Rectangle',
        style: {
          ...DEFAULT_DRAWN_RECTANGLE_STYLE,
          ...options?.rectangleStyle,
        },
      },
    } as RectangleAnnotation;
  }

  return null;
}
