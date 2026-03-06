/**
 * Plot-related type definitions for the Debrief VS Code Extension
 */

// GeoJSON geometry types (self-contained to avoid external dependency)
export interface LineString {
  type: 'LineString';
  coordinates: number[][];
}

export interface Point {
  type: 'Point';
  coordinates: number[];
}

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
 * Position style configuration for track positions (Feature: 048)
 */
export interface PositionStyle {
  /** Whether to display a symbol at positions */
  show_symbol: boolean;

  /** Shape to use for position symbols */
  symbol: 'circle' | 'square' | 'triangle';

  /** Whether to display labels at positions */
  show_label: boolean;
}

/**
 * Per-position style override (Feature: 048)
 */
export interface PositionStyleOverride {
  /** Override whether to show symbol */
  show_symbol?: boolean;

  /** Override symbol shape */
  symbol?: 'circle' | 'square' | 'triangle';

  /** Override whether to show label */
  show_label?: boolean;

  /** Custom label text */
  label?: string;
}

/**
 * Position metadata (coordinates are in geometry.coordinates[i]) (Feature: 048)
 */
export interface TimestampedPosition {
  /** Position timestamp (ISO 8601) */
  time: string;

  /** Depth in meters (optional) */
  depth?: number;

  /** Course in degrees (0-360, optional) */
  course?: number;

  /** Speed in knots (optional) */
  speed?: number;
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

  /** Time values for each coordinate (epoch ms) */
  times: number[];

  /** Position metadata array (parallel to geometry.coordinates) (Feature: 048) */
  positions?: TimestampedPosition[];

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

  // Position styling fields (Feature: 048)

  /** Default styling for all positions */
  defaultPositionStyle?: PositionStyle;

  /** ISO 8601 duration for interval-based symbol display (e.g., "PT5M") */
  symbolInterval?: string;

  /** ISO 8601 duration for interval-based label display */
  labelInterval?: string;

  /** Parallel array of per-position style overrides (null for no override) */
  positionStyleOverrides?: (PositionStyleOverride | null)[];
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

}

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
 * GeoJSON Feature for a track (self-contained to avoid any from geojson)
 */
export interface TrackFeature {
  type: 'Feature';
  geometry: LineString;
  properties: {
    id: string;
    name: string;
    platformType?: string;
    times: string[];
    startTime: string;
    endTime: string;
  };
}

/**
 * GeoJSON Feature for a location (self-contained to avoid any from geojson)
 */
export interface LocationFeature {
  type: 'Feature';
  geometry: Point;
  properties: {
    id: string;
    name: string;
    locationType?: string;
  };
}

/**
 * GeoJSON FeatureCollection for a plot
 */
export interface PlotFeatureCollection {
  type: 'FeatureCollection';
  features: Array<TrackFeature | LocationFeature>;
}

/**
 * Create an empty selection
 */
export function createEmptySelection(): Selection {
  return {
    trackIds: [],
    locationIds: [],
  };
}
