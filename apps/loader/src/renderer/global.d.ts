/**
 * Global type declarations for the renderer process.
 */

import type { ElectronAPI } from '../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
