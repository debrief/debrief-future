import type { CascadingMenuItem } from '../CascadingMenu/CascadingMenu';
import {
  COLOUR_PALETTE,
  LINE_WEIGHT_PRESETS,
  OPACITY_PRESETS,
  RADIUS_PRESETS,
  DASH_PATTERN_PRESETS,
  SHAPE_PRESETS,
} from './presetPalette';

export interface StylePropertyDescriptor {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly valueType: 'color' | 'number' | 'shape' | 'dashPattern';
}

/**
 * Map a valueType to the appropriate preset list.
 */
function getPresetsForValueType(valueType: string, propertyId: string): CascadingMenuItem[] {
  // For number types, further distinguish by property name
  switch (valueType) {
    case 'color':
      return COLOUR_PALETTE.map(p => ({
        id: `${propertyId}::${p.id}`,
        label: p.label,
        swatch: p.swatch,
      }));
    case 'shape':
      return SHAPE_PRESETS.map(p => ({
        id: `${propertyId}::${p.id}`,
        label: p.label,
      }));
    case 'dashPattern':
      return DASH_PATTERN_PRESETS.map(p => ({
        id: `${propertyId}::${p.id}`,
        label: p.label,
      }));
    case 'number': {
      // Distinguish weight, opacity, radius by property ID
      const presets = getNumericPresets(propertyId);
      return presets.map(p => ({
        id: `${propertyId}::${p.id}`,
        label: p.label,
      }));
    }
    default:
      return [];
  }
}

function getNumericPresets(propertyId: string) {
  if (propertyId.includes('weight')) return LINE_WEIGHT_PRESETS;
  if (propertyId.includes('opacity')) return OPACITY_PRESETS;
  if (propertyId.includes('radius')) return RADIUS_PRESETS;
  return LINE_WEIGHT_PRESETS; // fallback
}

/**
 * Convert I18N key like "format.line.color" to display label "Line Colour".
 */
function formatLabel(i18nKey: string): string {
  // Remove "format." prefix if present
  const key = i18nKey.startsWith('format.') ? i18nKey.slice(7) : i18nKey;

  // Split by dots and capitalize each word
  const words = key.split('.');
  return words
    .map(word => {
      // Special case: "color" -> "Colour" (British spelling)
      if (word === 'color') return 'Colour';
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Build cascading menu items from style property descriptors.
 */
export function buildFormatMenuItems(
  properties: readonly StylePropertyDescriptor[],
  currentValues?: Record<string, unknown>,
  disabledProperties?: Map<string, string>,  // propertyId -> disabled reason
): readonly CascadingMenuItem[] {
  return properties.map(property => {
    let submenu = getPresetsForValueType(property.valueType, property.id);

    // Mark current preset if currentValues provided
    if (currentValues && property.id in currentValues) {
      const currentValue = currentValues[property.id];
      submenu = submenu.map(item => {
        const parsed = parseMenuItemId(item.id);
        if (parsed) {
          const presetValue = resolvePresetValue(parsed.presetId, property.valueType);
          if (presetValue === currentValue) {
            return { ...item, current: true };
          }
        }
        return item;
      });
    }

    // Check if property is disabled
    const disabledReason = disabledProperties?.get(property.id);

    return {
      id: property.id,
      label: formatLabel(property.label),
      submenu,
      disabled: disabledReason !== undefined,
      disabledReason,
    };
  });
}

/**
 * Parse menu item ID like "line.color::red" into components.
 */
export function parseMenuItemId(itemId: string): { property: string; presetId: string } | null {
  const separatorIndex = itemId.indexOf('::');
  if (separatorIndex < 0) return null;
  return {
    property: itemId.slice(0, separatorIndex),
    presetId: itemId.slice(separatorIndex + 2),
  };
}

/**
 * Resolve a preset ID to its actual value.
 */
export function resolvePresetValue(presetId: string, valueType: string): string | number | undefined {
  switch (valueType) {
    case 'color': {
      const preset = COLOUR_PALETTE.find(p => p.id === presetId);
      return preset?.value;
    }
    case 'shape': {
      const preset = SHAPE_PRESETS.find(p => p.id === presetId);
      return preset?.value;
    }
    case 'dashPattern': {
      const preset = DASH_PATTERN_PRESETS.find(p => p.id === presetId);
      return preset?.value;
    }
    case 'number': {
      // Try all numeric preset lists
      const allNumericPresets = [
        ...LINE_WEIGHT_PRESETS,
        ...OPACITY_PRESETS,
        ...RADIUS_PRESETS,
      ];
      const preset = allNumericPresets.find(p => p.id === presetId);
      return preset?.value;
    }
    default:
      return undefined;
  }
}
