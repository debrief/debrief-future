/**
 * Persistence module exports.
 * Feature: 024-document-session-state
 */

export {
  saveSession,
  serializeState,
  extractPersistentState,
  type SaveResult,
} from './save.js';

export {
  loadSession,
  parseSessionJson,
  type LoadResult,
} from './load.js';

export {
  SCHEMA_VERSIONS,
  isVersionCompatible,
  isFutureVersion,
  requiresMigration,
  migrateSession,
  createSchemaHeader,
  type SessionFileHeader,
} from './schema.js';
