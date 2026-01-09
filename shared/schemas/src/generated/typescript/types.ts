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
* Type of sensor that produced a contact
*/
export enum SensorTypeEnum {
    
    /** Active sonar */
    SONAR_ACTIVE = "SONAR_ACTIVE",
    /** Passive sonar */
    SONAR_PASSIVE = "SONAR_PASSIVE",
    /** Radar */
    RADAR = "RADAR",
    /** Electronic Support Measures */
    ESM = "ESM",
    /** Visual observation */
    VISUAL = "VISUAL",
    /** Automatic Identification System */
    AIS = "AIS",
    /** Other sensor type */
    OTHER = "OTHER",
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
* Category of analysis tool
*/
export enum ToolCategoryEnum {
    
    /** Geometric calculations */
    GEOMETRY = "GEOMETRY",
    /** Speed, course, bearing calculations */
    KINEMATICS = "KINEMATICS",
    /** Tactical analysis */
    TACTICAL = "TACTICAL",
    /** Data export */
    EXPORT = "EXPORT",
    /** Data transformation */
    TRANSFORM = "TRANSFORM",
};
/**
* Type of selection context required by a tool
*/
export enum SelectionContextEnum {
    
    /** Single track selected */
    SINGLE_TRACK = "SINGLE_TRACK",
    /** Multiple tracks selected */
    MULTIPLE_TRACKS = "MULTIPLE_TRACKS",
    /** Time period selected */
    TIME_PERIOD = "TIME_PERIOD",
    /** Track segment selected */
    TRACK_SEGMENT = "TRACK_SEGMENT",
    /** Sensor contact selected */
    SENSOR_CONTACT = "SENSOR_CONTACT",
    /** Arbitrary feature set selected */
    FEATURE_SET = "FEATURE_SET",
};


/**
 * A position with timestamp and optional kinematic data
 */
export interface TimestampedPosition {
    /** Position timestamp (ISO8601) */
    time: string,
    /** [longitude, latitude] in degrees */
    coordinates: number[],
    /** Depth in meters (negative = below surface) */
    depth?: number,
    /** Course in degrees (0-360) */
    course?: number,
    /** Speed in knots */
    speed?: number,
}


/**
 * Metadata about a source file loaded into a plot
 */
export interface SourceFile {
    /** Original filename */
    filename: string,
    /** File format (e.g., "REP", "CSV") */
    format: string,
    /** When file was loaded */
    loaded_at: string,
    /** SHA256 hash of file contents */
    sha256: string,
    /** Path to asset in STAC catalog */
    asset_href: string,
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
 * Properties for a TrackFeature
 */
export interface TrackProperties {
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
    /** Display color (CSS color string) */
    color?: string,
}


/**
 * GeoJSON Feature representing a vessel track
 */
export interface TrackFeature {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier (UUID recommended) */
    id: string,
    /** Track path as GeoJSON LineString */
    geometry: GeoJSONLineString,
    /** Track metadata */
    properties: TrackProperties,
    /** Bounding box [minLon, minLat, maxLon, maxLat] */
    bbox?: number[],
}


/**
 * Properties for a SensorContact
 */
export interface SensorContactProperties {
    /** ID of parent TrackFeature */
    parent_track_id: string,
    /** Type of sensor */
    sensor_type: string,
    /** Detection timestamp (ISO8601) */
    time: string,
    /** Bearing in degrees (0-360) */
    bearing?: number,
    /** Bearing error in degrees */
    bearing_error?: number,
    /** Range in nautical miles */
    range?: number,
    /** Range error in nautical miles */
    range_error?: number,
    /** Frequency in Hz (for acoustic) */
    frequency?: number,
    /** User-assigned label */
    label?: string,
    /** Display color (CSS color string) */
    color?: string,
}


/**
 * GeoJSON Feature representing a sensor detection
 */
export interface SensorContact {
    /** GeoJSON type discriminator */
    type: string,
    /** Unique identifier (UUID recommended) */
    id: string,
    /** Contact position as GeoJSON Point */
    geometry: GeoJSONPoint,
    /** Contact metadata */
    properties: SensorContactProperties,
}


/**
 * Properties for a ReferenceLocation
 */
export interface ReferenceLocationProperties {
    /** Reference location name */
    name: string,
    /** Type of reference */
    location_type: string,
    /** Additional description */
    description?: string,
    /** Map symbol identifier */
    symbol?: string,
    /** Display color (CSS color string) */
    color?: string,
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
 * STAC Item properties for a Debrief plot
 */
export interface PlotMetadata {
    /** Unique plot identifier */
    id: string,
    /** Human-readable plot title */
    title: string,
    /** Plot description */
    description?: string,
    /** Single datetime (if not range) */
    datetime?: string,
    /** Start of temporal extent */
    start_datetime?: string,
    /** End of temporal extent */
    end_datetime?: string,
    /** Plot creation timestamp */
    created: string,
    /** Last update timestamp */
    updated: string,
    /** List of source files */
    source_files: SourceFile[],
    /** Platforms included in plot */
    platform_ids?: string[],
    /** Exercise/operation name */
    exercise_name?: string,
    /** Security classification */
    classification?: string,
}


/**
 * Describes an analysis tool available in the calc service
 */
export interface ToolMetadata {
    /** Unique tool identifier */
    id: string,
    /** Human-readable tool name */
    name: string,
    /** Tool description */
    description: string,
    /** Tool version (semver recommended) */
    version: string,
    /** Tool category */
    category: string,
    /** Required selection types */
    selection_context: string,
    /** JSON Schema for tool inputs (as JSON string) */
    input_schema?: string,
    /** JSON Schema for tool outputs (as JSON string) */
    output_schema?: string,
    /** Icon identifier */
    icon?: string,
}



