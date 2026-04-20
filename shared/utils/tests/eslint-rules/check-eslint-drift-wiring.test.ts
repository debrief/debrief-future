/**
 * Tests for scripts/check-eslint-drift-wiring.cjs
 *
 * Feature #214 — verifies the wiring-forgotten meta-check correctly
 * detects missing spreads across apps/<x>/.eslintrc.cjs files without
 * modifying the real tree.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT = path.resolve(REPO_ROOT, 'scripts', 'check-eslint-drift-wiring.cjs');

function runScript(cwd: string): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

describe('check-eslint-drift-wiring — real tree (passing baseline)', () => {
  it('exits 0 on the real repo-root tree', () => {
    const { stdout, stderr, status } = runScript(REPO_ROOT);
    expect(stderr).not.toContain('❌');
    expect(stdout).toContain('✓ check-eslint-drift-wiring');
    expect(status).toBe(0);
  });
});

describe('check-eslint-drift-wiring — synthetic tree (failure modes)', () => {
  let tmpRoot: string;
  const appsDir = (): string => path.join(tmpRoot, 'apps');
  const sharedEslintRules = (): string => path.join(tmpRoot, 'shared', 'eslint-rules');
  const scriptsDir = (): string => path.join(tmpRoot, 'scripts');

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-wiring-'));
    // Copy caller modules from the real tree so the tested script can
    // resolve them via `require()`.
    fs.mkdirSync(sharedEslintRules(), { recursive: true });
    const realCaller = path.resolve(
      REPO_ROOT,
      'shared',
      'eslint-rules',
      'no-redeclare-utils-exports.cjs',
    );
    const realFactory = path.resolve(
      REPO_ROOT,
      'shared',
      'eslint-rules',
      'drift-rule-factory.cjs',
    );
    // We use absolute-path requires in the synthetic caller to avoid having
    // to copy the factory + utils source tree.
    const syntheticCaller = `
      const rules = require(${JSON.stringify(realCaller)}).rules;
      module.exports = { rules };
    `;
    fs.writeFileSync(
      path.join(sharedEslintRules(), 'no-redeclare-utils-exports.cjs'),
      syntheticCaller,
    );
    // Also reference the factory so it's discoverable from its expected name.
    fs.writeFileSync(
      path.join(sharedEslintRules(), 'drift-rule-factory.cjs'),
      `module.exports = require(${JSON.stringify(realFactory)});`,
    );
    // Copy the check script so it resolves CALLER_MODULES relative to its
    // own location inside tmpRoot.
    fs.mkdirSync(scriptsDir(), { recursive: true });
    const realScript = fs.readFileSync(SCRIPT, 'utf8');
    fs.writeFileSync(
      path.join(scriptsDir(), 'check-eslint-drift-wiring.cjs'),
      realScript,
    );
    fs.mkdirSync(appsDir(), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeAppEslintrc(appName: string, body: string): void {
    const dir = path.join(appsDir(), appName);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.eslintrc.cjs'), body);
  }

  function runSyntheticScript(): { stdout: string; stderr: string; status: number | null } {
    const result = spawnSync(
      process.execPath,
      [path.join(scriptsDir(), 'check-eslint-drift-wiring.cjs')],
      {
        cwd: tmpRoot,
        encoding: 'utf8',
        env: { ...process.env },
      },
    );
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      status: result.status,
    };
  }

  function clearAppsDir(): void {
    if (fs.existsSync(appsDir())) {
      fs.rmSync(appsDir(), { recursive: true, force: true });
    }
    fs.mkdirSync(appsDir(), { recursive: true });
  }

  it('(a) passes when every apps/*/.eslintrc.cjs spreads the caller module', () => {
    clearAppsDir();
    writeAppEslintrc(
      'ok-app',
      `const { rules: utilsDriftRules } = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
       module.exports = {
         rules: {
           'no-restricted-syntax': ['error', ...utilsDriftRules],
         },
       };`,
    );
    const result = runSyntheticScript();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✓ check-eslint-drift-wiring');
  });

  it('(b) fails when an app omits the spread', () => {
    clearAppsDir();
    writeAppEslintrc(
      'missing-app',
      `module.exports = {
         rules: {
           'no-restricted-syntax': ['error'],
         },
       };`,
    );
    const result = runSyntheticScript();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('❌ ESLint drift-rule wiring check failed');
    expect(result.stderr).toContain('apps/missing-app/.eslintrc.cjs');
    expect(result.stderr).toContain('...utilsDriftRules');
  });

  it('(c) fails when the eslintrc has no no-restricted-syntax rule at all', () => {
    clearAppsDir();
    writeAppEslintrc(
      'bare-app',
      `module.exports = { rules: {} };`,
    );
    const result = runSyntheticScript();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('apps/bare-app/.eslintrc.cjs');
    expect(result.stderr).toContain('...utilsDriftRules');
  });

  it('(d) fails with a distinct message when a .eslintrc.cjs throws at require()', () => {
    clearAppsDir();
    writeAppEslintrc('broken-app', `throw new Error('broken config');`);
    const result = runSyntheticScript();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('apps/broken-app/.eslintrc.cjs');
    expect(result.stderr).toContain('threw at require()');
  });

  it('(e) ignores apps/* directories without a .eslintrc.cjs (FR-018)', () => {
    clearAppsDir();
    // Well-wired app.
    writeAppEslintrc(
      'ok-app-2',
      `const { rules: utilsDriftRules } = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
       module.exports = {
         rules: {
           'no-restricted-syntax': ['error', ...utilsDriftRules],
         },
       };`,
    );
    // Sibling directory with no eslintrc.
    fs.mkdirSync(path.join(appsDir(), 'no-eslintrc-sibling'), { recursive: true });
    const result = runSyntheticScript();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✓ check-eslint-drift-wiring');
  });
});
