import { TrackFeature, ReferenceLocation, TrackProperties, ReferenceLocationProperties, FeatureKindEnum, TrackTypeEnum, LocationTypeEnum, TimestampedPosition } from '@debrief/schemas';

export type { TrackFeature, ReferenceLocation, TrackProperties, ReferenceLocationProperties, FeatureKindEnum, TrackTypeEnum, LocationTypeEnum, TimestampedPosition, };
export type { DisplayMode } from '../TimeController/types';
/**
 * Union type for all Debrief feature types.
 * Components should accept either type interchangeably.
 */
export type DebriefFeature = TrackFeature | ReferenceLocation;
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
export declare function isTrackFeature(feature: DebriefFeature): feature is TrackFeature;
/**
 * Type guard to check if a feature is a ReferenceLocation
 */
export declare function isReferenceLocation(feature: DebriefFeature): feature is ReferenceLocation;
//# sourceMappingURL=types.d.ts.map