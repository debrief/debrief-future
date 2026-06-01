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
  RawGeoJSONFeature,
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
 * Permissive ingress / parse-boundary feature.
 *
 * Structurally derived from the schema-generated {@link RawGeoJSONFeature} with
 * `geometry` widened to admit `null` — the only difference required for the
 * genuine ingress boundaries (REP import, MCP tool results, on-disk GeoJSON,
 * the session-state→stac adapter, and the host→webview message DTOs).
 *
 * A `geometry: null` feature is an RFC 7946 "unlocated" feature; these
 * legitimately exist in the domain (SYSTEM_RECORD, STORYBOARD, NarrativeEntry)
 * and must be preserved, not dropped, through these boundaries.
 *
 * Derived via `Omit` + intersection (Constitution Article IV.5) so it cannot
 * silently drift when `RawGeoJSONFeature` grows a field — fields are NOT
 * re-listed by name. `RawGeoJSONFeature` is assignable to `IngressFeature`
 * (only `geometry` is widened); the typed coordinate union is retained (same
 * trust level ADR-021 accepts at parse boundaries — no new runtime validation).
 */
export type IngressFeature =
  Omit<RawGeoJSONFeature, 'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null };

/**
 * Permissive ingress / parse-boundary FeatureCollection — the collection
 * counterpart to {@link IngressFeature}.
 */
export interface IngressFeatureCollection {
  type: 'FeatureCollection';
  features: IngressFeature[];
  bbox?: number[];
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
