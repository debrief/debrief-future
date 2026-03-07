import { StacBrowserItem } from '../filter-engine/types';
import { BrowserFilterResult } from './types';

export interface UseBrowserFilterOptions {
    /** Full unfiltered item list. */
    readonly items: readonly StacBrowserItem[];
    /** Set of item IDs passing the metadata filter. null = all pass. */
    readonly metadataFilteredIds: ReadonlySet<string> | null;
    /** Whether spatial filtering is active. */
    readonly spatialFilterActive: boolean;
    /** Current viewport as 4-corner polygon coordinates. null = no viewport. */
    readonly viewportCoordinates: [[number, number], [number, number], [number, number], [number, number]] | null;
    /** Whether temporal filtering is active. */
    readonly temporalFilterActive: boolean;
    /** Current time filter range. null = no time filter. */
    readonly timeFilter: {
        start: number;
        end: number;
    } | null;
    /** Callback to clear all filters. */
    readonly clearAllFilters: () => void;
}
/**
 * Compute filtered items from all three filter axes.
 *
 * Filter logic per item:
 *   metadataPass = (metadataFilteredIds === null) || metadataFilteredIds.has(item.id)
 *   spatialPass  = !spatialFilterActive || item.bbox === null || bboxOverlaps(item.bbox, viewportBounds)
 *   temporalPass = !temporalFilterActive || temporalOverlaps(item, timeFilter)
 *   result = metadataPass AND spatialPass AND temporalPass
 */
export declare function useBrowserFilter(options: UseBrowserFilterOptions): BrowserFilterResult;
//# sourceMappingURL=useBrowserFilter.d.ts.map