import type { Preview } from '@storybook/react';
import '../src/renderer/index.html'; // Import base styles

// Mock electronAPI for Storybook
const mockElectronAPI = {
  getStores: async () => [],
  addStore: async () => ({ id: 'mock', name: 'Mock', path: '/mock', plotCount: 0, accessible: true }),
  parseFile: async () => ({ success: true, features: [], metadata: { parser: 'mock', version: '1.0', timestamp: new Date().toISOString(), sourceHash: 'mock' } }),
  listPlots: async () => [],
  createPlot: async () => ({ plotId: 'mock', name: 'Mock Plot', created: new Date().toISOString() }),
  addFeatures: async () => ({ plotId: 'mock', featuresAdded: 0, provenanceId: 'mock' }),
  copyAsset: async () => ({ assetPath: '/mock', assetHref: './mock' }),
  initStore: async () => {},
  onFileOpened: () => () => {},
  markOperationPending: async () => {},
  clearOperationPending: async () => {},
  getPlatform: () => 'linux',
  getDocumentsPath: async () => '/home/user/Documents',
};

// @ts-expect-error Mock for Storybook
window.electronAPI = mockElectronAPI;

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
