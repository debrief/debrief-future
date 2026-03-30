import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';

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

/**
 * Vite plugin to serve the VS Code STAC store directory as static files
 * under /stac-store/. This allows thumbnail <img> tags to load PNGs
 * directly from the local STAC catalog without bundling them (#174).
 */
/** STAC store root — override with STAC_STORE_PATH env var to point at a full catalog. */
const STAC_STORE_ROOT = process.env.STAC_STORE_PATH
  ? path.resolve(process.env.STAC_STORE_PATH)
  : path.resolve(__dirname, '../vscode/test-data/local-store');
const STAC_STORE_PREFIX = '/stac-store/';

function stacStorePlugin(): Plugin {
  return {
    name: 'vite-plugin-stac-store',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith(STAC_STORE_PREFIX)) {
          next();
          return;
        }
        const relativePath = req.url.slice(STAC_STORE_PREFIX.length);
        const filePath = path.join(STAC_STORE_ROOT, relativePath);

        // Prevent directory traversal
        if (!filePath.startsWith(STAC_STORE_ROOT)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.json': 'application/json',
          '.geojson': 'application/geo+json',
        };

        res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  // Use VITE_BASE_URL for GitHub Pages deployment (e.g., /debrief-future/web-shell/)
  base: process.env.VITE_BASE_URL || '/',
  plugins: [react(), geojsonPlugin(), stacStorePlugin()],
  resolve: {
    alias: {
      '@debrief/components': path.resolve(__dirname, '../../shared/components/src/index.ts'),
      // Use browser-only re-export — the full barrel re-exports Node-only modules (server, persistence)
      '@debrief/session-state': path.resolve(__dirname, 'src/session-state-browser.ts'),
      '@test-data': path.resolve(__dirname, '../vscode/test-data'),
    },
  },
});
