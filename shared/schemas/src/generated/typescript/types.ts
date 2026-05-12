// AUTO-GENERATED — DO NOT EDIT
export type ToolId = string;
/**
* Discriminator for GeoJSON feature types
*/
export enum FeatureKindEnum {
    
    /** Vessel track (LineString geometry) */
    TRACK = "TRACK",
    /** Reference point/location (Point geometry) */
    POINT = "POINT",
    /** Timestamped narrative/log entry (no geometry) */
    NARRATIVE = "NARRATIVE",
    /** Circle annotation (Polygon geometry, center+radius in properties) */
    CIRCLE = "CIRCLE",
    /** Rectangle annotation (Polygon geometry) */
    RECTANGLE = "RECTANGLE",
    /** Line annotation (LineString geometry) */
    LINE = "LINE",
    /** Text annotation at a position (Point geometry) */
    TEXT = "TEXT",
    /** Vector annotation (LineString geometry, origin+range+bearing in properties) */
    VECTOR = "VECTOR",
    /** Non-spatial system state (null geometry, reserved state.* IDs) */
    SYSTEM = "SYSTEM",
    /** Arbitrary polygon annotation (Polygon geometry) */
    POLY = "POLY",
    /** Multi-point tool result (MultiPoint geometry) */
    MULTI_POINT = "MULTI_POINT",
    /** Multi-polygon tool result (MultiPolygon geometry) */
    MULTI_POLYGON = "MULTI_POLYGON",
    /** Plot-level system record (snapshot chain, branches) */
    SYSTEM_RECORD = "SYSTEM_RECORD",
    /** Storyboard parent feature (panel-only entity, Polygon hull over child Scene viewports) */
    STORYBOARD = "STORYBOARD",
    /** Storyboard Scene feature (Polygon viewport bounds, captured moment in a Storyboard) */
    STORYBOARD_SCENE = "STORYBOARD_SCENE",
};
/**
* Type of track feature
*/
export enum TrackTypeEnum {
    
    /** Own ship track */
    OWNSHIP = "OWNSHIP",
    /** Contact/target track */
    CONTACT = "CONTACT",
    /** Reference track */
    REFERENCE = "REFERENCE",
    /** Solution/analysis track */
    SOLUTION = "SOLUTION",
};
/**
* Type of reference location
*/
export enum LocationTypeEnum {
    
    /** Navigation waypoint */
    WAYPOINT = "WAYPOINT",
    /** Exercise area boundary */
    EXERCISE_AREA = "EXERCISE_AREA",
    /** Danger/exclusion zone */
    DANGER_AREA = "DANGER_AREA",
    /** Anchorage location */
    ANCHORAGE = "ANCHORAGE",
    /** Port/harbor */
    PORT = "PORT",
    /** Generic reference point */
    REFERENCE = "REFERENCE",
};
/**
* Valid shapes for point markers
*/
export enum PointShapeEnum {
    
    /** Filled/stroked circle (default marker) */
    circle = "circle",
    /** Filled/stroked square (reference points) */
    square = "square",
    /** Filled/stroked triangle (directional indicators) */
    triangle = "triangle",
    /** Diamond shape */
    diamond = "diamond",
    /** Cross/plus shape */
    cross = "cross",
};
/**
* Template-literal derivation of the permissible point-marker shapes
* from PointShapeEnum. Narrows the `symbol` field on PositionStyle /
* PositionStyleOverride so TypeScript rejects an unknown shape at
* compile time (Feature 201 / FR-014).
*/
export type PointShape = `${PointShapeEnum}`;
/**
* Predefined named colours for styling tool parameters
*/
export enum NamedColorEnum {
    
    /** Red */
    red = "red",
    /** Green */
    green = "green",
    /** Blue */
    blue = "blue",
    /** Yellow */
    yellow = "yellow",
    /** Orange */
    orange = "orange",
    /** Purple */
    purple = "purple",
    /** Cyan */
    cyan = "cyan",
    /** Magenta */
    magenta = "magenta",
    /** White */
    white = "white",
    /** Black */
    black = "black",
    /** Grey */
    grey = "grey",
};
/**
* Marker shapes for tool parameter choices (superset of PointShapeEnum)
*/
export enum MarkerSymbolEnum {
    
    /** Filled/stroked circle (default marker) */
    circle = "circle",
    /** Filled/stroked square (reference points) */
    square = "square",
    /** Filled/stroked triangle (directional indicators) */
    triangle = "triangle",
    /** Diamond shape */
    diamond = "diamond",
    /** Cross/plus shape */
    cross = "cross",
};
/**
* Eight-point compass directions
*/
export enum CardinalDirectionEnum {
    
    /** North */
    N = "N",
    /** North-East */
    NE = "NE",
    /** East */
    E = "E",
    /** South-East */
    SE = "SE",
    /** South */
    S = "S",
    /** South-West */
    SW = "SW",
    /** West */
    W = "W",
    /** North-West */
    NW = "NW",
};
/**
* Common ISO 8601 duration presets for interval parameters
*/
export enum DurationPresetEnum {
    
    /** 1 minute */
    PT1M = "PT1M",
    /** 5 minutes */
    PT5M = "PT5M",
    /** 15 minutes */
    PT15M = "PT15M",
    /** 30 minutes */
    PT30M = "PT30M",
    /** 1 hour */
    PT1H = "PT1H",
    /** 2 hours */
    PT2H = "PT2H",
    /** 6 hours */
    PT6H = "PT6H",
    /** 12 hours */
    PT12H = "PT12H",
    /** 24 hours */
    PT24H = "PT24H",
};
/**
* Common numeric presets for count and distance parameters
*/
export enum NumericPresetEnum {
    
    /** One */
    n_1 = "n_1",
    /** Two */
    n_2 = "n_2",
    /** Five */
    n_5 = "n_5",
    /** Ten */
    n_10 = "n_10",
    /** Twenty-five */
    n_25 = "n_25",
    /** Fifty */
    n_50 = "n_50",
    /** One hundred */
    n_100 = "n_100",
};
/**
* Generation patterns for reference point placement
*/
export enum ReferencePointPatternEnum {
    
    /** Evenly spaced grid of rows and columns */
    grid = "grid",
    /** Randomly distributed points */
    scatter = "scatter",
};
/**
* How line endpoints are rendered (SVG/CSS standard)
*/
export enum LineCapEnum {
    
    /** Flat edge at endpoint */
    butt = "butt",
    /** Semicircle at endpoint */
    round = "round",
    /** Square projection beyond endpoint */
    square = "square",
};
/**
* Top-level vessel domain classification
*/
export enum VesselDomainEnum {
    
    /** Surface vessels (warships, auxiliaries, merchant) */
    surface = "surface",
    /** Subsurface vessels (submarines) */
    subsurface = "subsurface",
    /** Vessel domain not determined or not applicable */
    unknown = "unknown",
};
/**
* How line segment joints are rendered (SVG/CSS standard)
*/
export enum LineJoinEnum {
    
    /** Sharp corner (default) */
    miter = "miter",
    /** Rounded corner */
    round = "round",
    /** Flat corner */
    bevel = "bevel",
};
/**
* Discriminator for track segment types within compound tracks
*/
export enum SegmentTypeEnum {
    
    /** Plain recorded track segment */
    TRACK = "TRACK",
    /** Target Motion Analysis leg with absolute geographic coordinates */
    ABSOLUTE_TMA = "ABSOLUTE_TMA",
    /** Target Motion Analysis leg relative to ownship position */
    RELATIVE_TMA = "RELATIVE_TMA",
    /** Interpolated segment between TMA legs */
    DYNAMIC_INFILL = "DYNAMIC_INFILL",
};
/**
* Discriminator for system state variants
*/
export enum SystemStateTypeEnum {
    
    /** Time viewport state (start/end times) */
    temporal = "temporal",
    /** Map viewport state (bbox, zoom) */
    spatial = "spatial",
    /** Feature selection state (selected IDs) */
    selection = "selection",
    /** Per-plot active-Storyboard pin (#237) */
    active_storyboard = "active_storyboard",
};
/**
* Array centre calculation mode for towed array sensors
*/
export enum ArrayCentreModeEnum {
    
    /** Simple backtrack along vessel heading */
    PLAIN = "PLAIN",
    /** Follow vessel track path backwards */
    WORM = "WORM",
    /** Use actual measured array positions */
    MEASURED = "MEASURED",
};
/**
* Visual style for bearing lines
*/
export enum LineStyleEnum {
    
    /** Continuous line */
    SOLID = "SOLID",
    /** Evenly spaced dashes */
    DASHED = "DASHED",
    /** Evenly spaced dots */
    DOT = "DOT",
    /** Alternating dash and dot */
    DASH_DOT = "DASH_DOT",
};
/**
* Horizontal alignment of contact labels
*/
export enum LabelLocationEnum {
    
    /** Left-aligned text */
    LEFT = "LEFT",
    /** Center-aligned text */
    CENTER = "CENTER",
    /** Right-aligned text */
    RIGHT = "RIGHT",
};
/**
* Position along the bearing line where the label is placed
*/
export enum LineLabelPositionEnum {
    
