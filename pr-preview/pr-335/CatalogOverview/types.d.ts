import { Bounds } from '../utils/types';
import { CatalogOverviewItem } from '../filter-engine/types';

export type { CatalogOverviewItem } from '../filter-engine/types';
/**
 * Props for the CatalogOverview component.
 */
export interface CatalogOverviewProps {
    /** Items to display in the overview */
    items: CatalogOverviewItem[];
    /** Callback when user double-clicks an item */
    onItemSelect?: (itemPath: string) => void;
    /** Initial split ratio (0–1, fraction of height for the map region) */
    initialSplitRatio?: number;
    /** Callback when split ratio changes (for persistence) */
    onSplitRatioChange?: (ratio: number) => void;
    /** Additional CSS class name */
    className?: string;
    /** Callback when map viewport changes (debounced). Null if map not yet initialised. */
    onViewportChange?: (bounds: Bounds | null) => void;
    /** Map from item ID to CSS colour string. Items not in the map use default accent colour. */
    colorMap?: ReadonlyMap<string, string>;
}
//# sourceMappingURL=types.d.ts.map