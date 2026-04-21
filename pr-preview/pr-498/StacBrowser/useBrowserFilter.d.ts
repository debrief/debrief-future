import { StacBrowserItem } from '../filter-engine/types';
import { ViewportPolygon, TimeFilter } from '../../../schemas/src/generated/typescript/index.ts';
import { BrowserFilterResult } from './types';

interface UseBrowserFilterArgs {
    /** Full unfiltered item list. */
    readonly items: readonly StacBrowserItem[];
    /** Set of item IDs passing metadata filter. null = all pass. */
    readonly metadataFilteredIds: ReadonlySet<string> | null;
    /** Current map viewport polygon. null = no viewport set. */
    readonly viewport: ViewportPolygon | null;
    /** Whether spatial filtering is active. */
    readonly spatialFilterActive: boolean;
    /** Current time filter range. null = no time filter set. */
    readonly timeFilter: TimeFilter | null;
    /** Whether temporal filtering is active. */
    readonly temporalFilterActive: boolean;
    /** Clear all filters callback. */
    readonly clearAllFilters: () => void;
}
/**
 * Compute the filtered item set by applying all three filter axes.
 *
 * Filter logic per item:
 *   metadataPass = (metadataFilteredIds === null) || metadataFilteredIds.has(item.id)
 *   spatialPass  = !spatialFilterActive || item.bbox === null || bboxOverlaps(item.bbox, viewport)
 *   temporalPass = !temporalFilterActive || !hasTime(item) || temporalOverlaps(item, timeFilter)
 *   result = metadataPass AND spatialPass AND temporalPass
 */
export declare function useBrowserFilter({ items, metadataFilteredIds, viewport, spatialFilterActive, timeFilter, temporalFilterActive, clearAllFilters, }: UseBrowserFilterArgs): BrowserFilterResult;
export {};
//# sourceMappingURL=useBrowserFilter.d.ts.map