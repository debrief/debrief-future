/**
 * CQL2 Filter Engine — client-side STAC item filtering (#126).
 *
 * @module filter-engine
 */

export { createFilterEngine } from "./engine";
export { parseTaxonomy, buildDescendantMap } from "./taxonomy";
export type { RawTaxonomy, RawTaxonomyNode, DescendantMap } from "./taxonomy";
export type {
  FilterType,
  DurationBucket,
  Predicate,
  OrGroup,
  FilterExpression,
  StacBrowserItem,
  VesselTaxonomyNode,
  FilterEngineConfig,
  FilterEngine,
} from "./types";
