import { Tool } from './types';

/**
 * MCP tool definition with Debrief-specific annotations.
 */
export interface MCPToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
    };
    annotations: {
        'debrief:selectionRequirements': MCPSelectionRequirement[];
        'debrief:category': string;
        'debrief:version': string;
        'debrief:outputKind': string;
    };
}
/**
 * Selection requirement in MCP annotation format.
 */
export interface MCPSelectionRequirement {
    kind: string;
    min: number;
    max?: number;
}
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
//# sourceMappingURL=mcpAdapter.d.ts.map