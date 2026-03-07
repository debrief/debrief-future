import { CascadingMenuItem } from '../CascadingMenu';
import { VesselTaxonomyNode } from '../filter-engine';

export interface TaxonomyAdapterOptions {
    /** Currently selected value (full path) to mark with current: true */
    readonly currentValue?: string;
    /** Match counts per full path for badge display */
    readonly counts?: ReadonlyMap<string, number>;
    /** When true, nodes with count 0 are disabled */
    readonly disableEmpty?: boolean;
}
/** Convert a vessel taxonomy tree to CascadingMenu items */
export declare function taxonomyToCascadingItems(nodes: readonly VesselTaxonomyNode[], options?: TaxonomyAdapterOptions, parentPath?: string): CascadingMenuItem[];
//# sourceMappingURL=taxonomyAdapter.d.ts.map