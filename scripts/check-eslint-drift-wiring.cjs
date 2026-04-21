#!/usr/bin/env node
// @ts-check
//
// Wiring-forgotten meta-check for Feature #214 drift rules.
//
// Asserts that every apps/<x>/.eslintrc.cjs spreads every @debrief/<pkg>
// drift-rule array into its `no-restricted-syntax` config. Fails closed
// (exit 1) with a human-readable report naming each offending file and
// the identifier of the missing spread.
//
// Invocation: `node scripts/check-eslint-drift-wiring.cjs` from repo root.
// Wired into `task lint` — see Taskfile.yml.
//
// Contract: specs/214-utils-drift-guard/contracts/rule-contract.md §7.
//

const fs = require('fs');
const path = require('path');

/** @type {string[]} */
const CALLER_MODULES = [
  '../shared/eslint-rules/no-redeclare-utils-exports.cjs',
  '../shared/eslint-rules/no-redeclare-schemas-exports.cjs',
  '../shared/eslint-rules/no-redeclare-components-exports.cjs',
  '../shared/eslint-rules/no-redeclare-session-state-exports.cjs',
  '../shared/eslint-rules/no-redeclare-data-exports.cjs',
];

const REPO_ROOT = process.cwd();
const APPS_DIR = path.join(REPO_ROOT, 'apps');

function failClosed(message) {
  process.stderr.write(message + '\n');
  process.exit(1);
}

if (!fs.existsSync(APPS_DIR)) {
  failClosed(
    `check-eslint-drift-wiring: expected to find 'apps/' directory at ${APPS_DIR}. Run this script from the repo root.`,
  );
}

/**
 * Load the exported `rules` array from a caller module. Returns null if the
 * caller module does not exist yet (e.g. during intermediate phases of a
 * migration) — the meta-check skips it in that case.
 *
 * @param {string} relativePath
 * @returns {{ id: string, resolvedPath: string, rules: Array<{ selector: string, message: string }> } | null}
 */
function loadCallerModule(relativePath) {
  const resolvedPath = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(resolvedPath);
  if (!mod || !Array.isArray(mod.rules)) {
    throw new Error(
      `check-eslint-drift-wiring: caller module ${resolvedPath} does not export { rules: [...] }`,
    );
  }
  const base = path.basename(resolvedPath, '.cjs');
  // no-redeclare-utils-exports → utilsDriftRules
  // no-redeclare-session-state-exports → sessionStateDriftRules
  const match = base.match(/^no-redeclare-(.+)-exports$/);
  if (match === null) {
    throw new Error(
      `check-eslint-drift-wiring: caller module filename ${base} does not match no-redeclare-<pkg>-exports`,
    );
  }
  const pkgSlug = match[1];
  const camel = pkgSlug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const id = `${camel}DriftRules`;
  return { id, resolvedPath, rules: mod.rules };
}

/** @type {Array<{ id: string, resolvedPath: string, rules: Array<unknown> }>} */
const callerModules = [];
for (const rel of CALLER_MODULES) {
  const loaded = loadCallerModule(rel);
  if (loaded !== null) {
    callerModules.push(loaded);
  }
}

if (callerModules.length === 0) {
  failClosed(
    `check-eslint-drift-wiring: no caller modules are present. Expected one or more of: ${CALLER_MODULES.join(', ')}`,
  );
}

/**
 * Resolve the `no-restricted-syntax` rule config from an eslintrc object,
 * walking any shallow `extends` chain best-effort. Returns an array (the
 * rule's configuration tuple minus the severity element) or null if the
 * rule is not configured.
 *
 * @param {unknown} eslintrc
 * @returns {Array<unknown> | null}
 */
function resolveNoRestrictedSyntax(eslintrc) {
  if (
    eslintrc === null ||
    eslintrc === undefined ||
    typeof eslintrc !== 'object'
  ) {
    return null;
  }
  const config = /** @type {{ rules?: Record<string, unknown> }} */ (eslintrc);
  const rules = config.rules;
  if (rules && typeof rules === 'object') {
    const entry = /** @type {Record<string, unknown>} */ (rules)['no-restricted-syntax'];
    if (Array.isArray(entry)) {
      // entry is like ['error', ...entries] — skip the severity.
      return entry.slice(1);
    }
  }
  return null;
}

const appDirents = fs.readdirSync(APPS_DIR, { withFileTypes: true });
/** @type {Array<{ eslintrc: string, missing: Array<{ id: string, source: string }> }>} */
const defects = [];
/** @type {Array<{ eslintrc: string, error: Error }>} */
const brokenConfigs = [];

for (const dirent of appDirents) {
  if (!dirent.isDirectory()) {
    continue;
  }
  const appDir = path.join(APPS_DIR, dirent.name);
  const eslintrcPath = path.join(appDir, '.eslintrc.cjs');
  if (!fs.existsSync(eslintrcPath)) {
    continue;
  }

  /** @type {unknown} */
  let eslintrc;
  try {
    // Clear the require cache so repeated invocations (e.g. from tests) see
    // fresh state.
    delete require.cache[eslintrcPath];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    eslintrc = require(eslintrcPath);
  } catch (err) {
    brokenConfigs.push({
      eslintrc: path.relative(REPO_ROOT, eslintrcPath),
      error: /** @type {Error} */ (err),
    });
    continue;
  }

  const restrictedArray = resolveNoRestrictedSyntax(eslintrc);
  /** @type {Array<{ id: string, source: string }>} */
  const missing = [];

  for (const caller of callerModules) {
    if (restrictedArray === null) {
      missing.push({
        id: caller.id,
        source: path.relative(REPO_ROOT, caller.resolvedPath),
      });
      continue;
    }
    const allPresent = caller.rules.every((entry) =>
      restrictedArray.includes(entry),
    );
    if (!allPresent) {
      missing.push({
        id: caller.id,
        source: path.relative(REPO_ROOT, caller.resolvedPath),
      });
    }
  }

  if (missing.length > 0) {
    defects.push({
      eslintrc: path.relative(REPO_ROOT, eslintrcPath),
      missing,
    });
  }
}

if (brokenConfigs.length > 0) {
  for (const broken of brokenConfigs) {
    process.stderr.write(
      `❌ check-eslint-drift-wiring: ${broken.eslintrc} threw at require(): ${broken.error.message}\n`,
    );
  }
}

if (defects.length > 0) {
  process.stderr.write(
    `\n❌ ESLint drift-rule wiring check failed.\n\n` +
      `The following apps/*/.eslintrc.cjs files are missing one or more drift-rule spreads:\n\n`,
  );
  for (const defect of defects) {
    process.stderr.write(`  ${defect.eslintrc}\n`);
    for (const entry of defect.missing) {
      process.stderr.write(
        `    Missing: ...${entry.id}        (expected from ${entry.source})\n`,
      );
    }
    process.stderr.write('\n');
  }
  process.stderr.write(
    `Fix: add the missing require(...) lines and ensure each ...<pkg>DriftRules is spread\n` +
      `into the 'no-restricted-syntax' rule array. See shared/eslint-rules/ for caller modules\n` +
      `(or specs/214-utils-drift-guard/contracts/rule-contract.md §3 for the exact diff shape).\n`,
  );
  process.exit(1);
}

if (brokenConfigs.length > 0) {
  process.exit(1);
}

process.stdout.write(
  `✓ check-eslint-drift-wiring: all ${callerModules.length} drift-rule spread(s) are present in every apps/*/.eslintrc.cjs.\n`,
);
