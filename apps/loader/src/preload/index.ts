/**
 * Electron preload script.
 * Exposes secure IPC channels to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { StacStoreInfo, PlotInfo, ParseResult } from '../renderer/types/index.js';

/**
 * API exposed to renderer process via window.electronAPI
 */
const electronAPI = {
  // Config service
  getStores: (): Promise<StacStoreInfo[]> => ipcRenderer.invoke('config:getStores'),
  addStore: (store: Omit<StacStoreInfo, 'id' | 'plotCount' | 'accessible'>): Promise<StacStoreInfo> =>
    ipcRenderer.invoke('config:addStore', store),
  removeStore: (storeId: string): Promise<void> => ipcRenderer.invoke('config:removeStore', storeId),

  // IO service
  parseFile: (filePath: string): Promise<ParseResult> => ipcRenderer.invoke('io:parseFile', filePath),

  // STAC service
  listPlots: (storePath: string): Promise<PlotInfo[]> => ipcRenderer.invoke('stac:listPlots', storePath),
  createPlot: (
    storePath: string,
    name: string,
    description?: string
  ): Promise<{ plotId: string; name: string; created: string }> =>
    ipcRenderer.invoke('stac:createPlot', storePath, name, description),
  addFeatures: (
    storePath: string,
    plotId: string,
    features: unknown[],
    provenance: {
      sourcePath: string;
      sourceHash: string;
      parser: string;
      parserVersion: string;
      timestamp: string;
    }
  ): Promise<{ plotId: string; featuresAdded: number; provenanceId: string }> =>
    ipcRenderer.invoke('stac:addFeatures', storePath, plotId, features, provenance),
  copyAsset: (
    storePath: string,
    plotId: string,
    sourcePath: string,
    assetRole: string
  ): Promise<{ assetPath: string; assetHref: string }> =>
    ipcRenderer.invoke('stac:copyAsset', storePath, plotId, sourcePath, assetRole),
  initStore: (path: string, name: string): Promise<void> =>
    ipcRenderer.invoke('stac:initStore', path, name),

  // File events
  onFileOpened: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('file-opened', handler);
    return () => ipcRenderer.removeListener('file-opened', handler);
  },

  // Cleanup operations
  markOperationPending: (operationId: string): Promise<void> =>
    ipcRenderer.invoke('cleanup:markPending', operationId),
  clearOperationPending: (operationId: string): Promise<void> =>
    ipcRenderer.invoke('cleanup:clearPending', operationId),

  // App info
  getPlatform: (): string => process.platform,
  getDocumentsPath: (): Promise<string> => ipcRenderer.invoke('app:getDocumentsPath'),
  joinPath: (...segments: string[]): Promise<string> =>
    ipcRenderer.invoke('app:joinPath', ...segments),
  showFolderDialog: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('app:showFolderDialog', defaultPath),
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
