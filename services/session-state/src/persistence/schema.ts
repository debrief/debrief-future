/**
 * Schema versioning and migration.
 * Feature: 024-document-session-state
 */

import { SCHEMA_VERSION } from '../types/index.js';

/**
 * Session file header with version info.
 */
export interface SessionFileHeader {
  $schema: string;
  version: string;
  savedAt: string;
}

/**
 * Schema version history (for compatibility reference).
 */
export const SCHEMA_VERSION_HISTORY = ['1.0.0'] as const;

/**
 * Schema versions and their compatibility.
 */
export const SCHEMA_VERSIONS = {
  /** Current schema version */
  CURRENT: SCHEMA_VERSION,
  /** Minimum supported version for loading */
  MIN_SUPPORTED: '1.0.0',
} as const;

/**
 * Check if a version is compatible with the current schema.
 */
export function isVersionCompatible(version: string): boolean {
  // Parse major.minor.patch
  const [major] = version.split('.').map(Number);
  const [currentMajor] = SCHEMA_VERSION.split('.').map(Number);

  // Compatible if same major version
  return major === currentMajor;
}

/**
 * Check if a version requires migration.
 */
export function requiresMigration(version: string): boolean {
  return version !== SCHEMA_VERSION;
}

/**
 * Check if a version is from the future (incompatible).
 */
export function isFutureVersion(version: string): boolean {
  const [major, minor, patch] = version.split('.').map(Number);
  const [currentMajor, currentMinor, currentPatch] = SCHEMA_VERSION.split('.').map(Number);

  if (major > currentMajor) return true;
  if (major === currentMajor && minor > currentMinor) return true;
  if (major === currentMajor && minor === currentMinor && patch > currentPatch) return true;

  return false;
}

/**
 * Migrate session data from an older version to current.
 * Currently a no-op as we only have v1.0.0.
 */
export function migrateSession(
  data: Record<string, unknown>,
  fromVersion: string
): Record<string, unknown> {
  if (fromVersion === SCHEMA_VERSION) {
    return data;
  }

  // Future migrations would be added here
  // e.g., if (fromVersion === '1.0.0') { migrateFrom1_0_0(data) }

  return data;
}

/**
 * Create schema header for new session file.
 */
export function createSchemaHeader(): SessionFileHeader {
  return {
    $schema: `https://debrief.io/schemas/session-state/v${SCHEMA_VERSION}.json`,
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
  };
}
