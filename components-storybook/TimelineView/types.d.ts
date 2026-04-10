import { StacBrowserItem } from '../filter-engine/types';
import { TimeSpan } from '../utils/temporal-types';

/**
 * The temporal filter emitted by the timeline when the user adjusts the range.
 * Uses epoch milliseconds for consistency with parseTime() output.
 */
export interface TemporalFilter {
    /** Left boundary of selected range (epoch milliseconds) */
    readonly start: number;
    /** Right boundary of selected range (epoch milliseconds) */
    readonly end: number;
}
/**
 * Maps an exercise item to a CSS colour string.
 * Returns null to use the default theme colour.
 * Provided by the colour scheme engine (#134).
 */
export type ColourFn = (item: StacBrowserItem) => string | null;
/**
 * Computed layout data for a single exercise bar on the timeline.
 */
export interface TimelineBarData {
    readonly item: StacBrowserItem;
    readonly x: number;
    readonly width: number;
    readonly y: number;
    readonly isPoint: boolean;
    readonly colour: string | null;
    readonly hasTime: boolean;
}
/**
 * Props for the TimelineView component.
 */
export interface TimelineViewProps {
    /** Exercises to display on the timeline. */
    readonly items: readonly StacBrowserItem[];
    /**
     * Callback when the user adjusts the time range selection.
     * Called with null when the selection is cleared (all items visible).
     *
     * NOTE: Consumers should consider throttling this callback if wiring
     * to expensive downstream updates (e.g., store dispatch, network calls).
     * The component calls this on every pointer move during brush drag.
     */
    readonly onTemporalFilterChange?: (filter: TemporalFilter | null) => void;
    /**
     * Callback when the user double-clicks an exercise to open it.
     * Receives the item path (e.g., "exercises/item.json").
     */
    readonly onItemSelect?: (itemPath: string) => void;
    /**
     * Optional colour function from the colour scheme engine (#134).
     * When not provided, bars use the default theme colour.
     * Wrapped in try/catch per Art. V.1 — errors fall back to default.
     */
    readonly colourFn?: ColourFn;
    /**
     * Increment to externally reset zoom to full extent.
     * Used by "Clear All Filters" to reset the timeline after temporal zoom.
     */
    readonly resetKey?: number;
    /** Additional CSS class name for the container. */
    readonly className?: string;
}
export type { TimeSpan, StacBrowserItem };
//# sourceMappingURL=types.d.ts.map