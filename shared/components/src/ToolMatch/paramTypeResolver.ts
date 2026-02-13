/**
 * Resolves parameter type names to their enum values.
 *
 * Maps schema-defined parameter type names (from x-debrief-param-type)
 * to the actual enum values from generated TypeScript types.
 *
 * Feature: 091-tool-parameter-context-menus
 */

import {
  NamedColorEnum,
  MarkerSymbolEnum,
  CardinalDirectionEnum,
  DurationPresetEnum,
  NumericPresetEnum,
} from '@debrief/schemas';

import type { ContextMenuItem } from '../ContextMenu';

/**
 * Maps a NumericPreset enum value to its display label.
 */
const NUMERIC_DISPLAY_MAP: Record<string, string> = {
  n_1: '1',
  n_2: '2',
  n_5: '5',
  n_10: '10',
  n_25: '25',
  n_50: '50',
  n_100: '100',
};

const DURATION_DISPLAY_MAP: Record<string, string> = {
  PT1M: '1 minute',
  PT5M: '5 minutes',
  PT15M: '15 minutes',
  PT30M: '30 minutes',
  PT1H: '1 hour',
  PT2H: '2 hours',
  PT6H: '6 hours',
  PT12H: '12 hours',
  PT24H: '24 hours',
};

/**
 * Resolve a parameter type name to context menu items.
 * Returns the enum values as menu items, or null if the type is unknown.
 */
export function resolveParamType(paramType: string): ContextMenuItem[] | null {
  switch (paramType) {
    case 'NamedColor':
      return Object.values(NamedColorEnum).map((v) => ({
        id: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      }));
    case 'MarkerSymbol':
      return Object.values(MarkerSymbolEnum).map((v) => ({
        id: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      }));
    case 'CardinalDirection':
      return Object.values(CardinalDirectionEnum).map((v) => ({
        id: v,
        label: v,
      }));
    case 'DurationPreset':
      return Object.values(DurationPresetEnum).map((v) => ({
        id: v,
        label: DURATION_DISPLAY_MAP[v] ?? v,
      }));
    case 'NumericPreset':
      return Object.values(NumericPresetEnum).map((v) => ({
        id: v,
        label: NUMERIC_DISPLAY_MAP[v] ?? v,
      }));
    default:
      return null;
  }
}

/**
 * Check if a parameter type is a preset type (needs Custom... option).
 * Duration and Numeric types show presets plus a Custom entry.
 */
export function isPresetType(paramType: string): boolean {
  return paramType === 'DurationPreset' || paramType === 'NumericPreset';
}

/**
 * Get the actual numeric value from a NumericPreset enum value.
 */
export function getNumericValue(presetValue: string): number | null {
  const displayValue = NUMERIC_DISPLAY_MAP[presetValue];
  return displayValue ? parseInt(displayValue, 10) : null;
}
