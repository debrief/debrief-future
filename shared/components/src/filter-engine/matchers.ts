/**
 * Per-filter-type matching functions (#126).
 *
 * Each matcher takes a StacBrowserItem and a filter value,
 * returning true if the item matches the predicate.
 */

import type { DurationBucket, ModifiedBucket, FilterType, StacBrowserItem } from "./types";
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
  const platforms = item.platforms ?? [];
  if (platforms.length === 0) return false;
  const expandedPaths = descendantMap.get(value);
  if (!expandedPaths) return false;
  return platforms.some((p) => p.vessel_class && expandedPaths.has(p.vessel_class));
}

/** Match duration against a bucket */
function matchDuration(item: StacBrowserItem, value: string): boolean {
  const bucket = DURATION_THRESHOLDS[value as DurationBucket];
  if (!bucket) return false;
  const duration = computeDurationMs(item);
  return bucket.op === "lt" ? duration < bucket.ms : duration >= bucket.ms;
}

/** Modified-recency bucket thresholds in milliseconds */
const MODIFIED_THRESHOLDS: Record<ModifiedBucket, { op: "lt" | "gte"; ms: number }> = {
  "<6H": { op: "lt", ms: 6 * 60 * 60 * 1000 },
  "<24H": { op: "lt", ms: 24 * 60 * 60 * 1000 },
  "<7D": { op: "lt", ms: 7 * 24 * 60 * 60 * 1000 },
  "<1M": { op: "lt", ms: 30 * 24 * 60 * 60 * 1000 },
  ">1M": { op: "gte", ms: 30 * 24 * 60 * 60 * 1000 },
};

/** Match modified date against a recency bucket (time since modified) */
function matchModified(item: StacBrowserItem, value: string): boolean {
  if (!item.modified) return false;
  const bucket = MODIFIED_THRESHOLDS[value as ModifiedBucket];
  if (!bucket) return false;
  const modifiedTime = new Date(item.modified).getTime();
  if (isNaN(modifiedTime)) return false;
  const age = Date.now() - modifiedTime;
  return bucket.op === "lt" ? age < bucket.ms : age >= bucket.ms;
}

/** Match title with case-insensitive substring */
function matchTitle(item: StacBrowserItem, value: string): boolean {
  if (!item.title) return false;
  return item.title.toLowerCase().includes(value.toLowerCase());
}

/** Match filename (item ID) with case-insensitive substring */
function matchFilename(item: StacBrowserItem, value: string): boolean {
  if (!item.id) return false;
  return item.id.toLowerCase().includes(value.toLowerCase());
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

/** Match plot contents with case-insensitive substring */
function matchPlotContents(item: StacBrowserItem, value: string): boolean {
  if (!item.title) return false;
  return item.title.toLowerCase().includes(value.toLowerCase());
}

/** Registry of matchers by filter type */
const MATCHERS: Record<FilterType, MatcherFn> = {
  "vessel-class": matchVesselClass,
  tag: (item, value) =>
    arrayContainsCaseInsensitive(item.tags, value) ||
    arrayContainsCaseInsensitive(item.featureTags, value),
  author: (item, value) => matchAuthor(item, value),
  duration: (item, value) => matchDuration(item, value),
  modified: (item, value) => matchModified(item, value),
  title: (item, value) => matchTitle(item, value),
  filename: (item, value) => matchFilename(item, value),
  "plot-contents": (item, value) => matchPlotContents(item, value),
  "track-name": (item, value) => {
    const lower = value.toLowerCase();
    return (item.platforms ?? []).some((p) => p.name != null && p.name.toLowerCase() === lower);
  },
  nationality: (item, value) =>
    (item.platforms ?? []).some((p) => p.nationality === value),
  collection: (item, value) => matchCollection(item, value),
};

/** Get the matcher function for a filter type */
export function getMatcher(type: FilterType): MatcherFn {
  return MATCHERS[type];
}
