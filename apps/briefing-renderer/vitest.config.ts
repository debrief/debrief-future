import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    exclude: ['node_modules', 'playwright', 'dist'],
  },
  resolve: {
    alias: {
      // Match the alias web-shell uses (#237) — unit tests resolve
      // @debrief/components to its source so vitest doesn't load the
      // bundled dist (which transitively pulls in leaflet / react-dom
      // and breaks Node ESM resolution under jsdom).
      '@debrief/components': path.resolve(
        __dirname,
        '../../shared/components/src/index.ts',
      ),
    },
  },
});

