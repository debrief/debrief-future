/**
 * Canonical MCP type definitions for Debrief.
 *
 * These types describe the MCP tool protocol used between Python services
 * and TypeScript frontends. Consolidated from apps/vscode and @debrief/components.
 */

import type { ToolCategoryEnum } from '@debrief/schemas';

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
 */
export interface MCPContentItem {
  type: 'resource' | 'text' | 'image';
  resource?: { uri: string; mimeType: string; text: string };
  text?: string;
  data?: string;
  mimeType?: string;
  annotations: DebriefAnnotations;
}

/**
 * Successful MCP tool response with content array.
 */
export interface MCPToolResponse {
  content: MCPContentItem[];
  duration_ms: number;
}

/**
 * MCP error response with structured error data.
 */
export interface MCPErrorResponse {
  error: {
    code: number;
    message: string;
    data: {
      'debrief:errorCategory': string;
      'debrief:affectedFeatures': string[];
    };
  };
  duration_ms?: number;
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
 * MCP tool definition with Debrief-specific annotations.
 * Represents a tool as returned by MCP tools/list response.
 * Both Python and TypeScript tool libraries produce this format.
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
}
