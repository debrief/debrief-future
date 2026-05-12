import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface QuickSearchProps {
    /** Called on every debounced keystroke with the current search text (empty string = cleared). */
    readonly onSearchChange: (text: string) => void;
    /** Called when user commits the search (Enter). Parent should create a title lozenge. */
    readonly onCommit: (text: string) => void;
    /** Placeholder text */
    readonly placeholder?: string;
}
export declare const QuickSearch: React.FC<QuickSearchProps>;
//# sourceMappingURL=QuickSearch.d.ts.map