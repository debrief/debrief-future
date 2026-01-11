/**
 * Custom error classes for debrief-config.
 */

/**
 * Base error for config-related errors.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Thrown when a path is not a valid STAC catalog.
 */
export class InvalidCatalogError extends ConfigError {
  readonly path: string;
  readonly reason: string;

  constructor(path: string, reason: string) {
    super(`Invalid STAC catalog at ${path}: ${reason}`);
    this.name = 'InvalidCatalogError';
    this.path = path;
    this.reason = reason;
  }
}

/**
 * Thrown when attempting to access an unregistered store.
 */
export class StoreNotFoundError extends ConfigError {
  readonly path: string;

  constructor(path: string) {
    super(`Store not found: ${path}`);
    this.name = 'StoreNotFoundError';
    this.path = path;
  }
}

/**
 * Thrown when attempting to register a store that already exists.
 */
export class StoreExistsError extends ConfigError {
  readonly path: string;

  constructor(path: string) {
    super(`Store already registered: ${path}`);
    this.name = 'StoreExistsError';
    this.path = path;
  }
}

/**
 * Thrown when config file is corrupted and will be reset.
 */
export class ConfigCorruptError extends ConfigError {
  readonly configPath: string;
  readonly reason: string;

  constructor(configPath: string, reason: string) {
    super(`Config corrupted at ${configPath}: ${reason}. Reset to defaults.`);
    this.name = 'ConfigCorruptError';
    this.configPath = configPath;
    this.reason = reason;
  }
}
