/**
 * SearchableCascadingMenu — CascadingMenu with optional search input (#133).
 *
 * When searchable is true, renders a search input above the menu items that
 * filters the tree by case-insensitive substring match on labels.
 * When searchable is false, renders CascadingMenu unchanged (backwards compatible).
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { CascadingMenuProps } from './CascadingMenu';
import { CascadingMenu } from './CascadingMenu';
import { filterCascadingItems } from './filterCascadingItems';

export interface SearchableCascadingMenuProps extends CascadingMenuProps {
  readonly searchable?: boolean;
  readonly searchPlaceholder?: string;
  readonly onSearchChange?: (query: string) => void;
}

export const SearchableCascadingMenu: React.FC<SearchableCascadingMenuProps> = ({
  searchable,
  searchPlaceholder = 'Search vessel types...',
  onSearchChange,
  items,
  ...menuProps
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  const handleDismiss = useCallback(() => {
    setQuery('');
    menuProps.onDismiss();
  }, [menuProps.onDismiss]);

  // Focus search input on mount
  useEffect(() => {
    if (searchable) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [searchable]);

  // Prevent key events in search input from triggering menu keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return;
    e.stopPropagation();
  }, []);

  if (!searchable) {
    return <CascadingMenu items={items} {...menuProps} />;
  }

  const filteredItems = filterCascadingItems(items, query);
  const hasNoMatches = query.trim() !== '' && filteredItems.length === 0;

  const searchInput = (
    <div className="debrief-cascading-menu__search">
      <input
        ref={inputRef}
        type="text"
        className="debrief-cascading-menu__search-input"
        placeholder={searchPlaceholder}
        value={query}
        onChange={handleSearchChange}
        onKeyDown={handleKeyDown}
        data-testid="cascading-menu-search"
      />
    </div>
  );

  const noMatchesMessage = hasNoMatches ? (
    <div className="debrief-cascading-menu__no-matches">
      No matching vessel types
    </div>
  ) : undefined;

  return (
    <CascadingMenu
      items={hasNoMatches ? [] : filteredItems}
      {...menuProps}
      onDismiss={handleDismiss}
      beforeItems={searchInput}
      afterItems={noMatchesMessage}
    />
  );
};
