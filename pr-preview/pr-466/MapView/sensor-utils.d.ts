import { SensorContact, SensorData, TrackFeature } from '../../../schemas/src/generated/typescript/index.ts';
import { DisplayMode } from '../utils/types';
import { geodesicDestination, interpolateTrackCourse, interpolateTrackPosition } from './geo-utils';

export { geodesicDestination, interpolateTrackCourse, interpolateTrackPosition };
/** Maximum bearing line extent when no range is specified (5 degrees of latitude in metres) */
export declare const MAXIMUM_SENSOR_BEARING_RANGE: number;
/** Default sensor colour when no colour is specified at any level */
export declare const DEFAULT_SENSOR_COLOR = "#FF0000";
/** Mapping from LineStyleEnum to canvas dash arrays */
export declare const LINE_STYLE_DASH_ARRAYS: Record<string, number[] | null>;
/** Pre-computed rendering data for a single sensor contact */
export interface SensorRenderContact {
    contactIndex: number;
    origin: [number, number];
    timeMs: number;
    bearing: number;
    farEnd: [number, number];
    ambiguousFarEnd: [number, number] | null;
    range: number | null;
    label: string | null;
    showLabel: boolean;
    putLabelAt: string;
    labelLocation: string;
    color: string;
    darkenedColor: string;
    lineStyle: string;
    lineThickness: number;
    hasAmbiguous: boolean;
}
/** Pre-computed rendering data for a sensor arc (coverage fan) */
export interface SensorArcRenderData {
    origin: [number, number];
    leftAngle: number;
    rightAngle: number;
    innerRange: number;
    outerRange: number;
    startTimeMs: number;
    endTimeMs: number;
    color: string;
    fillOpacity: number;
}
/** Props for the SensorBearingLayer React component */
export interface SensorBearingLayerProps {
    feature: TrackFeature;
    currentTime?: number;
    displayMode?: DisplayMode;
    isSelected?: boolean;
    hiddenIds?: Set<string>;
}
/**
 * Parse a hex colour string into RGB components.
 *
 * Supports 3-digit (#RGB), 6-digit (#RRGGBB), and without hash prefix.
 */
export declare function parseHexColor(hex: string): [number, number, number];
/**
 * Produce a darker shade of the given colour.
 * Matches Java's Color.darker() which multiplies RGB by 0.7.
 */
export declare function darkenColor(color: string): string;
/**
 * Apply snail mode fading to a base colour.
 *
 * @param baseColor Hex colour string
 * @param proportion Fade proportion: 1.0 = newest (full colour), 0.0 = oldest (black)
 * @returns Hex colour with faded RGB values
 */
export declare function applySnailFade(baseColor: string, proportion: number): string;
/**
 * Calculate snail mode proportion for a contact.
 *
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @param currentTimeMs Current display time (epoch ms)
 * @param trailLengthMs Trail window length (ms)
 * @returns Proportion [0, 1] or null if contact is outside trail window
 */
export declare function calculateSnailProportion(contactTimeMs: number, currentTimeMs: number, trailLengthMs: number): number | null;
/**
 * Calculate the far end of a bearing line.
 * If range is provided, uses it directly.
 * If no range, extends to MAXIMUM_SENSOR_BEARING_RANGE (5 degrees latitude).
 */
export declare function computeBearingFarEnd(origin: [number, number], bearing: number, range: number | null): [number, number];
/**
 * Resolve the colour for a sensor contact using the inheritance chain:
 * contact.color > sensor.color > track style colour > DEFAULT_SENSOR_COLOR
 */
export declare function resolveContactColor(contact: SensorContact, sensor: SensorData, trackColor: string | undefined): string;
/**
 * Compute relative bearing from vessel course to a target bearing.
 * Returns value in range (-180, +180]:
 *   negative = port side
 *   positive = starboard side
 */
export declare function getRelativeBearing(courseDeg: number, bearingDeg: number): number;
/**
 * Determine whether a bearing is to the port side of the vessel.
 * Port = negative relative bearing.
 */
export declare function isBearingToPort(bearingDeg: number, courseDeg: number): boolean;
/**
 * Assign colours for primary and ambiguous bearing lines based on
 * port/starboard convention from legacy Debrief:
 *   - Port-side bearing → base (brighter) colour
 *   - Starboard-side bearing → darker colour
 *
 * This is independent of which bearing is "primary" vs "ambiguous".
 */
export declare function assignAmbiguousColors(primaryBearing: number, _ambiguousBearing: number, courseDeg: number, baseColor: string): {
    primaryColor: string;
    ambiguousColor: string;
};
/**
 * Filter and prepare sensor contacts for rendering.
 *
 * Filters by:
 * - has_bearing (must be true or undefined, defaults to true)
 * - visible (must be true or undefined, defaults to true)
 * - Time window (contact time must be within currentTime range)
 *
 * For each passing contact:
 * - Interpolates host position at contact time (or uses explicit origin)
 * - Computes bearing line far end
 * - Computes ambiguous bearing far end if applicable
 * - Resolves colour inheritance
 */
export declare function prepareSensorContacts(sensor: SensorData, feature: TrackFeature, currentTime: number | undefined, displayMode: DisplayMode, trailLengthMs: number): SensorRenderContact[];
/**
 * Calculate the pixel position for a label along a bearing line.
 *
 * @param originPx Origin in pixel coordinates [x, y]
 * @param farEndPx Far end in pixel coordinates [x, y]
 * @param putLabelAt Position along line: 'START', 'MIDDLE', or 'END'
 * @returns [x, y] pixel coordinates for the label
 */
export declare function calculateLabelPosition(originPx: [number, number], farEndPx: [number, number], putLabelAt: string): [number, number];
/**
 * Map label_location to canvas textAlign value.
 */
export declare function labelLocationToTextAlign(labelLocation: string): CanvasTextAlign;
/**
 * Compute canvas path points for a sensor arc (donut wedge).
 *
 * Returns an array of points forming the arc outline. The path is:
 * 1. Walk outer arc from leftAngle to rightAngle
 * 2. Walk inner arc from rightAngle to leftAngle (or to origin if innerRange=0)
 *
 * @param origin [lon, lat] arc centre
 * @param leftAngle Left angular bound (degrees)
 * @param rightAngle Right angular bound (degrees)
 * @param innerRange Inner range in metres (0 for point origin)
 * @param outerRange Outer range in metres
 * @param project Function to convert [lon, lat] to [x, y] pixel coordinates
 * @returns Array of [x, y] pixel points forming the arc path
 */
export declare function computeArcPath(origin: [number, number], leftAngle: number, rightAngle: number, innerRange: number, outerRange: number, project: (lonLat: [number, number]) => [number, number]): [number, number][];
//# sourceMappingURL=sensor-utils.d.ts.map