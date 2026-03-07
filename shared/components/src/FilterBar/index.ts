/**
 * FilterBar — persistent filter bar with lozenge UI and AND/OR logic (#127).
 *
 * @module FilterBar
 */

export { FilterBar } from './FilterBar';
export { useFilterBar } from './useFilterBar';
export { useDistinctValues } from './useDistinctValues';
export { taxonomyToCascadingItems } from './taxonomyAdapter';
export type {
  FilterBarState,
  FilterBarItem,
  LozengeItem,
  OrContainerItem,
  FilterTypeOption,
  InputMethod,
} from './types';
