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
export declare function useSelection(options?: UseSelectionOptions): UseSelectionReturn;
//# sourceMappingURL=useSelection.d.ts.map