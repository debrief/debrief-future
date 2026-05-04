#!/usr/bin/env node
/**
 * Bundle-budget guard for #244 (Backlog Navigator mobile PWA).
 *
 * Reads scripts/bundle-baseline-244.json, gzips every
 * apps/backlog-navigator/dist/assets/*.js, fails if total exceeds
 * baseline_bytes * (1 + current_budget_pct/100). Prints baseline,
 * current, and headroom for human review.
 *
 * Per spec FR-024 / SC-010 + plan.md Review §Issue 4A.
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
const distAssetsDir = join(repoRoot, 'apps', 'backlog-navigator', 'dist', 'assets');

async function main() {
  if (!existsSync(baselinePath)) {
    console.error(`ERROR: baseline file not found at ${baselinePath}`);
    process.exit(2);
  }
  if (!existsSync(distAssetsDir)) {
    console.error(
      `ERROR: dist not built. Run \`pnpm --filter @debrief/backlog-navigator build\` first.`,
    );
    process.exit(2);
  }

  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const baselineBytes = baseline.baseline_bytes;
  const budgetPct = baseline.current_budget_pct;
  const budgetBytes = Math.floor(baselineBytes * (1 + budgetPct / 100));

  const entries = await readdir(distAssetsDir);
  const jsFiles = entries.filter((f) => f.endsWith('.js'));
  let total = 0;
  const perFile = [];
  for (const f of jsFiles) {
    const buf = await readFile(join(distAssetsDir, f));
    const gz = gzipSync(buf);
    perFile.push({ file: f, gzipped_bytes: gz.length });
    total += gz.length;
  }

  const deltaBytes = total - baselineBytes;
  const deltaPct = baselineBytes === 0 ? 0 : (deltaBytes / baselineBytes) * 100;
  const headroomBytes = budgetBytes - total;

  console.log('Bundle-size guard for backlog-navigator');
  console.log('---------------------------------------');
  console.log(`Baseline (gzipped JS):   ${baselineBytes.toLocaleString()} B  (commit ${baseline.commit_sha?.slice(0, 7) ?? '???'})`);
  console.log(`Current  (gzipped JS):   ${total.toLocaleString()} B`);
  console.log(`Delta:                   ${deltaBytes >= 0 ? '+' : ''}${deltaBytes.toLocaleString()} B  (${deltaPct.toFixed(2)}%)`);
  console.log(`Budget (${budgetPct}% over):       ${budgetBytes.toLocaleString()} B`);
  console.log(`Headroom:                ${headroomBytes >= 0 ? '+' : ''}${headroomBytes.toLocaleString()} B`);
  console.log('Per-file:');
  for (const r of perFile) {
    console.log(`  ${r.file.padEnd(40)} ${r.gzipped_bytes.toLocaleString().padStart(10)} B`);
  }

  if (total > budgetBytes) {
    console.error('');
    console.error(
      `FAIL: gzipped JS total ${total.toLocaleString()} B exceeds budget ${budgetBytes.toLocaleString()} B (baseline ${baselineBytes.toLocaleString()} B + ${budgetPct}%).`,
    );
    console.error(
      `      Either trim the bundle, or amend scripts/bundle-baseline-244.json + spec.md SC-010/FR-024 per the Issue 4A protocol.`,
    );
    process.exit(1);
  }

  console.log('');
  console.log('OK: bundle within budget.');
}

main().catch((err) => {
  console.error('Bundle-size guard crashed:', err);
  process.exit(2);
});
