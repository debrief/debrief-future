import { FilterTypeOption } from './types';
import { DurationBucket } from '../filter-engine';

/** All 10 filter types with labels and input methods */
export declare const FILTER_TYPE_OPTIONS: readonly FilterTypeOption[];
/** Duration bucket options */
export declare const DURATION_BUCKETS: readonly DurationBucket[];
/** Duration bucket display labels */
export declare const DURATION_BUCKET_LABELS: Record<DurationBucket, string>;
/** Empty state hint text */
export declare const EMPTY_STATE_HINT = "Add filters to narrow results";
/** No matches message */
export declare const NO_MATCHES_MESSAGE = "No matches";
/** Error banner message */
export declare const FILTER_ERROR_MESSAGE = "Filter could not be applied";
/** OR group option label */
export declare const OR_GROUP_LABEL = "OR group";
/** Get the label for a filter type */
export declare function getFilterTypeLabel(type: string): string;
//# sourceMappingURL=constants.d.ts.map