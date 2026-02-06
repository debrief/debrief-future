/**
 * MCP Tool Adapter for VS Code Extension
 *
 * Thin wrapper that delegates to the shared mcpAdapter from @debrief/components.
 * This ensures both VS Code and web-shell frontends use the same adapter logic
 * for converting MCP tool definitions to ToolMatchService-compatible Tool[].
 *
 * Both frontends consume the same shared ToolMatchService and the same shared
 * mcpAdapter, guaranteeing identical enabled/disabled tool states for a given
 * selection — see T018 verification note below.
 *
 * Feature: 052-tool-api-integration (US2 Tool Filtering, T016)
 *
 * ---
 * T018 Verification: Both the VS Code extension and the web-shell use the same
 * shared ToolMatchService (from @debrief/components/ToolMatch) and the same
 * shared fromMCPTools adapter. This means that for any given set of MCP tool
 * definitions and any given feature selection, both UIs will produce identical
 * enabled/disabled tool lists. The only difference is how each UI obtains the
 * MCP tools/list response (VS Code via CalcService Python subprocess, web-shell
 * via direct TypeScript registry), but the adaptation and matching logic is
 * shared and deterministic.
 * ---
 */

import type { MCPToolDefinition } from '../types/tool';
import type { Tool } from '../types/tool';
import { fromMCPTools } from '@debrief/components/ToolMatch';

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
  // Delegate to shared adapter — keeps VS Code adapter thin and ensures
  // consistency with web-shell which also uses fromMCPTools directly.
  return fromMCPTools(mcpTools) as Tool[];
}