    /** At the origin (sensor location) */
    START = "START",
    /** At the midpoint of the bearing line */
    MIDDLE = "MIDDLE",
    /** At the far end of the bearing line */
    END = "END",
};
/**
* Semantic discriminator for provenance records. Consumers use this field to choose rendering or handling behaviour independently of visual tool-category grouping. Introduced by feature 208 so future entry types (manual checkpoint, standalone tune, manual rationale) can be distinguished without overloading tool-category.
*/
export enum ActivityType {
    
    /** Manual checkpoint entry. */
    snapshot = "snapshot",
    /** Regular tool invocation. Default for records without an explicit activity_type. */
    tool = "tool",
    /** Reserved for future standalone tune-action entries. */
    tune = "tune",
};
/**
* Canonical output kind identifiers for tool result features. Set on feature.properties.kind by the executor after tool execution. Values use slash-delimited hierarchical paths matching domain/subtype. Both Python and TypeScript executors MUST use these values — no hand-authored kind strings in tool implementations.
*/
export enum OutputKindEnum {
    
    /** Track statistics summary (point count, distance, speed, duration) */
    trackSOLIDUSstatistics = "track/statistics",
    /** Range-bearing time-series dataset between two features */
    datasetSOLIDUSrange_bearing_series = "dataset/range_bearing_series",
    /** Region/area statistics summary (extent, area, dimensions) */
    regionSOLIDUSstatistics = "region/statistics",
};
/**
* Top-level result type categories per TOOL-RESULTS.md. Used as prefix for debrief:resultType annotations.
*/
export enum ResultCategoryEnum {
    
    /** Modifies existing feature(s) in the FeatureCollection */
    mutation = "mutation",
    /** Creates new GeoJSON feature(s) */
    addition = "addition",
    /** Removes feature(s) from the FeatureCollection */
    deletion = "deletion",
    /** Creates non-GeoJSON output (image, report, dataset) */
    artifact = "artifact",
};
/**
* Names of available schema-defined parameter types. Referenced by ToolParameter.param_type to link tool parameters to their value enums defined in common.yaml.
*/
export enum ParameterTypeEnum {
    
    /** Predefined named colours (maps to NamedColorEnum) */
    NamedColor = "NamedColor",
    /** Marker shapes (maps to MarkerSymbolEnum) */
    MarkerSymbol = "MarkerSymbol",
    /** Eight-point compass directions (maps to CardinalDirectionEnum) */
    CardinalDirection = "CardinalDirection",
    /** Common ISO 8601 duration intervals (maps to DurationPresetEnum) */
    DurationPreset = "DurationPreset",
    /** Common numeric values (maps to NumericPresetEnum) */
    NumericPreset = "NumericPreset",
    /** Reference point generation patterns (maps to ReferencePointPatternEnum) */
    ReferencePointPattern = "ReferencePointPattern",
};
/**
* Visual category for Log Panel icon rendering. Declared by the tool at registration; consumed by frontends to colour tool-icon glyphs. See docs/log-panel-ux-srd.md §5.
This enum defines only the declarable values. The neutral-grey "unknown" state shown by the Log Panel when a tool has no declared category is NOT a value of this enum — it is a rendering-layer fallback produced when the attribute is null or absent.
*/
export enum ToolCategoryEnum {
    
    /** File / data ingestion tools (e.g., REP loader, DPF parser, CSV import) */
    import = "import",
    /** Appearance-changing tools (e.g., set-track-color, symbol style, label interval) */
    style = "style",
    /** Analytical computation tools (e.g., range-bearing, course/speed, statistics) */
    calc = "calc",
    /** Tools that narrow the dataset (time filter, spatial filter, trim) */
    filter = "filter",
    /** Tools that export or capture state (export-png, export-csv, export-geojson) */
    snapshot = "snapshot",
};
/**
* Type of file-level provenance event.
*/
export enum FileProvEventTypeEnum {
    
    /** Snapshot creation event */
    snapshot = "snapshot",
    /** Branch creation event */
    branch = "branch",
};
/**
* Direction of a branch event.
*/
export enum FileProvDirectionEnum {
    
    /** This file is the source of the branch */
    source = "source",
    /** This file is the target of the branch */
    target = "target",
};
/**
* Current state of time playback. Component consumers treat `stopped` as equivalent to `paused`. See ADR-022 in docs/project_notes/decisions.md.
*/
export enum PlaybackStateEnum {
    
    /** Playback is stopped */
    stopped = "stopped",
    /** Playback is running */
    playing = "playing",
    /** Playback is paused */
    paused = "paused",
};
/**
* Template-literal derivation of the permissible playback states from
* PlaybackStateEnum. Narrows the `playbackState` field on TemporalSlice
* so TypeScript rejects an unknown state at compile time (Feature 205 /
* FR-007).
*/
export type PlaybackState = `${PlaybackStateEnum}`;
/**
* Track visualization display mode. `full` renders the entire track regardless of current time; `trail` renders a snail-trail from track start up to current time. Mirrors session-state.yaml — see comment above.
*/
export enum DisplayModeEnum {
    
    /** Render the entire track regardless of current time */
    full = "full",
    /** Render a snail-trail from track start up to current time */
    trail = "trail",
};
/**
* Template-literal derivation of the permissible display modes from
* DisplayModeEnum. Narrows the `displayMode` field on TemporalSlice so
* TypeScript rejects an unknown mode at compile time (Feature 205 /
* FR-007).
*/
export type DisplayMode = `${DisplayModeEnum}`;
/**
* Units for time step navigation
*/
export enum TimeUnitEnum {
    
    /** Milliseconds */
    millisecond = "millisecond",
    /** Seconds */
    second = "second",
    /** Minutes */
    minute = "minute",
    /** Hours */
    hour = "hour",
    /** Days */
    day = "day",
};
/**
* How addresses in a selection path level are interpreted (Feature 053)
*/
export enum AddressingMode {
    
    /** Address is a string identifier */
    id = "id",
    /** Address is a numeric position index */
    index = "index",
};
/**
* Top-level result type categories
*/
export enum ResultTopType {
    
    /** Modification of existing features (e.g., track smoothing) */
    mutation = "mutation",
    /** Creation of new features (e.g., analysis results) */
    addition = "addition",
    /** Removal of features (e.g., outlier deletion) */
    deletion = "deletion",
    /** Non-GeoJSON outputs (e.g., plots, reports) */
    artifact = "artifact",
};
/**
* Categories of tool execution errors
*/
export enum ErrorCategory {
    
    /** User-provided input failed validation */
    invalid_input = "invalid_input",
    /** Algorithm encountered unrecoverable error */
    algorithm_failure = "algorithm_failure",
    /** Required feature or data not found */
    resource_not_found = "resource_not_found",
};
/**
* Provenance of a Scene's stored polygon geometry. Render-side consumers use this to decide whether to trust the on-disk polygon ('bounds') or recompute it from (viewport, map dimensions) when the stored polygon pre-dates Spec #258 ('placeholder') or was hand-drawn ('manual').
*/
export enum PolygonSourceEnum {
    
    /** Polygon was computed from real Leaflet map bounds at capture time (post-#258 norm). Renderers trust the on-disk geometry. */
    bounds = "bounds",
    /** Pre-#258 ~100m placeholder square or otherwise non-bounds-derived. Renderers recompute from (viewport, map dimensions); the on-disk value is preserved (Article III.2 source preservation). */
    placeholder = "placeholder",
    /** Reserved for future user-drawn rectangles. Renderers recompute (current behaviour) until manual editing of scene geometry ships. */
    manual = "manual",
};
/**
* Template-literal derivation of the permissible polygon-source values
* from PolygonSourceEnum. Narrows the `_polygon_source` field on
* SceneProperties so TypeScript rejects an unknown provenance value at
* compile time (Feature 258).
*/
export type PolygonSource = `${PolygonSourceEnum}`;


/**
 * Abstract base for all GeoJSON feature properties classes. Provides shared attributes inherited by every concrete properties type.
 */
export interface BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Free-text labels assigned to this feature by the analyst */
    tags?: string[],
    /** PROV-aligned provenance records (append-only log of tool operations) */
    provenance?: LogEntry[],
}


/**
 * Temporal and kinematic metadata for a single track position. Coordinates are NOT stored here - they live in geometry.coordinates[i]. Position metadata at index i corresponds to coordinate at index i.
 */
export interface TimestampedPosition {
    /** Position timestamp (ISO8601) */
    time: string,
    /** Depth in meters (negative = below surface) */
    depth?: number,
    /** Course in degrees (0-360) */
    course?: number,
    /** Speed in knots */
    speed?: number,
}


/**
 * Styling schema for Point and MultiPoint geometries. Follows Leaflet CircleMarker options naming conventions.
 */
