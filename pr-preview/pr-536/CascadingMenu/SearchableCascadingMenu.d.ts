import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { CascadingMenuProps } from './CascadingMenu';

export interface SearchableCascadingMenuProps extends CascadingMenuProps {
    readonly searchable?: boolean;
    readonly searchPlaceholder?: string;
    readonly onSearchChange?: (query: string) => void;
}
export declare const SearchableCascadingMenu: React.FC<SearchableCascadingMenuProps>;
//# sourceMappingURL=SearchableCascadingMenu.d.ts.map