import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.test.ts',
      // Feature 234 — pure helper unit tests under playwright/helpers/.
      // These import nothing Playwright-specific (categoriser is pure;
      // videoToGif shells out to ffmpeg via child_process). The Playwright
      // .spec.ts files remain excluded below so vitest doesn't try to
      // execute them as unit tests.
      'playwright/helpers/__tests__/**/*.test.ts',
    ],
    exclude: ['node_modules', 'playwright/tests', 'playwright/global-setup.ts'],
  },
  resolve: {
    alias: {
      '@test-data': path.resolve(__dirname, '../vscode/test-data'),
      // #237 — alias the @debrief/components import to its source so unit
      // tests don't load the bundled dist (which transitively pulls in
      // leaflet / react-dom and breaks Node ESM resolution under jsdom).
      // The pure helpers (storyboard/activeStoryboardSelection) work
      // directly from source; runtime in the browser uses the bundle.
      '@debrief/components': path.resolve(
        __dirname,
        '../../shared/components/src/index.ts',
      ),
      // #107 — mirror the schemas alias from vite.config.ts so unit tests
      // can resolve **value** imports from @debrief/schemas (e.g.
      // OutputKindEnum), not just type-only imports.
      '@debrief/schemas': path.resolve(
        __dirname,
        '../../shared/schemas/src/generated/typescript/index.ts',
      ),
    },
  },
});
