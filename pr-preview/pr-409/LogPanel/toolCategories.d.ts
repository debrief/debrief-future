import { ToolCategory, ToolCategoryConfig } from './types';

/**
 * Visual config for each tool category.
 */
export declare const TOOL_CATEGORY_CONFIGS: Record<ToolCategory, ToolCategoryConfig>;
/**
 * Fallback config for unknown tools.
 */
export declare const UNKNOWN_CATEGORY_CONFIG: Omit<ToolCategoryConfig, 'category'> & {
    category: null;
};
/**
 * Resolve the tool category for a given tool name.
 * Returns the ToolCategoryConfig if known, or the fallback config.
 */
export declare function resolveToolCategory(toolName: string): ToolCategoryConfig | (Omit<ToolCategoryConfig, 'category'> & {
    category: null;
});
//# sourceMappingURL=toolCategories.d.ts.map