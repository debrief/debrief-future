/**
 * Config file storage with atomic writes and file locking.
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import lockfile from 'proper-lockfile';
import { ConfigSchema } from './schemas.js';
import { ConfigCorruptError } from './errors.js';
import { getConfigFile, getLockFile } from './paths.js';
import { Config, createDefaultConfig } from './types.js';

// Lock timeout in milliseconds
const LOCK_TIMEOUT = 5000;

/**
 * Read the configuration file.
 *
 * If the file doesn't exist, returns default config.
 * If the file is corrupted, logs a warning and returns default config.
 */
export function readConfig(): Config {
  const configFile = getConfigFile(true);

  if (!existsSync(configFile)) {
    return createDefaultConfig();
  }

  try {
    const data = JSON.parse(readFileSync(configFile, 'utf-8'));
    const result = ConfigSchema.safeParse(data);

    if (!result.success) {
      console.warn(`Config validation failed: ${result.error.message}`);
      return createDefaultConfig();
    }

    return result.data;
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.warn(`Config file corrupted (invalid JSON): ${e.message}`);
      return createDefaultConfig();
    }
    throw e;
  }
}

/**
 * Read config synchronously (alias for readConfig).
 */
export function readConfigSync(): Config {
  return readConfig();
}

/**
 * Write the configuration file atomically with locking.
 */
export async function writeConfig(config: Config): Promise<void> {
  const configFile = getConfigFile(true);

  // Use proper-lockfile for cross-platform locking
  const release = await lockfile.lock(configFile, {
    retries: { retries: 3, minTimeout: 100, maxTimeout: 1000 },
    stale: LOCK_TIMEOUT,
    realpath: false,
  }).catch(() => {
    // If file doesn't exist yet, create it first
    if (!existsSync(configFile)) {
      writeFileSync(configFile, JSON.stringify(createDefaultConfig(), null, 2));
      return lockfile.lock(configFile, {
        retries: { retries: 3, minTimeout: 100, maxTimeout: 1000 },
        stale: LOCK_TIMEOUT,
        realpath: false,
      });
    }
    throw new Error(`Could not acquire lock on ${configFile}`);
  });

  try {
    // Write to temp file first
    const tempFile = configFile.replace('.json', '.tmp');
    writeFileSync(tempFile, JSON.stringify(config, null, 2), 'utf-8');

    // Atomic rename
    renameSync(tempFile, configFile);
  } finally {
    await release();
  }
}

/**
 * Read, update, and write config atomically.
 */
export async function updateConfig(
  updater: (config: Config) => Config
): Promise<Config> {
  const configFile = getConfigFile(true);

  // Ensure file exists before locking
  if (!existsSync(configFile)) {
    writeFileSync(configFile, JSON.stringify(createDefaultConfig(), null, 2));
  }

  const release = await lockfile.lock(configFile, {
    retries: { retries: 3, minTimeout: 100, maxTimeout: 1000 },
    stale: LOCK_TIMEOUT,
    realpath: false,
  });

  try {
    const config = readConfig();
    const updated = updater(config);

    // Write to temp file first
    const tempFile = configFile.replace('.json', '.tmp');
    writeFileSync(tempFile, JSON.stringify(updated, null, 2), 'utf-8');

    // Atomic rename
    renameSync(tempFile, configFile);

    return updated;
  } finally {
    await release();
  }
}
