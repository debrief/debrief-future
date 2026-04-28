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
    },
  },
});
