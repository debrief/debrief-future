/**
 * Low-level geodesic and track-interpolation primitives.
 *
 * Extracted from sensor-utils.ts so that array-offset.ts can depend on
 * these primitives without the reverse edge — breaking the
 * sensor-utils ↔ array-offset circular import.
 *
 * These functions are pure and have Python parity counterparts in
 * services/calc/debrief_calc/tools/sensor/array_offset.py.
 */
/**
 * Calculate the destination point given start point, bearing, and distance.
 * Uses haversine formula for geodesic accuracy.
 *
 * @param origin [lon, lat] starting point
 * @param bearing Degrees from north (0-360)
 * @param distanceMetres Distance in metres
 * @returns [lon, lat] destination point
 */
export declare function geodesicDestination(origin: [number, number], bearing: number, distanceMetres: number): [number, number];
/**
 * Interpolate the host track's position at a given timestamp.
 * Uses binary search + linear interpolation on the positions/coordinates arrays.
 *
 * @param coordinates Array of [lon, lat] from track geometry
 * @param positions Array of { time: string } from track properties
 * @param targetTimeMs Target timestamp (epoch ms)
 * @returns [lon, lat] interpolated position, or null if time is out of range
 */
export declare function interpolateTrackPosition(coordinates: [number, number][], positions: Array<{
    time: string;
}>, targetTimeMs: number): [number, number] | null;
/**
 * Interpolate the host track's course at a given timestamp.
 * Returns course in degrees, or null if time is out of range.
 */
export declare function interpolateTrackCourse(positions: Array<{
    time: string;
    course?: number;
}>, targetTimeMs: number): number | null;
//# sourceMappingURL=geo-utils.d.ts.map