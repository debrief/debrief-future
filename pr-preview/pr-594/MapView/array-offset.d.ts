import { SensorData } from '../../../schemas/src/generated/typescript/index.ts';

/**
 * Geodesic distance between two points in metres.
 *
 * Uses the haversine formula with the mean Earth radius (6371000m).
 *
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @returns Distance in metres
 */
export declare function haversineDistanceMetres(lon1: number, lat1: number, lon2: number, lat2: number): number;
/**
 * PLAIN mode: backtrack from the vessel's position along its heading.
 *
 * The reverse bearing is `(courseDeg + 180) mod 360`. The array centre is the
 * geodesic destination from the vessel at that reverse bearing, at the offset
 * distance.
 *
 * @param hostPosition Vessel position [lon, lat]
 * @param courseDeg Vessel heading (degrees, 0-360)
 * @param offsetMetres Backtrack distance in metres (must be >= 0)
 * @returns Array centre [lon, lat]
 */
export declare function computePlainOffset(hostPosition: [number, number], courseDeg: number, offsetMetres: number): [number, number];
/**
 * WORM mode: walk backward along the vessel's track path.
 *
 * Starts at the interpolated vessel position at the contact time, then walks
 * backward through track segments accumulating geodesic distances until the
 * offset distance is reached. If the track is exhausted before reaching the
 * offset, the array centre is placed at the earliest available track point.
 *
 * @param trackCoordinates Track geometry coordinates [lon, lat][]
 * @param trackPositions Track positions with ISO-8601 timestamps
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @param offsetMetres Distance to walk backward along the track path
 * @returns Array centre [lon, lat] on the track path
 */
export declare function backtrackAlongTrack(trackCoordinates: [number, number][], trackPositions: Array<{
    time: string;
}>, contactTimeMs: number, offsetMetres: number): [number, number];
/**
 * MEASURED mode: interpolate from the sensor's measured position time-series.
 *
 * If the contact time is outside the measured range, returns null so the
 * caller can fall back to PLAIN mode (FR-004).
 *
 * Measured positions are sorted by time before lookup to handle unordered input.
 *
 * @param measuredPositions Time-series of measured array positions
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @returns Interpolated [lon, lat], or null if out of measured range
 */
export declare function interpolateMeasuredPosition(measuredPositions: Array<{
    time: string;
    location: number[];
}>, contactTimeMs: number): [number, number] | null;
/**
 * Primary dispatch function: compute the array centre for a sensor contact.
 *
 * Resolution order:
 *   1. If `sensor.offset` is null/undefined/0 → return host position unchanged
 *   2. If `sensor.array_centre_mode` is null/undefined → return host position unchanged
 *   3. Otherwise dispatch on `sensor.array_centre_mode`:
 *      - PLAIN: computePlainOffset()
 *      - WORM: backtrackAlongTrack()
 *      - MEASURED: interpolateMeasuredPosition(), falling back to PLAIN when null
 *
 * When mode is PLAIN or MEASURED fallback and `courseDeg` is null, the host
 * position is returned unchanged (no heading available to backtrack along).
 *
 * @param hostPosition Interpolated vessel position [lon, lat]
 * @param courseDeg Vessel course at contact time (degrees) or null
 * @param sensor Parent SensorData (provides offset, mode, measured_positions)
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @param trackCoordinates Track geometry coordinates
 * @param trackPositions Track positions with timestamps
 * @returns Array centre [lon, lat]
 */
export declare function computeArrayCentre(hostPosition: [number, number], courseDeg: number | null, sensor: SensorData, contactTimeMs: number, trackCoordinates: [number, number][], trackPositions: Array<{
    time: string;
}>): [number, number];
/**
 * Convenience helper to resolve the course at a contact timestamp.
 * Wraps `interpolateTrackCourse` for symmetry with the Python side.
 */
export declare function resolveCourse(positions: Array<{
    time: string;
    course?: number;
}>, contactTimeMs: number): number | null;
//# sourceMappingURL=array-offset.d.ts.map