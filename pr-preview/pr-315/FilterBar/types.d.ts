import { FilterType, FilterExpression, StacBrowserItem, VesselTaxonomyNode } from '../filter-engine';

/** Input method used by a filter type's value editor */
export type InputMethod = 'hierarchical' | 'flat-dropdown' | 'free-text' | 'bucket';
/** Metadata for a filter type option in the add menu */
export interface FilterTypeOption {
    readonly type: FilterType;
    readonly label: string;
    readonly inputMethod: InputMethod;
}
/** A single filter lozenge */
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
/** The complete filter bar state */
export interface FilterBarState {
    readonly items: readonly FilterBarItem[];
}
/** Actions for the filter bar reducer */
export type FilterBarAction = {
    type: 'ADD_LOZENGE';
    filterType: FilterType;
    value: string;
} | {
    type: 'REMOVE_LOZENGE';
    id: string;
} | {
    type: 'EDIT_LOZENGE';
    id: string;
    value: string;
} | {
    type: 'ADD_OR_CONTAINER';
} | {
    type: 'REMOVE_OR_CONTAINER';
    id: string;
} | {
    type: 'ADD_CHILD_LOZENGE';
    containerId: string;
    filterType: FilterType;
    value: string;
} | {
    type: 'MOVE_TO_CONTAINER';
    lozengeId: string;
    containerId: string;
} | {
    type: 'MOVE_TO_TOP_LEVEL';
    lozengeId: string;
    fromContainerId: string;
};
/** Props for the FilterBar component */
export interface FilterBarProps {
    readonly items: readonly StacBrowserItem[];
    readonly taxonomy: readonly VesselTaxonomyNode[];
    readonly onFilteredItems: (items: StacBrowserItem[]) => void;
    readonly onExpressionChange?: (expression: FilterExpression) => void;
}
//# sourceMappingURL=types.d.ts.map