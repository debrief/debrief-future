import { FilterBarState, SavedFilterConfiguration, SavedFiltersStorage } from './types';

/** Generate a default name from active filter values */
declare function generateDefaultName(filterBarState: FilterBarState): string;
export interface UseSavedFiltersResult {
    readonly configurations: readonly SavedFilterConfiguration[];
    readonly saveConfiguration: (filterBarState: FilterBarState, cql2Json: Record<string, unknown>, name?: string) => void;
    readonly deleteConfiguration: (id: string) => void;
    readonly nameExists: (name: string) => boolean;
    readonly overwriteConfiguration: (id: string, filterBarState: FilterBarState, cql2Json: Record<string, unknown>) => void;
}
export declare function useSavedFilters(storage: SavedFiltersStorage): UseSavedFiltersResult;
export { generateDefaultName };
//# sourceMappingURL=useSavedFilters.d.ts.map