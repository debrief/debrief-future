import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/standalone.ts', 'src/browser.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
  esbuildOptions(options) {
    options.outbase = 'src';
  },
});
