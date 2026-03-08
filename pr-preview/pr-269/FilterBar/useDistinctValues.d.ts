import { FilterType, StacBrowserItem } from '../filter-engine';

export type DistinctValuesMap = Readonly<Record<FilterType, readonly string[]>>;
export declare function computeDistinctValues(items: readonly StacBrowserItem[]): DistinctValuesMap;
export declare function useDistinctValues(items: readonly StacBrowserItem[]): DistinctValuesMap;
//# sourceMappingURL=useDistinctValues.d.ts.map