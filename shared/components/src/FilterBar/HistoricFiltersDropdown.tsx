/**
 * SavedFiltersDropdown — dropdown list of saved filter configurations (#128).
 *
 * Shows saved configurations ordered newest first. Each entry can be
 * restored (click name) or deleted (click delete button).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SAVED_FILTERS_LABEL,
  SAVED_FILTERS_EMPTY,
  SAVED_FILTERS_DELETE_TOOLTIP,
} from './constants';
import type { SavedFilterConfiguration } from './types';

export interface HistoricFiltersDropdownProps {
  readonly configurations: readonly SavedFilterConfiguration[];
  readonly onRestore: (config: SavedFilterConfiguration) => void;
  readonly onDelete: (id: string) => void;
}

export const HistoricFiltersDropdown: React.FC<HistoricFiltersDropdownProps> = ({
  configurations,
  onRestore,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleRestore = useCallback(
    (config: SavedFilterConfiguration) => {
      onRestore(config);
      setIsOpen(false);
    },
    [onRestore],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDelete(id);
    },
    [onDelete],
  );

  return (
    <div className="debrief-saved-filters" ref={dropdownRef} data-testid="saved-filters">
      <button
        className="debrief-saved-filters__trigger"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="saved-filters-trigger"
      >
        {SAVED_FILTERS_LABEL}
      </button>

      {isOpen && (
        <div className="debrief-saved-filters__dropdown" data-testid="saved-filters-dropdown">
          {configurations.length === 0 ? (
            <div
              className="debrief-saved-filters__empty"
              data-testid="saved-filters-empty"
            >
              {SAVED_FILTERS_EMPTY}
            </div>
          ) : (
            <ul className="debrief-saved-filters__list" data-testid="saved-filters-list">
              {configurations.map((config) => (
                <li key={config.id} className="debrief-saved-filters__item">
                  <button
                    className="debrief-saved-filters__restore"
                    onClick={() => handleRestore(config)}
                    data-testid={`saved-filter-restore-${config.id}`}
                  >
                    <span className="debrief-saved-filters__name">{config.name}</span>
                    <span className="debrief-saved-filters__date">
                      {new Date(config.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    className="debrief-saved-filters__delete"
                    onClick={(e) => handleDelete(e, config.id)}
                    title={SAVED_FILTERS_DELETE_TOOLTIP}
                    data-testid={`saved-filter-delete-${config.id}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