export interface PointProperties {
    /** Marker shape */
    shape: string,
    /** Marker radius in pixels */
    radius: number,
    /** Whether to fill the shape */
    fill?: boolean,
    /** Fill color (CSS color string) */
    fill_color: string,
    /** Fill transparency (0-1) */
    fill_opacity?: number,
    /** Whether to draw outline */
    stroke?: boolean,
    /** Stroke color (CSS color string) */
    color: string,
    /** Stroke width in pixels */
    weight?: number,
    /** Stroke transparency (0-1) */
    opacity?: number,
    /** Legacy symbol name from Debrief symbology (e.g., 'Aircraft', 'torpedo'). Preserved for future icon rendering support. */
    legacy_style?: string,
}


/**
 * Styling schema for LineString and MultiLineString geometries. Follows Leaflet Polyline options naming conventions.
 */
export interface LineProperties {
    /** Whether to draw the line */
    stroke?: boolean,
    /** Line color (CSS color string) */
    color: string,
    /** Line width in pixels */
    weight?: number,
    /** Line transparency (0-1) */
    opacity?: number,
    /** Line endpoint style */
    line_cap?: string,
    /** Line join style */
    line_join?: string,
    /** Dash pattern (SVG format, e.g., "5, 10") */
    dash_array?: string,
}


/**
 * Styling schema for Polygon and MultiPolygon geometries. Follows Leaflet Polygon options naming conventions.
 */
export interface PolygonProperties {
    /** Whether to fill the polygon */
    fill?: boolean,
    /** Fill color (CSS color string) */
    fill_color: string,
    /** Fill transparency (0-1) */
    fill_opacity?: number,
    /** Whether to draw border */
    stroke?: boolean,
    /** Border color (CSS color string) */
    color: string,
    /** Border width in pixels */
    weight?: number,
    /** Border transparency (0-1) */
    opacity?: number,
    /** Border endpoint style */
    line_cap?: string,
    /** Border join style */
    line_join?: string,
    /** Border dash pattern (SVG format, e.g., "5, 10") */
    dash_array?: string,
}


/**
 * Composite styling for TrackFeature, supporting both line path and position markers.
 */
export interface TrackStyle {
    /** Styling for the track line path */
    line: LineProperties,
    /** Styling for position markers */
    point: PointProperties,
}


/**
 * Default styling configuration for track positions. Applied as baseline before interval rules and overrides.
 */
export interface PositionStyle {
    /** Whether to display a symbol at positions */
    show_symbol: boolean,
    /** Shape to use for position symbols */
    symbol: PointShape,
    /** Whether to display labels at positions */
    show_label: boolean,
}


/**
 * Per-position style override. Index in array determines which position. No time field - array index i applies to positions[i]. Use null for positions without custom styling.
 */
export interface PositionStyleOverride {
    /** Override whether to show symbol (null = use default/interval) */
    show_symbol?: boolean,
    /** Override symbol shape */
    symbol?: PointShape,
    /** Override whether to show label */
    show_label?: boolean,
    /** Custom label text (null = use timestamp) */
    label?: string,
}


/**
 * GeoJSON Point geometry
 */
export interface GeoJSONPoint {
    /** Geometry type discriminator */
    type: string,
    /** [longitude, latitude] in degrees */
    coordinates: number[],
}


/**
 * GeoJSON Point geometry with empty coordinates (for non-spatial features)
 */
export interface GeoJSONEmptyPoint {
    /** Geometry type discriminator */
    type: string,
    /** Empty array for non-spatial features */
    coordinates: number[],
}


/**
 * GeoJSON LineString geometry
 */
export interface GeoJSONLineString {
    /** Geometry type discriminator */
    type: string,
    /** Array of [longitude, latitude] pairs */
    coordinates: number[][],
}


/**
 * GeoJSON Polygon geometry
 */
export interface GeoJSONPolygon {
    /** Geometry type discriminator */
    type: string,
    /** Array of linear rings (arrays of [lon, lat] pairs) */
    coordinates: number[][][],
}


/**
 * GeoJSON MultiPoint geometry for reference point sets
 */
export interface GeoJSONMultiPoint {
    /** Geometry type discriminator */
    type: string,
    /** Array of [longitude, latitude] pairs */
    coordinates: number[][],
}


/**
 * GeoJSON MultiLineString geometry for compound tracks
 */
export interface GeoJSONMultiLineString {
    /** Geometry type discriminator */
    type: string,
    /** Array of LineString coordinate arrays */
    coordinates: number[][][],
}


/**
 * GeoJSON MultiPolygon geometry for multi-polygon tool results
 */
export interface GeoJSONMultiPolygon {
    /** Geometry type discriminator */
    type: string,
    /** Array of polygon coordinate arrays (each an array of linear rings) */
    coordinates: number[][][][],
}


/**
 * Per-segment metadata for compound tracks. Each segment corresponds to one LineString within a MultiLineString geometry. segments[i] describes geometry.coordinates[i].
 */
export interface SegmentMetadata {
    /** Segment type discriminator */
    segment_type: string,
    /** Segment start timestamp (ISO8601) */
    start_time: string,
    /** Segment end timestamp (ISO8601) */
    end_time: string,
    /** Per-position metadata (parallel to coordinates) */
    positions: TimestampedPosition[],
    /** Human-readable segment name */
    name?: string,
    /** Per-segment line styling override */
    style?: LineProperties,
    /** Estimated course in degrees (TMA segments) */
    course?: number,
    /** Estimated speed in knots (TMA segments) */
    speed?: number,
    /** Base frequency in Hz (TMA segments) */
    base_frequency?: number,
    /** ID of track this solution is relative to (RELATIVE_TMA) */
    host_track_id?: string,
    /** Towed array sensor name (RELATIVE_TMA) */
    host_sensor_name?: string,
    /** Bearing offset in degrees (RELATIVE_TMA) */
    offset_bearing?: number,
    /** Range offset in metres (RELATIVE_TMA) */
    offset_range?: number,
    /** Name of preceding TMA leg (DYNAMIC_INFILL) */
    before_leg?: string,
    /** Name of following TMA leg (DYNAMIC_INFILL) */
    after_leg?: string,
}


/**
 * Timestamped geographic position of a towed array centre. Used by MEASURED array centre mode for bearing line origin interpolation.
 */
export interface MeasuredArrayPosition {
    /** Position timestamp (ISO8601) */
    time: string,
    /** Array centre position [longitude, latitude] (GeoJSON coordinate order) */
    location: number[],
}


/**
 * Single sensor measurement record. Represents one bearing/range observation at a point in time.
 */
export interface SensorContact {
    /** Contact measurement timestamp (ISO8601) */
    time: string,
    /** Bearing to contact in degrees (0-360) */
    bearing: number,
    /** Controls bearing line display (true=show, false=hide). Data stored regardless. */
    has_bearing?: boolean,
    /** Ambiguous bearing (second solution) in degrees */
    ambiguous_bearing?: number,
    /** Controls ambiguous bearing display */
    has_ambiguous?: boolean,
    /** Range to contact in metres */
    range?: number,
    /** Measured frequency in Hz */
    frequency?: number,
    /** Controls frequency data display */
    has_frequency?: boolean,
    /** Display label */
    label?: string,
    /** Operator note */
    comment?: string,
    /** Contact color override (null = inherit from parent SensorData) */
    color?: string,
    /** Contact visibility */
    visible?: boolean,
    /** Label visibility */
    show_label?: boolean,
    /** Bearing line visual style */
    line_style?: string,
    /** Label horizontal alignment */
    label_location?: string,
    /** Label position along bearing line */
    put_label_at?: string,
    /** Explicit sensor location override [longitude, latitude] */
    origin?: number[],
}


/**
 * Named sensor with contact measurements. Embedded in TrackProperties to associate sensor data with the host track.
 */
export interface SensorData {
    /** Sensor identifier (e.g., "TOWED_ARRAY") */
    name: string,
    /** Reference frequency in Hz */
    base_frequency?: number,
    /** Sensor offset from host platform in metres */
    offset?: number,
    /** How bearing line origin is calculated relative to host platform */
    array_centre_mode?: string,
    /** Display mode flag */
    worm_in_hole?: boolean,
    /** Default color for all contacts in this sensor */
    color?: string,
    /** Sensor visibility */
    visible?: boolean,
    /** Bearing line width in pixels */
    line_thickness?: number,
    /** Array of sensor measurements */
    contacts: SensorContact[],
    /** Actual towed array positions for MEASURED array centre mode */
    measured_positions?: MeasuredArrayPosition[],
}


/**
 * Single Target Uncertainty Area estimate. Has either absolute positioning (centre_lat/centre_lon) or relative positioning (bearing/range), plus optional ellipse and kinematics.
 */
export interface TUASolution {
    /** Solution timestamp (ISO8601) */
    time: string,
    /** Solution label */
    label: string,
    /** Absolute latitude (mutual exclusive with bearing/range) */
    centre_lat?: number,
    /** Absolute longitude (mutual exclusive with bearing/range) */
    centre_lon?: number,
    /** Relative bearing from host track in degrees */
    bearing?: number,
    /** Relative range from host track in metres */
    range?: number,
    /** Ellipse orientation from north in degrees */
    orientation?: number,
    /** Semi-major axis in metres */
    maxima?: number,
    /** Semi-minor axis in metres */
    minima?: number,
    /** Estimated course in degrees */
    course?: number,
    /** Estimated speed in knots */
    speed?: number,
    /** Estimated depth in metres */
    depth?: number,
}


