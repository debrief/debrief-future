import { useState, useCallback, useEffect, useRef } from 'react';
import type { LayersToolbarProps } from './types';
import { DEFAULT_FILTER_STATE, DEFAULT_LABELS, isFilterActive } from './types';
import { FilterDropdown } from './FilterDropdown';
import { RunDropdown } from './RunDropdown';
import { AssociatedFilesDropdown } from './AssociatedFilesDropdown';
import './LayersToolbar.css';
import './YellowHalo.css';

type OpenDropdown = 'filter' | 'run' | 'associated' | null;

/**
 * LayersToolbar renders 5 buttons in two groups:
 * - Selection-scoped (left): Delete, Visibility, Run
 * - Plot-scoped (right): Filter, Associated Files
 *
 * Only one dropdown is open at a time. Click-outside or Escape closes it.
 */
export function LayersToolbar({
  selectedFeatureIds,
  features,
  toolMatches = [],
  sourceFiles = [],
  resultFiles = [],
  toolsChanged = false,
  resultsChanged = false,
  filterState: externalFilterState,
  onDelete,
  onToggleVisibility,
  onRunTool,
  onRunAction,
  onFilterChange,
  onApplyToSelection,
  onFileAction,
  onDropdownOpened,
  labels: labelOverrides,
  className,
}: LayersToolbarProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const filterState = externalFilterState ?? DEFAULT_FILTER_STATE;
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedFeatureIds.length > 0;
  const filterActive = isFilterActive(filterState);

  const toggleDropdown = useCallback(
    (dropdown: OpenDropdown) => {
      setOpenDropdown((prev) => {
        if (prev === dropdown) return null;
        // Notify parent when run or associated opens
        if (dropdown === 'run' || dropdown === 'associated') {
          onDropdownOpened?.(dropdown);
        }
        return dropdown;
      });
    },
    [onDropdownOpened],
  );

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const containerClassName = ['debrief-layers-toolbar', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName} ref={toolbarRef}>
      {/* Selection-scoped group */}
      <div className="debrief-layers-toolbar__group">
        {/* Delete */}
        <button
          className="debrief-layers-toolbar__btn"
          disabled={!hasSelection}
          onClick={() => hasSelection && onDelete?.(selectedFeatureIds)}
          title={labels.delete}
          aria-label={labels.delete}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 1h5a.5.5 0 0 1 .5.5V3H5V1.5a.5.5 0 0 1 .5-.5ZM4 3V1.5A1.5 1.5 0 0 1 5.5 0h5A1.5 1.5 0 0 1 12 1.5V3h2.5a.5.5 0 0 1 0 1H14l-.7 9.1A1.5 1.5 0 0 1 11.8 14H4.2a1.5 1.5 0 0 1-1.5-1.4L2 4h-.5a.5.5 0 0 1 0-1H4Zm1 1-.7 9h7.4l-.7-9H5Z" />
          </svg>
        </button>

        {/* Visibility */}
        <button
          className="debrief-layers-toolbar__btn"
          disabled={!hasSelection}
          onClick={() => hasSelection && onToggleVisibility?.(selectedFeatureIds)}
          title={labels.toggleVisibility}
          aria-label={labels.toggleVisibility}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3.5c-3.4 0-6.2 2.1-7.8 4.5 1.6 2.4 4.4 4.5 7.8 4.5s6.2-2.1 7.8-4.5C14.2 5.6 11.4 3.5 8 3.5Zm0 8a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0-5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
          </svg>
        </button>

        {/* Run */}
        <div className="debrief-layers-toolbar__btn-wrapper">
          <button
            className={`debrief-layers-toolbar__btn debrief-layers-toolbar__btn--with-arrow${
              toolsChanged ? ' debrief-toolbar-btn--halo' : ''
            }`}
            disabled={!hasSelection}
            onClick={() => hasSelection && toggleDropdown('run')}
            title={labels.run}
            aria-label={labels.run}
            aria-expanded={openDropdown === 'run'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2l10 6-10 6V2Z" />
            </svg>
            <span className="debrief-layers-toolbar__arrow">▾</span>
          </button>
          {openDropdown === 'run' && (
            <div className="debrief-layers-toolbar__dropdown debrief-layers-toolbar__dropdown--left">
              <RunDropdown
                toolMatches={toolMatches}
                selectedFeatureIds={selectedFeatureIds}
                onRunTool={(toolId, ids) => {
                  onRunTool?.(toolId, ids);
                  setOpenDropdown(null);
                }}
                onRunAction={(actionId, ids) => {
                  onRunAction?.(actionId, ids);
                  setOpenDropdown(null);
                }}
                labels={labelOverrides}
              />
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="debrief-layers-toolbar__spacer" />

      {/* Plot-scoped group */}
      <div className="debrief-layers-toolbar__group">
        {/* Filter */}
        <div className="debrief-layers-toolbar__btn-wrapper">
          <button
            className={`debrief-layers-toolbar__btn debrief-layers-toolbar__btn--with-arrow${
              filterActive ? ' debrief-layers-toolbar__btn--active' : ''
            }`}
            onClick={() => toggleDropdown('filter')}
            title={labels.filter}
            aria-label={labels.filter}
            aria-expanded={openDropdown === 'filter'}
          >
            {filterActive ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2h14l-5 6v5l-4 2V8L1 2Z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.5 7a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM8 8l5 5-.7.7L7.3 8.7 8 8Z" />
              </svg>
            )}
            <span className="debrief-layers-toolbar__arrow">▾</span>
          </button>
          {openDropdown === 'filter' && (
            <div className="debrief-layers-toolbar__dropdown debrief-layers-toolbar__dropdown--right">
              <FilterDropdown
                filterState={filterState}
                onFilterChange={(state) => onFilterChange?.(state)}
                onApplyToSelection={onApplyToSelection}
                labels={labelOverrides}
              />
            </div>
          )}
        </div>

        {/* Associated Files */}
        <div className="debrief-layers-toolbar__btn-wrapper">
          <button
            className={`debrief-layers-toolbar__btn debrief-layers-toolbar__btn--with-arrow${
              resultsChanged ? ' debrief-toolbar-btn--halo' : ''
            }`}
            onClick={() => toggleDropdown('associated')}
            title={labels.associatedFiles}
            aria-label={labels.associatedFiles}
            aria-expanded={openDropdown === 'associated'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.5 3a2.5 2.5 0 0 1 5 0v.5H11a1 1 0 0 1 1 1V6h-1V4.5H5V6H4V4.5a1 1 0 0 1 1-1h-.5V3a2.5 2.5 0 0 1 0 0Zm1 0v.5h3V3a1.5 1.5 0 0 0-3 0ZM2 7h12v1H2V7Zm0 2h12v1H2V9Zm0 2h12v1H2v-1Zm0 2h8v1H2v-1Z" />
            </svg>
            <span className="debrief-layers-toolbar__arrow">▾</span>
          </button>
          {openDropdown === 'associated' && (
            <div className="debrief-layers-toolbar__dropdown debrief-layers-toolbar__dropdown--right">
              <AssociatedFilesDropdown
                sourceFiles={sourceFiles}
                resultFiles={resultFiles}
                onFileAction={(file, action) => {
                  onFileAction?.(file, action);
                }}
                labels={labelOverrides}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
