/**
 * useTaxonomyMatchCounts — per-node count hook for taxonomy dropdown (#133).
 *
 * Computes the number of items matching each taxonomy node's subtree.
 * Uses buildDescendantMap() for subtree resolution, memoized on taxonomy reference.
 * Counts reflect the current (possibly filtered) item set.
 */

import { useMemo } from 'react';
import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine';

/** Map from full taxonomy path to count of matching items */
export type TaxonomyMatchCounts = ReadonlyMap<string, number>;

/**
 * Collect all full paths in the taxonomy tree.
 * Returns a map from full path to the set of all descendant full paths
 * (including self).
 */
function buildPathDescendantMap(
  nodes: readonly VesselTaxonomyNode[],
  parentPath = '',
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  function walk(node: VesselTaxonomyNode, parent: string): Set<string> {
    const fullPath = parent ? `${parent}/${node.id}` : node.id;
    const paths = new Set<string>([fullPath]);

    if (node.children) {
      for (const child of node.children) {
        const childPaths = walk(child, fullPath);
        for (const p of childPaths) {
          paths.add(p);
        }
      }
    }

    map.set(fullPath, paths);
    return paths;
  }

  for (const root of nodes) {
    walk(root, parentPath);
  }

  return map;
}

export function useTaxonomyMatchCounts(
  items: readonly StacBrowserItem[],
  taxonomy: readonly VesselTaxonomyNode[],
): TaxonomyMatchCounts {
  // Memoize the path descendant map on taxonomy reference
  const pathDescendantMap = useMemo(
    () => buildPathDescendantMap(taxonomy),
    [taxonomy],
  );

  // Compute counts whenever items change
  return useMemo(() => {
    const counts = new Map<string, number>();

    // Initialize all taxonomy paths to 0
    for (const path of pathDescendantMap.keys()) {
      counts.set(path, 0);
    }

    // For each item, find which taxonomy paths it matches
    for (const item of items) {
      // Track which taxonomy paths this item has already been counted for
      // (an item with multiple vessel classes in the same subtree counts once per ancestor)
      const countedPaths = new Set<string>();

      for (const vesselClass of (item.platforms ?? []).map((p) => p.vessel_class).filter((v): v is string => v != null)) {
        // For each taxonomy path, check if this vessel class is a descendant
        for (const [taxonomyPath, descendants] of pathDescendantMap) {
          if (descendants.has(vesselClass) && !countedPaths.has(taxonomyPath)) {
            countedPaths.add(taxonomyPath);
            counts.set(taxonomyPath, (counts.get(taxonomyPath) ?? 0) + 1);
          }
        }
      }
    }

    return counts;
  }, [items, pathDescendantMap]);
}
