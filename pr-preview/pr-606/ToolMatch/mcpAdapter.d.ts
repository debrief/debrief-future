import { Tool, ToolParameter } from './types';
import { MCPToolDefinition, MCPSelectionRequirement } from '@debrief/utils';
import { ToolCategoryEnum } from '../../../schemas/src/generated/typescript/index.ts';

export type { MCPToolDefinition, MCPSelectionRequirement };
/**
 * Boundary coercion for `debrief:uiCategory` from MCP annotations.
 *
 * Accepts only one of the five canonical ToolCategoryEnum values. Anything
 * else — missing, null, unknown string, wrong type — produces `undefined`
 * (the renderer's grey-fallback trigger). Unknown non-null strings emit a
 * `console.warn` naming the tool and the offending value so that developers
 * see the problem; end-users do not.
 *
 * Feature 207 (FR-007, FR-008).
 */
export declare function parseToolUICategory(raw: unknown, toolName: string): ToolCategoryEnum | undefined;
/**
 * Convert a single MCP tool definition to ToolMatchService Tool format.
 *
 * @param mcpTool - MCP tool definition with Debrief annotations
 * @returns Tool instance compatible with ToolMatchService
 */
export declare function fromMCPTool(mcpTool: MCPToolDefinition): Tool;
/**
 * Convert an array of MCP tool definitions to ToolMatchService Tool format.
 *
 * @param mcpTools - Array of MCP tool definitions
 * @returns Array of Tool instances
 */
export declare function fromMCPTools(mcpTools: MCPToolDefinition[]): Tool[];
/**
 * Extract tool parameters from MCP tool definition's inputSchema.
 * Parses the params.properties section and extracts x-debrief-param-type annotations.
 *
 * @param mcpTool - MCP tool definition with inputSchema
 * @returns Array of ToolParameter descriptors
 */
export declare function extractParameters(mcpTool: MCPToolDefinition): ToolParameter[];
//# sourceMappingURL=mcpAdapter.d.ts.map