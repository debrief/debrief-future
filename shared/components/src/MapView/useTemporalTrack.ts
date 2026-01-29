/**
 * useTemporalTrack hook - computes render state for a temporal track.
 *
 * Given a track feature, current time, and display mode, returns:
 * - The visible coordinates (full or sliced)
 * - The marker position (for full-track mode)
 * - A render key for efficient GeoJSON updates
 */

import { useMemo } from 'react';
import type { DisplayMode, DebriefFeature } from '../utils/types';
import { findNearestPointIndex, sliceTrackToTime, extractTemporalData } from './temporal-utils';

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

export function useTemporalTrack(
  feature: DebriefFeature,
  currentTime: number,
  displayMode: DisplayMode
): UseTemporalTrackResult {
  const temporalData = useMemo(
    () => extractTemporalData(feature),
    [feature]
  );

  const renderState = useMemo((): TemporalRenderState => {
    if (!temporalData) {
      return {
        nearestIndex: -1,
        nearestTime: 0,
        visibleCoordinates: [],
        showMarker: false,
        markerPosition: null,
      };
    }

    const { coordinates, timestamps, timeExtent } = temporalData;
    const nearestIndex = findNearestPointIndex(timestamps, currentTime);
    const nearestTime = nearestIndex >= 0 ? timestamps[nearestIndex]! : 0;

    if (displayMode === 'trail') {
      const visibleCoordinates = sliceTrackToTime(coordinates, timestamps, currentTime);
      return {
        nearestIndex,
        nearestTime,
        visibleCoordinates,
        showMarker: false,
        markerPosition: null,
      };
    }

    // Full-track mode
    const showMarker = nearestIndex >= 0 && currentTime >= timeExtent[0];
    const markerPosition: [number, number] | null = showMarker ? coordinates[nearestIndex]! : null;
    return {
      nearestIndex,
      nearestTime,
      visibleCoordinates: coordinates,
      showMarker,
      markerPosition,
    };
  }, [temporalData, currentTime, displayMode]);

  const renderKey = useMemo(() => {
    if (!temporalData) return 'no-data';
    return `${temporalData.trackId}-${displayMode}-${renderState.nearestIndex}`;
  }, [temporalData, displayMode, renderState.nearestIndex]);

  return {
    renderState,
    renderKey,
    hasTemporalData: temporalData !== null,
  };
}
