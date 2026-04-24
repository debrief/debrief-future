import { ToolCategory, ToolCategoryConfig, ToolCategoryMap } from './types';

/**
 * Visual config for each tool category.
 */
export declare const TOOL_CATEGORY_CONFIGS: Record<ToolCategory, ToolCategoryConfig>;
/**
 * Fallback config for unknown tools.
 */
export declare const UNKNOWN_CATEGORY_CONFIG: ToolCategoryConfig;
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
export declare function resolveToolCategory(toolName: string, toolCategories?: ToolCategoryMap): ToolCategoryConfig;
//# sourceMappingURL=toolCategories.d.ts.map