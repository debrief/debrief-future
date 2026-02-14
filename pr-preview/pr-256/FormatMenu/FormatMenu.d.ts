import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { StylePropertyDescriptor } from './formatMenuItems';

export interface FormatMenuProps {
    readonly featureIds: readonly string[];
    readonly featureKinds: readonly string[];
    /** Style property descriptors. If omitted, resolved automatically from featureKinds. */
    readonly properties?: readonly StylePropertyDescriptor[];
    readonly currentValues?: Record<string, unknown>;
    readonly disabledProperties?: Map<string, string>;
    readonly anchorPosition: {
        x: number;
        y: number;
    };
    readonly onFormatChange: (featureIds: readonly string[], property: string, value: string | number) => void;
    readonly onDismiss: () => void;
}
/**
 * FormatMenu — context menu for applying style presets to selected features.
 *
 * Thin wrapper around CascadingMenu that:
 * 1. Builds menu items from style property descriptors
 * 2. Resolves preset selections to actual values
 * 3. Calls onFormatChange with the resolved property and value
 */
export declare function FormatMenu(props: FormatMenuProps): React.ReactElement;
//# sourceMappingURL=FormatMenu.d.ts.map