/**
 * LogFilterRow component — collapsible filter controls.
 *
 * Provides text search, tool type dropdown, and operation category dropdown.
 * Filters combine with AND logic.
 *
 * Feature: 072-log-panel (US4)
 */

import React from 'react';
import type { LogFilterRowProps, OperationCategory } from './types';
import { LOG_PANEL_STRINGS } from './strings';

const CATEGORY_OPTIONS: Array<{ value: OperationCategory; label: string }> = [
  { value: 'calculation', label: LOG_PANEL_STRINGS.categoryCalculation },
  { value: 'import', label: LOG_PANEL_STRINGS.categoryImport },
  { value: 'property-edit', label: LOG_PANEL_STRINGS.categoryPropertyEdit },
  { value: 'export', label: LOG_PANEL_STRINGS.categoryExport },
];

export function LogFilterRow({
  filterState,
  availableToolTypes,
  onFilterChange,
  className,
}: LogFilterRowProps): React.ReactElement {
  const toggleExpanded = () => {
    onFilterChange({ ...filterState, isExpanded: !filterState.isExpanded });
  };

  return (
    <div className={`log-panel__filter-row ${className ?? ''}`} data-testid="log-filter-row">
      <button
        className="log-panel__filter-toggle"
        onClick={toggleExpanded}
        data-testid="log-filter-toggle"
        aria-expanded={filterState.isExpanded}
      >
        {filterState.isExpanded
          ? `▾ ${LOG_PANEL_STRINGS.filterCollapse}`
          : `▸ ${LOG_PANEL_STRINGS.filterExpand}`}
      </button>

      {filterState.isExpanded && (
        <div className="log-panel__filter-controls">
          {/* Text search */}
          <input
            type="text"
            className="log-panel__filter-input"
            placeholder={LOG_PANEL_STRINGS.filterSearch}
            value={filterState.searchText}
            onChange={(e) =>
              onFilterChange({ ...filterState, searchText: e.target.value })
            }
            data-testid="log-filter-search"
          />

          {/* Tool type dropdown */}
          <select
            className="log-panel__filter-select"
            value={filterState.toolType ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filterState,
                toolType: e.target.value || null,
              })
            }
            data-testid="log-filter-tool-type"
          >
            <option value="">{LOG_PANEL_STRINGS.filterToolType}</option>
            {availableToolTypes.map((tool) => (
              <option key={tool} value={tool}>
                {tool}
              </option>
            ))}
          </select>

          {/* Operation category dropdown */}
          <select
            className="log-panel__filter-select"
            value={filterState.operationCategory ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filterState,
                operationCategory: (e.target.value as OperationCategory) || null,
              })
            }
            data-testid="log-filter-category"
          >
            <option value="">{LOG_PANEL_STRINGS.filterCategory}</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
