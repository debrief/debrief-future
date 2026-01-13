/**
 * Vitest setup file.
 * Configures test environment and global mocks.
 */

import { vi } from 'vitest';

// Mock electron API for renderer tests
const mockElectronAPI = {
  getStores: vi.fn(),
  addStore: vi.fn(),
  parseFile: vi.fn(),
  listPlots: vi.fn(),
  createPlot: vi.fn(),
  addFeatures: vi.fn(),
  copyAsset: vi.fn(),
  initStore: vi.fn(),
  onFileOpened: vi.fn(() => vi.fn()),
  markOperationPending: vi.fn(),
  clearOperationPending: vi.fn(),
  getPlatform: vi.fn(() => 'linux'),
  getDocumentsPath: vi.fn(),
};

// Expose mock to window
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Export for test access
export { mockElectronAPI };
