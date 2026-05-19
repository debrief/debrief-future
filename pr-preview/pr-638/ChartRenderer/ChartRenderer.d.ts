import { TopLevelSpec } from 'vega-lite';

export interface ChartRendererProps {
    /** Vega-Lite spec to render. Pass `null` to show the error state. */
    spec: TopLevelSpec | null;
    /** Additional CSS class for the container. */
    className?: string;
    /** Callback invoked when vega-embed encounters an error. */
    onError?: (error: Error) => void;
}
/**
 * Shared chart renderer wrapping vega-embed.
 *
 * Handles four visual states:
 * - **Loading** — waiting for the spec to mount
 * - **Success** — chart rendered
 * - **Empty** — spec exists but data has zero rows
 * - **Error** — null/invalid spec or render failure
 */
export declare function ChartRenderer({ spec, className, onError }: ChartRendererProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ChartRenderer.d.ts.map