import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Checkbox, Dropdown, Icon, TextField } from 'vscrui';
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

  const visibilityOptions = [
    { label: labels.visibilityAll, value: 'all' },
    { label: labels.visibilityHiddenOnly, value: 'hidden-only' },
    { label: labels.visibilityVisibleOnly, value: 'visible-only' },
  ];

  return (
    <div className="debrief-filter-dropdown">
      {/* Header row: selection actions (left) + clear filters eraser (right) */}
      <div className="debrief-filter-dropdown__action-row">
        {onApplyToSelection && (
          <>
            <Button
              appearance="icon"
              onClick={() => onApplyToSelection('selectAll')}
              disabled={allSelected}
              title={labels.applySelectAll}
              aria-label={labels.applySelectAll}
            >
              <Icon name="check-all" />
            </Button>
            <Button
              appearance="icon"
              onClick={() => onApplyToSelection('select')}
              disabled={!hasActiveFilter}
              title={labels.applySelectMatched}
              aria-label={labels.applySelectMatched}
            >
              <Icon name="check" />
            </Button>
            <Button
              appearance="icon"
              onClick={() => onApplyToSelection('add')}
              disabled={!hasActiveFilter}
              title={labels.applyAddMatched}
              aria-label={labels.applyAddMatched}
            >
              <Icon name="add" />
            </Button>
            <Button
              appearance="icon"
              onClick={() => onApplyToSelection('remove')}
              disabled={!hasActiveFilter}
              title={labels.applyRemoveMatched}
              aria-label={labels.applyRemoveMatched}
            >
              <Icon name="remove" />
            </Button>
          </>
        )}
        <div className="debrief-filter-dropdown__action-spacer" />
        <Button
          appearance="icon"
          onClick={clearAll}
          disabled={!hasActiveFilter}
          title={labels.clearAllFilters}
          aria-label={labels.clearAllFilters}
        >
          {/* Eraser — no Codicon equivalent, retain inline SVG */}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14h8M7.5 14l5.3-5.3a2 2 0 0 0 0-2.8L10.1 3.1a2 2 0 0 0-2.8 0L2.6 7.8a2 2 0 0 0 0 2.8L5 13.1" />
          </svg>
        </Button>
      </div>
      <div className="debrief-filter-dropdown__divider" />

      {/* Text Search */}
      <div className="debrief-filter-dropdown__section">
        <TextField
          placeholder={labels.searchPlaceholder}
          value={localQuery}
          onChange={handleTextChange}
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
            <Checkbox
              key={key}
              label={label}
              checked={filterState.searchScope[key]}
              onChange={(checked: boolean) => updateScope(key, checked)}
            />
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
              <Checkbox
                key={kind}
                label={kind}
                checked={filterState.featureTypes[kind] ?? true}
                onChange={(checked: boolean) => updateFeatureType(kind, checked)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="debrief-filter-dropdown__divider" />

      {/* Visibility */}
      <div className="debrief-filter-dropdown__section">
        <Dropdown
          options={visibilityOptions}
          value={filterState.visibility}
          onChange={(value: string) => updateVisibility(value as typeof filterState.visibility)}
        />
      </div>

      <div className="debrief-filter-dropdown__divider" />

      {/* Temporal — native datetime-local retained (vscrui TextField doesn't support type pass-through) */}
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
              <Button
                appearance="icon"
                onClick={() => updateTemporal('after', null)}
                aria-label="Clear after filter"
              >
                ×
              </Button>
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
              <Button
                appearance="icon"
                onClick={() => updateTemporal('before', null)}
                aria-label="Clear before filter"
              >
                ×
              </Button>
            )}
          </div>
        </label>
      </div>

    </div>
  );
}
