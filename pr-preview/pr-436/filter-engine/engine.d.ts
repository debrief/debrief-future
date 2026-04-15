import { FilterEngine, FilterEngineConfig, StacBrowserItem } from './types';

/**
 * Create a filter engine instance.
 *
 * @param config - Engine configuration including vessel taxonomy
 * @returns A FilterEngine ready to evaluate expressions
 */
export declare function createFilterEngine(config: FilterEngineConfig): FilterEngine;
/**
 * One-liner convenience: parse a CQL2-JSON object and filter items with an
 * empty-taxonomy engine. Callers needing taxonomy-aware vessel-class
 * descendant matching should build their own engine via `createFilterEngine`.
 *
 * Added in #188 for the NL → CQL2 harness (decision 1A).
 */
export declare function filterByCql2Json<T extends StacBrowserItem>(items: readonly T[], cql2: Record<string, unknown>): T[];
//# sourceMappingURL=engine.d.ts.map