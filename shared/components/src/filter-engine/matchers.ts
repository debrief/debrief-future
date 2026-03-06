/**
 * Per-filter-type matching functions (#126).
 *
 * Each matcher takes a StacBrowserItem and a filter value,
 * returning true if the item matches the predicate.
 */

import type { DurationBucket, FilterType, StacBrowserItem } from "./types";
import type { DescendantMap } from "./taxonomy";

/** Duration bucket thresholds in milliseconds */
const DURATION_THRESHOLDS: Record<DurationBucket, { op: "lt" | "gte"; ms: number }> = {
  "<6H": { op: "lt", ms: 6 * 60 * 60 * 1000 },
  "<24H": { op: "lt", ms: 24 * 60 * 60 * 1000 },
  "<72H": { op: "lt", ms: 72 * 60 * 60 * 1000 },
  "<10D": { op: "lt", ms: 10 * 24 * 60 * 60 * 1000 },
  ">10D": { op: "gte", ms: 10 * 24 * 60 * 60 * 1000 },
};

/** Case-insensitive check: does the array contain the value? */
function arrayContainsCaseInsensitive(
  arr: readonly string[] | undefined,
  value: string,
): boolean {
  if (!arr || arr.length === 0) return false;
  const lower = value.toLowerCase();
  return arr.some((v) => v.toLowerCase() === lower);
}

/** Compute duration in ms from start/end datetimes */
function computeDurationMs(item: StacBrowserItem): number {
  if (item.startDatetime && item.endDatetime) {
    const start = new Date(item.startDatetime).getTime();
    const end = new Date(item.endDatetime).getTime();
    if (!isNaN(start) && !isNaN(end)) {
      return Math.max(0, end - start);
    }
  }
  return 0;
}

/** Match vessel class with hierarchical taxonomy expansion */
function matchVesselClass(
  item: StacBrowserItem,
  value: string,
  descendantMap: DescendantMap,
): boolean {
  if (!item.vesselClasses || item.vesselClasses.length === 0) return false;
  const expandedPaths = descendantMap.get(value);
  if (!expandedPaths) return false;
  return item.vesselClasses.some((vc) => expandedPaths.has(vc));
}

/** Match duration against a bucket */
function matchDuration(item: StacBrowserItem, value: string): boolean {
  const bucket = DURATION_THRESHOLDS[value as DurationBucket];
  if (!bucket) return false;
  const duration = computeDurationMs(item);
  return bucket.op === "lt" ? duration < bucket.ms : duration >= bucket.ms;
}

/** Match title with case-insensitive substring */
function matchTitle(item: StacBrowserItem, value: string): boolean {
  if (!item.title) return false;
  return item.title.toLowerCase().includes(value.toLowerCase());
}

/** Match author with case-insensitive exact match */
function matchAuthor(item: StacBrowserItem, value: string): boolean {
  if (!item.author) return false;
  return item.author.toLowerCase() === value.toLowerCase();
}

/** Match collection with exact match */
function matchCollection(item: StacBrowserItem, value: string): boolean {
  if (!item.collection) return false;
  return item.collection === value;
}

export type MatcherFn = (
  item: StacBrowserItem,
  value: string,
  descendantMap: DescendantMap,
) => boolean;

/** Registry of matchers by filter type */
const MATCHERS: Record<FilterType, MatcherFn> = {
  "vessel-class": matchVesselClass,
  "plot-tag": (item, value) => arrayContainsCaseInsensitive(item.tags, value),
  "feature-tag": (item, value) =>
    arrayContainsCaseInsensitive(item.featureTags, value),
  author: (item, value) => matchAuthor(item, value),
  duration: (item, value) => matchDuration(item, value),
  title: (item, value) => matchTitle(item, value),
  "track-name": (item, value) =>
    arrayContainsCaseInsensitive(item.trackNames, value),
  nationality: (item, value) =>
    arrayContainsCaseInsensitive(item.nationalities, value),
  collection: (item, value) => matchCollection(item, value),
};

/** Get the matcher function for a filter type */
export function getMatcher(type: FilterType): MatcherFn {
  return MATCHERS[type];
}
