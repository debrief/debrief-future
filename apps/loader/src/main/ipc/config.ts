/**
 * debrief-config TypeScript integration.
 * Provides access to user configuration (STAC store locations).
 */

import { app, IpcMain } from 'electron';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import type { StacStoreInfo } from '../../renderer/types/store.js';

const CONFIG_FILE = 'config.json';

interface DebriefConfig {
  stores: Array<{
    id: string;
    name: string;
    path: string;
  }>;
}

/**
 * Gets the path to the config file.
 */
function getConfigPath(): string {
  // Use XDG-compliant path
  const configDir =
    process.env.XDG_CONFIG_HOME || join(app.getPath('home'), '.config', 'debrief');
  return join(configDir, CONFIG_FILE);
}

/**
 * Ensures config directory exists.
 */
async function ensureConfigDir(): Promise<void> {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);
  await fs.mkdir(configDir, { recursive: true });
}

/**
 * Reads the configuration file.
 */
async function readConfig(): Promise<DebriefConfig> {
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
async function writeConfig(config: DebriefConfig): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2));
}

/**
 * Checks if a store path is accessible.
 */
async function checkStoreAccess(path: string): Promise<{ accessible: boolean; error?: string }> {
  try {
    await fs.access(path);
    return { accessible: true };
  } catch (err) {
    return {
      accessible: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Counts plots in a store (placeholder - would call debrief-stac).
 */
async function countPlots(_path: string): Promise<number> {
  // TODO: Implement via debrief-stac list_plots call
  return 0;
}

/**
 * Gets all configured stores with accessibility info.
 */
export async function getStores(): Promise<StacStoreInfo[]> {
  const config = await readConfig();

  const stores: StacStoreInfo[] = await Promise.all(
    config.stores.map(async (store) => {
      const access = await checkStoreAccess(store.path);
      const plotCount = access.accessible ? await countPlots(store.path) : 0;

      return {
        id: store.id,
        name: store.name,
        path: store.path,
        plotCount,
        accessible: access.accessible,
        accessError: access.error,
      };
    })
  );

  return stores;
}

/**
 * Adds a new store to the configuration.
 */
export async function addStore(
  store: Omit<StacStoreInfo, 'id' | 'plotCount' | 'accessible'>
): Promise<StacStoreInfo> {
  const config = await readConfig();

  const newStore = {
    id: `store-${Date.now()}`,
    name: store.name,
    path: store.path,
  };

  config.stores.push(newStore);
  await writeConfig(config);

  const access = await checkStoreAccess(store.path);

  return {
    ...newStore,
    plotCount: 0,
    accessible: access.accessible,
    accessError: access.error,
  };
}

/**
 * Gets all store paths for debrief-stac configuration.
 */
export async function getStorePaths(): Promise<string[]> {
  const config = await readConfig();
  return config.stores.map((s) => s.path);
}

/**
 * Sets up IPC handlers for config operations.
 */
export function setupConfigHandlers(ipc: IpcMain): void {
  ipc.handle('config:getStores', async () => {
    return getStores();
  });

  ipc.handle(
    'config:addStore',
    async (_event, store: Omit<StacStoreInfo, 'id' | 'plotCount' | 'accessible'>) => {
      return addStore(store);
    }
  );

  ipc.handle('app:getDocumentsPath', () => {
    return app.getPath('documents');
  });

  ipc.handle('app:joinPath', (_event, ...segments: string[]) => {
    return join(...segments);
  });
}
