import { FilterType, StacBrowserItem } from './types';
import { DescendantMap } from './taxonomy';

export type MatcherFn = (item: StacBrowserItem, value: string, descendantMap: DescendantMap) => boolean;
/** Get the matcher function for a filter type */
export declare function getMatcher(type: FilterType): MatcherFn;
//# sourceMappingURL=matchers.d.ts.map