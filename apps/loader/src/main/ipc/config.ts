/**
 * debrief-config TypeScript integration.
 * Provides access to user configuration (STAC store locations).
 *
 * Low-level persistence (read/write/store-paths) lives in `configStore.ts`
 * so that `stac.ts` can depend on it without creating a cycle with this
 * module (which itself lazily imports `stac.ts` for plot-count display).
 */

import { app, dialog, IpcMain } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { StacStoreInfo } from '../../renderer/types/store.js';
import { getStorePaths, readConfig, writeConfig } from './configStore.js';

// Re-export for external consumers of `./config.js` that previously relied on
// these symbols being defined here. `stac.ts` now imports them directly from
// `./configStore.js` to avoid the cycle.
export { getStorePaths };

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
 * Counts plots in a store by listing plots via debrief-stac.
 */
async function countPlots(storePath: string): Promise<number> {
  try {
    const { listPlots } = await import('./stac.js');
    const plots = await listPlots(storePath);
    return plots.length;
  } catch {
    // Service may not be available (e.g., first launch before config)
    return 0;
  }
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
 * Removes a store from the configuration.
 */
export async function removeStore(storeId: string): Promise<void> {
  const config = await readConfig();
  config.stores = config.stores.filter((s) => s.id !== storeId);
  await writeConfig(config);
}

// TODO: Add "Manage Stores" tab in the future for:
// - Renaming stores
// - Reordering stores
// - Bulk cleanup of inaccessible stores

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

  ipc.handle('config:removeStore', async (_event, storeId: string) => {
    return removeStore(storeId);
  });

  ipc.handle('app:getDocumentsPath', () => {
    return app.getPath('documents');
  });

  ipc.handle('app:joinPath', (_event, ...segments: string[]) => {
    return join(...segments);
  });

  ipc.handle('app:showFolderDialog', async (_event, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: defaultPath || app.getPath('documents'),
      title: 'Select folder for STAC catalog',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
}
