import { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine';

/** Map from full taxonomy path to count of matching items */
export type TaxonomyMatchCounts = ReadonlyMap<string, number>;
export declare function useTaxonomyMatchCounts(items: readonly StacBrowserItem[], taxonomy: readonly VesselTaxonomyNode[]): TaxonomyMatchCounts;
//# sourceMappingURL=useTaxonomyMatchCounts.d.ts.map