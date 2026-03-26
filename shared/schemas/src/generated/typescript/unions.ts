/**
 * Hand-maintained companion module for schema-generated types.
 * Provides convenience unions and type guards for DebriefFeature.
 */
import type {
  TrackFeature,
  ReferenceLocation,
  MultiPointFeature,
  MultiPolygonFeature,
  NarrativeEntry,
  CircleAnnotation,
  RectangleAnnotation,
  LineAnnotation,
  TextAnnotation,
  VectorAnnotation,
  PolyAnnotation,
} from './types.js';

/**
 * Schema-typed annotation features — union of all 7 annotation types.
 */
export type SchemaAnnotationFeature =
  | NarrativeEntry
  | CircleAnnotation
  | RectangleAnnotation
  | LineAnnotation
  | TextAnnotation
  | VectorAnnotation
  | PolyAnnotation;

/**
 * Union type for all Debrief feature types.
 * This is the primary type for feature collections and component props.
 */
export type DebriefFeature =
  | TrackFeature
  | ReferenceLocation
  | MultiPointFeature
  | MultiPolygonFeature
  | SchemaAnnotationFeature;

/**
 * GeoJSON FeatureCollection containing Debrief features.
 */
export interface DebriefFeatureCollection {
  type: 'FeatureCollection';
  features: DebriefFeature[];
}

/**
 * Type guard: check if a feature is a TrackFeature
 */
export function isTrackFeature(feature: DebriefFeature): feature is TrackFeature {
  return feature.properties.kind === 'TRACK';
}

/**
 * Type guard: check if a feature is a ReferenceLocation
 */
export function isReferenceLocation(feature: DebriefFeature): feature is ReferenceLocation {
  return feature.properties.kind === 'POINT';
}

/**
 * Type guard: check if a feature is a MultiPointFeature
 */
export function isMultiPointFeature(feature: DebriefFeature): feature is MultiPointFeature {
  return feature.properties.kind === 'MULTI_POINT';
}

/**
 * Type guard: check if a feature is a MultiPolygonFeature
 */
export function isMultiPolygonFeature(feature: DebriefFeature): feature is MultiPolygonFeature {
  return feature.properties.kind === 'MULTI_POLYGON';
}

/**
 * Type guard: check if a feature is a SchemaAnnotationFeature
 */
export function isAnnotationFeature(feature: DebriefFeature): feature is SchemaAnnotationFeature {
  return (
    !isTrackFeature(feature) &&
    !isReferenceLocation(feature) &&
    !isMultiPointFeature(feature) &&
    !isMultiPolygonFeature(feature)
  );
}
