import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

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
      // #273 — web-shell stories transitively import @debrief/briefing-export.
      // Resolve it (and the storyboard subpath it imports) to source BEFORE
      // the general @debrief/components alias so prefix-matching does not
      // mangle `@debrief/components/storyboard` into `src/index.ts/storyboard`.
      '@debrief/briefing-export': path.resolve(__dirname, '../../briefing-export/src/index.ts'),
      '@debrief/components/storyboard': path.resolve(__dirname, '../src/storyboard/index.ts'),
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
