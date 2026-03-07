/**
 * Contract types for the Filter Bar Lozenge UI (#127)
 *
 * These types define the public API surface. Implementation will
 * be in shared/components/src/FilterBar/.
 *
 * Depends on: #126 filter-engine types (FilterType, FilterExpression, StacBrowserItem, VesselTaxonomyNode)
 */

import type {
  FilterType,
  FilterExpression,
  StacBrowserItem,
  VesselTaxonomyNode,
} from './filter-engine';

// --- Filter Bar Item Types ---

/** A single filter lozenge in the filter bar */
export interface LozengeItem {
  readonly kind: 'lozenge';
  readonly id: string;
  readonly filterType: FilterType;
  readonly value: string;
}

/** An OR container grouping child lozenges with OR logic */
export interface OrContainerItem {
  readonly kind: 'or-container';
  readonly id: string;
  readonly children: readonly LozengeItem[];
}

/** A top-level item in the filter bar */
export type FilterBarItem = LozengeItem | OrContainerItem;

// --- Input Methods ---

/** The input method used by a filter type's value editor */
export type InputMethod = 'hierarchical' | 'flat-dropdown' | 'free-text' | 'bucket';

/** Metadata for a filter type option in the add menu */
export interface FilterTypeOption {
  readonly type: FilterType;
  readonly label: string;
  readonly inputMethod: InputMethod;
}

// --- Component Props ---

/** Props for the FilterBar component */
export interface FilterBarProps {
  /** All STAC items (unfiltered) — used for dropdown value population */
  readonly items: readonly StacBrowserItem[];
  /** Vessel taxonomy tree for hierarchical vessel class filtering */
  readonly taxonomy: readonly VesselTaxonomyNode[];
  /** Called whenever the filtered item set changes */
  readonly onFilteredItems: (items: StacBrowserItem[]) => void;
  /** Called whenever the filter expression changes (for CQL2 serialisation) */
  readonly onExpressionChange?: (expression: FilterExpression) => void;
}

/** Props for the Lozenge component */
export interface LozengeProps {
  /** The lozenge data */
  readonly item: LozengeItem;
  /** Whether the lozenge is currently being edited */
  readonly isEditing: boolean;
  /** Called when the lozenge body is clicked (open editor) */
  readonly onEdit: (id: string) => void;
  /** Called when the remove button is clicked */
  readonly onRemove: (id: string) => void;
  /** Called when the value is changed via the editor */
  readonly onValueChange: (id: string, newValue: string) => void;
  /** Called when the editor should close */
  readonly onEditClose: () => void;
  /** Available values for dropdown editors (from data set) */
  readonly availableValues: readonly string[];
  /** Vessel taxonomy (only used for vessel-class type) */
  readonly taxonomy?: readonly VesselTaxonomyNode[];
}

/** Props for the OrContainer component */
export interface OrContainerProps {
  /** The OR container data */
  readonly item: OrContainerItem;
  /** ID of the lozenge currently being edited (if inside this container) */
  readonly editingId: string | null;
  /** Called when the mini plus (+) is clicked */
  readonly onAddChild: (containerId: string) => void;
  /** Called to remove the entire OR container */
  readonly onRemove: (containerId: string) => void;
  /** Lozenge event handlers (delegated to child lozenges) */
  readonly onEditLozenge: (id: string) => void;
  readonly onRemoveLozenge: (id: string) => void;
  readonly onValueChange: (id: string, newValue: string) => void;
  readonly onEditClose: () => void;
  /** Available values for dropdown editors */
  readonly availableValues: Readonly<Record<FilterType, readonly string[]>>;
  /** Vessel taxonomy */
  readonly taxonomy: readonly VesselTaxonomyNode[];
}

/** Props for the ValueEditor popover */
export interface ValueEditorProps {
  /** Which filter type this editor is for */
  readonly filterType: FilterType;
  /** Current value */
  readonly value: string;
  /** Called when a new value is selected */
  readonly onSelect: (value: string) => void;
  /** Called when the editor should close without changes */
  readonly onClose: () => void;
  /** Available values for dropdown types */
  readonly availableValues: readonly string[];
  /** Vessel taxonomy (for hierarchical type) */
  readonly taxonomy?: readonly VesselTaxonomyNode[];
}

// --- Distinct Values Utility ---

/** Pre-computed distinct values from the full item set */
export interface DistinctValues {
  readonly tags: readonly string[];
  readonly featureTags: readonly string[];
  readonly authors: readonly string[];
  readonly trackNames: readonly string[];
  readonly nationalities: readonly string[];
  readonly collections: readonly string[];
}

/**
 * Compute distinct values from a set of STAC items.
 * Values are sorted alphabetically. Used to populate dropdown filters.
 */
export type ComputeDistinctValues = (items: readonly StacBrowserItem[]) => DistinctValues;
