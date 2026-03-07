/**
 * CQL2 Filter Engine — client-side STAC item filtering (#126).
 *
 * @module filter-engine
 */
export { createFilterEngine } from './engine';
export { parseTaxonomy, buildDescendantMap, buildTaxonomyLabelMap, resolveTaxonomyLabel } from './taxonomy';
export type { RawTaxonomy, RawTaxonomyNode, DescendantMap, TaxonomyLabelMap } from './taxonomy';
export type { FilterType, DurationBucket, ModifiedBucket, Predicate, OrGroup, FilterExpression, StacBrowserItem, VesselTaxonomyNode, FilterEngineConfig, FilterEngine, } from './types';
//# sourceMappingURL=index.d.ts.map