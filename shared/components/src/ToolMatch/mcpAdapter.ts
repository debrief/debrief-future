/**
 * Adapter to convert MCP tool definitions to ToolMatchService format.
 *
 * Both the VS Code extension (consuming Python MCP tools/list) and the
 * web-shell (consuming TypeScript tool registry) use this adapter to
 * feed tool definitions into the shared ToolMatchService.
 */

import type { Tool, SelectionRequirement, ToolParameter } from './types';

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
 * Schema for a single parameter within the MCP inputSchema params section.
 */
interface MCPParamSchema {
  type?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  'x-debrief-param-type'?: string;
}

/**
 * Map an MCP parameter schema to a ToolParameter valueType.
 */
function mapParamType(schema: MCPParamSchema): ToolParameter['valueType'] {
  if (schema.enum || schema['x-debrief-param-type']) return 'enum';
  if (schema.type === 'number') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  return 'string';
}

/**
 * Extract tool parameters from MCP tool definition's inputSchema.
 * Parses the params.properties section and extracts x-debrief-param-type annotations.
 *
 * @param mcpTool - MCP tool definition with inputSchema
 * @returns Array of ToolParameter descriptors
 */
export function extractParameters(mcpTool: MCPToolDefinition): ToolParameter[] {
  const paramsSchema = mcpTool.inputSchema?.properties?.params as
    | { type: 'object'; properties: Record<string, MCPParamSchema> }
    | undefined;
  if (!paramsSchema?.properties) return [];

  return Object.entries(paramsSchema.properties).map(([name, schema]) => {
    const param: ToolParameter = {
      name,
      valueType: mapParamType(schema),
      description: schema.description ?? '',
    };
    if (schema.enum) param.choices = schema.enum as string[];
    if (schema.default !== undefined) param.defaultValue = schema.default;
    if (schema['x-debrief-param-type']) param.paramType = schema['x-debrief-param-type'] as string;
    return param;
  });
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
