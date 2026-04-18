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
  NarrativeEntry,
  CircleAnnotation,
  RectangleAnnotation,
  LineAnnotation,
  TextAnnotation,
  VectorAnnotation,
  PolyAnnotation,
  DebriefFeature,
} from '@debrief/schemas';
import {
  isTrackFeature,
  isMultiPointFeature,
  isMultiPolygonFeature,
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
  NarrativeEntry,
  CircleAnnotation,
  RectangleAnnotation,
  LineAnnotation,
  TextAnnotation,
  VectorAnnotation,
  PolyAnnotation,
};

// Re-export unions and type guards from @debrief/schemas
export type {
  SchemaAnnotationFeature,
  DebriefFeature,
  DebriefFeatureCollection,
} from '@debrief/schemas';
export {
  isTrackFeature,
  isReferenceLocation,
  isMultiPointFeature,
  isMultiPolygonFeature,
  isAnnotationFeature,
} from '@debrief/schemas';

/**
 * Track display mode.
 * - 'full': Show entire track regardless of time position
 * - 'trail': Show track history from start up to current time position
 */
export type DisplayMode = 'full' | 'trail';

// Bounds type — canonical definition in @debrief/utils (T08)
export type { Bounds } from '@debrief/utils';

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
 * Check if a feature is expandable (has child elements that can be shown).
 */
export function isExpandableFeature(feature: DebriefFeature): boolean {
  if (isTrackFeature(feature)) return true;
  if (isMultiPointFeature(feature)) return feature.geometry.coordinates.length > 0;
  if (isMultiPolygonFeature(feature)) return feature.geometry.coordinates.length > 0;
  return false;
}
