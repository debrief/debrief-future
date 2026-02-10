import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

/**
 * Vite plugin to handle .geojson files as JSON.
 */
function geojsonPlugin(): Plugin {
  return {
    name: 'vite-plugin-geojson',
    transform(code, id) {
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

export default defineConfig({
  // Use VITE_BASE_URL for GitHub Pages deployment (e.g., /debrief-future/web-shell/)
  base: process.env.VITE_BASE_URL || '/',
  plugins: [react(), geojsonPlugin()],
  resolve: {
    alias: {
      '@debrief/components': path.resolve(__dirname, '../../shared/components/src/index.ts'),
      // Use browser-only re-export — the full barrel re-exports Node-only modules (server, persistence)
      '@debrief/session-state': path.resolve(__dirname, 'src/session-state-browser.ts'),
      '@test-data': path.resolve(__dirname, '../vscode/test-data'),
    },
  },
});
