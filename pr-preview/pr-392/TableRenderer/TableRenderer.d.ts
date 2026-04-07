import { ResultsPanelLabels } from '../panels/resultsPanelLabels';

export interface TableRendererProps {
    /** Array of row records. Column names are derived from the keys of the first row. */
    data: Record<string, unknown>[];
    /** Optional CSS class name */
    className?: string;
    /** Optional partial overrides for user-facing strings (i18n) */
    labels?: Partial<ResultsPanelLabels>;
}
export declare function TableRenderer({ data, className, labels: labelOverrides }: TableRendererProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=TableRenderer.d.ts.map