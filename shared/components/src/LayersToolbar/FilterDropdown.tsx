import { useState, useCallback, useEffect, useRef } from 'react';
import type { FilterDropdownProps } from './types';
import { DEFAULT_FILTER_STATE, DEFAULT_LABELS } from './types';
import './FilterDropdown.css';

/**
 * FilterDropdown provides text search, feature type checkboxes,
 * visibility filters, temporal range, and apply-to-selection actions.
 *
 * Selection action buttons appear as a row of small icon buttons at
 * the top of the panel. "Select all" is always enabled unless all
 * items are already selected. The filter-dependent actions (Select
 * matched, Add matched, Remove matched) are only enabled when a
 * filter is active.
 *
 * Controlled component: parent owns FilterState, this component
 * fires onFilterChange on every interaction.
 */
export function FilterDropdown({
  featureKinds,
  filterState,
  onFilterChange,
  onApplyToSelection,
  hasActiveFilter = false,
  allSelected = false,
  labels: labelOverrides,
}: FilterDropdownProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [localQuery, setLocalQuery] = useState(filterState.textQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local query when parent resets
  useEffect(() => {
    setLocalQuery(filterState.textQuery);
  }, [filterState.textQuery]);

  const handleTextChange = useCallback(
    (value: string) => {
      setLocalQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onFilterChange({ ...filterState, textQuery: value });
      }, 150);
    },
    [filterState, onFilterChange],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateScope = (key: keyof typeof filterState.searchScope, value: boolean) => {
    onFilterChange({
      ...filterState,
      searchScope: { ...filterState.searchScope, [key]: value },
    });
  };

  const updateFeatureType = (kind: string, value: boolean) => {
    onFilterChange({
      ...filterState,
      featureTypes: { ...filterState.featureTypes, [kind]: value },
    });
  };

  const updateVisibility = (value: typeof filterState.visibility) => {
    onFilterChange({ ...filterState, visibility: value });
  };

  const updateTemporal = (key: 'before' | 'after', value: string | null) => {
    onFilterChange({
      ...filterState,
      temporal: { ...filterState.temporal, [key]: value },
    });
  };

  const clearAll = () => {
    setLocalQuery('');
    onFilterChange(DEFAULT_FILTER_STATE);
  };

  return (
    <div className="debrief-filter-dropdown">
      {/* Header row: selection actions (left) + clear filters eraser (right) */}
      <div className="debrief-filter-dropdown__action-row">
        {onApplyToSelection && (
          <>
            <button
              className="debrief-filter-dropdown__action-icon-btn"
              onClick={() => onApplyToSelection('selectAll')}
              disabled={allSelected}
              title={labels.applySelectAll}
              aria-label={labels.applySelectAll}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 9 5 13 15 3" />
                <polyline points="1 4 5 8" />
              </svg>
            </button>
            <button
              className="debrief-filter-dropdown__action-icon-btn"
              onClick={() => onApplyToSelection('select')}
              disabled={!hasActiveFilter}
              title={labels.applySelectMatched}
              aria-label={labels.applySelectMatched}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 8 6 12 14 4" />
              </svg>
            </button>
            <button
              className="debrief-filter-dropdown__action-icon-btn"
              onClick={() => onApplyToSelection('add')}
              disabled={!hasActiveFilter}
              title={labels.applyAddMatched}
              aria-label={labels.applyAddMatched}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </button>
            <button
              className="debrief-filter-dropdown__action-icon-btn"
              onClick={() => onApplyToSelection('remove')}
              disabled={!hasActiveFilter}
              title={labels.applyRemoveMatched}
              aria-label={labels.applyRemoveMatched}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </button>
          </>
        )}
        <div className="debrief-filter-dropdown__action-spacer" />
        <button
          className="debrief-filter-dropdown__action-icon-btn"
          onClick={clearAll}
          disabled={!hasActiveFilter}
          title={labels.clearAllFilters}
          aria-label={labels.clearAllFilters}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14h8M7.5 14l5.3-5.3a2 2 0 0 0 0-2.8L10.1 3.1a2 2 0 0 0-2.8 0L2.6 7.8a2 2 0 0 0 0 2.8L5 13.1" />
          </svg>
        </button>
      </div>
      <div className="debrief-filter-dropdown__divider" />

      {/* Text Search */}
      <div className="debrief-filter-dropdown__section">
        <input
          type="text"
          className="debrief-filter-dropdown__search-input"
          placeholder={labels.searchPlaceholder}
          value={localQuery}
          onChange={(e) => handleTextChange(e.target.value)}
        />
        <div className="debrief-filter-dropdown__scope-row">
          {(
            [
              ['name', labels.searchScopeName],
              ['type', labels.searchScopeType],
              ['platform', labels.searchScopePlatform],
              ['attachments', labels.searchScopeAttachments],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="debrief-filter-dropdown__checkbox-label">
              <input
                type="checkbox"
                checked={filterState.searchScope[key]}
                onChange={(e) => updateScope(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="debrief-filter-dropdown__divider" />

      {/* Feature Types (built from feature kinds) */}
      {featureKinds.length > 0 && (
        <div className="debrief-filter-dropdown__section">
          <div className="debrief-filter-dropdown__section-title">
            {labels.featureTypesTitle}
          </div>
          <div className="debrief-filter-dropdown__checkbox-grid">
            {featureKinds.map((kind) => (
              <label key={kind} className="debrief-filter-dropdown__checkbox-label">
                <input
                  type="checkbox"
                  checked={filterState.featureTypes[kind] ?? true}
                  onChange={(e) => updateFeatureType(kind, e.target.checked)}
                />
                {kind}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="debrief-filter-dropdown__divider" />

      {/* Visibility */}
      <div className="debrief-filter-dropdown__section">
        {(
          [
            ['all', labels.visibilityAll],
            ['hidden-only', labels.visibilityHiddenOnly],
            ['visible-only', labels.visibilityVisibleOnly],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="debrief-filter-dropdown__radio-label">
            <input
              type="radio"
              name="debrief-filter-visibility"
              checked={filterState.visibility === value}
              onChange={() => updateVisibility(value)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="debrief-filter-dropdown__divider" />

      {/* Temporal */}
      <div className="debrief-filter-dropdown__section">
        <label className="debrief-filter-dropdown__temporal-label">
          {labels.temporalAfter}
          <div className="debrief-filter-dropdown__temporal-row">
            <input
              type="datetime-local"
              className="debrief-filter-dropdown__temporal-input"
              value={filterState.temporal.after ?? ''}
              onChange={(e) => updateTemporal('after', e.target.value || null)}
            />
            {filterState.temporal.after && (
              <button
                className="debrief-filter-dropdown__temporal-clear"
                onClick={() => updateTemporal('after', null)}
                aria-label="Clear after filter"
              >
                ×
              </button>
            )}
          </div>
        </label>
        <label className="debrief-filter-dropdown__temporal-label">
          {labels.temporalBefore}
          <div className="debrief-filter-dropdown__temporal-row">
            <input
              type="datetime-local"
              className="debrief-filter-dropdown__temporal-input"
              value={filterState.temporal.before ?? ''}
              onChange={(e) => updateTemporal('before', e.target.value || null)}
            />
            {filterState.temporal.before && (
              <button
                className="debrief-filter-dropdown__temporal-clear"
                onClick={() => updateTemporal('before', null)}
                aria-label="Clear before filter"
              >
                ×
              </button>
            )}
          </div>
        </label>
      </div>

    </div>
  );
}
