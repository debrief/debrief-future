/**
 * Constants for the Filter Bar (#127).
 *
 * All user-facing string constants are centralised here for i18n readiness.
 */

import type { FilterTypeOption } from './types';
import type { DurationBucket, ModifiedBucket } from '../filter-engine';

/** All 10 filter types with labels and input methods */
export const FILTER_TYPE_OPTIONS: readonly FilterTypeOption[] = [
  { type: 'vessel-class', label: 'Vessel Class', inputMethod: 'hierarchical' },
  { type: 'tag', label: 'Tag', inputMethod: 'flat-dropdown' },
  { type: 'author', label: 'Author', inputMethod: 'flat-dropdown' },
  { type: 'duration', label: 'Duration', inputMethod: 'bucket' },
  { type: 'modified', label: 'Modified', inputMethod: 'bucket' },
  { type: 'title', label: 'Title', inputMethod: 'free-text' },
  { type: 'plot-contents', label: 'Plot Contents', inputMethod: 'free-text' },
  { type: 'track-name', label: 'Track Name', inputMethod: 'flat-dropdown' },
  { type: 'nationality', label: 'Nationality', inputMethod: 'flat-dropdown' },
  { type: 'collection', label: 'Collection', inputMethod: 'flat-dropdown' },
] as const;

/** Duration bucket options */
export const DURATION_BUCKETS: readonly DurationBucket[] = [
  '<6H',
  '<24H',
  '<72H',
  '<10D',
  '>10D',
] as const;

/** Duration bucket display labels */
export const DURATION_BUCKET_LABELS: Record<DurationBucket, string> = {
  '<6H': 'Under 6 hours',
  '<24H': 'Under 24 hours',
  '<72H': 'Under 72 hours',
  '<10D': 'Under 10 days',
  '>10D': 'Over 10 days',
};

/** Modified-recency bucket options */
export const MODIFIED_BUCKETS: readonly ModifiedBucket[] = [
  '<6H',
  '<24H',
  '<7D',
  '<1M',
  '>1M',
] as const;

/** Modified-recency bucket display labels */
export const MODIFIED_BUCKET_LABELS: Record<ModifiedBucket, string> = {
  '<6H': 'Last 6 hours',
  '<24H': 'Last 24 hours',
  '<7D': 'Last 7 days',
  '<1M': 'Last month',
  '>1M': 'Over a month ago',
};

/** Empty state hint text */
export const EMPTY_STATE_HINT = 'Add filters to narrow results';

/** No matches message */
export const NO_MATCHES_MESSAGE = 'No matches';

/** Error banner message */
export const FILTER_ERROR_MESSAGE = 'Filter could not be applied';

/** OR group option label */
export const OR_GROUP_LABEL = 'OR group';

/** Get the label for a filter type */
export function getFilterTypeLabel(type: string): string {
  const option = FILTER_TYPE_OPTIONS.find((o) => o.type === type);
  return option?.label ?? type;
}

/** Saved filters — user-facing strings (#128) */
export const SAVE_BUTTON_LABEL = 'Save';
export const SAVE_BUTTON_TOOLTIP = 'Save current filters';
export const SAVE_PROMPT_PLACEHOLDER = 'Filter name';
export const SAVE_PROMPT_CONFIRM = 'Save';
export const SAVE_PROMPT_CANCEL = 'Cancel';
export const SAVE_PROMPT_OVERWRITE = 'A filter with this name already exists. Overwrite?';
export const SAVED_FILTERS_LABEL = 'Saved Filters';
export const SAVED_FILTERS_EMPTY = 'No saved filters';
export const SAVED_FILTERS_DELETE_TOOLTIP = 'Delete saved filter';
export const SAVED_FILTERS_MAX = 100;
export const SAVED_FILTERS_NAME_MAX_LENGTH = 120;
