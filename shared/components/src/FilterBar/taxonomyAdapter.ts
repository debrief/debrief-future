/**
 * Adapter mapping VesselTaxonomyNode[] to CascadingMenuItem[] (#127, #133).
 *
 * Reuses CascadingMenu from @debrief/components (review decision #1).
 * Enhanced with currentValue, counts, and disableEmpty options (#133).
 */

import type { CascadingMenuItem } from '../CascadingMenu';
import type { VesselTaxonomyNode } from '../filter-engine';

export interface TaxonomyAdapterOptions {
  /** Currently selected value (full path) to mark with current: true */
  readonly currentValue?: string;
  /** Match counts per full path for badge display */
  readonly counts?: ReadonlyMap<string, number>;
  /** When true, nodes with count 0 are disabled */
  readonly disableEmpty?: boolean;
}

/** Convert a vessel taxonomy tree to CascadingMenu items */
export function taxonomyToCascadingItems(
  nodes: readonly VesselTaxonomyNode[],
  options?: TaxonomyAdapterOptions,
  parentPath?: string,
): CascadingMenuItem[] {
  return nodes.map((node) => {
    const fullPath = parentPath ? `${parentPath}/${node.id}` : node.id;
    const count = options?.counts?.get(fullPath);
    const isZero = count === 0;

    return {
      id: node.id,
      label: node.label,
      submenu: node.children
        ? taxonomyToCascadingItems(node.children, options, fullPath)
        : undefined,
      current: options?.currentValue === fullPath ? true : undefined,
      badge: count !== undefined ? `(${count})` : undefined,
      disabled: options?.disableEmpty && isZero ? true : undefined,
      disabledReason: options?.disableEmpty && isZero ? 'No matching items' : undefined,
    };
  });
}
