import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  // `@debrief/components` (and its peers) stay external — the consuming
  // host resolves them. The pure core only references the type guards.
  external: ['@debrief/components', '@debrief/schemas', 'jszip'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
  esbuildOptions(options) {
    options.outbase = 'src';
  },
});
