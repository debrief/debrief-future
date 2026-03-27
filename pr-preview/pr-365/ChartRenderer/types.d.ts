/** Describes a single axis (x or y). */
export interface AxisDefinition {
    /** Human-readable axis label (e.g., "Zone", "Time", "Range"). */
    label: string;
    /** Data type for the axis. Maps to Vega-Lite encoding type. */
    type: 'nominal' | 'ordinal' | 'quantitative' | 'temporal';
    /** Display units appended to axis label (e.g., "nm", "points"). */
    units?: string;
}
/** Axis and display configuration derived from the tool's output. */
export interface DatasetMetadata {
    xAxis: AxisDefinition;
    yAxis: AxisDefinition;
}
/** A named series of data points for multi-series charts. */
export interface DataSeries {
    /** Series name for the legend. */
    name: string;
    /** Array of data records for this series. */
    data: Record<string, unknown>[];
}
/**
 * Standard envelope for all tool result datasets.
 *
 * Every dataset artifact conforms to this structure. Exactly one of
 * `data` or `series` must be present.
 *
 * Schema equivalent: @debrief/schemas#DatasetEntry
 * Not migrated: field names differ (data vs data_points, series vs DatasetSeries
 * with data_points, AxisDefinition literal union vs DatasetAxisMetadata string).
 * The ChartRenderer operates at runtime on this camelCase shape; the schema
 * DatasetEntry is the persistence/wire representation.
 */
export interface DatasetEnvelope {
    /** Dataset subtype identifier (e.g., "zone_histogram"). */
    type: string;
    /** Human-readable chart title. */
    title: string;
    /** Axis definitions and display hints. */
    metadata: DatasetMetadata;
    /** Flat array of data records (histograms, single-series). */
    data?: Record<string, unknown>[];
    /** Named data series (multi-line/multi-series charts). */
    series?: DataSeries[];
}
//# sourceMappingURL=types.d.ts.map