import { FilterEngine, FilterEngineConfig, StacBrowserItem, VesselTaxonomyNode } from './types';

/**
 * Create a filter engine instance.
 *
 * @param config - Engine configuration including vessel taxonomy
 * @returns A FilterEngine ready to evaluate expressions
 */
export declare function createFilterEngine(config: FilterEngineConfig): FilterEngine;
/**
 * Convenience wrapper: parse CQL2-JSON into a `FilterExpression`, then filter.
 *
 * Added by #188 (decision 1A) alongside the full reverse parser. Consumers
 * that already hold a `FilterExpression` should prefer `createFilterEngine`;
 * this helper is for downstream callers (the NL→CQL2 harness, future transport
 * layers in #190) that start from a CQL2-JSON object.
 *
 * The optional `config` lets callers pass vessel-class taxonomy so
 * hierarchical expansion works (e.g. `vessel_class=submarine` matching
 * `subsurface/submarine/ssk/type212`). When omitted, the engine runs with
 * an empty taxonomy — fine for predicates that do not depend on vessel-class
 * expansion.
 */
export declare function filterByCql2Json<T extends StacBrowserItem>(items: readonly T[], cql2: Record<string, unknown>, config?: FilterEngineConfig): T[];
/**
 * Convert a raw vessel-class tree (as shipped in `shared/data/enum-bundle.json`
 * or similar) into the `VesselTaxonomyNode[]` shape expected by
 * `createFilterEngine`.
 *
 * The enum-bundle tree nests `_class.full_name` alongside child keys; this
 * helper strips the metadata entries and recurses.
 */
export declare function vesselClassTreeToTaxonomy(tree: Readonly<Record<string, unknown>>): VesselTaxonomyNode[];
//# sourceMappingURL=engine.d.ts.map