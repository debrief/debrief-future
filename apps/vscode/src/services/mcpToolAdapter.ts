/**
 * MCP Tool Adapter for VS Code Extension
 *
 * Converts MCP tool definitions (from tools/list) to ToolMatchService-compatible
 * Tool[]. Inlines the adaptation logic using local types so that tsc can
 * resolve all imports without requiring a pre-built @debrief/components dist.
 *
 * Feature: 052-tool-api-integration (US2 Tool Filtering, T016)
 *
 * ---
 * T018 Verification: Both the VS Code extension and the web-shell use equivalent
 * adaptation logic (MCP annotations → Tool requirements). The shared
 * ToolMatchService then produces identical enabled/disabled results for any
 * given selection. The only difference is how each UI obtains the MCP tools/list
 * response (VS Code via CalcService Python subprocess, web-shell via direct
 * TypeScript registry).
 * ---
 */

import type { MCPToolDefinition, Tool, ToolParameter, SelectionRequirement } from '../types/tool';

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
function extractParameters(mcpTool: MCPToolDefinition): ToolParameter[] {
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
 * Convert a single MCP tool definition to ToolMatchService Tool format.
 */
function fromMCPTool(mcpTool: MCPToolDefinition): Tool {
  const requirements: SelectionRequirement[] =
    mcpTool.annotations['debrief:selectionRequirements'].map((req) => ({
      kind: req.kind,
      min: req.min,
      ...(req.max !== undefined ? { max: req.max } : {}),
    }));

  const parameters = extractParameters(mcpTool);

  return {
    id: mcpTool.name,
    name: formatToolName(mcpTool.name),
    description: mcpTool.description,
    version: mcpTool.annotations['debrief:version'],
    requirements,
    ...(parameters.length > 0 ? { parameters } : {}),
  };
}

/**
 * Adapt MCP tool definitions for use with ToolMatchService.
 *
 * Converts MCPToolDefinition[] (from MCP tools/list response) to Tool[]
 * compatible with the shared ToolMatchService matching algorithm.
 *
 * @param mcpTools - Array of MCP tool definitions with Debrief annotations
 * @returns Tool[] for use with ToolMatchService
 */
export function adaptMCPToolsForMatching(mcpTools: MCPToolDefinition[]): Tool[] {
  return mcpTools.map(fromMCPTool);
}