/**
 * Named TUA solution collection. Embedded in TrackProperties to associate TUA data with the host track.
 */
export interface TUAData {
    /** TUA collection name */
    name: string,
    /** Name of track this TUA set relates to */
    host_track_name: string,
    /** Array of TUA estimates */
    solutions: TUASolution[],
}


/**
 * Properties for a TrackFeature
 */
export interface TrackProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Platform/vessel identifier */
    platform_id: string,
    /** Human-readable platform name */
    platform_name?: string,
    /** Type of track */
    track_type: string,
    /** Track start time (ISO8601) */
    start_time: string,
    /** Track end time (ISO8601) */
    end_time: string,
    /** Array of timestamped positions */
    positions: TimestampedPosition[],
    /** Composite styling for track line and position markers */
    style: TrackStyle,
    /** Default styling applied to all positions */
    default_position_style: PositionStyle,
    /** ISO 8601 duration for interval-based symbol display. E.g., "PT5M" = every 5 minutes, "PT1H" = every hour. Null means no interval-based symbols. */
    symbol_interval?: string,
    /** ISO 8601 duration for interval-based label display. Null means no interval-based labels. */
    label_interval?: string,
    /** Parallel array of per-position style overrides. Same length as positions array. Use null entries for positions without custom styling. */
    position_style_overrides?: PositionStyleOverride[],
    /** Per-segment metadata for compound tracks. When present, geometry MUST be MultiLineString and segments[i] describes coordinates[i]. When absent, geometry is LineString and the flat positions array is used. */
    segments?: SegmentMetadata[],
    /** Embedded sensor data associated with this track. Each sensor contains named metadata and an array of contact measurements. */
    sensors?: SensorData[],
    /** Embedded Target Uncertainty Area data associated with this track. Each TUA entry is a named collection of time-indexed solutions. */
    tuas?: TUAData[],
    /** Human-readable platform display name override. When set, overrides the registry-derived name for this track. */
    display_name?: string,
    /** ISO 3166-1 alpha-2 country code override (e.g., GB, US). When set, overrides the registry-derived nationality. */
    nationality?: string,
    /** Full vessel classification path override using slash-separated notation (e.g., surface/warship/frigate/type23). When set, overrides registry-derived path. */
    vessel_class?: string,
    /** Vessel type override (leaf of classification path, e.g., type23). When set, overrides the registry-derived type. */
    vessel_type?: string,
    /** Vessel role override (parent of leaf in classification path, e.g., frigate). When set, overrides the registry-derived role. */
    vessel_role?: string,
    /** Vessel domain override. When set, overrides the registry-derived domain. */
    domain?: string,
}


/**
 * GeoJSON Feature representing a vessel track
 */
export interface TrackFeature {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier (UUID recommended) */
    id: string,
    /** Track path as LineString (simple) or MultiLineString (compound) */
    geometry: GeoJSONLineString | GeoJSONMultiLineString,
    /** Track metadata */
    properties: TrackProperties,
    /** Bounding box [minLon, minLat, maxLon, maxLat] */
    bbox?: number[],
}


/**
 * Metadata for a single point within a MultiPoint reference set. Entries are parallel to the MultiPoint coordinates array. Downstream tools (#081 classifier) extend entries with zone/color fields.
 */
export interface PointMetadataEntry {
    /** 0-based ordinal matching coordinates array position */
    index: number,
    /** Human-readable point label (e.g., "Ref 1") */
    name: string,
}


/**
 * Properties for a ReferenceLocation
 */
export interface ReferenceLocationProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Reference location name */
    name: string,
    /** Type of reference */
    location_type: string,
    /** Additional description */
    description?: string,
    /** Map symbol identifier */
    symbol?: string,
    /** Point styling properties for display */
    style: PointProperties,
    /** Start of validity period */
    valid_from?: string,
    /** End of validity period */
    valid_until?: string,
    /** Per-point metadata array, parallel to MultiPoint coordinates. Each entry contains at minimum an index and name. Downstream tools extend entries with zone/color fields. */
    point_metadata?: PointMetadataEntry[],
}


/**
 * GeoJSON Feature for fixed reference points or reference point sets
 */
export interface ReferenceLocation {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Location (Point) or reference point set (MultiPoint) */
    geometry: GeoJSONPoint | GeoJSONMultiPoint,
    /** Reference metadata */
    properties: ReferenceLocationProperties,
}


/**
 * Properties for SYSTEM features storing application state
 */
export interface SystemStateProperties {
    /** Feature type discriminator */
    kind: string,
    /** Discriminator for state variant (temporal, spatial, selection, active_storyboard) */
    state_type: string,
    /** Viewport start time (ISO8601) - for temporal state */
    start_time?: string,
    /** Viewport end time (ISO8601) - for temporal state */
    end_time?: string,
    /** Bounding box [minLon, minLat, maxLon, maxLat] - for spatial state */
    bbox?: number[],
    /** Map zoom level - for spatial state */
    zoom?: number,
    /** Map center [longitude, latitude] - for spatial state */
    center?: number[],
    /** Array of selected feature IDs - for selection state */
    selected_ids?: string[],
    /** Storyboard properties.id the analyst last pinned for this plot (#237) */
    active_storyboard_id?: string,
    /** PROV-aligned provenance records (append-only log of tool operations) */
    provenance?: LogEntry[],
}


/**
 * GeoJSON Feature for storing non-spatial system state
 */
export interface SystemState {
    /** GeoJSON type discriminator */
    type: string,
    /** State identifier (must start with 'state.') */
    id: string,
    /** Point geometry with empty coordinates for SYSTEM features */
    geometry: GeoJSONEmptyPoint,
    /** State-specific properties */
    properties: SystemStateProperties,
}


/**
 * Properties for a MultiPointFeature (multi-point tool results)
 */
export interface MultiPointFeatureProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Human-readable result label */
    label: string,
    /** Point styling for all positions */
    style: PointProperties,
    /** Name of calculation tool that produced this result */
    source_tool?: string,
    /** IDs of input features used to generate this result */
    source_features?: string[],
    /** Additional description or notes */
    description?: string,
}


/**
 * GeoJSON Feature for multi-point tool results
 */
export interface MultiPointFeature {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier (UUID recommended) */
    id: string,
    /** MultiPoint geometry */
    geometry: GeoJSONMultiPoint,
    /** Feature properties and styling */
    properties: MultiPointFeatureProperties,
    /** Bounding box [minLon, minLat, maxLon, maxLat] */
    bbox?: number[],
}


/**
 * Properties for a MultiPolygonFeature (multi-polygon tool results)
 */
export interface MultiPolygonFeatureProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Human-readable result label */
    label: string,
    /** Polygon styling for all regions */
    style: PolygonProperties,
    /** Name of calculation tool that produced this result */
    source_tool?: string,
    /** IDs of input features used to generate this result */
    source_features?: string[],
    /** Additional description or notes */
    description?: string,
}


/**
 * GeoJSON Feature for multi-polygon tool results
 */
export interface MultiPolygonFeature {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier (UUID recommended) */
    id: string,
    /** MultiPolygon geometry */
    geometry: GeoJSONMultiPolygon,
    /** Feature properties and styling */
    properties: MultiPolygonFeatureProperties,
    /** Bounding box [minLon, minLat, maxLon, maxLat] */
    bbox?: number[],
}


/**
 * A PROV-aligned provenance record stored on GeoJSON features. Contains activity identity, timestamp, generator information, input/output references, execution duration, and tuning annotations.
 */
export interface LogEntry {
    /** Unique operation identifier (UUID v4). Shared across features in multi-feature operations. */
    activity_id: string,
    /** When the operation occurred (ISO 8601 with timezone). */
    timestamp: string,
    /** Tool identity and parameters for this invocation. */
    was_generated_by: WasGeneratedBy,
    /** Feature IDs of inputs. May be empty for operations with no explicit inputs. */
    used: string[],
    /** Feature IDs or versioned asset paths of outputs. May be empty for in-place modifications. */
    generated: string[],
    /** Wall-clock execution time in ISO 8601 duration format (e.g., PT0.3S). */
    execution_duration: string,
    /** Stable logical identity for artifact-producing tools. Null for non-artifact tools. */
    generated_result_id?: string,
    /** Parameter tuning record. Null until a tuning operation modifies this entry. */
    tune?: TuneAnnotation,
    /** Pre-operation feature states for coordinate-mutating tools. Captures geometry and spatial properties as they were immediately before the operation, enabling correct replay with modified parameters. Null for non-mutation tools. */
    input_state?: InputFeatureState[],
    /** Whether this entry is skipped during replay. Toggled via the flip-card edit face. */
    disabled?: boolean,
    /** Free-text analyst annotation explaining the reasoning for this operation. */
    rationale?: string,
    /** Human actor (e.g. analyst username) who triggered the operation. Added by #215 for Storyboarding CRUD provenance; optional and useful to any tool emitting LogEntry records. */
    agent?: string,
    /** Semantic kind of this provenance record. Optional; absent records are treated as `tool` by consumers. Introduced by feature 208 so future entry types (manual checkpoint, standalone tune, manual rationale) can be distinguished without overloading visual tool-category. See `shared/components/src/LogPanel/types.ts` `TimelineEntryKind` for the UI-side mirror. */
    activity_type?: ActivityType,
}


