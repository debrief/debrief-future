import { CascadingMenuItem } from '../CascadingMenu/CascadingMenu';

export interface StylePropertyDescriptor {
    readonly id: string;
    readonly label: string;
    readonly category: string;
    readonly valueType: 'color' | 'number' | 'shape' | 'dashPattern' | 'boolean';
}
/**
 * Build cascading menu items from style property descriptors.
 */
export declare function buildFormatMenuItems(properties: readonly StylePropertyDescriptor[], currentValues?: Record<string, unknown>, disabledProperties?: Map<string, string>): readonly CascadingMenuItem[];
/**
 * Parse menu item ID like "line.color::red" into components.
 */
export declare function parseMenuItemId(itemId: string): {
    property: string;
    presetId: string;
} | null;
/**
 * Resolve a preset ID to its actual value.
 */
export declare function resolvePresetValue(presetId: string, valueType: string): string | number | undefined;
//# sourceMappingURL=formatMenuItems.d.ts.map