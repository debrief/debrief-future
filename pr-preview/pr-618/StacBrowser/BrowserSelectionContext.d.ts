import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface BrowserSelection {
    selectedItemPath: string | null;
    setSelectedItemPath: (path: string | null) => void;
}
export declare const BrowserSelectionContext: React.Context<BrowserSelection | null>;
export interface BrowserSelectionProviderProps {
    children: React.ReactNode;
    initialSelectedItemPath?: string | null;
    /** Optional controlled-component hook — when set, Provider forwards instead of owning state. */
    value?: BrowserSelection;
}
export declare function BrowserSelectionProvider({ children, initialSelectedItemPath, value, }: BrowserSelectionProviderProps): React.ReactElement;
export declare function useBrowserSelection(): BrowserSelection;
//# sourceMappingURL=BrowserSelectionContext.d.ts.map