/**
 * Identifies the tool and its parameters for a specific invocation. Named after the W3C PROV vocabulary term.
 */
export interface WasGeneratedBy {
    /** Tool identifier (kebab-case, e.g., calculate-range). */
    tool: string,
    /** Semantic version of the tool (e.g., 1.2.0). */
    tool_version: string,
    /** Full resolved parameter set. Keys are parameter names, values are ParameterValue objects. May be empty dict. */
    parameters: ParameterValue[],
}


/**
 * A typed parameter value with replay metadata.
 */
export interface ParameterValue {
    /** The parameter value (any JSON type). */
    value: string,
    /** Whether this is the default value. */
    default?: boolean,
    /** Whether this parameter can be modified during replay. */
    tunable?: boolean,
}


/**
 * Pre-operation state of a feature captured before a coordinate-mutating tool executes. Enables correct replay by providing the original geometry as the anchor for re-computation with modified parameters.
 */
export interface InputFeatureState {
    /** ID of the feature whose pre-operation state is captured. */
    feature_id: string,
    /** Full GeoJSON geometry object (type + coordinates) as it was immediately before the operation. Stored as a JSON object. */
    geometry: string,
    /** Kind-specific spatial properties captured before the operation. Excludes provenance (which is append-only). Null if no spatial properties need capturing. */
    properties?: string,
}


/**
 * Records a parameter modification (appended, not replacing original).
 */
export interface TuneAnnotation {
    /** When the tuning occurred (ISO 8601 with timezone). */
    timestamp: string,
    /** Name of the parameter that was changed. */
    parameter: string,
    /** Value before tuning. */
    previous_value: string,
    /** Value after tuning. */
    new_value: string,
}


/**
 * Properties for a NarrativeEntry annotation
 */
export interface NarrativeEntryProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Narrative timestamp (ISO8601) */
    time: string,
    /** Narrative text content */
    text: string,
    /** Associated track identifier (optional) */
    track_id?: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Point styling properties for display position */
    style: PointProperties,
}


/**
 * GeoJSON Feature for timestamped narrative/log entries. Narratives are operator notes associated with a timestamp and optionally a track. Geometry is optional (Point for display position, or null).
 */
export interface NarrativeEntry {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Optional display position (Point) or null */
    geometry?: GeoJSONPoint,
    /** Narrative metadata */
    properties: NarrativeEntryProperties,
}


/**
 * Properties for a CircleAnnotation
 */
export interface CircleAnnotationProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Circle center as [longitude, latitude] for precise reconstruction */
    center: number[],
    /** Circle radius in meters for precise reconstruction */
    radius: number,
    /** Annotation label text */
    label?: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Polygon styling properties for the circle area */
    style: PolygonProperties,
}


/**
 * GeoJSON Feature for circle annotations. Geometry is a Polygon approximating the circle (vertices at regular intervals). Properties contain center and radius for precise reconstruction and smooth rendering.
 */
export interface CircleAnnotation {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Circle as Polygon (approximated with vertices, e.g., every 45 degrees) */
    geometry: GeoJSONPolygon,
    /** Circle metadata including center and radius for reconstruction */
    properties: CircleAnnotationProperties,
}


/**
 * Properties for a RectangleAnnotation
 */
export interface RectangleAnnotationProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Annotation label text */
    label?: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Polygon styling properties for the rectangle area */
    style: PolygonProperties,
}


/**
 * GeoJSON Feature for rectangle annotations. Geometry is a Polygon with 4 corners (plus closing point).
 */
export interface RectangleAnnotation {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Rectangle as Polygon (4 corners + close) */
    geometry: GeoJSONPolygon,
    /** Rectangle metadata */
    properties: RectangleAnnotationProperties,
}


/**
 * Properties for a LineAnnotation
 */
export interface LineAnnotationProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Annotation label text */
    label?: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Line styling properties for the line segment */
    style: LineProperties,
}


/**
 * GeoJSON Feature for line segment annotations. Geometry is a LineString with 2 points (start and end).
 */
export interface LineAnnotation {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Line as LineString (2 points) */
    geometry: GeoJSONLineString,
    /** Line metadata */
    properties: LineAnnotationProperties,
}


/**
 * Properties for a TextAnnotation
 */
export interface TextAnnotationProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Text content to display */
    text: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Point styling properties for the text position marker */
    style: PointProperties,
}


/**
 * GeoJSON Feature for text annotations at a position. Geometry is the Point where text should be displayed.
 */
export interface TextAnnotation {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Text display position */
    geometry: GeoJSONPoint,
    /** Text metadata */
    properties: TextAnnotationProperties,
}


/**
 * Properties for a VectorAnnotation
 */
export interface VectorAnnotationProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Vector origin as [longitude, latitude] for precise reconstruction */
    origin: number[],
    /** Vector length/range in meters for precise reconstruction */
    range: number,
    /** Vector bearing in degrees (0-360, from north) for precise reconstruction */
    bearing: number,
    /** Annotation label text */
    label?: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Line styling properties for the vector */
    style: LineProperties,
}


/**
 * GeoJSON Feature for vector annotations. Geometry is a LineString from origin to endpoint (computed from range/bearing). Properties contain origin, range, and bearing for precise reconstruction.
 */
export interface VectorAnnotation {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Vector as LineString (origin to computed endpoint) */
    geometry: GeoJSONLineString,
    /** Vector metadata including origin, range, and bearing for reconstruction */
    properties: VectorAnnotationProperties,
}


/**
 * Properties for a PolyAnnotation
 */
export interface PolyAnnotationProperties extends BaseFeatureProperties {
    /** Feature type discriminator */
    kind: string,
    /** Number of unique vertices (excluding ring closure point) */
    vertex_count: number,
    /** Annotation label text */
    label?: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Polygon styling properties for the polygon area */
    style: PolygonProperties,
    /** Source line number for debugging */
    line_number?: number,
}


/**
 * GeoJSON Feature for arbitrary polygon annotations. Geometry is a Polygon with user-defined vertices (freeform shape). Used for patrol zones, exclusion areas, search grids, etc.
 */
export interface PolyAnnotation {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Polygon with user-defined vertices (closed ring) */
    geometry: GeoJSONPolygon,
    /** Polygon metadata including vertex count and styling */
    properties: PolyAnnotationProperties,
}


/**
 * A constraint specifying which feature kinds a tool accepts, with minimum and maximum counts. Used to determine if a tool is applicable to the current selection.
 */
export interface SelectionRequirement {
    /** The feature kind this requirement applies to. Supports flat values (e.g., "TRACK", "POINT") matching the 'kind' property of GeoJSON features, and dot-delimited hierarchical paths (e.g., "TRACK.SENSOR", "TRACK.SEGMENT") for targeting embedded children within compound features. */
    kind: string,
    /** Optional filter for segment type when kind targets TRACK.SEGMENT. Must be a valid SegmentTypeEnum value (e.g., "ABSOLUTE_TMA"). Only meaningful when kind is "TRACK.SEGMENT". */
    segment_type?: string,
    /** Minimum number of features of this kind required. Must be >= 0. Defaults to 0 if not specified. */
    min?: number,
    /** Maximum number of features of this kind allowed. Must be >= min if both specified. Null means no upper limit. */
    max?: number,
}


/**
 * An analysis operation with a name, description, version, and selection requirements. Tools are discovered from debrief-calc via MCP and matched to analyst selections.
 */
export interface Tool {
    /** Unique identifier for the tool. Used for execution and deduplication. Should be stable across versions. */
    id: string,
    /** Human-readable name displayed in menus and panels. Should be concise (2-4 words). */
    name: string,
    /** Brief description of what the tool does. Displayed in tooltips and help text. Should be one sentence. */
    description?: string,
    /** Tool version string for provenance tracking. Follows semantic versioning (e.g., "1.0.0"). */
    version?: string,
    /** List of selection requirements. Tool is active when ALL requirements are satisfied by the current selection. Empty list means tool accepts any selection. */
    requirements?: SelectionRequirement[],
    /** Visual category for Log Panel icon rendering. Null / absent tools render with the neutral-grey "Other" icon. First-party tools MUST declare a value (enforced by test policy; see specs/207-tool-manifest-categories/research.md §R5). Feature 207. */
    category?: string,
}


/**
 * A configurable parameter for a tool. Supports string, number, boolean, and enum types with optional default values, explicit choices, and schema-defined parameter type references.
 */
export interface ToolParameter {
    /** Parameter identifier (kebab-case) */
    name: string,
    /** Value type discriminator: string, number, boolean, enum */
    type: string,
    /** Human-readable parameter description */
    description: string,
    /** Whether parameter must be provided */
    required?: boolean,
    /** Default value if not provided */
    default_value?: string,
    /** References a schema-defined parameter-type enum by name. When set, the client resolves enum values from generated types rather than using inline choices. */
    param_type?: string,
}


