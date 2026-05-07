/**
 * Unit tests for scripts/check-bundle-size.mjs.
 *
 * Covers the six contract cases enumerated in
 * specs/247-lazy-mobile-bundle/contracts/bundle-budget-cli.md §"Test contract".
 *
 * Run with: node --test scripts/__tests__/check-bundle-size.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGuard } from '../check-bundle-size.mjs';

/**
 * Build a self-contained fixture tree under a fresh temp dir:
 *
 *   <root>/scripts/bundle-baseline-244.json
 *   <root>/dist/.vite/manifest.json
 *   <root>/dist/<entry.file>          (if entryContent provided)
 *   <root>/dist/assets/*.js           (additional chunks)
 */
function buildFixture({ baseline, manifest, files, omitManifest = false }) {
  const root = join(
    tmpdir(),
    `cbs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'dist', '.vite'), { recursive: true });
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });

  const baselinePath = join(root, 'scripts', 'bundle-baseline-244.json');
  writeFileSync(baselinePath, JSON.stringify(baseline ?? {}, null, 2));

  if (!omitManifest && manifest) {
    writeFileSync(
      join(root, 'dist', '.vite', 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );
  }

  for (const [rel, content] of Object.entries(files ?? {})) {
    const abs = join(root, 'dist', rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content);
  }

  return {
    root,
    baselinePath,
    distDir: join(root, 'dist'),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const SMALL_BASELINE = {
  feature: '247-test',
  baseline_bytes: 1000,
  baseline_files: { 'apps/backlog-navigator/dist/assets/index-aaa.js': 1000 },
  commit_sha: 'deadbeefcafebabe',
  captured_at: '2026-05-07T00:00:00Z',
  target_pct: 15,
  cap_pct: 30,
  current_budget_pct: 15,
  notes: 'fixture',
};

// 1 KB of compressible content (gzips small).
const SMALL_JS = 'var x = "hello world";\n'.repeat(50);
// 100 KB of varied content (gzips larger). Use random-ish string so gzip can't crush it to nothing.
const LARGE_JS = (() => {
  let s = '';
  for (let i = 0; i < 50000; i++) s += `var v${i}=${Math.random().toString(36)};\n`;
  return s;
})();

test('within-budget single entry → exit 0, "OK: entry chunk within budget."', async () => {
  const fx = buildFixture({
    baseline: SMALL_BASELINE,
    manifest: {
      'src/main.tsx': {
        file: 'assets/index-aaa.js',
        isEntry: true,
      },
    },
    files: {
      'assets/index-aaa.js': SMALL_JS,
    },
  });
  try {
    const res = await runGuard({ baselinePath: fx.baselinePath, distDir: fx.distDir });
    assert.equal(res.exitCode, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /OK: entry chunk within budget\./);
    assert.match(res.stdout, /Entry chunk:\s+assets\/index-aaa\.js/);
  } finally {
    fx.cleanup();
  }
});

test('over-budget single entry → exit 1, FAIL message on stderr', async () => {
  const fx = buildFixture({
    baseline: SMALL_BASELINE,
    manifest: {
      'src/main.tsx': {
        file: 'assets/index-bbb.js',
        isEntry: true,
      },
    },
    files: {
      'assets/index-bbb.js': LARGE_JS,
    },
  });
  try {
    const res = await runGuard({ baselinePath: fx.baselinePath, distDir: fx.distDir });
    assert.equal(res.exitCode, 1);
    assert.match(res.stderr, /FAIL: entry chunk gzipped size .* exceeds budget/);
  } finally {
    fx.cleanup();
  }
});

test('manifest with zero entries → exit 2', async () => {
  const fx = buildFixture({
    baseline: SMALL_BASELINE,
    manifest: {
      'src/util.ts': { file: 'assets/util.js' },
    },
    files: { 'assets/util.js': SMALL_JS },
  });
  try {
    const res = await runGuard({ baselinePath: fx.baselinePath, distDir: fx.distDir });
    assert.equal(res.exitCode, 2);
    assert.match(res.stderr, /manifest contains zero entries with isEntry=true/);
  } finally {
    fx.cleanup();
  }
});

test('manifest with multiple entries → exit 2', async () => {
  const fx = buildFixture({
    baseline: SMALL_BASELINE,
    manifest: {
      'src/main.tsx': { file: 'assets/index-ccc.js', isEntry: true },
      'src/other.tsx': { file: 'assets/other-ddd.js', isEntry: true },
    },
    files: {
      'assets/index-ccc.js': SMALL_JS,
      'assets/other-ddd.js': SMALL_JS,
    },
  });
  try {
    const res = await runGuard({ baselinePath: fx.baselinePath, distDir: fx.distDir });
    assert.equal(res.exitCode, 2);
    assert.match(res.stderr, /manifest contains 2 entries with isEntry=true/);
  } finally {
    fx.cleanup();
  }
});

test('missing manifest → exit 2', async () => {
  const fx = buildFixture({
    baseline: SMALL_BASELINE,
    omitManifest: true,
    files: { 'assets/index-eee.js': SMALL_JS },
  });
  try {
    const res = await runGuard({ baselinePath: fx.baselinePath, distDir: fx.distDir });
    assert.equal(res.exitCode, 2);
    assert.match(res.stderr, /manifest not found at/);
  } finally {
    fx.cleanup();
  }
});

test('lazy chunks are listed alongside entry with annotations', async () => {
  const fx = buildFixture({
    baseline: SMALL_BASELINE,
    manifest: {
      'src/main.tsx': {
        file: 'assets/index-fff.js',
        isEntry: true,
        dynamicImports: ['src/components/mobile/CardList.tsx'],
      },
      'src/components/mobile/CardList.tsx': {
        file: 'assets/CardList-ggg.js',
        isDynamicEntry: true,
      },
    },
    files: {
      'assets/index-fff.js': SMALL_JS,
      'assets/CardList-ggg.js': SMALL_JS,
    },
  });
  try {
    const res = await runGuard({ baselinePath: fx.baselinePath, distDir: fx.distDir });
    assert.equal(res.exitCode, 0, res.stderr || res.stdout);
    // Entry annotation present
    assert.match(res.stdout, /assets\/index-fff\.js\s+\(entry\)/);
    // Lazy annotation present
    assert.match(res.stdout, /assets\/CardList-ggg\.js\s+\(lazy\)/);
  } finally {
    fx.cleanup();
  }
});

test('missing baseline file → exit 2', async () => {
  const fx = buildFixture({
    baseline: SMALL_BASELINE,
    manifest: {
      'src/main.tsx': { file: 'assets/index-zzz.js', isEntry: true },
    },
    files: { 'assets/index-zzz.js': SMALL_JS },
  });
  try {
    // Use a baseline path that doesn't exist on disk
    const res = await runGuard({
      baselinePath: join(fx.root, 'scripts', 'does-not-exist.json'),
      distDir: fx.distDir,
    });
    assert.equal(res.exitCode, 2);
    assert.match(res.stderr, /baseline file not found/);
  } finally {
    fx.cleanup();
  }
});
