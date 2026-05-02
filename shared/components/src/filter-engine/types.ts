/**
 * Type definitions for the CQL2 Filter Engine (#126).
 *
 * Defines the filter expression model, STAC browser item type,
 * and vessel taxonomy structure.
 *
 * CatalogOverviewItem is the canonical home for the base STAC item type
 * (migrated from CatalogOverview/types.ts in #132-three-view-sync).
 */

import type { PlatformRecord } from '@debrief/schemas';
export type { PlatformRecord };

/**
 * A single item in a STAC catalog overview.
 * Canonical definition — previously in CatalogOverview/types.ts.
 *
 * Schema equivalent: @debrief/schemas#StacItemSummary
 * Not migrated: the generated StacItemSummary uses snake_case field names
 * (item_path, start_datetime, end_datetime, feature_tags) while this type uses
 * camelCase. All consumers (ExerciseListView, FilterBar, timeline helpers)
 * depend on camelCase field access. Rename would require coordinated update
 * across many consumers.
 */
export interface CatalogOverviewItem {
  /** STAC Item ID */
  id: string;
  /** Item title */
  title: string;
  /** Path to item.json relative to store root */
  itemPath: string;
  /** Bounding box [west, south, east, north] */
  bbox: [number, number, number, number] | null;
  /** Single datetime (ISO 8601) — fallback when start/end not available */
  datetime: string | null;
  /** Range start datetime (ISO 8601) */
  startDatetime: string | null;
  /** Range end datetime (ISO 8601) */
  endDatetime: string | null;
  /** Per-platform metadata from debrief:platforms */
  platforms?: readonly PlatformRecord[];
  /** Plot-level tags from debrief:tags */
  tags?: readonly string[];
  /** Feature-level tags from debrief:feature_tags */
  featureTags?: readonly string[];
  /** Href to small thumbnail PNG (200x150) — assets.thumbnail (spec 241). */
  thumbnailHref?: string | null;
  /** Href to large overview PNG (800x600) — assets.overview (spec 241). */
  overviewHref?: string | null;
}

/** Fields on PlatformRecord that can be compared within array_filter */
export type PlatformField = "id" | "name" | "nationality" | "vessel_class" | "vessel_type" | "vessel_role" | "domain";

/** A recursive boolean expression tree for compound predicates */
export type CompoundPredicate =
  | { readonly kind: "comparison"; readonly field: PlatformField; readonly value: string }
  | { readonly kind: "and"; readonly children: readonly CompoundPredicate[] }
  | { readonly kind: "or"; readonly children: readonly CompoundPredicate[] };

/** An array_filter() call — compound predicate evaluated per-element */
export interface ArrayFilterPredicate {
  readonly array: "platforms";
  readonly predicate: CompoundPredicate;
  readonly negated?: boolean;
}

/** All supported metadata filter types from SRD Section 4.4 */
export type FilterType =
  | "vessel-class"
  | "tag"
  | "author"
  | "duration"
  | "modified"
  | "title"
  | "filename"
  | "plot-contents"
  | "track-name"
  | "nationality"
  | "collection"
  | "platform";

/** Valid duration bucket values */
export type DurationBucket = "<6H" | "<24H" | "<72H" | "<10D" | ">10D";

/** Valid modified-recency bucket values */
export type ModifiedBucket = "<6H" | "<24H" | "<7D" | "<1M" | ">1M";

/** A single filter condition */
export interface Predicate {
  readonly type: FilterType;
  readonly value: string;
  readonly negated?: boolean;
}

/** A group of predicates combined with OR logic */
export interface OrGroup {
  readonly predicates: readonly Predicate[];
}

/** The complete filter state: AND of top-level predicates + OR groups + array filters */
export interface FilterExpression {
  readonly predicates: readonly Predicate[];
  readonly orGroups: readonly OrGroup[];
  readonly arrayFilters?: readonly ArrayFilterPredicate[];
}

/**
 * Extended STAC item with Debrief extension properties for filtering.
 * Extends CatalogOverviewItem with the properties defined by #125.
 */
export interface StacBrowserItem extends CatalogOverviewItem {
  readonly platforms: readonly PlatformRecord[];
  readonly tags: readonly string[];
  readonly featureTags: readonly string[];
  readonly author: string | null;
  readonly collection: string | null;
  /** ISO 8601 datetime when the item was last modified */
  readonly modified: string | null;
}

/** A node in the hierarchical vessel classification tree */
export interface VesselTaxonomyNode {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly VesselTaxonomyNode[];
}

/** Configuration for creating a filter engine instance */
export interface FilterEngineConfig {
  readonly taxonomy: readonly VesselTaxonomyNode[];
}

/** The filter engine public interface */
export interface FilterEngine {
  /** Evaluate a filter expression against an array of items. */
  filter(
    items: readonly StacBrowserItem[],
    expression: FilterExpression,
  ): StacBrowserItem[];

  /** Test whether a single item matches a filter expression. */
  matches(item: StacBrowserItem, expression: FilterExpression): boolean;

  /** Serialise a filter expression to CQL2 JSON. */
  toCql2Json(expression: FilterExpression): Record<string, unknown>;
}
