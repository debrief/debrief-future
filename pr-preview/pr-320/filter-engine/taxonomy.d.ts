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
//# sourceMappingURL=taxonomy.d.ts.map