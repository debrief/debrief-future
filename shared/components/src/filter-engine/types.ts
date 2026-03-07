/**
 * Type definitions for the CQL2 Filter Engine (#126).
 *
 * Defines the filter expression model, STAC browser item type,
 * and vessel taxonomy structure.
 */

/** All supported metadata filter types from SRD Section 4.4 */
export type FilterType =
  | "vessel-class"
  | "tag"
  | "author"
  | "duration"
  | "modified"
  | "title"
  | "plot-contents"
  | "track-name"
  | "nationality"
  | "collection";

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

/** The complete filter state: AND of top-level predicates + OR groups */
export interface FilterExpression {
  readonly predicates: readonly Predicate[];
  readonly orGroups: readonly OrGroup[];
}

/**
 * STAC catalog exercise item — the canonical data type for exercises (#132).
 *
 * Combines core STAC fields with Debrief extension properties (#125).
 * Used by FilterBar, ExerciseListView, MapView, TimelineView.
 */
export interface StacBrowserItem {
  /** STAC Item ID */
  readonly id: string;
  /** Item title */
  readonly title: string;
  /** Path to item.json relative to store root */
  readonly itemPath: string;
  /** Bounding box [west, south, east, north] */
  readonly bbox: [number, number, number, number] | null;
  /** Single datetime (ISO 8601) — fallback when start/end not available */
  readonly datetime: string | null;
  /** Range start datetime (ISO 8601) */
  readonly startDatetime: string | null;
  /** Range end datetime (ISO 8601) */
  readonly endDatetime: string | null;
  /** Vessel taxonomy paths from debrief:vessel_classes */
  readonly vesselClasses: readonly string[];
  /** Plot-level tags from debrief:tags */
  readonly tags: readonly string[];
  /** Feature-level tags from debrief:feature_tags */
  readonly featureTags: readonly string[];
  /** Exercise author from debrief:author */
  readonly author: string | null;
  /** Track platform names from debrief:track_names */
  readonly trackNames: readonly string[];
  /** ISO 3166-1 nationality codes from debrief:nationalities */
  readonly nationalities: readonly string[];
  /** STAC collection ID */
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
