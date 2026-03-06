/**
 * MCP Tool Adapter for VS Code Extension
 *
 * Delegates to the shared adapter in @debrief/components for core conversion
 * (MCP annotations → Tool requirements), adding VS Code-specific parameter
 * extraction. Eliminates duplicate adaptation logic (#105 — F-5.2).
 *
 * Feature: 052-tool-api-integration (US2 Tool Filtering, T016)
 */

import { fromMCPTool as sharedFromMCPTool } from '@debrief/components/ToolMatch';
import type { MCPToolDefinition as SharedMCPToolDefinition } from '@debrief/components/ToolMatch';
import type { MCPToolDefinition, Tool, ToolParameter } from '../types/tool';

/** JSON Schema property shape inside inputSchema.properties.params.properties */
interface MCPParamSchema {
  type?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  'x-debrief-param-type'?: string;
}

function mapParamType(schema: MCPParamSchema): ToolParameter['valueType'] {
  if (schema.enum) { return 'enum'; }
  switch (schema.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

/**
 * Extract collectible parameters from MCP inputSchema.
 * Only returns parameters that have a paramType or explicit choices,
 * matching the web-shell's ParameterCollector filter.
 */
function extractPickerParameters(mcpTool: MCPToolDefinition): ToolParameter[] {
  const paramsSchema = mcpTool.inputSchema?.properties?.params as
    | { type: 'object'; properties: Record<string, MCPParamSchema> }
    | undefined;
  if (!paramsSchema?.properties) { return []; }

  const all = Object.entries(paramsSchema.properties).map(([name, schema]) => {
    const param: ToolParameter = {
      name,
      valueType: mapParamType(schema),
      description: schema.description ?? '',
    };
    if (schema.enum) { param.choices = schema.enum as string[]; }
    if (schema.default !== undefined) { param.defaultValue = schema.default; }
    if (schema['x-debrief-param-type']) { param.paramType = schema['x-debrief-param-type']; }
    return param;
  });

  // Only keep parameters that can be presented in a picker
  return all.filter(p => p.paramType || p.choices);
}

/**
 * Adapt MCP tool definitions for use with ToolMatchService.
 *
 * Uses the shared adapter for base conversion, then enriches with
 * VS Code-specific parameter data.
 *
 * @param mcpTools - Array of MCP tool definitions with Debrief annotations
 * @returns Tool[] for use with ToolMatchService
 */
export function adaptMCPToolsForMatching(mcpTools: MCPToolDefinition[]): Tool[] {
  return mcpTools.map((mcpTool) => {
    // Delegate core conversion to shared adapter
    const baseTool = sharedFromMCPTool(mcpTool as SharedMCPToolDefinition);

    // Add VS Code-specific parameter extraction
    const parameters = extractPickerParameters(mcpTool);

    return {
      ...baseTool,
      ...(parameters.length > 0 ? { parameters } : {}),
    } as Tool;
  });
}
