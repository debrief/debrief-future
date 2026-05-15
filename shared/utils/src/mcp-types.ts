/**
 * Canonical MCP type definitions for Debrief.
 *
 * These types describe the MCP tool protocol used between Python services
 * and TypeScript frontends. Consolidated from apps/vscode and @debrief/components.
 */

import type {
  MCPContentItem as MCPContentItemBase,
  MCPErrorResponse as MCPErrorResponseBase,
  MCPSelectionRequirement as MCPSelectionRequirementSchema,
  MCPToolDefinition as MCPToolDefinitionBase,
  MCPToolResponse as MCPToolResponseSchema,
  ToolCategoryEnum,
} from '@debrief/schemas';

/**
 * String-literal form of `ToolCategoryEnum`. Feature 207.
 *
 * Annotation fields on `MCPToolDefinition` are declared as tools author
 * them in their source files — i.e. as string literals (`'style'`). The
 * generated `ToolCategoryEnum` is a TypeScript string-enum that is NOT
 * mutually assignable with its string literal values under strict mode,
 * so we widen the annotation type to the string-literal union form while
 * still anchoring it to the enum's `keyof`.
 */
export type ToolUICategory =
  | 'import'
  | 'style'
  | 'calc'
  | 'filter'
  | 'snapshot';

// Compile-time cross-check: `ToolUICategory` must stay in lockstep with
// the generated `ToolCategoryEnum` values. If either drifts, this will
// fail to compile.
type _ToolUICategoryCheck = ToolUICategory extends `${ToolCategoryEnum}`
  ? `${ToolCategoryEnum}` extends ToolUICategory
    ? true
    : never
  : never;
const _toolUICategoryCheck: _ToolUICategoryCheck = true;
void _toolUICategoryCheck;

/**
 * Debrief-specific annotations on MCP content items.
 */
export interface DebriefAnnotations {
  'debrief:resultType': string;
  'debrief:sourceFeatures': string[];
  'debrief:label': string;
  'debrief:href'?: string;
  'debrief:deletedFeatures'?: string[];
  'debrief:toolVersion'?: string;
  'debrief:modifiedFeatures'?: Array<{
    featureId: string;
    changedProperties: Record<string, { previousValue: unknown; newValue: unknown }>;
  }>;
  'debrief:createdFeatures'?: string[];
  'debrief:createdAssets'?: Array<{ resultId: string; path: string; mimeType?: string }>;
  'debrief:parameters'?: Record<string, { value: unknown; default: boolean; tunable: boolean }>;
}

/**
 * A single MCP content item (resource, text, or image).
 *
 * Schema-rooted on `MCPContentItem` from `@debrief/schemas` (LinkML
 * `mcp.yaml`) and narrowed with the Debrief-specific `type` discriminator
 * literal union, the inner `resource` shape, and the `DebriefAnnotations`
 * payload. The narrowing is a consumer-side type projection — no new
 * fields are added on the wire. See spec 222 §FR-004 (R4 import-based
 * schema rooting).
 */
export type MCPContentItem = Omit<MCPContentItemBase, 'type' | 'resource' | 'annotations'> & {
  type: 'resource' | 'text' | 'image';
  resource?: { uri: string; mimeType: string; text: string };
  annotations: DebriefAnnotations;
};

/**
 * Successful MCP tool response with content array. Re-exported from
 * `@debrief/schemas` and narrowed so that each content item carries the
 * `DebriefAnnotations` payload via the local `MCPContentItem` projection.
 */
export type MCPToolResponse = Omit<MCPToolResponseSchema, 'content'> & {
  content: MCPContentItem[];
};

/**
 * MCP error response with structured error data.
 *
 * Schema-rooted on `MCPErrorResponse` from `@debrief/schemas` and narrowed
 * with the Debrief-specific nested error payload shape (matches the
 * JSON-RPC convention used by the live MCP server). The inner `data` map
 * uses colon-bearing keys (`debrief:errorCategory`, `debrief:affectedFeatures`)
 * which LinkML cannot constrain as slot names — see spec 222 §Edge Cases #3.
 */
export type MCPErrorResponse = Omit<MCPErrorResponseBase, 'error'> & {
  error: {
    code: number;
    message: string;
    data: {
      'debrief:errorCategory': string;
      'debrief:affectedFeatures': string[];
    };
  };
};

/**
 * Selection requirement in MCP annotation format.
 *
 * Re-exported directly from `@debrief/schemas` (LinkML `mcp.yaml`); the
 * generated shape `{ kind: string, min: number, max?: number }` matches
 * the live wire format byte-for-byte.
 */
export type MCPSelectionRequirement = MCPSelectionRequirementSchema;

/**
 * MCP tool definition with Debrief-specific annotations.
 *
 * Schema-rooted on `MCPToolDefinition` from `@debrief/schemas` (LinkML
 * `mcp.yaml`) and narrowed with the camelCase `inputSchema` projection
 * and the Debrief annotations payload. The schema base treats
 * `input_schema` and `annotations` as `range: Any` (free-form per
 * Article XV.2); this projection materialises the wire shape used by
 * the live MCP server.
 */
export type MCPToolDefinition = Omit<MCPToolDefinitionBase, 'input_schema' | 'annotations'> & {
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
  };
  annotations: {
    'debrief:selectionRequirements': MCPSelectionRequirement[];
    'debrief:category': string;
    'debrief:version': string;
    'debrief:outputKind': string;
    /**
     * Visual category for Log Panel icon rendering (feature 207). One of
     * the five canonical ToolCategoryEnum values. Absent when the tool did
     * not declare a category — Log Panel then renders neutral grey.
     *
     * This is additive to `debrief:category` (hierarchical path). The two
     * serve different consumers (tool-match vs Log Panel visuals) and
     * may disagree without issue.
     *
     * Typed as a string-literal union (`ToolUICategory`) rather than the
     * raw `ToolCategoryEnum` so tool authors can write ergonomic string
     * literals (`'style'`) at the declaration site.
     */
    'debrief:uiCategory'?: ToolUICategory;
  };
};
