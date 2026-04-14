/**
 * CQL2 Filter Engine — client-side STAC item filtering (#126).
 *
 * @module filter-engine
 */

export { createFilterEngine, filterByCql2Json } from "./engine";
export {
  cql2JsonToArrayFilters,
  cql2JsonToFilterExpression,
  Cql2ParseError,
  PROPERTY_MAP,
} from "./cql2-json";
export { parseTaxonomy, buildDescendantMap, buildTaxonomyLabelMap, resolveTaxonomyLabel } from "./taxonomy";
export type { RawTaxonomy, RawTaxonomyNode, DescendantMap, TaxonomyLabelMap } from "./taxonomy";
export type {
  CatalogOverviewItem,
  PlatformField,
  CompoundPredicate,
  ArrayFilterPredicate,
  FilterType,
  DurationBucket,
  ModifiedBucket,
  Predicate,
  OrGroup,
  FilterExpression,
  StacBrowserItem,
  VesselTaxonomyNode,
  FilterEngineConfig,
  FilterEngine,
} from "./types";
