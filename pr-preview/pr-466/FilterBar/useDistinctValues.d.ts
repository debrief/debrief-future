import { FilterType, StacBrowserItem } from '../filter-engine';
import { PlatformDistinctValues } from './types';

/** Distinct values keyed by filter type, with an additional sub-object for platform pickers */
export type DistinctValuesMap = Readonly<Record<Exclude<FilterType, 'platform'>, readonly string[]> & {
    readonly platform: PlatformDistinctValues;
}>;
export declare function computeDistinctValues(items: readonly StacBrowserItem[]): DistinctValuesMap;
export declare function useDistinctValues(items: readonly StacBrowserItem[]): DistinctValuesMap;
//# sourceMappingURL=useDistinctValues.d.ts.map