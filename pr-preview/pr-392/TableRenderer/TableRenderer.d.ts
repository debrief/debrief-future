/**
 * TableRenderer — renders flat tabular data as an HTML table.
 * Feature: 177-tabular-results-panel
 *
 * Designed for tool results that produce flat key-value statistics
 * (e.g., track-stats). Column names are derived from the data keys.
 */
export interface TableRendererProps {
    /** Array of row records. Column names are derived from the keys of the first row. */
    data: Record<string, unknown>[];
    /** Optional CSS class name */
    className?: string;
}
export declare function TableRenderer({ data, className }: TableRendererProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=TableRenderer.d.ts.map