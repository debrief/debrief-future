/**
 * Adapter to convert MCP tool definitions to ToolMatchService format.
 *
 * Both the VS Code extension (consuming Python MCP tools/list) and the
 * web-shell (consuming TypeScript tool registry) use this adapter to
 * feed tool definitions into the shared ToolMatchService.
 */

import type { Tool, SelectionRequirement } from './types';

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
export function fromMCPTool(mcpTool: MCPToolDefinition): Tool {
  const requirements: SelectionRequirement[] =
    mcpTool.annotations['debrief:selectionRequirements'].map((req) => ({
      kind: req.kind,
      min: req.min,
      ...(req.max !== undefined ? { max: req.max } : {}),
    }));

  return {
    id: mcpTool.name,
    name: formatToolName(mcpTool.name),
    description: mcpTool.description,
    version: mcpTool.annotations['debrief:version'],
    requirements,
  };
}

/**
 * Convert an array of MCP tool definitions to ToolMatchService Tool format.
 *
 * @param mcpTools - Array of MCP tool definitions
 * @returns Array of Tool instances
 */
export function fromMCPTools(mcpTools: MCPToolDefinition[]): Tool[] {
  return mcpTools.map(fromMCPTool);
}

/**
 * Convert kebab-case tool name to display name.
 * e.g., "set-track-color" → "Set Track Color"
 */
function formatToolName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
