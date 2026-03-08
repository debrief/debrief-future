/**
 * Age colour dimension — gradient encoding where most recent = vivid,
 * oldest = faded (FR-005).
 */

import type { ColourDimension } from '../types';

/**
 * Resolve the effective datetime from a STAC item for age encoding.
 * Uses endDatetime (most representative of when the exercise occurred),
 * falling back to startDatetime, then datetime.
 */
function resolveDateTime(item: { datetime: string | null; startDatetime: string | null; endDatetime: string | null }): string | null {
  return item.endDatetime ?? item.startDatetime ?? item.datetime;
}

export const ageDimension: ColourDimension = {
  id: 'age',
  label: 'Age',
  type: 'gradient',
  resolve: (item) => {
    const dt = resolveDateTime(item);
    return dt ?? null;
  },
};
