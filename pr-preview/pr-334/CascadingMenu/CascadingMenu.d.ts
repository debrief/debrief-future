import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface CascadingMenuItem {
    readonly id: string;
    readonly label: string;
    readonly icon?: string;
    readonly swatch?: string;
    readonly disabled?: boolean;
    readonly disabledReason?: string;
    readonly submenu?: readonly CascadingMenuItem[];
    readonly current?: boolean;
    readonly badge?: string;
}
export interface CascadingMenuProps {
    readonly items: readonly CascadingMenuItem[];
    readonly anchorPosition: {
        x: number;
        y: number;
    };
    readonly header?: string;
    /** When true, branch nodes (items with submenu) are clickable/selectable too */
    readonly selectableBranches?: boolean;
    readonly onSelect: (itemId: string) => void;
    readonly onDismiss: () => void;
    /** Optional React node rendered between header and items (used for search input) */
    readonly beforeItems?: React.ReactNode;
    /** Optional React node rendered after items (used for no-matches message) */
    readonly afterItems?: React.ReactNode;
}
export declare const CascadingMenu: React.FC<CascadingMenuProps>;
//# sourceMappingURL=CascadingMenu.d.ts.map