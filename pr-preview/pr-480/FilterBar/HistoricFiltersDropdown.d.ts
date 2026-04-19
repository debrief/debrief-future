import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { SavedFilterConfiguration } from './types';

export interface HistoricFiltersDropdownProps {
    readonly configurations: readonly SavedFilterConfiguration[];
    readonly onRestore: (config: SavedFilterConfiguration) => void;
    readonly onDelete: (id: string) => void;
}
export declare const HistoricFiltersDropdown: React.FC<HistoricFiltersDropdownProps>;
//# sourceMappingURL=HistoricFiltersDropdown.d.ts.map