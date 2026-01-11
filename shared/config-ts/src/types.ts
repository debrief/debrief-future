/**
 * TypeScript types for debrief-config.
 */

/**
 * A registered STAC catalog location.
 */
export interface StoreRegistration {
  /** Absolute path to STAC catalog */
  path: string;
  /** Human-readable display name */
  name: string;
  /** ISO 8601 datetime of last access */
  lastAccessed: string;
  /** Optional user notes */
  notes?: string;
}

/**
 * Allowed types for preference values.
 */
export type PreferenceValue = string | number | boolean | null;

/**
 * Root configuration object.
 */
export interface Config {
  /** Schema version (semver) */
  version: string;
  /** Registered STAC stores */
  stores: StoreRegistration[];
  /** User preferences */
  preferences: Record<string, PreferenceValue>;
}

/**
 * Default configuration factory.
 */
export function createDefaultConfig(): Config {
  return {
    version: '1.0.0',
    stores: [],
    preferences: {},
  };
}
