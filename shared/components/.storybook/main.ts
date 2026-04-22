import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname shim — Node 22.6+ runs this file via native
// TS stripping as ESM, where `__dirname` is not defined. This keeps the
// config working across Node 20 (CommonJS-native), Node 22.6+ (native TS
// stripping), and all tsx / ts-node variants.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite plugin to handle .geojson files as JSON.
 */
function geojsonPlugin(): Plugin {
  return {
    name: 'vite-plugin-geojson',
    transform(_code, id) {
      if (id.endsWith('.geojson')) {
        const json = fs.readFileSync(id, 'utf-8');
        return {
          code: `export default ${json}`,
          map: null,
        };
      }
    },
  };
}

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // Include web-shell app stories for integrated demos
    '../../../apps/web-shell/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    // Add geojson plugin
    config.plugins = config.plugins || [];
    config.plugins.push(geojsonPlugin());
    // Add aliases for web-shell stories
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Resolve @debrief/components to source files for Storybook builds
      '@debrief/components': path.resolve(__dirname, '../src/index.ts'),
      // Resolve @debrief/schemas to generated TypeScript types
      '@debrief/schemas': path.resolve(__dirname, '../../../shared/schemas/src/generated/typescript/index.ts'),
      // Resolve @debrief/session-state to browser-safe shim (web-shell stories import it)
      '@debrief/session-state': path.resolve(__dirname, '../../../apps/web-shell/src/session-state-browser.ts'),
      '@test-data': path.resolve(__dirname, '../../../apps/vscode/test-data'),
    };
    return config;
  },
};

export default config;
