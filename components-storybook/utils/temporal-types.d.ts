/**
 * Shared temporal types for timeline components (#131).
 *
 * TimeSpan is the local equivalent of a continuous time interval
 * using epoch milliseconds, consistent with session-state's
 * epoch-based temporal types (Review Decision 5C).
 */
/**
 * A continuous time interval (epoch milliseconds).
 * Named TimeSpan to avoid collision with session-state's TimeRange
 * (which uses { start, end } instead of { min, max }).
 */
export interface TimeSpan {
    readonly min: number;
    readonly max: number;
}
//# sourceMappingURL=temporal-types.d.ts.map