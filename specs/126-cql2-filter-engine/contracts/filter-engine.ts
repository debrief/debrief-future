/**
 * Contract types for the CQL2 Filter Engine (#126)
 *
 * These types define the public API surface. Implementation will
 * be in shared/components/src/filter-engine/.
 */

// --- Filter Types ---

/** All supported metadata filter types from SRD Section 4.4 */
export type FilterType =
  | "vessel-class"
  | "plot-tag"
  | "feature-tag"
  | "author"
  | "duration"
  | "title"
  | "plot-contents"
  | "track-name"
  | "nationality"
  | "collection";

/** Valid duration bucket values */
export type DurationBucket = "<6H" | "<24H" | "<72H" | "<10D" | ">10D";

/** A single filter condition */
export interface Predicate {
  readonly type: FilterType;
  readonly value: string;
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

// --- Item Types ---

/**
 * Extended STAC item with extension properties for filtering.
 * Extends CatalogOverviewItem from @debrief/components.
 */
export interface StacBrowserItem {
  readonly id: string;
  readonly title: string;
  readonly itemPath: string;
  readonly bbox: [number, number, number, number] | null;
  readonly datetime: string | null;
  readonly startDatetime: string | null;
  readonly endDatetime: string | null;
  readonly vesselClasses: readonly string[];
  readonly tags: readonly string[];
  readonly featureTags: readonly string[];
  readonly author: string | null;
  readonly trackNames: readonly string[];
  readonly nationalities: readonly string[];
  readonly collection: string | null;
}

// --- Vessel Taxonomy ---

/** A node in the hierarchical vessel classification tree */
export interface VesselTaxonomyNode {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly VesselTaxonomyNode[];
}

// --- Filter Engine API ---

/** Configuration for creating a filter engine instance */
export interface FilterEngineConfig {
  readonly taxonomy: readonly VesselTaxonomyNode[];
}

/** The filter engine public interface */
export interface FilterEngine {
  /**
   * Evaluate a filter expression against an array of items.
   * Returns the subset of items matching the expression.
   *
   * Empty expression (no predicates, no OR groups) returns all items.
   */
  filter(items: readonly StacBrowserItem[], expression: FilterExpression): StacBrowserItem[];

  /**
   * Test whether a single item matches a filter expression.
   */
  matches(item: StacBrowserItem, expression: FilterExpression): boolean;

  /**
   * Serialise a filter expression to CQL2 JSON.
   * Returns a valid OGC CQL2 JSON object.
   */
  toCql2Json(expression: FilterExpression): Record<string, unknown>;
}

// --- Factory ---

/**
 * Create a filter engine instance.
 *
 * @param config - Engine configuration including vessel taxonomy
 * @returns A FilterEngine instance ready to evaluate expressions
 */
export type CreateFilterEngine = (config: FilterEngineConfig) => FilterEngine;
