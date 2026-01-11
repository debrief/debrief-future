/**
 * @debrief/config - Shared configuration service for Debrief v4.x
 *
 * This module provides configuration management for STAC store registrations
 * and user preferences across Python and TypeScript consumers.
 */

// Core functions
export {
  registerStore,
  listStores,
  listStoresSync,
  listStoresAsync,
  getStore,
  removeStore,
  getPreference,
  getPreferenceSync,
  getPreferenceAsync,
  setPreference,
  deletePreference,
} from './config.js';

// Types
export type { Config, StoreRegistration, PreferenceValue } from './types.js';
export { createDefaultConfig } from './types.js';

// Errors
export {
  ConfigError,
  InvalidCatalogError,
  StoreNotFoundError,
  StoreExistsError,
  ConfigCorruptError,
} from './errors.js';

// Paths
export {
  getConfigDir,
  getConfigDirSync,
  getConfigFile,
  getConfigFileSync,
  getLockFile,
} from './paths.js';

// Schemas (for advanced usage)
export { ConfigSchema, StoreRegistrationSchema, PreferenceValueSchema } from './schemas.js';

// Validation (for advanced usage)
export { validateStacCatalog } from './validation.js';