/**
 * Properties for the non-spatial system record feature. A system record is a GeoJSON Feature with kind SYSTEM_RECORD and Point geometry with empty coordinates.
 */
export interface SystemRecordProperties {
    /** Feature type discriminator */
    kind: string,
    /** Doubly-linked snapshot chain. Null when no snapshots exist. */
    snapshot_links?: SnapshotLinks,
    /** Branch records. Empty array when no branches exist. */
    branches?: BranchRecord[],
    /** Reverse link to source plot (set when this plot is a branch). */
    branch_origin?: BranchOrigin,
    /** File-level provenance events (snapshot and branch creation). */
    provenance?: FileProvEntry[],
}


/**
 * Doubly-linked references to adjacent snapshots.
 */
export interface SnapshotLinks {
    /** Link to previous snapshot. Null if this is the first snapshot. */
    prev?: SnapshotRef,
    /** Link to next snapshot. Null if this is the current working file. */
    next?: SnapshotRef,
}


/**
 * Reference to a snapshot file.
 */
export interface SnapshotRef {
    /** Relative path to snapshot GeoJSON file. */
    asset: string,
    /** Number of provenance entries in the snapshot. */
    prov_entry_count: number,
}


/**
 * Reference to a branched plot.
 */
export interface BranchRecord {
    /** Unique branch identifier. */
    branch_id: string,
    /** Activity ID of the branch point. */
    branched_from: string,
    /** When the branch was created (ISO 8601 with timezone). */
    branched_at: string,
    /** Relative path to the branched plot file. */
    target_asset: string,
}


/**
 * Reverse link on a branch plot's system record, pointing to the source plot.
 */
export interface BranchOrigin {
    /** Relative path to the source plot file. */
    source_asset: string,
    /** Activity ID of the branch point. */
    branched_from: string,
    /** When the branch was created (ISO 8601 with timezone). */
    branched_at: string,
    /** Branch identifier matching the source BranchRecord. */
    branch_id: string,
}


/**
 * File-level provenance event (snapshot or branch creation).
 */
export interface FileProvEntry {
    /** Unique event identifier. */
    activity_id: string,
    /** Event type: snapshot or branch. */
    type: string,
    /** When the event occurred (ISO 8601 with timezone). */
    timestamp: string,
    /** Path to snapshot file (for snapshot events). */
    asset?: string,
    /** Branch identifier (for branch events). */
    branch_id?: string,
    /** 'source' or 'target' (for branch events). */
    direction?: string,
}


/**
 * Fully-resolved metadata for a single platform within a STAC item. Produced by save-time resolution merging registry lookups with analyst overrides. Only id is required; all other fields may be absent for unregistered platforms.

 */
export interface PlatformRecord {
    /** Platform identifier (e.g., "NELSON"). Matches platform_id on TrackProperties. */
    id: string,
    /** Human-readable platform name (e.g., "HMS Nelson") */
    name?: string,
    /** ISO 3166-1 alpha-2 country code (e.g., GB, US) */
    nationality?: string,
    /** Full vessel classification path using slash-separated notation (e.g., surface/warship/frigate/type23).
 */
    vessel_class?: string,
    /** Vessel type — leaf of classification path (e.g., type23) */
    vessel_type?: string,
    /** Vessel role — parent of leaf in classification path (e.g., frigate) */
    vessel_role?: string,
    /** Top-level vessel domain classification */
    domain?: string,
}


/**
 * Single entry in item.properties["debrief:provenance_log"] recording one Properties Panel commit. Appended by stacService.updateItemMetadata (single writer — Article IV.2). Immutable once written (Article III.3); archive rotation preserves entries by moving to a sibling provenance_log_archive.jsonl — entries are never mutated or deleted in place.

 */
export interface PropertiesProvenanceEntry {
    /** ULID generated by the service writer at commit time. Monotonic sort key for replay, undo, and LogPanel cross-referencing.
 */
    activity_id: string,
    /** ISO-8601 UTC timestamp set by the service at write time. */
    timestamp: string,
    /** Sentinel identifying the Properties Panel as the writer. MUST equal "debrief.propertiesPanel".
 */
    tool: string,
    /** Versioned method identifier matching ^properties-panel@.+$, populated from the @debrief/components package.json version.
 */
    method: string,
    /** Non-empty list of field names touched in this commit. Sorted alphabetically for deterministic replay.
 */
    fields: string[],
    /** Origin of the edit. MUST equal "user" — Properties Panel edits are human-initiated.
 */
    source: string,
}


/**
 * Extension properties added to STAC item.properties under the debrief: namespace. All properties are optional — existing items without extension properties remain valid. These properties enable filtering, searching, and colour-coding in the Discovery UI.

 */
export interface StacExtensionProperties {
    /** Fully-resolved per-platform metadata array. Each entry represents one platform in the plot with merged registry + override data.
 */
    platforms?: PlatformRecord[],
    /** Plot-level tags — free-text labels applied to the entire plot by the analyst. Trimmed non-empty strings with no duplicates.
 */
    tags?: string[],
    /** Union of all feature-level tags from the plot's GeoJSON features. Aggregated at item level for discoverability. Authoritative per-feature tags remain in each GeoJSON feature's properties.
 */
    feature_tags?: string[],
    /** Flat list of field names on item.properties that the analyst has overridden via the Properties Panel. Auto-derivation routines (e.g. stacService.updateTemporalMetadata) MUST skip any field whose name appears here. Sorted alphabetically on write; deduplicated.
 */
    overrides?: string[],
    /** Per-commit provenance entries written by the Properties Panel. Bounded at 500 entries per item; overflow rotates to sibling provenance_log_archive.jsonl in the item directory. Append-only (Article III.3 — audit trail immutable).
 */
    provenance_log?: PropertiesProvenanceEntry[],
}


/**
 * Temporal extent of a plot expressed as ISO 8601 strings. Used within PlotSummary and StacItemSummary for lightweight display without the full epoch+iso dual representation of TimeInstant.

 */
export interface PlotTimeExtent {
    /** Start of time extent (ISO 8601) */
    start: string,
    /** End of time extent (ISO 8601) */
    end: string,
}


/**
 * Projection of a STAC Item for UI consumption (e.g., browser tree rows). Carries only the fields required for listing and opening a plot, derived from the STAC Item plus its debrief: extension properties. Replaces the Plot interface from apps/vscode/src/types/plot.ts as the canonical summary type.

 */
export interface PlotSummary {
    /** STAC Item ID */
    id: string,
    /** Plot title from STAC metadata */
    title: string,
    /** Creation/capture timestamp (ISO 8601) */
    datetime: string,
    /** Path to item.json relative to store root */
    item_path: string,
    /** Parent catalog identifier */
    catalog_id: string,
    /** Original source file path (for provenance) */
    source_path?: string,
    /** Geographic bounding box as [west, south, east, north] */
    bbox?: number[],
    /** Temporal extent of the plot (start/end ISO 8601 strings) */
    time_extent?: PlotTimeExtent,
    /** Number of tracks in this plot */
    track_count?: number,
    /** Number of reference locations in this plot */
    location_count?: number,
}


/**
 * Minimal STAC Item projection for browser tree display and metadata filtering. Unifies StacItemSummary (apps/vscode/src/types/stac.ts) and CatalogOverviewItem (shared/components/src/filter-engine/types.ts) into a single canonical summary type that carries both navigation fields and the full set of debrief: extension properties needed for filtering.

 */
export interface StacItemSummary {
    /** STAC Item ID */
    id: string,
    /** Item title */
    title: string,
    /** Single datetime (ISO 8601) — fallback when start/end not available */
    datetime?: string,
    /** Path to item.json relative to store root */
    item_path: string,
    /** Parent catalog identifier */
    catalog_id: string,
    /** Parent store identifier (needed for URI construction) */
    store_id: string,
    /** Geographic bounding box as [west, south, east, north] */
    bbox?: number[],
    /** Range start datetime (ISO 8601) */
    start_datetime?: string,
    /** Range end datetime (ISO 8601) */
    end_datetime?: string,
    /** Fully-resolved per-platform metadata array for filtering. Same structure as StacExtensionProperties.platforms.
 */
    platforms?: PlatformRecord[],
    /** Plot-level tags from debrief:tags */
    tags?: string[],
    /** Feature-level tags from debrief:feature_tags */
    feature_tags?: string[],
}


/**
 * Parse-boundary GeoJSON Feature (RFC 7946 §3.2). Consumers narrow this to a domain feature (TrackFeature, ReferenceLocation, SystemState, MultiPointFeature, MultiPolygonFeature) after validating the properties.kind discriminator. Narrowing is done via the existing isDebriefFeature / isTrackFeature / isReferenceLocation type guards in @debrief/schemas/unions.ts (TypeScript) and debrief_schemas.unions (Python). Note: geometry is REQUIRED — callers handling possibly-null geometry payloads (e.g. NarrativeEntry features) either narrow at the parse boundary or defer to the domain-specific feature class that allows the looser shape (see ADR-021 for the ingress-coercion deferral).
 */
