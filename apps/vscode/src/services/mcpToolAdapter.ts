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

import type { MCPToolDefinition, Tool, SelectionRequirement } from '../types/tool';

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

  return {
    id: mcpTool.name,
    name: formatToolName(mcpTool.name),
    description: mcpTool.description,
    version: mcpTool.annotations['debrief:version'],
    requirements,
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
