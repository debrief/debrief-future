/**
 * Re-export types from @debrief/schemas and add convenience unions
 * for component props.
 */

import type {
  TrackFeature,
  ReferenceLocation,
  TrackProperties,
  ReferenceLocationProperties,
  FeatureKindEnum,
  TrackTypeEnum,
  LocationTypeEnum,
  TimestampedPosition,
  MultiPointFeature,
  MultiPointFeatureProperties,
  MultiPolygonFeature,
  MultiPolygonFeatureProperties,
  SegmentMetadata,
  PositionStyleOverride,
} from '@debrief/schemas';

// Re-export all schema types for convenience
export type {
  TrackFeature,
  ReferenceLocation,
  TrackProperties,
  ReferenceLocationProperties,
  FeatureKindEnum,
  TrackTypeEnum,
  LocationTypeEnum,
  TimestampedPosition,
  MultiPointFeature,
  MultiPointFeatureProperties,
  MultiPolygonFeature,
  MultiPolygonFeatureProperties,
  SegmentMetadata,
  PositionStyleOverride,
};

// Re-export DisplayMode from TimeController for use by MapView temporal rendering
export type { DisplayMode } from '../TimeController/types';

/**
 * Union type for all Debrief feature types.
 * Components should accept either type interchangeably.
 */
export type DebriefFeature = TrackFeature | ReferenceLocation | MultiPointFeature | MultiPolygonFeature;

/**
 * GeoJSON FeatureCollection containing Debrief features.
 * This is the primary data input for all visualization components.
 */
export interface DebriefFeatureCollection {
  type: 'FeatureCollection';
  features: DebriefFeature[];
}

/**
 * Bounds as [minLon, minLat, maxLon, maxLat]
 */
export type Bounds = [number, number, number, number];

/**
 * Time extent as [startTime, endTime] in milliseconds since epoch
 */
export type TimeExtent = [number, number];

/**
 * Selection state for coordinated component selection
 */
export interface SelectionState {
  /** Set of currently selected feature IDs */
  selectedIds: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (ids: Set<string>) => void;
}

/**
 * Type guard to check if a feature is a TrackFeature
 */
export function isTrackFeature(feature: DebriefFeature): feature is TrackFeature {
  return feature.properties.kind === 'TRACK';
}

/**
 * Type guard to check if a feature is a ReferenceLocation
 */
export function isReferenceLocation(feature: DebriefFeature): feature is ReferenceLocation {
  return feature.properties.kind === 'POINT';
}

/**
 * Type guard to check if a feature is a MultiPointFeature
 */
export function isMultiPointFeature(feature: DebriefFeature): feature is MultiPointFeature {
  return feature.properties.kind === 'MULTI_POINT';
}

/**
 * Type guard to check if a feature is a MultiPolygonFeature
 */
export function isMultiPolygonFeature(feature: DebriefFeature): feature is MultiPolygonFeature {
  return feature.properties.kind === 'MULTI_POLYGON';
}

/**
 * Check if a feature is expandable (has child elements that can be shown).
 */
export function isExpandableFeature(feature: DebriefFeature): boolean {
  if (isTrackFeature(feature)) return true;
  if (isMultiPointFeature(feature)) return feature.geometry.coordinates.length > 0;
  if (isMultiPolygonFeature(feature)) return feature.geometry.coordinates.length > 0;
  return false;
}
