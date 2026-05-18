/**
 * Adapter to convert MCP tool definitions to ToolMatchService format.
 *
 * Both the VS Code extension (consuming Python MCP tools/list) and the
 * web-shell (consuming TypeScript tool registry) use this adapter to
 * feed tool definitions into the shared ToolMatchService.
 */

import type { Tool, SelectionRequirement, ToolParameter } from './types';
import type { MCPToolDefinition, MCPSelectionRequirement } from '@debrief/utils';
import type { MCPParamSchema as MCPParamSchemaBase, ToolCategoryEnum } from '@debrief/schemas';

export type { MCPToolDefinition, MCPSelectionRequirement };

/**
 * Schema for a single parameter within the MCP inputSchema params section.
 *
 * Schema-rooted on `MCPParamSchema` from `@debrief/schemas` (LinkML
 * `mcp.yaml`) and narrowed with the consumer-side `enum`, `default`,
 * and `x-debrief-param-type` extensions that the live wire format
 * carries on each parameter. The base contributes `type` and
 * `description`; consumers add the rest via intersection. Per FR-004
 * (R4 import-based schema rooting) the audit treats this file as
 * schema-rooted.
 */
type MCPParamSchema = MCPParamSchemaBase & {
  enum?: unknown[];
  default?: unknown;
  'x-debrief-param-type'?: string;
};

/**
 * Canonical set of visual category values — the five `ToolCategoryEnum`
 * permissible values. Hand-rolled whitelist (rather than deriving from
 * `ToolCategoryEnum`'s entries) because it must survive transpilation
 * unchanged and be efficient to check at runtime.
 *
 * Feature 207 (see shared/schemas/src/linkml/tool.yaml).
 */
const CANONICAL_TOOL_CATEGORIES: ReadonlySet<string> = new Set([
  'import',
  'style',
  'calc',
  'filter',
  'snapshot',
]);

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
export function parseToolUICategory(
  raw: unknown,
  toolName: string,
): ToolCategoryEnum | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') {
    // eslint-disable-next-line no-console
    console.warn(
      `[debrief:uiCategory] tool "${toolName}" declared a non-string category (${typeof raw}); falling back to neutral grey`,
    );
    return undefined;
  }
  if (!CANONICAL_TOOL_CATEGORIES.has(raw)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[debrief:uiCategory] tool "${toolName}" declared category "${raw}" which is not one of import|style|calc|filter|snapshot; falling back to neutral grey`,
    );
    return undefined;
  }
  return raw as ToolCategoryEnum;
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

  const uiCategory = parseToolUICategory(
    mcpTool.annotations['debrief:uiCategory'],
    mcpTool.name,
  );

  return {
    id: mcpTool.name,
    name: formatToolName(mcpTool.name),
    description: mcpTool.description,
    version: mcpTool.annotations['debrief:version'],
    requirements,
    ...(uiCategory !== undefined ? { category: uiCategory } : {}),
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
