import { ContextMenuItem } from '../ContextMenu';

/**
 * Resolve a parameter type name to context menu items.
 * Returns the enum values as menu items, or null if the type is unknown.
 */
export declare function resolveParamType(paramType: string): ContextMenuItem[] | null;
/**
 * Check if a parameter type is a preset type (needs Custom... option).
 * Duration and Numeric types show presets plus a Custom entry.
 */
export declare function isPresetType(paramType: string): boolean;
/**
 * Get the actual numeric value from a NumericPreset enum value.
 */
export declare function getNumericValue(presetValue: string): number | null;
//# sourceMappingURL=paramTypeResolver.d.ts.map