import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { FilterBarState, SavedFilterConfiguration } from './types';

export interface SaveFilterButtonProps {
    readonly currentFilterBarState: FilterBarState;
    readonly currentCql2Json: Record<string, unknown>;
    readonly hasActiveFilters: boolean;
    readonly nameExists: (name: string) => boolean;
    readonly onSave: (filterBarState: FilterBarState, cql2Json: Record<string, unknown>, name?: string) => void;
    readonly onOverwrite?: (name: string) => SavedFilterConfiguration | undefined;
    readonly onSaved?: (config: SavedFilterConfiguration) => void;
}
export declare const SaveFilterButton: React.FC<SaveFilterButtonProps>;
//# sourceMappingURL=SaveFilterButton.d.ts.map