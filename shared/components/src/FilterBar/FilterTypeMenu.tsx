/**
 * FilterTypeMenu — dropdown for selecting a filter type or OR group (#127).
 *
 * Local state for menu open/close (review decision #5).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FILTER_TYPE_OPTIONS, OR_GROUP_LABEL } from './constants';

export interface FilterTypeMenuProps {
  readonly onSelectType: (type: string) => void;
  readonly onSelectOrGroup: () => void;
}

export const FilterTypeMenu: React.FC<FilterTypeMenuProps> = ({
  onSelectType,
  onSelectOrGroup,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  return (
    <div className="debrief-filter-type-menu" ref={menuRef}>
      <button
        className="debrief-filter-type-menu__add"
        onClick={() => setIsOpen((o) => !o)}
        data-testid="filter-add-button"
        aria-label="Add filter"
        title="Add filter"
      >
        +
      </button>
      {isOpen && (
        <div className="debrief-filter-type-menu__dropdown" role="menu" data-testid="filter-type-dropdown">
          {FILTER_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              className="debrief-filter-type-menu__option"
              role="menuitem"
              data-testid={`filter-type-${option.type}`}
              onClick={() => { onSelectType(option.type); setIsOpen(false); }}
            >
              {option.label}
            </button>
          ))}
          <div className="debrief-filter-type-menu__divider" />
          <button
            className="debrief-filter-type-menu__option debrief-filter-type-menu__option--or"
            role="menuitem"
            data-testid="filter-type-or-group"
            onClick={() => { onSelectOrGroup(); setIsOpen(false); }}
          >
            {OR_GROUP_LABEL}
          </button>
        </div>
      )}
    </div>
  );
};
