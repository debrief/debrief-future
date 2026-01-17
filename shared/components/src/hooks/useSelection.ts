import { useState, useCallback, useMemo } from 'react';

/**
 * Options for the useSelection hook
 */
export interface UseSelectionOptions {
  /** Initial selected IDs */
  initialSelection?: string[] | Set<string>;

  /** Maximum number of items that can be selected (undefined = unlimited) */
  maxSelection?: number;

  /** Callback when selection changes */
  onChange?: (selectedIds: Set<string>) => void;
}

/**
 * Return type for the useSelection hook
 */
export interface UseSelectionReturn {
  /** Set of currently selected IDs */
  selectedIds: Set<string>;

  /** Check if an ID is selected */
  isSelected: (id: string) => boolean;

  /** Select a single ID (replaces current selection) */
  select: (id: string) => void;

  /** Toggle selection of an ID */
  toggle: (id: string) => void;

  /** Add an ID to the current selection */
  add: (id: string) => void;

  /** Remove an ID from the current selection */
  remove: (id: string) => void;

  /** Select multiple IDs (replaces current selection) */
  selectMultiple: (ids: string[]) => void;

  /** Toggle multiple IDs */
  toggleMultiple: (ids: string[]) => void;

  /** Clear all selections */
  clear: () => void;

  /** Select all from a list of IDs */
  selectAll: (ids: string[]) => void;

  /** Number of currently selected items */
  count: number;

  /** Whether any items are selected */
  hasSelection: boolean;
}

/**
 * Hook for managing feature selection state.
 * Provides methods for single and multi-select operations
 * that can be shared across MapView, Timeline, and FeatureList components.
 *
 * @param options - Configuration options
 * @returns Selection state and methods
 *
 * @example
 * ```tsx
 * function PlotView({ features }) {
 *   const selection = useSelection({
 *     onChange: (ids) => console.log('Selected:', ids),
 *   });
 *
 *   return (
 *     <>
 *       <MapView
 *         features={features}
 *         selectedIds={selection.selectedIds}
 *         onSelect={(id) => selection.toggle(id)}
 *       />
 *       <FeatureList
 *         features={features}
 *         selectedIds={selection.selectedIds}
 *         onSelect={(id) => selection.toggle(id)}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useSelection(options: UseSelectionOptions = {}): UseSelectionReturn {
  const { initialSelection, maxSelection, onChange } = options;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (!initialSelection) return new Set();
    return initialSelection instanceof Set
      ? new Set(initialSelection)
      : new Set(initialSelection);
  });

  const updateSelection = useCallback(
    (newSelection: Set<string>) => {
      setSelectedIds(newSelection);
      onChange?.(newSelection);
    },
    [onChange]
  );

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const select = useCallback(
    (id: string) => {
      updateSelection(new Set([id]));
    },
    [updateSelection]
  );

  const toggle = useCallback(
    (id: string) => {
      const newSelection = new Set(selectedIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        if (maxSelection !== undefined && newSelection.size >= maxSelection) {
          // At max selection, replace oldest (first) item
          const first = newSelection.values().next().value;
          if (first) newSelection.delete(first);
        }
        newSelection.add(id);
      }
      updateSelection(newSelection);
    },
    [selectedIds, maxSelection, updateSelection]
  );

  const add = useCallback(
    (id: string) => {
      if (selectedIds.has(id)) return;
      if (maxSelection !== undefined && selectedIds.size >= maxSelection) return;

      const newSelection = new Set(selectedIds);
      newSelection.add(id);
      updateSelection(newSelection);
    },
    [selectedIds, maxSelection, updateSelection]
  );

  const remove = useCallback(
    (id: string) => {
      if (!selectedIds.has(id)) return;

      const newSelection = new Set(selectedIds);
      newSelection.delete(id);
      updateSelection(newSelection);
    },
    [selectedIds, updateSelection]
  );

  const selectMultiple = useCallback(
    (ids: string[]) => {
      const limitedIds = maxSelection ? ids.slice(0, maxSelection) : ids;
      updateSelection(new Set(limitedIds));
    },
    [maxSelection, updateSelection]
  );

  const toggleMultiple = useCallback(
    (ids: string[]) => {
      const newSelection = new Set(selectedIds);
      for (const id of ids) {
        if (newSelection.has(id)) {
          newSelection.delete(id);
        } else if (maxSelection === undefined || newSelection.size < maxSelection) {
          newSelection.add(id);
        }
      }
      updateSelection(newSelection);
    },
    [selectedIds, maxSelection, updateSelection]
  );

  const clear = useCallback(() => {
    updateSelection(new Set());
  }, [updateSelection]);

  const selectAll = useCallback(
    (ids: string[]) => {
      const limitedIds = maxSelection ? ids.slice(0, maxSelection) : ids;
      updateSelection(new Set(limitedIds));
    },
    [maxSelection, updateSelection]
  );

  const count = selectedIds.size;
  const hasSelection = count > 0;

  return useMemo(
    () => ({
      selectedIds,
      isSelected,
      select,
      toggle,
      add,
      remove,
      selectMultiple,
      toggleMultiple,
      clear,
      selectAll,
      count,
      hasSelection,
    }),
    [
      selectedIds,
      isSelected,
      select,
      toggle,
      add,
      remove,
      selectMultiple,
      toggleMultiple,
      clear,
      selectAll,
      count,
      hasSelection,
    ]
  );
}
