/**
 * Static tool category configuration map.
 *
 * Maps tool IDs to visual categories for icon rendering.
 * Future: replaced by tool manifest lookup.
 *
 * Feature: 176-log-panel-ux
 */

import type { ToolCategory, ToolCategoryConfig } from './types';

/**
 * Visual config for each tool category.
 */
export const TOOL_CATEGORY_CONFIGS: Record<ToolCategory, ToolCategoryConfig> = {
  import: { category: 'import', background: '#dbeafe', glyph: '\u2B07', label: 'Import' },
  style: { category: 'style', background: '#ede9fe', glyph: '\uD83C\uDFA8', label: 'Style' },
  calc: { category: 'calc', background: '#dcfce7', glyph: '\u223F', label: 'Calculation' },
  filter: { category: 'filter', background: '#fff7ed', glyph: '\u29D6', label: 'Filter' },
  snapshot: { category: 'snapshot', background: '#fef9c3', glyph: '\uD83D\uDCF7', label: 'Snapshot' },
};

/**
 * Fallback config for unknown tools.
 */
export const UNKNOWN_CATEGORY_CONFIG: ToolCategoryConfig = {
  category: null,
  background: '#e5e5e5',
  glyph: '',
  label: 'Other',
};

/**
 * Static mapping of known tool IDs to categories.
 */
const TOOL_ID_TO_CATEGORY: Record<string, ToolCategory> = {
  // Import tools
  'import-rep': 'import',
  'import-csv': 'import',
  'load-rep': 'import',
  // Style / property-edit tools
  'change-color': 'style',
  'change-track-color': 'style',
  'set-display-mode': 'style',
  // Calculation tools
  'bearing-between-tracks': 'calc',
  'range-between-tracks': 'calc',
  'course-speed-from-positions': 'calc',
  'move-track': 'calc',
  // Filter tools
  'time-filter': 'filter',
  'spatial-filter': 'filter',
  // Snapshot tools
  'export-png': 'snapshot',
  'export-csv': 'snapshot',
  'export-geojson': 'snapshot',
  'delete-features': 'style',
};

/**
 * Resolve the tool category for a given tool name.
 * Returns the ToolCategoryConfig if known, or the fallback config.
 */
export function resolveToolCategory(toolName: string): ToolCategoryConfig {
  const category = TOOL_ID_TO_CATEGORY[toolName];
  if (category) {
    return TOOL_CATEGORY_CONFIGS[category];
  }
  return UNKNOWN_CATEGORY_CONFIG;
}
