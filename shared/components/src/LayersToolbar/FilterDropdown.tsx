import { useState, useCallback, useEffect, useRef } from 'react';
import type { FilterDropdownProps } from './types';
import { DEFAULT_FILTER_STATE, DEFAULT_LABELS } from './types';
import './FilterDropdown.css';

/**
 * FilterDropdown provides text search, feature type checkboxes,
 * visibility filters, temporal range, and apply-to-selection actions.
 *
 * Controlled component: parent owns FilterState, this component
 * fires onFilterChange on every interaction.
 */
export function FilterDropdown({
  filterState,
  onFilterChange,
  onApplyToSelection,
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

  const updateFeatureType = (key: keyof typeof filterState.featureTypes, value: boolean) => {
    onFilterChange({
      ...filterState,
      featureTypes: { ...filterState.featureTypes, [key]: value },
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

      {/* Feature Types */}
      <div className="debrief-filter-dropdown__section">
        <div className="debrief-filter-dropdown__section-title">
          {labels.featureTypeTracks}
        </div>
        <div className="debrief-filter-dropdown__checkbox-grid">
          {(
            [
              ['tracks', labels.featureTypeTracks],
              ['contacts', labels.featureTypeContacts],
              ['zones', labels.featureTypeZones],
              ['annotations', labels.featureTypeAnnotations],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="debrief-filter-dropdown__checkbox-label">
              <input
                type="checkbox"
                checked={filterState.featureTypes[key]}
                onChange={(e) => updateFeatureType(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

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

      <div className="debrief-filter-dropdown__divider" />

      {/* Apply to Selection */}
      {onApplyToSelection && (
        <div className="debrief-filter-dropdown__section">
          <button
            className="debrief-filter-dropdown__action-btn"
            onClick={() => onApplyToSelection('select')}
          >
            {labels.applySelectMatched}
          </button>
          <button
            className="debrief-filter-dropdown__action-btn"
            onClick={() => onApplyToSelection('add')}
          >
            {labels.applyAddMatched}
          </button>
          <button
            className="debrief-filter-dropdown__action-btn"
            onClick={() => onApplyToSelection('remove')}
          >
            {labels.applyRemoveMatched}
          </button>
        </div>
      )}

      <div className="debrief-filter-dropdown__divider" />

      {/* Clear All */}
      <div className="debrief-filter-dropdown__section">
        <button
          className="debrief-filter-dropdown__clear-btn"
          onClick={clearAll}
        >
          {labels.clearAllFilters}
        </button>
      </div>
    </div>
  );
}
