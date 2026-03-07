/**
 * Constants for the Filter Bar (#127).
 *
 * All user-facing string constants are centralised here for i18n readiness.
 */

import type { FilterTypeOption } from './types';
import type { DurationBucket } from '../filter-engine';

/** All 10 filter types with labels and input methods */
export const FILTER_TYPE_OPTIONS: readonly FilterTypeOption[] = [
  { type: 'vessel-class', label: 'Vessel Class', inputMethod: 'hierarchical' },
  { type: 'tag', label: 'Tag', inputMethod: 'flat-dropdown' },
  { type: 'author', label: 'Author', inputMethod: 'flat-dropdown' },
  { type: 'duration', label: 'Duration', inputMethod: 'bucket' },
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
