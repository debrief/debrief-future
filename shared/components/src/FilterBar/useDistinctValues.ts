/**
 * Hook to extract distinct sorted values from STAC items for dropdown population (#127).
 */

import { useMemo } from 'react';
import type { FilterType, StacBrowserItem } from '../filter-engine';

/** Extract distinct sorted values from an array, ignoring nulls and empties */
function distinctSorted(values: readonly (string | null | undefined)[]): readonly string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v != null && v !== '') {
      set.add(v);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Extract and flatten array values from items */
function flatDistinct(items: readonly StacBrowserItem[], accessor: (item: StacBrowserItem) => readonly string[]): readonly string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const v of accessor(item)) {
      if (v !== '') {
        set.add(v);
      }
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export type DistinctValuesMap = Readonly<Record<FilterType, readonly string[]>>;

export function computeDistinctValues(items: readonly StacBrowserItem[]): DistinctValuesMap {
  return {
    'vessel-class': flatDistinct(items, (i) =>
      (i.platforms ?? []).map((p) => p.vessel_class).filter((v): v is string => v != null),
    ),
    'tag': flatDistinct(items, (i) => [...i.tags, ...i.featureTags]),
    'author': distinctSorted(items.map((i) => i.author)),
    'duration': [], // Duration uses fixed buckets, not distinct values
    'modified': [], // Modified uses fixed recency buckets
    'title': [], // Title uses free-text input
    'filename': distinctSorted(items.map((i) => i.id)),
    'plot-contents': [], // Plot contents uses free-text input
    'track-name': flatDistinct(items, (i) =>
      (i.platforms ?? []).map((p) => p.name).filter((v): v is string => v != null),
    ),
    'nationality': flatDistinct(items, (i) =>
      (i.platforms ?? []).map((p) => p.nationality).filter((v): v is string => v != null),
    ),
    'collection': distinctSorted(items.map((i) => i.collection)),
  };
}

export function useDistinctValues(items: readonly StacBrowserItem[]): DistinctValuesMap {
  return useMemo(() => computeDistinctValues(items), [items]);
}
