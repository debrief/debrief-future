/**
 * CORS middleware configuration (FR-038).
 * Feature: 024-document-session-state
 *
 * Allows access from standalone HTML applications like the debug dashboard.
 */

import cors from 'cors';

/**
 * Default CORS options for development.
 * Allows all origins in development mode.
 */
export const corsOptions: cors.CorsOptions = {
  origin: true, // Allow all origins (for debug dashboard)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Last-Event-ID'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Create CORS middleware with the default options.
 */
export function createCorsMiddleware() {
  return cors(corsOptions);
}
