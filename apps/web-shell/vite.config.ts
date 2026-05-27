import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import type { NormalizedOutputOptions, OutputBundle } from 'rollup';

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
/** STAC store root — override with STAC_STORE_PATH env var to point at a full catalog.
 *  In local dev, prefers the preview samples directory (~71 items) over minimal test-data (2 items).
 *  In CI, always uses test-data for E2E test stability. */
const PREVIEW_SAMPLES_DIR = path.resolve(__dirname, '../../preview/workspace/samples/local-store');
const TEST_DATA_DIR = path.resolve(__dirname, '../vscode/test-data/local-store');
const STAC_STORE_ROOT = process.env.STAC_STORE_PATH
  ? path.resolve(process.env.STAC_STORE_PATH)
  : (!process.env.CI && fs.existsSync(PREVIEW_SAMPLES_DIR)) ? PREVIEW_SAMPLES_DIR : TEST_DATA_DIR;
const STAC_STORE_PREFIX = '/stac-store/';

/** Serve STAC store files via middleware (shared between dev and preview servers). */
function stacStoreMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): void {
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
}

/** Recursively copy a directory tree, creating destination dirs as needed. */
function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function stacStorePlugin(): Plugin {
  return {
    name: 'vite-plugin-stac-store',
    configureServer(server) {
      server.middlewares.use(stacStoreMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(stacStoreMiddleware);
    },
    writeBundle(_options: NormalizedOutputOptions, _bundle: OutputBundle) {
      // Copy STAC store into the build output so static hosting (GitHub Pages) can serve it
      const outDir = _options.dir ?? path.resolve(__dirname, 'dist');
      const destDir = path.join(outDir, 'stac-store');
      if (fs.existsSync(STAC_STORE_ROOT)) {
        copyDirSync(STAC_STORE_ROOT, destDir);
        console.log(`[stac-store] Copied STAC store to ${destDir}`);
      }
    },
  };
}

/**
 * #273 — Serve the briefing-renderer SPA under `/briefing-renderer/` so the
 * live Preview button can open it same-origin in a new tab (dev, `vite
 * preview`, and the static Pages build). Mirrors `stacStorePlugin`: a
 * middleware in dev/preview + a `writeBundle` copy for the static build.
 * The renderer dist must be built first (`pnpm --filter
 * @debrief/briefing-renderer build`).
 */
const BRIEFING_RENDERER_DIST = path.resolve(__dirname, '../briefing-renderer/dist');
const BRIEFING_RENDERER_PREFIX = '/briefing-renderer/';

function briefingRendererMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  if (!req.url?.startsWith(BRIEFING_RENDERER_PREFIX)) {
    next();
    return;
  }
  // Strip the prefix + any query string; default the directory root to index.html.
  const afterPrefix = req.url.slice(BRIEFING_RENDERER_PREFIX.length).split('?')[0] ?? '';
  const relativePath = afterPrefix === '' ? 'index.html' : afterPrefix;
  const filePath = path.join(BRIEFING_RENDERER_DIST, relativePath);

  // Prevent directory traversal.
  if (!filePath.startsWith(BRIEFING_RENDERER_DIST)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}

function briefingRendererPlugin(): Plugin {
  return {
    name: 'vite-plugin-briefing-renderer',
    configureServer(server) {
      server.middlewares.use(briefingRendererMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(briefingRendererMiddleware);
    },
    writeBundle(_options: NormalizedOutputOptions, _bundle: OutputBundle) {
      const outDir = _options.dir ?? path.resolve(__dirname, 'dist');
      const destDir = path.join(outDir, 'briefing-renderer');
      if (fs.existsSync(BRIEFING_RENDERER_DIST)) {
        copyDirSync(BRIEFING_RENDERER_DIST, destDir);
        console.log(`[briefing-renderer] Copied SPA to ${destDir}`);
      } else {
        console.warn(
          `[briefing-renderer] dist not found at ${BRIEFING_RENDERER_DIST} — ` +
            `run \`pnpm --filter @debrief/briefing-renderer build\` before building web-shell.`,
        );
      }
    },
  };
}

export default defineConfig({
  // Use VITE_BASE_URL for GitHub Pages deployment (e.g., /debrief-future/web-shell/)
  base: process.env.VITE_BASE_URL || '/',
  plugins: [react(), geojsonPlugin(), stacStorePlugin(), briefingRendererPlugin()],
  resolve: {
    alias: {
      // #273 — briefing-export core + the storyboard subpath resolve to
      // source (mirrors @debrief/components). The specific subpath MUST
      // precede the general @debrief/components alias so prefix-matching
      // does not mangle it.
      '@debrief/briefing-export': path.resolve(__dirname, '../../shared/briefing-export/src/index.ts'),
      '@debrief/components/storyboard': path.resolve(__dirname, '../../shared/components/src/storyboard/index.ts'),
      '@debrief/components': path.resolve(__dirname, '../../shared/components/src/index.ts'),
      '@debrief/schemas': path.resolve(__dirname, '../../shared/schemas/src/generated/typescript/index.ts'),
      // Use browser-only re-export — the full barrel re-exports Node-only modules (server, persistence)
      '@debrief/session-state': path.resolve(__dirname, 'src/session-state-browser.ts'),
      '@test-data': path.resolve(__dirname, '../vscode/test-data'),
    },
  },
});
