import { Tool, ToolParameter } from './types';
import { MCPToolDefinition, MCPSelectionRequirement } from '@debrief/utils';

export type { MCPToolDefinition, MCPSelectionRequirement };
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