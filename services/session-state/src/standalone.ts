/**
 * Standalone server entry point.
 * Feature: 024-document-session-state
 *
 * Run with: pnpm dev (development) or pnpm start (production)
 */

import { getSessionStore } from './store/index.js';
import { startServer } from './server/index.js';

const store = getSessionStore();
const port = parseInt(process.env.PORT ?? '3001', 10);
const host = process.env.HOST ?? '0.0.0.0';

const { close } = startServer(store, { port, host });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  close();
  process.exit(0);
});
