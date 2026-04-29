import { DisplayMode, DebriefFeature } from '../utils/types';

export interface TemporalRenderState {
    nearestIndex: number;
    nearestTime: number;
    visibleCoordinates: [number, number][];
    showMarker: boolean;
    markerPosition: [number, number] | null;
}
export interface UseTemporalTrackResult {
    renderState: TemporalRenderState;
    renderKey: string;
    hasTemporalData: boolean;
}
export declare function useTemporalTrack(feature: DebriefFeature, currentTime: number, displayMode: DisplayMode): UseTemporalTrackResult;
//# sourceMappingURL=useTemporalTrack.d.ts.map