/**
 * MCP tool handlers for session state.
 * Feature: 024-document-session-state
 *
 * Provides a simple HTTP-based MCP interface (FR-028, FR-029, FR-030).
 */

import type { Request, Response } from 'express';
import type { MCPRequest } from '@debrief/schemas';
import { SessionMCPToolName } from '@debrief/schemas';
import type { SessionStoreApi } from '../store/index.js';

/**
 * Discriminator string union over the registered tool names. Derived from
 * the LinkML-rooted `SessionMCPToolName` enum (spec 222 R-001) so adding
 * a tool requires updating the enum at
 * `shared/schemas/src/linkml/mcp.yaml` first; the compile-time check
 * below then enforces that the local `TOOLS` const stays in lockstep.
 */
type ToolName = `${SessionMCPToolName}`;
import {
  getState,
  setCurrentTime,
  setViewport,
  setSelection,
  setHiddenFeatures,
  setPlaybackRate,
  setRotation,
} from './tools/index.js';

/**
 * Available MCP tools.
 */
const TOOLS = {
  'session.getState': getState,
  'session.getTemporalState': (store: SessionStoreApi) =>
    getState(store, { slice: 'temporal' }),
  'session.getSpatialState': (store: SessionStoreApi) =>
    getState(store, { slice: 'spatial' }),
  'session.getFeaturesState': (store: SessionStoreApi) =>
    getState(store, { slice: 'features' }),
  'session.getDocumentState': (store: SessionStoreApi) =>
    getState(store, { slice: 'document' }),
  'session.setCurrentTime': setCurrentTime,
  'session.setViewport': setViewport,
  'session.setSelection': setSelection,
  'session.setHiddenFeatures': setHiddenFeatures,
  'session.setPlaybackRate': setPlaybackRate,
  'session.setRotation': setRotation,
} as const;

// Compile-time guard: `TOOLS` keys MUST mirror `SessionMCPToolName` exactly.
// If either drifts, this assignment fails to typecheck — see spec 222 R-001.
type _ToolNameCheck = keyof typeof TOOLS extends ToolName
  ? ToolName extends keyof typeof TOOLS
    ? true
    : never
  : never;
const _toolNameCheck: _ToolNameCheck = true;
void _toolNameCheck;

/**
 * List available tools.
 */
export function listTools(): { tools: Array<{ name: string }> } {
  return {
    tools: Object.keys(TOOLS).map((name) => ({ name })),
  };
}

/**
 * Create MCP request handler.
 */
export function createMCPHandler(store: SessionStoreApi) {
  return (req: Request, res: Response): void => {
    try {
      const { tool, input } = req.body as MCPRequest;

      if (!tool) {
        res.status(400).json({
          success: false,
          error: 'Missing tool name',
        });
        return;
      }

      if (!(tool in TOOLS)) {
        res.status(400).json({
          success: false,
          error: `Unknown tool: ${tool}`,
          availableTools: Object.keys(TOOLS),
        });
        return;
      }

      const handler = TOOLS[tool as ToolName];
      const result = handler(store, input as never);

      res.json(result);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };
}

/**
 * Create tools list handler.
 */
export function createToolsListHandler() {
  return (_req: Request, res: Response): void => {
    res.json(listTools());
  };
}
