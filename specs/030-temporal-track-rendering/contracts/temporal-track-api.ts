/**
 * Temporal Track Rendering API Contract
 *
 * Feature: 030-temporal-track-rendering
 * Date: 2026-01-27
 *
 * This file defines the TypeScript interfaces for temporal track rendering.
 * It serves as the contract between components and should be implemented
 * in shared/components/src/MapView/types.ts
 */

// Re-export from existing types
export type { DisplayMode } from '@debrief/components/TimeController/types';

/**
 * Extended MapView props with temporal rendering support.
 * These props extend the existing MapViewProps interface.
 */
export interface TemporalMapViewProps {
  /**
   * Current time position for temporal rendering.
   * Epoch milliseconds. When provided, enables temporal track rendering.
   */
  currentTime?: number;

  /**
   * Track display mode.
   * - 'full': Show entire track with highlight marker at current time
   * - 'trail': Show track from start to current time only (snail-trail)
   * @default 'full'
   */
  displayMode?: DisplayMode;
}

/**
 * Track feature with temporal data.
 * Extends the base TrackFeature with required temporal properties.
 */
export interface TemporalTrackFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    name?: string;
    /**
     * Array of timestamps corresponding to each coordinate.
     * Must have same length as coordinates array.
     * Values are epoch milliseconds.
     */
    times: number[];
    [key: string]: unknown;
  };
}

/**
 * Extracted temporal data from a track feature.
 * Used internally by useTemporalTrack hook.
 */
export interface TemporalTrackData {
  /** Track identifier */
  trackId: string;
  /** Coordinate array [lon, lat][] */
  coordinates: [number, number][];
  /** Timestamp array (epoch ms), parallel to coordinates */
  timestamps: number[];
  /** Time extent [minTime, maxTime] */
  timeExtent: [number, number];
}

/**
 * Computed render state for a track at a specific time.
 */
export interface TemporalRenderState {
  /** Index of coordinate nearest to current time */
  nearestIndex: number;
  /** Timestamp of nearest point (epoch ms) */
  nearestTime: number;
  /** Coordinates to render (full or sliced based on mode) */
  visibleCoordinates: [number, number][];
  /** Whether to show highlight marker (true in full mode) */
  showMarker: boolean;
  /** Marker position [lon, lat], or null if not showing */
  markerPosition: [number, number] | null;
}

/**
 * Style configuration for the highlight marker.
 */
export interface HighlightMarkerStyle {
  /** Marker radius in pixels */
  radius: number;
  /** Fill color (CSS color string) */
  fillColor: string;
  /** Fill opacity (0-1) */
  fillOpacity: number;
  /** Stroke color (CSS color string) */
  strokeColor: string;
  /** Stroke weight in pixels */
  strokeWeight: number;
}

/**
 * Default marker style values.
 */
export const DEFAULT_MARKER_STYLE: HighlightMarkerStyle = {
  radius: 8,
  fillColor: '#ff6b6b',
  fillOpacity: 1.0,
  strokeColor: '#ffffff',
  strokeWeight: 2,
};

/**
 * Props for the TemporalTrackLayer component.
 */
export interface TemporalTrackLayerProps {
  /** Track feature with temporal data */
  feature: TemporalTrackFeature;
  /** Current time position (epoch ms) */
  currentTime: number;
  /** Display mode */
  displayMode: DisplayMode;
  /** Whether this track is selected */
  isSelected?: boolean;
  /** Track style (color, weight) */
  style?: {
    color: string;
    weight: number;
  };
  /** Marker style override */
  markerStyle?: Partial<HighlightMarkerStyle>;
  /** Click handler */
  onClick?: (featureId: string, event: React.MouseEvent) => void;
}

/**
 * Props for the TrackHighlightMarker component.
 */
export interface TrackHighlightMarkerProps {
  /** Marker position [lat, lon] (Leaflet convention) */
  position: [number, number];
  /** Style configuration */
  style?: Partial<HighlightMarkerStyle>;
  /** Tooltip content */
  tooltip?: string;
}

/**
 * Return type for useTemporalTrack hook.
 */
export interface UseTemporalTrackResult {
  /** Computed render state */
  renderState: TemporalRenderState;
  /** Key for forcing GeoJSON re-render */
  renderKey: string;
  /** Whether track has valid temporal data */
  hasTemporalData: boolean;
}

// ============================================================================
// Utility Function Signatures
// ============================================================================

/**
 * Find the index of the coordinate nearest to the target time.
 *
 * @param timestamps Array of timestamps (epoch ms)
 * @param targetTime Target time to find (epoch ms)
 * @returns Index of nearest timestamp
 *
 * @example
 * const index = findNearestPointIndex([1000, 2000, 3000], 2400);
 * // Returns 1 (timestamp 2000 is nearest to 2400)
 */
export type FindNearestPointIndex = (
  timestamps: number[],
  targetTime: number
) => number;

/**
 * Slice track coordinates up to the point nearest to target time.
 *
 * @param coordinates Array of [lon, lat] coordinates
 * @param timestamps Array of timestamps (epoch ms)
 * @param targetTime Target time to slice at (epoch ms)
 * @returns Sliced coordinate array from start to nearest point (inclusive)
 *
 * @example
 * const sliced = sliceTrackToTime(
 *   [[-4, 50], [-4.1, 50.1], [-4.2, 50.2]],
 *   [1000, 2000, 3000],
 *   2400
 * );
 * // Returns [[-4, 50], [-4.1, 50.1]] (up to index 1)
 */
export type SliceTrackToTime = (
  coordinates: [number, number][],
  timestamps: number[],
  targetTime: number
) => [number, number][];

/**
 * Extract temporal track data from a feature.
 *
 * @param feature GeoJSON feature (may or may not have temporal data)
 * @returns TemporalTrackData if valid, null if missing required data
 */
export type ExtractTemporalData = (
  feature: unknown
) => TemporalTrackData | null;
