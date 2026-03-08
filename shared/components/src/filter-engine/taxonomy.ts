/**
 * Vessel taxonomy utilities for hierarchical filter expansion (#126).
 *
 * Converts the #125 fixture taxonomy JSON format to VesselTaxonomyNode[],
 * and pre-computes descendant path maps for efficient filtering.
 */

import type { VesselTaxonomyNode } from "./types";

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
export function parseTaxonomy(
  raw: Readonly<Record<string, RawTaxonomyNode>>,
): VesselTaxonomyNode[] {
  return Object.entries(raw).map(([id, node]) => ({
    id,
    label: node.label,
    children: node.children ? parseTaxonomy(node.children) : undefined,
  }));
}

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
export function buildDescendantMap(
  nodes: readonly VesselTaxonomyNode[],
): DescendantMap {
  const map = new Map<string, Set<string>>();

  function walk(
    node: VesselTaxonomyNode,
    parentPath: string,
  ): Set<string> {
    const fullPath = parentPath ? `${parentPath}/${node.id}` : node.id;
    const paths = new Set<string>([fullPath]);

    if (node.children) {
      for (const child of node.children) {
        const childPaths = walk(child, fullPath);
        for (const p of childPaths) {
          paths.add(p);
        }
      }
    }

    // Merge into the map entry for this node ID
    const existing = map.get(node.id);
    if (existing) {
      for (const p of paths) {
        existing.add(p);
      }
    } else {
      map.set(node.id, new Set(paths));
    }

    return paths;
  }

  for (const root of nodes) {
    walk(root, "");
  }

  return map;
}

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
export function buildTaxonomyLabelMap(
  taxonomy: readonly VesselTaxonomyNode[],
): TaxonomyLabelMap {
  const map = new Map<string, string>();

  function walk(node: VesselTaxonomyNode, parentPath: string): void {
    const fullPath = parentPath ? `${parentPath}/${node.id}` : node.id;
    map.set(fullPath, node.label);

    if (node.children) {
      for (const child of node.children) {
        walk(child, fullPath);
      }
    }
  }

  for (const root of taxonomy) {
    walk(root, "");
  }

  return map;
}

/**
 * Resolve a taxonomy path to its human-readable label.
 * Returns the raw value as fallback for unknown paths (graceful degradation).
 */
export function resolveTaxonomyLabel(
  value: string,
  labelMap: ReadonlyMap<string, string>,
): string {
  return labelMap.get(value) ?? value;
}
