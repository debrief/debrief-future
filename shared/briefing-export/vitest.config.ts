import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      // Resolve the storyboard subpath to source so tests stay off the
      // Leaflet-dependent components barrel (mirrors the VS Code config).
      '@debrief/components/storyboard': path.resolve(
        __dirname,
        '../components/src/storyboard/index.ts',
      ),
      '@debrief/schemas': path.resolve(
        __dirname,
        '../schemas/src/generated/typescript/index.ts',
      ),
    },
  },
});
