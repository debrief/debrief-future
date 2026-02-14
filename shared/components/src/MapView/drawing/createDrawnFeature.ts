import type {
  LineProperties,
  PointProperties,
  PolygonProperties,
  ReferenceLocation,
  RectangleAnnotation,
  PolyAnnotation,
  LineAnnotation,
} from '@debrief/schemas';
import type { DrawingMode } from '../LeafletToolbar';
import {
  DEFAULT_DRAWN_POINT_STYLE,
  DEFAULT_DRAWN_RECTANGLE_STYLE,
  DEFAULT_DRAWN_POLYGON_STYLE,
  DEFAULT_DRAWN_POLYLINE_STYLE,
} from './drawingDefaults';
import { isValidDrawnGeometry } from './isValidDrawnGeometry';

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
export function createDrawnFeature(
  geojson: GeoJSON.Feature,
  mode: DrawingMode,
  options?: CreateDrawnFeatureOptions,
): ReferenceLocation | RectangleAnnotation | PolyAnnotation | LineAnnotation | null {
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
        coordinates: polygonGeometry.coordinates as unknown as number[],
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

  if (mode === 'polygon') {
    const polygonGeometry = geojson.geometry as GeoJSON.Polygon;
    const ring = polygonGeometry.coordinates[0]!;
    // vertex_count = unique vertices, excluding the closure point
    const vertexCount = ring.length - 1;
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'Polygon',
        coordinates: polygonGeometry.coordinates as unknown as number[],
      },
      properties: {
        kind: 'POLY',
        vertex_count: vertexCount,
        label: options?.label ?? 'Drawn Polygon',
        style: {
          ...DEFAULT_DRAWN_POLYGON_STYLE,
          ...options?.polygonStyle,
        },
      },
    } as PolyAnnotation;
  }

  if (mode === 'polyline') {
    const lineGeometry = geojson.geometry as GeoJSON.LineString;
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'LineString',
        coordinates: lineGeometry.coordinates as unknown as number[],
      },
      properties: {
        kind: 'LINE',
        label: options?.label ?? 'Drawn Path',
        style: {
          ...DEFAULT_DRAWN_POLYLINE_STYLE,
          ...options?.polylineStyle,
        },
      },
    } as LineAnnotation;
  }

  return null;
}
