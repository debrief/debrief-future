/**
 * Tool category configuration + resolver.
 *
 * Feature: 176-log-panel-ux (introduced the five-bucket visual taxonomy).
 * Feature: 207 (replaces the static `TOOL_ID_TO_CATEGORY` shim with a
 *               manifest-fed resolver; shim kept here as a transitional
 *               fallback for callers that do not yet pass a manifest map,
 *               scheduled for removal in Commit B once all first-party
 *               tools declare `category` via the LinkML schema).
 */

import type { ToolCategory, ToolCategoryConfig, ToolCategoryMap } from './types';

/**
 * Visual config for each tool category.
 */
export const TOOL_CATEGORY_CONFIGS: Record<ToolCategory, ToolCategoryConfig> = {
  import: { category: 'import', background: '#dbeafe', glyph: '⬇', label: 'Import' },
  style: { category: 'style', background: '#ede9fe', glyph: '🎨', label: 'Style' },
  calc: { category: 'calc', background: '#dcfce7', glyph: '∿', label: 'Calculation' },
  filter: { category: 'filter', background: '#fff7ed', glyph: '⧖', label: 'Filter' },
  snapshot: { category: 'snapshot', background: '#fef9c3', glyph: '📷', label: 'Snapshot' },
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
 * Transitional static mapping of known tool IDs to categories.
 *
 * Consulted only when the caller does NOT supply a manifest map. This
 * preserves the pre-#207 behaviour for Storybook stories and any legacy
 * consumer that has not been threaded with `toolCategories` yet. Feature
 * 207 Commit B deletes this constant and switches `resolveToolCategory`
 * to consult the manifest-only path.
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
 *
 * Resolution precedence (feature 207):
 *   1. If a manifest map is supplied and the tool has a canonical declared
 *      category in it → use that.
 *   2. If a manifest map is supplied but the tool is absent from it, or
 *      declared `null`, or declared a non-canonical value (which should not
 *      happen after the `mcpAdapter` boundary coerces) → unknown (grey).
 *   3. If NO manifest map is supplied (legacy callers / Storybook without
 *      fixtures) → consult the transitional static `TOOL_ID_TO_CATEGORY`
 *      shim. Removed in Commit B.
 *   4. Otherwise → unknown (grey).
 */
export function resolveToolCategory(
  toolName: string,
  toolCategories?: ToolCategoryMap,
): ToolCategoryConfig {
  if (toolCategories !== undefined) {
    const declared = toolCategories[toolName];
    if (declared && declared in TOOL_CATEGORY_CONFIGS) {
      return TOOL_CATEGORY_CONFIGS[declared as ToolCategory];
    }
    return UNKNOWN_CATEGORY_CONFIG;
  }
  // Legacy path — transitional static shim.
  const category = TOOL_ID_TO_CATEGORY[toolName];
  if (category) {
    return TOOL_CATEGORY_CONFIGS[category];
  }
  return UNKNOWN_CATEGORY_CONFIG;
}
