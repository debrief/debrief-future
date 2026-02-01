import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button, Icon } from 'vscrui';
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
  hiddenIds,
  toolMatches = [],
  sourceFiles = [],
  resultFiles = [],
  toolsChanged = false,
  resultsChanged = false,
  filterState: externalFilterState,
  showHidden = true,
  onDelete,
  onToggleVisibility,
  onRunTool,
  onRunAction,
  onFilterChange,
  onShowHiddenChange,
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

  // Determine visibility state of selected features: 'all-visible' | 'all-hidden' | 'mixed'
  const selectionVisibility = useMemo(() => {
    if (!hasSelection || !hiddenIds || hiddenIds.size === 0) return 'all-visible' as const;
    let hiddenCount = 0;
    for (const id of selectedFeatureIds) {
      if (hiddenIds.has(id)) hiddenCount++;
    }
    if (hiddenCount === 0) return 'all-visible' as const;
    if (hiddenCount === selectedFeatureIds.length) return 'all-hidden' as const;
    return 'mixed' as const;
  }, [hasSelection, selectedFeatureIds, hiddenIds]);

  // Cache sorted unique kind values, regenerated when features change
  const featureKinds = useMemo(() => {
    const kinds = new Set<string>();
    for (const f of features) {
      if (f.properties.kind) kinds.add(f.properties.kind);
    }
    return Array.from(kinds).sort();
  }, [features]);

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
        <Button
          appearance="icon"
          disabled={!hasSelection}
          onClick={() => hasSelection && onDelete?.(selectedFeatureIds)}
          title={labels.delete}
          aria-label={labels.delete}
        >
          <Icon name="trash" />
        </Button>

        {/* Visibility — icon reflects state of selected features */}
        <Button
          appearance="icon"
          disabled={!hasSelection}
          onClick={() => hasSelection && onToggleVisibility?.(selectedFeatureIds)}
          title={labels.toggleVisibility}
          aria-label={labels.toggleVisibility}
        >
          {selectionVisibility === 'all-visible' ? (
            <Icon name="eye-closed" />
          ) : selectionVisibility === 'all-hidden' ? (
            <Icon name="eye" />
          ) : (
            <Icon name="eye" />
          )}
        </Button>

        {/* Run */}
        <div className="debrief-layers-toolbar__btn-wrapper">
          <Button
            appearance="icon"
            className={toolsChanged ? 'debrief-toolbar-btn--halo' : undefined}
            disabled={!hasSelection}
            onClick={() => hasSelection && toggleDropdown('run')}
            title={labels.run}
            aria-label={labels.run}
            aria-expanded={openDropdown === 'run'}
          >
            <Icon name="play" />
            <span className="debrief-layers-toolbar__arrow">▾</span>
          </Button>
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
        {/* Show/Hide hidden features toggle */}
        {onShowHiddenChange && (
          <Button
            appearance="icon"
            onClick={() => onShowHiddenChange(!showHidden)}
            title={showHidden ? labels.hideHidden : labels.showHidden}
            aria-label={showHidden ? labels.hideHidden : labels.showHidden}
            aria-pressed={!showHidden}
          >
            {showHidden ? (
              <Icon name="eye-closed" />
            ) : (
              <Icon name="eye" />
            )}
          </Button>
        )}
        {/* Filter */}
        <div className="debrief-layers-toolbar__btn-wrapper">
          <Button
            appearance="icon"
            onClick={() => toggleDropdown('filter')}
            title={labels.filter}
            aria-label={labels.filter}
            aria-expanded={openDropdown === 'filter'}
          >
            {filterActive ? (
              <Icon name="filter-filled" />
            ) : (
              <Icon name="search" />
            )}
            <span className="debrief-layers-toolbar__arrow">▾</span>
          </Button>
          {openDropdown === 'filter' && (
            <div className="debrief-layers-toolbar__dropdown debrief-layers-toolbar__dropdown--right">
              <FilterDropdown
                featureKinds={featureKinds}
                filterState={filterState}
                onFilterChange={(state) => onFilterChange?.(state)}
                onApplyToSelection={onApplyToSelection}
                hasActiveFilter={filterActive}
                allSelected={selectedFeatureIds.length > 0 && selectedFeatureIds.length >= features.length}
                labels={labelOverrides}
              />
            </div>
          )}
        </div>

        {/* Associated Files */}
        <div className="debrief-layers-toolbar__btn-wrapper">
          <Button
            appearance="icon"
            className={resultsChanged ? 'debrief-toolbar-btn--halo' : undefined}
            onClick={() => toggleDropdown('associated')}
            title={labels.associatedFiles}
            aria-label={labels.associatedFiles}
            aria-expanded={openDropdown === 'associated'}
          >
            {/* Paperclip — no Codicon equivalent, retain inline SVG */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 4.5l-5 5a2.12 2.12 0 0 0 3 3l5-5a3.54 3.54 0 0 0-5-5l-5 5a4.95 4.95 0 0 0 7 7l4.5-4.5" />
            </svg>
            <span className="debrief-layers-toolbar__arrow">▾</span>
          </Button>
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
