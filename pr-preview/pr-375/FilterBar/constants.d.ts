import { FilterTypeOption } from './types';
import { DurationBucket, ModifiedBucket } from '../filter-engine';

/** All 10 filter types with labels and input methods */
export declare const FILTER_TYPE_OPTIONS: readonly FilterTypeOption[];
/** Duration bucket options */
export declare const DURATION_BUCKETS: readonly DurationBucket[];
/** Duration bucket display labels */
export declare const DURATION_BUCKET_LABELS: Record<DurationBucket, string>;
/** Modified-recency bucket options */
export declare const MODIFIED_BUCKETS: readonly ModifiedBucket[];
/** Modified-recency bucket display labels */
export declare const MODIFIED_BUCKET_LABELS: Record<ModifiedBucket, string>;
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
/** Saved filters — user-facing strings (#128) */
export declare const SAVE_BUTTON_LABEL = "Save";
export declare const SAVE_BUTTON_TOOLTIP = "Save current filters";
export declare const SAVE_PROMPT_PLACEHOLDER = "Filter name";
export declare const SAVE_PROMPT_CONFIRM = "Save";
export declare const SAVE_PROMPT_CANCEL = "Cancel";
export declare const SAVE_PROMPT_OVERWRITE = "A filter with this name already exists. Overwrite?";
export declare const SAVED_FILTERS_LABEL = "Saved Filters";
export declare const SAVED_FILTERS_EMPTY = "No saved filters";
export declare const SAVED_FILTERS_DELETE_TOOLTIP = "Delete saved filter";
export declare const SAVED_FILTERS_MAX = 100;
export declare const SAVED_FILTERS_NAME_MAX_LENGTH = 120;
//# sourceMappingURL=constants.d.ts.map