import { VesselTaxonomyNode } from './types';

/**
 * The raw taxonomy JSON format from #125 fixtures.
 * Uses object keys as node IDs: `{ [id]: { label, children? } }`
 */
export interface RawTaxonomyNode {
    readonly label: string;
    readonly children?: Readonly<Record<string, RawTaxonomyNode>>;
}
export interface RawTaxonomy {
    readonly version: string;
    readonly description: string;
    readonly taxonomy: Readonly<Record<string, RawTaxonomyNode>>;
}
/**
 * Convert the #125 fixture taxonomy format to VesselTaxonomyNode[].
 */
export declare function parseTaxonomy(raw: Readonly<Record<string, RawTaxonomyNode>>): VesselTaxonomyNode[];
/** Map from node ID to all full paths at or under that node */
export type DescendantMap = ReadonlyMap<string, ReadonlySet<string>>;
/**
 * Pre-compute a descendant map: nodeId → Set of all full taxonomy paths
 * at or below that node. Used for hierarchical vessel-class matching.
 *
 * Given taxonomy:
 *   surface/warship/frigate/type23
 * The map includes:
 *   "surface"  → {"surface", "surface/warship", "surface/warship/frigate", "surface/warship/frigate/type23"}
 *   "warship"  → {"surface/warship", "surface/warship/frigate", "surface/warship/frigate/type23"}
 *   "frigate"  → {"surface/warship/frigate", "surface/warship/frigate/type23"}
 *   "type23"   → {"surface/warship/frigate/type23"}
 */
export declare function buildDescendantMap(nodes: readonly VesselTaxonomyNode[]): DescendantMap;
/** Map from full taxonomy path to human-readable label */
export type TaxonomyLabelMap = ReadonlyMap<string, string>;
/**
 * Build a map from full taxonomy path to human-readable label.
 * Uses full paths as keys to avoid ambiguity (e.g., "auxiliary/tanker" vs "merchant/tanker").
 *
 * @example
 * "surface/warship/frigate/type23" → "Type 23 Frigate"
 * "surface/warship" → "Warship"
 */
export declare function buildTaxonomyLabelMap(taxonomy: readonly VesselTaxonomyNode[]): TaxonomyLabelMap;
/**
 * Resolve a taxonomy path to its human-readable label.
 * Returns the raw value as fallback for unknown paths (graceful degradation).
 */
export declare function resolveTaxonomyLabel(value: string, labelMap: ReadonlyMap<string, string>): string;
//# sourceMappingURL=taxonomy.d.ts.map