/**
 * Recursive tree filter for CascadingMenuItem[] (#133).
 *
 * Filters by case-insensitive substring match on item labels.
 * Preserves ancestor chain: if a child matches, all ancestors are included.
 * When a branch node matches, all its children are included.
 * Uses String.includes() (not regex) to avoid special-character exceptions.
 */

import type { CascadingMenuItem } from './CascadingMenu';

export function filterCascadingItems(
  items: readonly CascadingMenuItem[],
  query: string,
): CascadingMenuItem[] {
  const trimmed = query.trim();
  if (!trimmed) return items as CascadingMenuItem[];

  const lowerQuery = trimmed.toLowerCase();

  return items.reduce<CascadingMenuItem[]>((acc, item) => {
    const labelMatches = item.label.toLowerCase().includes(lowerQuery);

    if (labelMatches) {
      // Branch node matches — include it with all children intact
      acc.push(item as CascadingMenuItem);
    } else if (item.submenu) {
      // Check children recursively
      const filteredChildren = filterCascadingItems(item.submenu, query);
      if (filteredChildren.length > 0) {
        // Include this ancestor with only the matching subtree
        acc.push({ ...item, submenu: filteredChildren });
      }
    }

    return acc;
  }, []);
}
