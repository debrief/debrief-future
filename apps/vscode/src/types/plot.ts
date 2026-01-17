/**
 * Plot-related type definitions for the Debrief VS Code Extension
 */

import type { Feature, LineString, Point, FeatureCollection, GeoJsonProperties } from 'geojson';

/**
 * A plot from a STAC catalog containing tracks and reference locations
 */
export interface Plot {
  /** STAC Item ID */
  id: string;

  /** Plot title from STAC metadata */
  title: string;

  /** Creation/capture timestamp (ISO 8601) */
  datetime: string;

  /** Path to item.json relative to store root */
  itemPath: string;

  /** Parent catalog ID */
  catalogId: string;

  /** Source file path (for provenance) */
  sourcePath?: string;

  /** Geographic bounding box [west, south, east, north] */
  bbox: [number, number, number, number];

  /** Time extent [start, end] in ISO 8601 */
  timeExtent: [string, string];

  /** Number of tracks in this plot */
  trackCount: number;

  /** Number of reference locations in this plot */
  locationCount: number;
}

/**
 * A track representing a vessel's movement over time
 */
export interface Track {
  /** Unique track ID within the plot */
  id: string;

  /** Track name/identifier */
  name: string;

  /** Platform type (e.g., 'Destroyer', 'Submarine', 'Helicopter') */
  platformType?: string;

  /** GeoJSON LineString geometry */
  geometry: LineString;

  /** Time values for each coordinate (ISO 8601) */
  times: string[];

  /** Start time of track */
  startTime: string;

  /** End time of track */
  endTime: string;

  /** User-customized display color (hex) */
  color?: string;

  /** Whether this track is currently visible */
  visible: boolean;

  /** Whether this track is currently selected */
  selected: boolean;
}

/**
 * A reference location marking a significant point
 */
export interface ReferenceLocation {
  /** Unique location ID within the plot */
  id: string;

  /** Location name */
  name: string;

  /** Location type (e.g., 'Waypoint', 'Datum', 'Port') */
  locationType?: string;

  /** GeoJSON Point geometry */
  geometry: Point;

  /** Whether this location is currently visible */
  visible: boolean;

  /** Whether this location is currently selected */
  selected: boolean;
}

/**
 * The current selection state
 */
export interface Selection {
  /** Selected track IDs */
  trackIds: string[];

  /** Selected location IDs */
  locationIds: string[];

  /** Selection context type for tool matching */
  contextType: SelectionContextType;

  /** Feature kinds in selection (for tool filtering) */
  featureKinds: FeatureKind[];
}

/**
 * Selection context types
 */
export type SelectionContextType =
  | 'none'
  | 'single-track'
  | 'multi-track'
  | 'location'
  | 'mixed';

/**
 * Feature kinds
 */
export type FeatureKind = 'track' | 'location';

/**
 * Time range for filtering
 */
export interface TimeRange {
  /** Filter start time (ISO 8601) */
  start: string;

  /** Filter end time (ISO 8601) */
  end: string;

  /** Full data extent start */
  dataStart: string;

  /** Full data extent end */
  dataEnd: string;
}

/**
 * Persisted map view state
 */
export interface MapViewState {
  /** Map center [lat, lng] */
  center: [number, number];

  /** Zoom level */
  zoom: number;

  /** Current time range filter */
  timeRange: TimeRange;

  /** Active selection */
  selection: Selection;

  /** Layer visibility states by ID */
  layerVisibility: Record<string, boolean>;

  /** Custom track colors by ID */
  trackColors: Record<string, string>;
}

/**
 * Recent plot entry
 */
export interface RecentPlot {
  /** Plot ID */
  plotId: string;

  /** Plot title */
  title: string;

  /** Store ID */
  storeId: string;

  /** Last opened timestamp */
  lastOpened: string;

  /** URI for quick open */
  uri: string;
}

/**
 * GeoJSON Feature for a track
 */
export type TrackFeature = Feature<LineString, {
  id: string;
  name: string;
  platformType?: string;
  times: string[];
  startTime: string;
  endTime: string;
}>;

/**
 * GeoJSON Feature for a location
 */
export type LocationFeature = Feature<Point, {
  id: string;
  name: string;
  locationType?: string;
}>;

/**
 * GeoJSON FeatureCollection for a plot
 */
export interface PlotFeatureCollection extends FeatureCollection<LineString | Point, GeoJsonProperties> {
  features: Array<TrackFeature | LocationFeature>;
}

/**
 * Compute selection context type from selection
 */
export function computeContextType(selection: Selection): SelectionContextType {
  const hasTrack = selection.trackIds.length > 0;
  const hasLocation = selection.locationIds.length > 0;

  if (!hasTrack && !hasLocation) {
    return 'none';
  }

  if (hasTrack && hasLocation) {
    return 'mixed';
  }

  if (hasLocation) {
    return 'location';
  }

  return selection.trackIds.length === 1 ? 'single-track' : 'multi-track';
}

/**
 * Create an empty selection
 */
export function createEmptySelection(): Selection {
  return {
    trackIds: [],
    locationIds: [],
    contextType: 'none',
    featureKinds: [],
  };
}
