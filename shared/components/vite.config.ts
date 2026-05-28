import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src'],
      exclude: ['**/*.stories.tsx', '**/*.test.tsx'],
    }),
    cssInjectedByJsPlugin({
      // Inject CSS into the main index.js entry point
      jsAssetsFilterFunction: (outputChunk) => outputChunk.name === 'index',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'MapView/index': resolve(__dirname, 'src/MapView/index.ts'),
        'Timeline/index': resolve(__dirname, 'src/Timeline/index.ts'),
        'FeatureList/index': resolve(__dirname, 'src/FeatureList/index.ts'),
        'ThemeProvider/index': resolve(__dirname, 'src/ThemeProvider/index.ts'),
        'ChartRenderer/index': resolve(__dirname, 'src/ChartRenderer/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'leaflet',
        'react-leaflet',
        'vega',
        'vega-lite',
        'vega-embed',
        'vscrui',
        // Spec 192 — `@debrief/session-state` exposes `parsePath` (used by
        // the new mode resolver) and `saveSession` (Node-only fs). Bundling
        // it pulls fs/promises into the browser bundle and breaks the
        // build. Workspace consumers already install the package directly,
        // so externalising is the correct shape.
        '@debrief/session-state',
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          leaflet: 'L',
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
