/**
 * ToolMatch module - Context-sensitive tool offering.
 *
 * Provides a service for matching analysis tools to feature selections.
 *
 * @example
 * ```ts
 * import { ToolMatchService, createSelectionFromCounts } from '@debrief/components/ToolMatch';
 *
 * const service = new ToolMatchService(tools);
 * const selection = createSelectionFromCounts({ TRACK: 2 });
 * const activeTools = service.getActiveTools(selection);
 * ```
 */

export { ToolMatchService } from './ToolMatchService';
export { getInactiveReason, getAllInactiveReasons } from './explanations';
export type { Selection, MatchResult, ToolParameter } from './types';
export { createSelection, createSelectionFromCounts } from './types';

// MCP adapter for converting MCP tool definitions to ToolMatchService format
export { fromMCPTool, fromMCPTools, extractParameters } from './mcpAdapter';
export type { MCPToolDefinition, MCPSelectionRequirement } from './mcpAdapter';

// Re-export schema types for convenience
export type { Tool, SelectionRequirement } from './types';