export interface RawGeoJSONFeature {
    /** GeoJSON object type — always "Feature". */
    type: "Feature",
    /** Optional feature identifier. RFC 7946 permits either a string or an integer; both are retained without coercion. */
    id?: string | number,
    /** GeoJSON geometry — any_of union over the seven existing geometry classes in geojson.yaml (GeoJSONPoint, GeoJSONEmptyPoint, GeoJSONLineString, GeoJSONPolygon, GeoJSONMultiPoint, GeoJSONMultiLineString, GeoJSONMultiPolygon). Pydantic validates via try-each-alternative; observed cost is ~25µs per feature (10 000 features in ~250ms). */
    geometry: GeoJSONPoint | GeoJSONEmptyPoint | GeoJSONLineString | GeoJSONPolygon | GeoJSONMultiPoint | GeoJSONMultiLineString | GeoJSONMultiPolygon,
    /** Free-form properties dictionary. Consumers narrow to a domain properties class (TrackProperties, ReferenceLocationProperties, etc.) after validating the kind discriminator. May be absent or null per RFC 7946 §3.2. */
    properties?: Record<string, unknown> | null,
    /** Optional bounding box. Either [minLon, minLat, maxLon, maxLat] (length 4) or [minLon, minLat, minAlt, maxLon, maxLat, maxAlt] (length 6). */
    bbox?: number[],
}


/**
 * Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3.3). Used by STAC item payloads and tool-result layers before narrowing.
 */
export interface RawGeoJSONFeatureCollection {
    /** GeoJSON object type — always "FeatureCollection". */
    type: "FeatureCollection",
    /** The collection's features, in document order. */
    features: RawGeoJSONFeature[],
    /** Optional bounding box, shaped as in RawGeoJSONFeature.bbox. */
    bbox?: number[],
}


/**
 * A point in time with dual representations (FR-032, FR-033)
 */
export interface TimeInstant {
    /** Milliseconds since Unix epoch */
    epoch: number,
    /** ISO 8601 UTC format string */
    iso: string,
}


/**
 * A temporal interval with inclusive start and end
 */
export interface TimeRange {
    /** Start of interval */
    start: TimeInstant,
    /** End of interval */
    end: TimeInstant,
}


/**
 * Constraints on the visible time window (epoch milliseconds; null = unbounded)
 */
export interface TimeFilter {
    /** Filter start as epoch milliseconds (null/missing = unbounded on the start) */
    start?: number,
    /** Filter end as epoch milliseconds (null/missing = unbounded on the end) */
    end?: number,
}


/**
 * Step size for discrete time navigation (FR-008)
 */
export interface TimeStep {
    /** Numeric step value */
    value: number,
    /** Unit of the step */
    unit: string,
}


/**
 * A geographic coordinate [longitude, latitude]
 */
export interface Coordinate {
    /** Longitude in degrees (-180 to 180) */
    longitude: number,
    /** Latitude in degrees (-90 to 90) */
    latitude: number,
}


/**
 * Geographic area as a 4-corner polygon supporting rotated views (FR-012, FR-013)
 */
export interface ViewportPolygon {
    /** Four corners in clockwise order [NW, NE, SE, SW] */
    coordinates: Coordinate[],
    /** Map zoom level for restoring the view (optional) */
    zoom?: number,
}


/**
 * Named nesting level within a feature hierarchy (Feature 053, FR-010). Defines how addresses at this level are interpreted.
 */
export interface LevelDefinition {
    /** Level identifier used in selection paths */
    name: string,
    /** How addresses at this level are interpreted */
    addressingMode: string,
    /** Human-readable description */
    description?: string,
}


/**
 * Set of selected feature identifiers with metadata (FR-017). featureIds accepts selection path strings: forward-slash-separated segments following RFC 6901 escaping. A single-segment path is a flat feature ID (backward compatible). Feature 053.
 */
export interface FeatureSelection {
    /** Selected feature paths. Each entry is a forward-slash-separated selection path (e.g. "track-001/positions/4") or a flat feature ID. */
    featureIds: string[],
    /** Primary selection path for properties display */
    primary?: string,
    /** When selection was made */
    timestamp: TimeInstant,
}


/**
 * Time-related state including navigation, playback, and filtering
 */
export interface TemporalSlice {
    /** Current playback/display time (FR-005) */
    currentTime?: TimeInstant,
    /** Full temporal extent of loaded data (FR-006) */
    timeRange?: TimeRange,
    /** Optional visible time window constraint (FR-007) */
    timeFilter?: TimeFilter,
    /** Step size for discrete navigation (FR-008) */
    stepSize: TimeStep,
    /** Playback speed multiplier 0.1-100x (FR-009) */
    playbackRate: number,
    /** Current playback state - ephemeral (FR-010) */
    playbackState: PlaybackState,
    /** Track visualization mode (FR-011) */
    displayMode: DisplayMode,
}


/**
 * Geographic view state for the map display
 */
export interface SpatialSlice {
    /** Visible map area as 4-corner polygon (FR-012) */
    viewport?: ViewportPolygon,
    /** Map rotation in degrees 0-360 (FR-013) */
    rotation: number,
}


/**
 * Feature selection and visibility state
 */
export interface FeaturesSlice {
    /** Reference to external feature collection (FR-016) */
    featureCollectionUri?: string,
    /** Currently selected features (FR-017) */
    selection: FeatureSelection,
    /** Features hidden from display (FR-018) */
    hiddenFeatureIds?: string[],
}


/**
 * Editor lifecycle state including dirty tracking and undo history
 */
export interface DocumentSlice {
    /** Unsaved changes exist - ephemeral (FR-020) */
    dirty: boolean,
    /** Last save location */
    savePath?: string,
}


/**
 * Record of the last tool execution, enabling single-step undo. Feature 110-tool-level-undo-gap.

 */
export interface LastToolExecution {
    /** Identifier of the tool that was executed */
    tool_id: string,
    /** IDs of the source features the tool operated on */
    source_feature_ids: string[],
    /** IDs of the result layers produced by the tool */
    result_layer_ids: string[],
}


/**
 * Accumulated tool result layers and last-execution record for undo support. Features 109-unify-result-layer-lifecycle and 110-tool-level-undo-gap.

 */
export interface ResultsSlice {
    /** Accumulated tool result features */
    result_layers: RawGeoJSONFeature[],
    /** Last tool execution record for single-step undo */
    last_tool_execution?: LastToolExecution,
}


/**
 * Multi-axis filter state for the STAC browser panel. Manages the metadata filter expression plus active flags for spatial (viewport) and temporal (timeline) filter axes. Feature 132-three-view-sync. Note: spatial bounds and temporal range live in SpatialSlice/TemporalSlice; this slice only tracks the metadata expression and axis-activation flags.

 */
export interface BrowserFilterSlice {
    /** Set of exercise IDs passing the current metadata filter. Absent/null means all items pass (no filter applied).
 */
    metadata_filtered_ids?: string[],
    /** Serialised CQL2 filter expression from the filter bar, stored as an opaque JSON object (Record<string, unknown>). Absent/null means no filter is active. Stored for debugging and round-trip serialisation.
 */
    metadata_expression?: string,
    /** Whether the map viewport is used as a spatial filter */
    spatial_filter_active: boolean,
    /** Whether the timeline range is used as a temporal filter */
    temporal_filter_active: boolean,
}


/**
 * Root entity containing all session state slices (FR-001, FR-002)
 */
export interface SessionState {
    /** Schema version for persistence compatibility (FR-026) */
    schemaVersion: string,
    /** Time-related state */
    temporal: TemporalSlice,
    /** Geographic view state */
    spatial: SpatialSlice,
    /** Feature-related state */
    features: FeaturesSlice,
    /** Editor state */
    document: DocumentSlice,
}


/**
 * Persisted session file format (FR-024)
 */
export interface SessionFile {
    /** JSON Schema URI */
    $schema?: string,
    /** Schema version */
    version: string,
    /** When the session was saved (ISO 8601) */
    savedAt: string,
    /** Temporal state (excluding ephemeral playbackState) */
    temporal: TemporalSlice,
    /** Spatial state */
    spatial: SpatialSlice,
    /** Features state */
    features: FeaturesSlice,
}


/**
 * Slash-delimited hierarchical type path. Format: {top_type}/{domain}/{specific_type} Example: mutation/track/smoothed

 */
export interface ResultTypePath {
    /** Full hierarchical path */
    path: string,
}


/**
 * Annotations for MCP tool result content items. All results MUST include resultType, sourceFeatures, and label. Deletions MUST include deletedFeatures. Artifacts MUST include href.

 */
export interface ToolResultAnnotations {
    /** Hierarchical result type (e.g., mutation/track/smoothed) */
    resultType: string,
    /** IDs of input features used to generate this result */
    sourceFeatures: string[],
    /** Human-readable description of the result */
    label: string,
    /** Relative path to artifact file (REQUIRED for artifacts) */
    href?: string,
    /** IDs of features removed (REQUIRED for deletions) */
    deletedFeatures?: string[],
}


/**
 * Axis label and type metadata for a dataset chart
 */
