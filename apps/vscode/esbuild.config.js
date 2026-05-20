// @ts-check
const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const target = process.argv.includes('--webview') ? 'webview' : 'extension';

/** @type {esbuild.BuildOptions} */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !isWatch,
  alias: {
    // Resolve subpath import to source (ToolMatch has no bundled index.js)
    '@debrief/components/ToolMatch': path.resolve(__dirname, '../../shared/components/src/ToolMatch/index.ts'),
    // Properties Panel (#193) — pull these directly from source so the Node
    // extension bundle doesn't drag the Leaflet/DOM-dependent barrel.
    '@debrief/components/PropertiesPanel/provenanceTypes': path.resolve(__dirname, '../../shared/components/src/PropertiesPanel/provenanceTypes.ts'),
    '@debrief/components/PropertiesPanel/autoDerivedFields': path.resolve(__dirname, '../../shared/components/src/PropertiesPanel/autoDerivedFields.ts'),
    // Briefing-zip export (#264) — same pattern: avoid the Leaflet pull
    // by importing the storyboard helpers directly from source.
    '@debrief/components/storyboard': path.resolve(__dirname, '../../shared/components/src/storyboard/index.ts'),
  },
};

/** @type {esbuild.BuildOptions} */
const webviewConfig = {
  entryPoints: ['src/webview/web/map.ts'],
  bundle: true,
  outfile: 'dist/webview/map.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: !isWatch,
  loader: {
    '.css': 'text',
    '.html': 'text',
  },
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
};

async function build() {
  const config = target === 'webview' ? webviewConfig : extensionConfig;

  if (isWatch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log(`Watching ${target}...`);
  } else {
    await esbuild.build(config);
    console.log(`Built ${target}`);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
