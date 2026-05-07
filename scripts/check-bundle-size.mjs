#!/usr/bin/env node
/**
 * Bundle-budget guard for the Backlog Navigator.
 *
 * Originally introduced in #244 to gate transfer-cost growth on the mobile
 * PWA. Re-contracted in #247: instead of summing every JS file in
 * `dist/assets/`, this script now identifies the desktop entry chunk via the
 * Vite build manifest (`dist/.vite/manifest.json`) and gzip-measures *only*
 * that file against the baseline. This is the only contract that produces
 * the right number after `React.lazy` splits the mobile subtree into its own
 * chunk — summing all JS would mechanically still see the same total bytes
 * after the split.
 *
 * See specs/247-lazy-mobile-bundle/contracts/bundle-budget-cli.md for the
 * authoritative CLI contract.
 *
 * Exit codes (preserved from the pre-#247 contract):
 *   0 — entry chunk within budget
 *   1 — entry chunk exceeds budget
 *   2 — configuration error (cannot evaluate)
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

const baselinePath = join(repoRoot, 'scripts', 'bundle-baseline-244.json');
const distDir = join(repoRoot, 'apps', 'backlog-navigator', 'dist');
const manifestPath = join(distDir, '.vite', 'manifest.json');
const distAssetsDir = join(distDir, 'assets');

/**
 * Run the guard against the given paths. Pure function so the unit test can
 * point it at fixture directories.
 *
 * @param {{baselinePath: string, distDir: string}} paths
 * @returns {Promise<{exitCode: 0 | 1 | 2, stdout: string, stderr: string}>}
 */
export async function runGuard({ baselinePath: b, distDir: d }) {
  const out = [];
  const err = [];
  const log = (line = '') => out.push(line);
  const elog = (line = '') => err.push(line);

  if (!existsSync(b)) {
    elog(`ERROR: baseline file not found at ${b}`);
    return { exitCode: 2, stdout: out.join('\n'), stderr: err.join('\n') };
  }

  const baseline = JSON.parse(await readFile(b, 'utf8'));
  const baselineBytes = baseline.baseline_bytes;
  const budgetPct = baseline.current_budget_pct;
  const budgetBytes = Math.floor(baselineBytes * (1 + budgetPct / 100));

  const manifestFile = join(d, '.vite', 'manifest.json');
  if (!existsSync(manifestFile)) {
    elog(
      `ERROR: manifest not found at ${manifestFile}. Ensure vite.config.ts has build.manifest=true and run \`pnpm --filter @debrief/backlog-navigator build\` first.`,
    );
    return { exitCode: 2, stdout: out.join('\n'), stderr: err.join('\n') };
  }

  /** @type {Record<string, {file: string, isEntry?: boolean, isDynamicEntry?: boolean}>} */
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const entries = Object.entries(manifest).filter(([, v]) => v.isEntry === true);

  if (entries.length === 0) {
    elog('ERROR: manifest contains zero entries with isEntry=true.');
    return { exitCode: 2, stdout: out.join('\n'), stderr: err.join('\n') };
  }
  if (entries.length > 1) {
    elog(
      `ERROR: manifest contains ${entries.length} entries with isEntry=true; expected exactly 1. The Backlog Navigator is a single-entry SPA.`,
    );
    return { exitCode: 2, stdout: out.join('\n'), stderr: err.join('\n') };
  }

  const [, entry] = entries[0];
  const entryFile = join(d, entry.file);
  if (!existsSync(entryFile)) {
    elog(`ERROR: entry chunk file ${entryFile} not found on disk.`);
    return { exitCode: 2, stdout: out.join('\n'), stderr: err.join('\n') };
  }

  const entryBuf = await readFile(entryFile);
  const entryGz = gzipSync(entryBuf).length;

  const deltaBytes = entryGz - baselineBytes;
  const deltaPct = baselineBytes === 0 ? 0 : (deltaBytes / baselineBytes) * 100;
  const headroomBytes = budgetBytes - entryGz;

  log('Bundle-size guard for backlog-navigator');
  log('---------------------------------------');
  log(`Entry chunk:             ${entry.file}`);
  log(
    `Baseline (gzipped):      ${baselineBytes.toLocaleString()} B  (commit ${baseline.commit_sha?.slice(0, 7) ?? '???'})`,
  );
  log(`Current  (gzipped):      ${entryGz.toLocaleString()} B`);
  log(
    `Delta:                   ${deltaBytes >= 0 ? '+' : ''}${deltaBytes.toLocaleString()} B  (${deltaPct.toFixed(2)}%)`,
  );
  log(`Budget (${budgetPct}% over):       ${budgetBytes.toLocaleString()} B`);
  log(`Headroom:                ${headroomBytes >= 0 ? '+' : ''}${headroomBytes.toLocaleString()} B`);
  log('');
  log('All chunks (informational):');

  // Build a lookup: which manifest entries are dynamic?
  const lazyFiles = new Set(
    Object.values(manifest)
      .filter((v) => v.isDynamicEntry === true)
      .map((v) => v.file),
  );
  const entryFileRel = entry.file;

  // Print every JS file in dist/assets/ for human review, annotating each.
  const distAssetsDirAbs = join(d, 'assets');
  if (existsSync(distAssetsDirAbs)) {
    const allEntries = await readdir(distAssetsDirAbs);
    const jsFiles = allEntries.filter((f) => f.endsWith('.js')).sort();
    for (const f of jsFiles) {
      const rel = `assets/${f}`;
      const buf = await readFile(join(distAssetsDirAbs, f));
      const gz = gzipSync(buf).length;
      let label = '';
      if (rel === entryFileRel) label = '(entry)';
      else if (lazyFiles.has(rel)) label = '(lazy)';
      else label = '(chunk)';
      log(`  ${rel.padEnd(40)} ${label.padEnd(8)} ${gz.toLocaleString().padStart(10)} B`);
    }
  }

  if (entryGz > budgetBytes) {
    elog('');
    elog(
      `FAIL: entry chunk gzipped size ${entryGz.toLocaleString()} B exceeds budget ${budgetBytes.toLocaleString()} B (baseline ${baselineBytes.toLocaleString()} B + ${budgetPct}%).`,
    );
    elog(
      '      Either trim the entry chunk, or amend scripts/bundle-baseline-244.json per the Issue 4A protocol.',
    );
    return { exitCode: 1, stdout: out.join('\n'), stderr: err.join('\n') };
  }

  log('');
  log('OK: entry chunk within budget.');
  return { exitCode: 0, stdout: out.join('\n'), stderr: err.join('\n') };
}

async function main() {
  const result = await runGuard({ baselinePath, distDir });
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(result.exitCode);
}

// Only run main when invoked as a script, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Bundle-size guard crashed:', err);
    process.exit(2);
  });
}
