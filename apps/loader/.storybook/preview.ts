import type { Preview } from '@storybook/react';
import '../src/renderer/styles/base.css'; // Import base styles

// Mock data for Storybook
const mockStores = [
  { id: 'local', name: 'Local Analysis Store', path: '/home/user/debrief/local-catalog', plotCount: 3, accessible: true },
  { id: 'project', name: 'Project Alpha Store', path: '/shared/projects/alpha/catalog', plotCount: 12, accessible: true },
];

const mockPlots = [
  { id: 'plot1', name: 'Exercise Bravo', created: '2026-01-10T10:00:00Z', featureCount: 45 },
  { id: 'plot2', name: 'Operation Neptune', created: '2026-01-08T14:30:00Z', featureCount: 128 },
  { id: 'plot3', name: 'Training Run 3', created: '2026-01-05T09:15:00Z', featureCount: 23 },
];

// Mock electronAPI for Storybook
const mockElectronAPI = {
  getStores: async () => mockStores,
  addStore: async () => ({ id: 'new-store', name: 'New Store', path: '/new/store', plotCount: 0, accessible: true }),
  parseFile: async () => ({ success: true, features: [], metadata: { parser: 'rep-parser', version: '1.0.0', timestamp: new Date().toISOString(), sourceHash: 'abc123' } }),
  listPlots: async () => mockPlots,
  createPlot: async () => ({ plotId: 'new-plot', name: 'New Plot', created: new Date().toISOString() }),
  addFeatures: async () => ({ plotId: 'mock', featuresAdded: 45, provenanceId: 'prov-123' }),
  copyAsset: async () => ({ assetPath: '/store/assets/file.rep', assetHref: './assets/file.rep' }),
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
