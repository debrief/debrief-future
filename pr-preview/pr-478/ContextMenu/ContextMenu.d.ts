import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface ContextMenuItem {
    id: string;
    label: string;
    description?: string;
}
export interface ContextMenuProps {
    /** Menu items to display */
    items: ContextMenuItem[];
    /** Position anchor point (x, y) relative to viewport */
    anchorPosition: {
        x: number;
        y: number;
    };
    /** Optional header text (e.g., parameter name) */
    header?: string;
    /** Callback when an item is selected */
    onSelect: (itemId: string) => void;
    /** Callback when menu is dismissed (Escape or click outside) */
    onDismiss: () => void;
    /** Whether to show "Custom..." item at end */
    showCustomOption?: boolean;
    /** Callback when custom value is submitted */
    onCustomValue?: (value: string) => void;
    /** Custom input validation function */
    validateCustom?: (value: string) => string | null;
}
export declare function ContextMenu({ items, anchorPosition, header, onSelect, onDismiss, showCustomOption, onCustomValue, validateCustom, }: ContextMenuProps): React.ReactElement;
//# sourceMappingURL=ContextMenu.d.ts.map