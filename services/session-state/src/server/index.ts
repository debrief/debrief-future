/**
 * Express server for session state service.
 * Feature: 024-document-session-state
 *
 * Provides HTTP-based MCP interface and SSE for real-time updates.
 */

import express, { type Express, type Request, type Response } from 'express';
import { createCorsMiddleware } from './cors.js';
import { createMCPHandler, createToolsListHandler } from './mcp.js';
import { createSSEHandler } from './sse.js';
import type { SessionStoreApi } from '../store/index.js';

export interface ServerOptions {
  port?: number;
  host?: string;
}

const DEFAULT_PORT = 3001;
const DEFAULT_HOST = '0.0.0.0';

/**
 * Create the Express application.
 */
export function createApp(store: SessionStoreApi): Express {
  const app = express();

  // Middleware
  app.use(createCorsMiddleware());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // MCP endpoints
  app.post('/mcp', createMCPHandler(store));
  app.get('/mcp/tools', createToolsListHandler());

  // SSE endpoint for real-time updates
  app.get('/sse', createSSEHandler(store));

  return app;
}

/**
 * Start the standalone server.
 */
export function startServer(
  store: SessionStoreApi,
  options: ServerOptions = {}
): { app: Express; close: () => void } {
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;

  const app = createApp(store);

  const server = app.listen(port, host, () => {
    console.log(`Session state server listening on http://${host}:${port}`);
    console.log(`  - Health: http://${host}:${port}/health`);
    console.log(`  - MCP: http://${host}:${port}/mcp`);
    console.log(`  - SSE: http://${host}:${port}/sse`);
  });

  return {
    app,
    close: () => {
      server.close();
    },
  };
}

// Re-exports
export { createCorsMiddleware } from './cors.js';
export { createMCPHandler, createToolsListHandler, listTools } from './mcp.js';
export { createSSEHandler, broadcast, getClientCount } from './sse.js';
