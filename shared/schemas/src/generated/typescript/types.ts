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
    /** Display color (CSS color string) */
    color?: string,
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
    /** Display color (CSS color string) */
    color?: string,
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
    /** Display color (CSS color string) */
    color?: string,
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
    /** Display color (CSS color string) */
    color?: string,
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
    /** Display color (CSS color string) */
    color?: string,
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
    /** Display color (CSS color string) */
    color?: string,
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



