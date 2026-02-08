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
};


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
    symbol: string,
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
    symbol?: string,
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
    coordinates: number[],
}


/**
 * GeoJSON Polygon geometry
 */
export interface GeoJSONPolygon {
    /** Geometry type discriminator */
    type: string,
    /** Array of linear rings (arrays of [lon, lat] pairs) */
    coordinates: number[],
}


/**
 * GeoJSON MultiLineString geometry for compound tracks
 */
export interface GeoJSONMultiLineString {
    /** Geometry type discriminator */
    type: string,
    /** Array of LineString coordinate arrays */
    coordinates: number[],
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
 * Single sensor measurement record. Represents one bearing/range observation at a point in time.
 */
export interface SensorContact {
    /** Contact measurement timestamp (ISO8601) */
    time: string,
    /** Bearing to contact in degrees (0-360) */
    bearing: number,
    /** Range to contact in metres */
    range?: number,
    /** Measured frequency in Hz */
    frequency?: number,
    /** Ambiguous bearing (second solution) in degrees */
    ambiguous_bearing?: number,
    /** Display label */
    label?: string,
    /** Operator note */
    comment?: string,
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
    /** Display mode flag */
    worm_in_hole?: boolean,
    /** Array of sensor measurements */
    contacts: SensorContact[],
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
export interface TrackProperties {
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
    /** Original source file path */
    source_file?: string,
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
 * Properties for a ReferenceLocation
 */
export interface ReferenceLocationProperties {
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
}


/**
 * GeoJSON Feature for fixed reference points
 */
export interface ReferenceLocation {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier */
    id: string,
    /** Location (Point) or area (Polygon) */
    geometry: GeoJSONPoint,
    /** Reference metadata */
    properties: ReferenceLocationProperties,
}


/**
 * Properties for SYSTEM features storing application state
 */
export interface SystemStateProperties {
    /** Feature type discriminator */
    kind: string,
    /** Discriminator for state variant (temporal, spatial, selection) */
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
 * Properties for a NarrativeEntry annotation
 */
export interface NarrativeEntryProperties {
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
    /** Original source file path */
    source_file?: string,
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
export interface CircleAnnotationProperties {
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
    /** Original source file path */
    source_file?: string,
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
export interface RectangleAnnotationProperties {
    /** Feature type discriminator */
    kind: string,
    /** Annotation label text */
    label?: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Polygon styling properties for the rectangle area */
    style: PolygonProperties,
    /** Original source file path */
    source_file?: string,
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
export interface LineAnnotationProperties {
    /** Feature type discriminator */
    kind: string,
    /** Annotation label text */
    label?: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Line styling properties for the line segment */
    style: LineProperties,
    /** Original source file path */
    source_file?: string,
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
export interface TextAnnotationProperties {
    /** Feature type discriminator */
    kind: string,
    /** Text content to display */
    text: string,
    /** Display symbol code from REP file */
    symbol?: string,
    /** Point styling properties for the text position marker */
    style: PointProperties,
    /** Original source file path */
    source_file?: string,
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
export interface VectorAnnotationProperties {
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
    /** Original source file path */
    source_file?: string,
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
}



