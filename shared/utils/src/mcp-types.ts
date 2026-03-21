/**
 * Canonical MCP type definitions for Debrief.
 *
 * These types describe the MCP tool protocol used between Python services
 * and TypeScript frontends. Consolidated from apps/vscode and @debrief/components.
 */

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
  };
}
