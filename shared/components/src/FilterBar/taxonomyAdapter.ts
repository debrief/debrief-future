/**
 * Adapter mapping VesselTaxonomyNode[] to CascadingMenuItem[] (#127).
 *
 * Reuses CascadingMenu from @debrief/components (review decision #1).
 */

import type { CascadingMenuItem } from '../CascadingMenu';
import type { VesselTaxonomyNode } from '../filter-engine';

/** Convert a vessel taxonomy tree to CascadingMenu items */
export function taxonomyToCascadingItems(
  nodes: readonly VesselTaxonomyNode[],
): CascadingMenuItem[] {
  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    submenu: node.children ? taxonomyToCascadingItems(node.children) : undefined,
  }));
}
