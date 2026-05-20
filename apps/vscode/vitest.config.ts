import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/integration/**', 'tests/e2e/**', 'node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/extension.ts', // Entry point, integration tested
        'src/webview/web/**', // Browser code, tested separately
        'src/**/*.d.ts',
      ],
    },
    setupFiles: ['tests/setup.ts'],
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      vscode: path.resolve(__dirname, 'tests/__mocks__/vscode.ts'),
      '@debrief/components/ToolMatch': path.resolve(__dirname, '../../shared/components/src/ToolMatch/index.ts'),
      '@debrief/components/PropertiesPanel/provenanceTypes': path.resolve(__dirname, '../../shared/components/src/PropertiesPanel/provenanceTypes.ts'),
      '@debrief/components/PropertiesPanel/autoDerivedFields': path.resolve(__dirname, '../../shared/components/src/PropertiesPanel/autoDerivedFields.ts'),
      // Briefing-zip export (#264) — keep tests off the Leaflet-dependent barrel.
      '@debrief/components/storyboard': path.resolve(__dirname, '../../shared/components/src/storyboard/index.ts'),
      '@debrief/components': path.resolve(__dirname, '../../shared/components/src/index.ts'),
      '@debrief/schemas': path.resolve(__dirname, '../../shared/schemas/src/generated/typescript/index.ts'),
    },
  },
});
