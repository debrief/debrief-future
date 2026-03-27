/**
 * Plot-related type definitions for the Debrief VS Code Extension
 */

// T014: Import and re-export schema feature types (TrackFeature, ReferenceLocation, PlotFeatureCollection)
// T015: Import geometry types from @debrief/schemas instead of hand-writing LineString/Point
// T016: Import PositionStyle, PositionStyleOverride from @debrief/schemas
// T017: Import TimestampedPosition from @debrief/schemas
import type {
  GeoJSONLineString,
  GeoJSONPoint,
  PositionStyle,
  PositionStyleOverride,
  TimestampedPosition,
  TrackFeature,
  ReferenceLocation,
  DebriefFeatureCollection,
} from '@debrief/schemas';

// T014: LocationFeature → SchemaReferenceLocation (matches schema type name ReferenceLocation)
// T014: PlotFeatureCollection → DebriefFeatureCollection (schema's canonical collection type)
export type {
  GeoJSONLineString,
  GeoJSONPoint,
  PositionStyle,
  PositionStyleOverride,
  TimestampedPosition,
  TrackFeature,
  ReferenceLocation as SchemaReferenceLocation,
  DebriefFeatureCollection as PlotFeatureCollection,
};

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
 * A track view model representing a vessel's movement over time.
 * T018: Renamed from `Track` to `TrackViewModel` — this is a UI projection,
 * not a schema type. It carries display state (visible, selected, color) not
 * present in the schema TrackFeature.
 */
export interface TrackViewModel {
  /** Unique track ID within the plot */
  id: string;

  /** Track name/identifier */
  name: string;

  /** Platform type (e.g., 'Destroyer', 'Submarine', 'Helicopter') */
  platformType?: string;

  /** GeoJSON LineString geometry */
  geometry: GeoJSONLineString;

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
 * A reference location view model marking a significant point.
 * UI projection carrying display state (visible, selected) not present
 * in the schema ReferenceLocation (SchemaReferenceLocation).
 */
export interface ReferenceLocationViewModel {
  /** Unique location ID within the plot */
  id: string;

  /** Location name */
  name: string;

  /** Location type (e.g., 'Waypoint', 'Datum', 'Port') */
  locationType?: string;

  /** GeoJSON Point geometry */
  geometry: GeoJSONPoint;

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
 * Time range for plot-level filtering (ISO 8601 strings + data extent).
 *
 * Renamed from TimeRange to PlotTimeRange to avoid conflict with the
 * canonical session-state TimeRange (epoch milliseconds, Review Decision 5C).
 *
 * @see {@link @debrief/session-state!TimeRange} for the canonical epoch-ms type
 */
export interface PlotTimeRange {
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
  timeRange: PlotTimeRange;

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
 * Create an empty selection
 */
export function createEmptySelection(): Selection {
  return {
    trackIds: [],
    locationIds: [],
  };
}
