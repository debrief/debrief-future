import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'playwright'],
  },
  resolve: {
    alias: {
      '@test-data': path.resolve(__dirname, '../vscode/test-data'),
    },
  },
});