export interface DatasetAxisMetadata {
    /** Human-readable axis label (e.g., "Time", "Range") */
    label: string,
    /** Axis data type (temporal, quantitative) */
    type: string,
    /** Units for the axis values (e.g., "m", "°") */
    units?: string,
}


/**
 * Chart metadata for a dataset entry
 */
export interface DatasetMetadata {
    /** X-axis metadata */
    xAxis: DatasetAxisMetadata,
    /** Y-axis metadata */
    yAxis: DatasetAxisMetadata,
}


/**
 * A single structured data record within a series or flat dataset. Fields are open-ended (the axes are described by DatasetMetadata) to accommodate any combination of x/y/series-key values produced by tools. At minimum one of x_value or y_value is expected, but additional domain-specific fields (e.g., "zone", "bearing", "time") are allowed.

 */
export interface DatasetDataPoint {
    /** Primary independent-axis value serialised as a string. For temporal axes this is an ISO 8601 datetime; for quantitative axes it is a decimal string; for nominal/ordinal axes it is the category label.
 */
    x_value?: string,
    /** Primary dependent-axis value serialised as a string (decimal or label).
 */
    y_value?: string,
    /** Series discriminator for multi-series datasets (e.g., track name). Absent for single-series (flat) datasets.
 */
    series_key?: string,
}


/**
 * A named data series within a multi-series dataset. Replaces the earlier float[] data field with a list of structured DatasetDataPoint records to match the runtime DataSeries shape from shared/components/src/ChartRenderer/types.ts (Record<string, unknown>[]).

 */
export interface DatasetSeries {
    /** Series display name (shown in chart legend) */
    name: string,
    /** Array of structured data records for this series. Each record carries open x/y/domain fields; see DatasetDataPoint.
 */
    data_points: DatasetDataPoint[],
}


/**
 * Standard envelope for all tool result datasets, matching the runtime DatasetEnvelope interface from shared/components/src/ChartRenderer/types.ts. Exactly one of data_points (flat/single-series) or series (multi-series) should be populated per instance.

 */
export interface DatasetEntry {
    /** Dataset subtype identifier (e.g., "zone_histogram", "range_bearing_series") */
    type: string,
    /** Human-readable chart title */
    title: string,
    /** Axis definitions and display hints */
    metadata: DatasetMetadata,
    /** Flat array of structured data records for histograms and single-series charts. Corresponds to DatasetEnvelope.data (Record<string, unknown>[]). Absent when series is populated.
 */
    data_points?: DatasetDataPoint[],
    /** Named data series for multi-line/multi-series charts. Corresponds to DatasetEnvelope.series (DataSeries[]). Absent when data_points is populated.
 */
    series?: DatasetSeries[],
}


/**
 * Camera state sub-record inside a Scene. Captures the map viewport at capture time.
 */
export interface Viewport {
    /** [longitude, latitude] in degrees */
    center: number[],
    /** Leaflet-compatible zoom level */
    zoom: number,
    /** Viewport bearing in degrees. MUST be 0 in schema v1 (reserved slot for future rotated viewports). */
    bearing: number,
}


/**
 * Properties class for a Storyboard parent Feature. A Storyboard is a named, ordered collection of Scenes attached to a single plot.
 */
export interface StoryboardProperties extends BaseFeatureProperties {
    /** Feature kind discriminator (pinned to STORYBOARD) */
    kind: string,
    /** ULID (26 chars, Crockford base-32). Immutable after create. */
    id: string,
    /** Display title. Non-empty. Unique within plot FeatureCollection. */
    name: string,
    /** Markdown narrative description */
    description?: string,
    /** Schema version. Starts at 1. Monotonically non-decreasing across edits; bumped only by migrations. */
    schema_version: number,
}


/**
 * Properties class for a Scene child Feature. A Scene is a single captured moment in a Storyboard — viewport, timestamp, and per-feature visibility.
 */
export interface SceneProperties extends BaseFeatureProperties {
    /** Feature kind discriminator (pinned to STORYBOARD_SCENE) */
    kind: string,
    /** ULID (26 chars, Crockford base-32). Immutable after create. */
    id: string,
    /** Foreign key to parent Storyboard.properties.id (ULID). */
    storyboard_id: string,
    /** Display title. Defaults to DTG of timestamp in DDHHmmZ MMM YY; falls back to ISO-8601 on parse failure. */
    title: string,
    /** Markdown per-scene narrative */
    description?: string,
    /** Map viewport camera state at capture time */
    viewport: Viewport,
    /** ISO-8601 instant when the Scene was captured. Drives Scene ordering (ascending within a Storyboard). MUST be unique within a Storyboard. */
    timestamp: string,
    /** Reserved slot for v2 animated time-range Scenes. MUST be absent (null) in schema v1. */
    time_range?: string,
    /** Stable feature IDs visible at capture. Canonicalised (trim, reject empty, dedupe, sort lexicographically) by the CRUD module before hashing. Order-insensitive from the consumer's perspective. */
    visible_feature_ids: string[],
    /** SHA-256 hex (lowercase, 64 chars) of JSON.stringify(canonical visible_feature_ids). Recomputed on every create/update touching visible_feature_ids. */
    feature_set_hash: string,
    /** STAC asset key (path + name within the plot's STAC item). Populated by #216 at capture time via #174 helpers. */
    thumbnail_asset_ref: string,
    /** Playback transition duration in milliseconds. Default 500. */
    transition_duration_ms: number,
    /** Time-controller display mode at capture time (full = entire track history; trail = only the tail behind each platform). Reuses DisplayModeEnum from session-state.yaml. Optional for legacy compatibility (Spec #258): readers MUST leave the time controller untouched when this slot is absent (FR-003). Writers populate it from session.displayMode at the moment the scene is created. */
    display_mode?: DisplayMode,
    /** Provenance of the scene's stored polygon geometry (Spec #258). 'bounds' = computed from real Leaflet map bounds at capture time; 'placeholder' = pre-#258 ~100m square; 'manual' = reserved for future user-drawn rectangles. Render-side consumers recompute the polygon from (viewport, map dimensions) when this value is anything other than 'bounds' (including absent, for legacy scenes). The stored geometry is NEVER rewritten on read (Article III.2 source preservation). */
    _polygon_source?: PolygonSource,
}


/**
 * GeoJSON Feature representing a Storyboard parent entity
 */
export interface StoryboardFeature {
    /** GeoJSON type discriminator */
    type: string,
    /** Stable identifier (equal to properties.id). ULID. */
    id: string,
    /** Polygon hull covering the union of child Scene viewport bounds. Recomputed whenever the Scene set changes. */
    geometry: GeoJSONPolygon,
    /** Storyboard properties */
    properties: StoryboardProperties,
}


/**
 * GeoJSON Feature representing a Scene child entity
 */
export interface SceneFeature {
    /** GeoJSON type discriminator */
    type: string,
    /** Stable identifier (equal to properties.id). ULID. */
    id: string,
    /** Polygon covering the map viewport bounds at capture time. Antimeridian-crossing viewports produce a best-effort Polygon in MVP (module logs a warning; does not throw). */
    geometry: GeoJSONPolygon,
    /** Scene properties */
    properties: SceneProperties,
}


/**
 * A single STAC Item asset entry produced by Storyboarding (#216) for one
variant of one Scene's thumbnail. Always appears as part of a
pair in an Item's `assets` map: a large entry under the key
`scene-thumbnail-{ULID}` and a small entry under the key
`scene-thumbnail-{ULID}-sm`, where `{ULID}` is the owning Scene's
identifier (matches SceneProperties.id).

Why ULID: the owning Scene's id; lets every per-Scene asset be
traced back to its Scene without an explicit foreign-key field
in the asset payload.

Why pairs: the Storyboarding capture pipeline produces both
sizes atomically (800x600 large for inspection; 200x150 small
for timeline strips). A single-variant entry is a defect — see
schema rule scene-thumbnail-pair-rule-001.

Lifecycle: created when a Scene is captured. Deleted when the
Scene is deleted (garbage-collection invariant — see schema
rule scene-thumbnail-orphan-rule-001). Both rules are enforced
by the debrief-stac audit module; the JSON Schema layer
enforces the value shape and key format only (see schema rule
scene-thumbnail-key-format-rule-001).

Supersedes the spec-241 placeholder `item_assets["scene-thumbnail"]`
and the `^scene-thumbnail(-.+)?$` patternProperties rule.
 */
export interface SceneThumbnailAssetEntry {
    /** URI-reference relative to the Item directory; conventionally ./scene-thumbnails/scene-{ULID}.png (large) or ./scene-thumbnails/scene-{ULID}-sm.png (small). */
    href: string,
    /** Always image/png — Storyboarding capture writes PNGs only. */
    type: string,
    /** Exactly ["thumbnail"]. Storyboarding-derived thumbnails are not declared as overview (which is reserved for plot-level overviews of dimensions 600x800). */
    roles: string[],
    /** Optional human label. Storyboarding writer emits "Scene thumbnail" (large) or "Scene thumbnail (small)" (small). */
    title?: string,
}



