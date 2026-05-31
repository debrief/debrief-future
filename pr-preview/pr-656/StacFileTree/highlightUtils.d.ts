/**
 * Utilities for highlight propagation in tree structures
 */
/**
 * Compute highlight sets from highlighted paths.
 * Returns both direct paths (nodes that are highlighted) and ancestor paths
 * (parent directories containing highlighted nodes).
 *
 * @param highlightedPaths - Array of paths to highlight
 * @returns Object with directPaths and ancestorPaths sets
 *
 * @example
 * ```ts
 * const result = computeHighlightSets([
 *   '/catalog/item-001/snapshot-1.json',
 *   '/catalog/item-002/snapshot-2.json'
 * ]);
 * // result.directPaths contains the snapshot files
 * // result.ancestorPaths contains /catalog, /catalog/item-001, /catalog/item-002
 * ```
 */
export declare function computeHighlightSets(highlightedPaths: string[]): {
    directPaths: Set<string>;
    ancestorPaths: Set<string>;
};
//# sourceMappingURL=highlightUtils.d.ts.map