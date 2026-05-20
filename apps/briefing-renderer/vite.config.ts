import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The briefing-renderer ships as a static SPA loadable from a file://
// origin. Use base: './' so all asset paths in the built index.html
// are relative — required by FR-013 (briefing zip must be portable
// across any unpack path including paths with spaces / non-ASCII chars).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      // Match the web-shell alias (#237) — resolve @debrief/components
      // to source so the dev server doesn't load the bundled dist.
      '@debrief/components': path.resolve(__dirname, '../../shared/components/src/index.ts'),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsInlineLimit: 0,
    // Don't emit a `crossorigin` attribute on <script>/<link> tags. The
    // SPA loads from a file:// origin where the attribute triggers a
    // CORS check that Chrome / Edge fail (the spec defines CORS only
    // for http(s), so the attribute makes file://-origin loading worse,
    // not better).
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },
});
