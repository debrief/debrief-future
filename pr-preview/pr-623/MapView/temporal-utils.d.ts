import { findNearestPointIndex, sliceTrackToTime } from '@debrief/utils';
import { DebriefFeature } from '../utils/types';

export { findNearestPointIndex, sliceTrackToTime };
/**
 * Extracted temporal data from a track feature.
 */
export interface TemporalTrackData {
    trackId: string;
    coordinates: [number, number][];
    timestamps: number[];
    timeExtent: [number, number];
}
/**
 * Extract temporal data from a GeoJSON feature.
 *
 * @param feature A GeoJSON feature (may or may not have temporal data)
 * @returns TemporalTrackData if the feature has valid temporal data, null otherwise
 */
export declare function extractTemporalData(feature: DebriefFeature): TemporalTrackData | null;
//# sourceMappingURL=temporal-utils.d.ts.map