import { TrackFeature, ReferenceLocation, TrackProperties, ReferenceLocationProperties, FeatureKindEnum, TrackTypeEnum, LocationTypeEnum, TimestampedPosition, MultiPointFeature, MultiPointFeatureProperties, MultiPolygonFeature, MultiPolygonFeatureProperties, SegmentMetadata, PositionStyleOverride, NarrativeEntry, CircleAnnotation, RectangleAnnotation, LineAnnotation, TextAnnotation, VectorAnnotation, PolyAnnotation, DebriefFeature } from '@debrief/schemas';

export type { TrackFeature, ReferenceLocation, TrackProperties, ReferenceLocationProperties, FeatureKindEnum, TrackTypeEnum, LocationTypeEnum, TimestampedPosition, MultiPointFeature, MultiPointFeatureProperties, MultiPolygonFeature, MultiPolygonFeatureProperties, SegmentMetadata, PositionStyleOverride, NarrativeEntry, CircleAnnotation, RectangleAnnotation, LineAnnotation, TextAnnotation, VectorAnnotation, PolyAnnotation, };
export type { SchemaAnnotationFeature, DebriefFeature, DebriefFeatureCollection, } from '@debrief/schemas';
export { isTrackFeature, isReferenceLocation, isMultiPointFeature, isMultiPolygonFeature, isAnnotationFeature, } from '@debrief/schemas';
export type { DisplayMode } from '../TimeController/types';
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
export declare function isExpandableFeature(feature: DebriefFeature): boolean;
//# sourceMappingURL=types.d.ts.map