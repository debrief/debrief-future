/**
 * debrief-config persistence layer (leaf module).
 *
 * Extracted from `config.ts` to break a cyclic dependency with `stac.ts`:
 *   - `stac.ts` needs `getStorePaths()` during initialisation/reconfigure
 *   - `config.ts` lazy-imports `stac.ts` (via `countPlots()`) to surface
 *     plot counts in the store list
 *
 * Keeping the low-level config I/O in this dependency-free module lets
 * `stac.ts` pull in store paths without importing `config.ts`, eliminating
 * the cycle flagged by madge.
 */

import { app } from 'electron';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';

const CONFIG_FILE = 'config.json';

export interface DebriefConfig {
  stores: Array<{
    id: string;
    name: string;
    path: string;
  }>;
}

/**
 * Gets the path to the config file.
 */
export function getConfigPath(): string {
  // Use XDG-compliant path
  const configDir =
    process.env.XDG_CONFIG_HOME || join(app.getPath('home'), '.config', 'debrief');
  return join(configDir, CONFIG_FILE);
}

/**
 * Ensures config directory exists.
 */
export async function ensureConfigDir(): Promise<void> {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);
  await fs.mkdir(configDir, { recursive: true });
}

/**
 * Reads the configuration file.
 */
export async function readConfig(): Promise<DebriefConfig> {
  try {
    const data = await fs.readFile(getConfigPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return { stores: [] };
  }
}

/**
 * Writes the configuration file.
 */
export async function writeConfig(config: DebriefConfig): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2));
}

/**
 * Gets all store paths for debrief-stac configuration.
 */
export async function getStorePaths(): Promise<string[]> {
  const config = await readConfig();
  return config.stores.map((s) => s.path);
}
