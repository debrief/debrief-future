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
export const SCHEMA_VERSION_HISTORY = ['1.0.0', '1.1.0'] as const;

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
  const major = version.split('.').map(Number)[0]!;
  const currentMajor = SCHEMA_VERSION.split('.').map(Number)[0]!;

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
  const vParts = version.split('.').map(Number);
  const major = vParts[0]!;
  const minor = vParts[1]!;
  const patch = vParts[2]!;
  const cParts = SCHEMA_VERSION.split('.').map(Number);
  const currentMajor = cParts[0]!;
  const currentMinor = cParts[1]!;
  const currentPatch = cParts[2]!;

  if (major > currentMajor) return true;
  if (major === currentMajor && minor > currentMinor) return true;
  if (major === currentMajor && minor === currentMinor && patch > currentPatch) return true;

  return false;
}

/**
 * Migrate session data from an older version to current.
 *
 * Viewport-shape migration (tuple-form coordinates → object form, introduced by
 * feature 203) is handled inline by `coerceViewport` inside `applySessionState`,
 * not here — see `persistence/load.ts`. This function only records the version
 * transitions so that the "every past version is acknowledged" discipline holds.
 */
export function migrateSession(
  data: Record<string, unknown>,
  fromVersion: string
): Record<string, unknown> {
  if (fromVersion === SCHEMA_VERSION) {
    return data;
  }

  // REMOVABLE: added for feature 203 (spatial types consolidation, 2026-04-20).
  // Once all production session files have been saved with viewport in object
  // form (version >= 1.1.0), this branch can be deleted.
  if (fromVersion === '1.0.0') {
    // Viewport migration is handled inline by coerceViewport in
    // applySessionState — no data mutation required here.
    return data;
  }

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
