import { FilterDropdownProps } from './types';

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
export declare function FilterDropdown({ featureKinds, filterState, onFilterChange, onApplyToSelection, hasActiveFilter, allSelected, labels: labelOverrides, }: FilterDropdownProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FilterDropdown.d.ts.map