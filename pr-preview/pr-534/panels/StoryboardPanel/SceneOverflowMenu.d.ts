import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export type SceneOverflowAction = 'edit-description' | 'update-to-current' | 'duplicate' | 'copy-to-other' | 'delete' | 'refresh-thumbnail';
export interface SceneOverflowMenuItem {
    readonly id: SceneOverflowAction;
    readonly label: string;
    readonly disabled?: boolean;
}
export interface SceneOverflowMenuProps {
    /** Scene row the menu was opened against. */
    readonly sceneId: string;
    /** Anchor rect of the row trigger — popover placed below-right. */
    readonly anchorRect: DOMRect;
    /** Menu items in display order. */
    readonly items: readonly SceneOverflowMenuItem[];
    /** Accessible label for the menu (mentions the Scene title). */
    readonly ariaLabel: string;
    /** Fires when a menu item is activated. */
    onAction(action: SceneOverflowAction, sceneId: string): void;
    /** Fires when the menu should close (Escape / click outside / tab). */
    onClose(): void;
}
export declare function SceneOverflowMenu({ sceneId, anchorRect, items, ariaLabel, onAction, onClose, }: SceneOverflowMenuProps): React.ReactElement;
//# sourceMappingURL=SceneOverflowMenu.d.ts.map