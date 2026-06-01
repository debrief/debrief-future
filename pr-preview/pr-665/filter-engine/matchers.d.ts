import { ArrayFilterPredicate, FilterType, StacBrowserItem } from './types';
import { DescendantMap } from './taxonomy';

export type MatcherFn = (item: StacBrowserItem, value: string, descendantMap: DescendantMap) => boolean;
/** Get the matcher function for a filter type */
export declare function getMatcher(type: FilterType): MatcherFn;
/** Evaluate an array_filter predicate against a STAC item */
export declare function matchArrayFilter(item: StacBrowserItem, af: ArrayFilterPredicate, descendantMap: DescendantMap): boolean;
//# sourceMappingURL=matchers.d.ts.map