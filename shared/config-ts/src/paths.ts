/**
 * Platform-specific path resolution for debrief-config.
 *
 * Matches Python platformdirs behavior:
 * - Linux: ~/.config/debrief or $XDG_CONFIG_HOME/debrief
 * - macOS: ~/Library/Application Support/debrief
 * - Windows: %APPDATA%\debrief
 */

import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const APP_NAME = 'debrief';
const CONFIG_FILENAME = 'config.json';

/**
 * Get the platform-specific configuration directory.
 *
 * Uses XDG_CONFIG_HOME on Linux if set, otherwise follows platform conventions.
 *
 * @param ensureExists - Create directory if it doesn't exist (default: true)
 * @returns Path to the configuration directory
 */
export function getConfigDir(ensureExists = true): string {
  const currentPlatform = platform();
  let configDir: string;

  if (currentPlatform === 'darwin') {
    // macOS: ~/Library/Application Support/debrief
    // Match platformdirs behavior (NOT ~/Library/Preferences)
    configDir = join(homedir(), 'Library', 'Application Support', APP_NAME);
  } else if (currentPlatform === 'win32') {
    // Windows: %APPDATA%\debrief
    // Match platformdirs behavior (NOT %APPDATA%\debrief\Config)
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    configDir = join(appData, APP_NAME);
  } else {
    // Linux/Unix: $XDG_CONFIG_HOME/debrief or ~/.config/debrief
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    const baseDir = xdgConfigHome || join(homedir(), '.config');
    configDir = join(baseDir, APP_NAME);
  }

  if (ensureExists && !existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  return configDir;
}

/**
 * Get the path to the configuration file.
 *
 * @param ensureDirExists - Create directory if it doesn't exist (default: true)
 * @returns Path to config.json
 */
export function getConfigFile(ensureDirExists = true): string {
  return join(getConfigDir(ensureDirExists), CONFIG_FILENAME);
}

/**
 * Get the path to the lock file for atomic writes.
 *
 * @returns Path to config.json.lock
 */
export function getLockFile(): string {
  const configFile = getConfigFile(true);
  return configFile.replace(/\.json$/, '.lock');
}

/**
 * Synchronous version of getConfigDir for use in initialization.
 */
export function getConfigDirSync(ensureExists = true): string {
  return getConfigDir(ensureExists);
}

/**
 * Synchronous version of getConfigFile for use in initialization.
 */
export function getConfigFileSync(ensureDirExists = true): string {
  return getConfigFile(ensureDirExists);
}
