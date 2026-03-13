/**
 * Type definitions for the CQL2 Filter Engine (#126).
 *
 * Defines the filter expression model, STAC browser item type,
 * and vessel taxonomy structure.
 *
 * CatalogOverviewItem is the canonical home for the base STAC item type
 * (migrated from CatalogOverview/types.ts in #132-three-view-sync).
 */
/**
 * A single item in a STAC catalog overview.
 * Canonical definition — previously in CatalogOverview/types.ts.
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
}
/** All supported metadata filter types from SRD Section 4.4 */
export type FilterType = "vessel-class" | "tag" | "author" | "duration" | "modified" | "title" | "plot-contents" | "track-name" | "nationality" | "collection";
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
 * Extended STAC item with Debrief extension properties for filtering.
 * Extends CatalogOverviewItem with the properties defined by #125.
 */
export interface StacBrowserItem extends CatalogOverviewItem {
    readonly vesselClasses: readonly string[];
    readonly tags: readonly string[];
    readonly featureTags: readonly string[];
    readonly author: string | null;
    readonly trackNames: readonly string[];
    readonly nationalities: readonly string[];
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
    filter(items: readonly StacBrowserItem[], expression: FilterExpression): StacBrowserItem[];
    /** Test whether a single item matches a filter expression. */
    matches(item: StacBrowserItem, expression: FilterExpression): boolean;
    /** Serialise a filter expression to CQL2 JSON. */
    toCql2Json(expression: FilterExpression): Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map