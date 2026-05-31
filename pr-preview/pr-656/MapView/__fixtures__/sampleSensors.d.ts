import { TrackFeature, SensorData } from '../../../../schemas/src/generated/typescript/index.ts';

declare const BASE_TIME: number;
declare const MINUTE = 60000;
declare function isoTime(offsetMinutes: number): string;
/** Towed array sensor with bearings, ranges, ambiguous bearings, labels */
export declare const towedArraySensor: SensorData;
/** Hull sonar — contacts with bearings only (no ranges), no ambiguous bearings */
export declare const hullSonarSensor: SensorData;
/** Sensor with many contacts for performance testing */
export declare const highDensitySensor: SensorData;
export interface SensorArcData {
    origin: [number, number];
    leftAngle: number;
    rightAngle: number;
    innerRange: number;
    outerRange: number;
    startTime: string;
    endTime: string;
    color: string;
}
export declare const sampleSensorArcs: SensorArcData[];
/** Track with towed array sensor (primary test fixture) */
export declare function createTrackWithSensors(sensors?: SensorData[]): TrackFeature;
/** Track with towed array and hull sonar */
export declare const sampleTrackWithSensors: TrackFeature;
/** Track with high-density sensor for performance testing */
export declare const performanceTrackWithSensors: TrackFeature;
/** Time extent for the sample data */
export declare const sensorTimeExtent: [number, number];
/** Convenient time values for testing */
export declare const sensorTestTimes: {
    beforeAll: number;
    atStart: number;
    atContact1: number;
    atContact2: number;
    midRange: number;
    atContact9: number;
    atEnd: number;
    afterAll: number;
    trailLength: number;
};
export { BASE_TIME, MINUTE, isoTime };
//# sourceMappingURL=sampleSensors.d.ts.map