import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['__tests__/*.test.ts'],
    exclude: ['__tests__/fixtures/**', 'node_modules/**'],
    environment: 'node',
    root: HERE,
    passWithNoTests: false,
  },
});
