/**
 * MCP tool handlers for session state.
 * Feature: 024-document-session-state
 *
 * Provides a simple HTTP-based MCP interface (FR-028, FR-029, FR-030).
 */

import type { Request, Response } from 'express';
import type { MCPRequest } from '@debrief/schemas';
import type { SessionStoreApi } from '../store/index.js';
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

type ToolName = keyof typeof TOOLS;

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
