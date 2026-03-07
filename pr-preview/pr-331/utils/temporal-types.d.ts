/**
 * Shared temporal types for timeline components (#131).
 *
 * TimeSpan is the local equivalent of a continuous time interval.
 * TimeFilter and TimeInstant are re-exported from session-state
 * for use by components that don't import session-state directly.
 */
/**
 * A continuous time interval (epoch milliseconds).
 * Named TimeSpan to avoid collision with session-state's TimeRange.
 */
export interface TimeSpan {
    readonly min: number;
    readonly max: number;
}
//# sourceMappingURL=temporal-types.d.ts.map