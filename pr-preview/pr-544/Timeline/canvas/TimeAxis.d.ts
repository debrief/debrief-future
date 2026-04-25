import { TimeExtent } from '../../utils/types';

export interface TimeAxisConfig {
    /** Canvas width in pixels */
    width: number;
    /** Height of the time axis in pixels */
    height: number;
    /** Time extent [startMs, endMs] */
    timeExtent: TimeExtent;
    /** Font family */
    fontFamily?: string;
    /** Font size in pixels */
    fontSize?: number;
    /** Text color */
    textColor?: string;
    /** Grid line color */
    gridColor?: string;
    /** Tick color */
    tickColor?: string;
}
/**
 * Render the time axis on a canvas context.
 */
export declare function renderTimeAxis(ctx: CanvasRenderingContext2D, config: TimeAxisConfig): void;
/**
 * Convert x coordinate to time.
 */
export declare function xToTime(x: number, width: number, timeExtent: TimeExtent): number;
/**
 * Convert time to x coordinate.
 */
export declare function timeToX(time: number, width: number, timeExtent: TimeExtent): number;
//# sourceMappingURL=TimeAxis.d.ts.map