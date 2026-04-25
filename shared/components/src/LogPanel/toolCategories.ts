/**
 * Tool category configuration + resolver.
 *
 * Feature: 176-log-panel-ux (introduced the five-bucket visual taxonomy).
 * Feature: 207 (Commit B — the interim `TOOL_ID_TO_CATEGORY` shim has
 *               been retired; every tool now declares its `category` at
 *               its registration site and the value reaches the Log
 *               Panel via the MCP `tools/list` → `tools:manifest`
 *               webview pipeline).
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
 * Resolve the tool category for a given tool name.
 *
 * Resolution (feature 207 Commit B):
 *   1. If the manifest map declares a canonical category for this tool → use it.
 *   2. Otherwise → unknown (neutral-grey fallback). "Otherwise" covers:
 *       - manifest `undefined` (webview hasn't received `tools:manifest` yet)
 *       - manifest map missing this tool (tool not registered, or old log
 *         entry referencing a renamed tool)
 *       - manifest declares `null` for this tool (tool author chose not
 *         to declare a category — exempt for contrib tools per spec A3)
 *       - manifest declares a non-canonical value (defensive — should not
 *         happen after the `mcpAdapter` boundary coerces)
 *
 * See specs/207-tool-manifest-categories/research.md §R4 for load-race
 * handling and §R5 for CI coverage enforcement.
 */
export function resolveToolCategory(
  toolName: string,
  toolCategories?: ToolCategoryMap,
): ToolCategoryConfig {
  if (toolCategories === undefined) {
    return UNKNOWN_CATEGORY_CONFIG;
  }
  const declared = toolCategories[toolName];
  if (declared && declared in TOOL_CATEGORY_CONFIGS) {
    return TOOL_CATEGORY_CONFIGS[declared as ToolCategory];
  }
  return UNKNOWN_CATEGORY_CONFIG;
}
