/**
 * Integration tests for shared/eslint-rules/no-redeclare-utils-exports.cjs
 *
 * Feature #214 — verifies the `@debrief/utils` caller module produces the
 * expected drift rules and correctly reports violations against real
 * fixture files.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { lintFile, lintSource } from './helpers';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rules: utilsDriftRules } = require(
  '../../../eslint-rules/no-redeclare-utils-exports.cjs',
) as { rules: Array<{ selector: string; message: string }> };

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__');

describe('no-redeclare-utils-exports — positive fixtures', () => {
  const POSITIVE_FIXTURES = [
    'redeclaration-fn.ts',
    'redeclaration-const.ts',
    'redeclaration-class.ts',
    'redeclaration-type.ts',
    'redeclaration-interface.ts',
    'redeclaration-enum.ts',
    'redeclaration-default.ts',
  ];

  it.each(POSITIVE_FIXTURES)('reports >=1 violation for %s', (filename) => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, filename),
      utilsDriftRules,
    );
    expect(violations.length).toBeGreaterThanOrEqual(1);
    const message = violations[0].message;
    expect(message).toContain(`'@debrief/utils'`);
    expect(message).toContain('apps/*');
    expect(message).toMatch(/import \{ [A-Za-z_][A-Za-z0-9_]* \} from '@debrief\/utils';/);
    // Single-line, ASCII-only (no ANSI), no trailing whitespace.
    expect(message).not.toContain('\n');
    expect(message).not.toMatch(/\x1b\[/);
    expect(message).toBe(message.trimEnd());
  });
});

describe('no-redeclare-utils-exports — negative fixtures', () => {
  const NEGATIVE_FIXTURES = [
    'reexport-named.ts',
    'reexport-star.ts',
    'local-identifier-collision.ts',
  ];

  it.each(NEGATIVE_FIXTURES)('reports zero violations for %s', (filename) => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, filename),
      utilsDriftRules,
    );
    expect(violations).toEqual([]);
  });
});

describe('no-redeclare-utils-exports — symbol-match not filename-match', () => {
  it('fires on `mergeBounds` in any apps/* file path', () => {
    const source = `export function mergeBounds(): number[] { return [0,0,0,0]; }\n`;
    const violations = lintSource(
      source,
      utilsDriftRules,
      'apps/web-shell/src/lib/helpers.ts',
    );
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].message).toContain(`'mergeBounds'`);
    expect(violations[0].message).toContain(`'@debrief/utils'`);
  });
});

describe('no-redeclare-utils-exports — auto-extension (SC-004 / FR-010)', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-sc004-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('adding a fresh export to a synthetic index extends the rule set automatically', () => {
    // Use the factory directly (what the caller module does internally) with
    // a synthetic index that includes `__sc004Probe`; verify the resulting
    // rules include selectors for that name.
    const syntheticIndex = path.join(tmpRoot, 'index.ts');
    fs.writeFileSync(
      syntheticIndex,
      `export { __sc004Probe } from './probe.js';\n`,
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'probe.ts'),
      `export const __sc004Probe = 42;\n`,
    );

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const createDriftRules: (input: {
      packageName: string;
      indexPath: string;
    }) => { rules: Array<{ selector: string; message: string }> } = require(
      '../../../eslint-rules/drift-rule-factory.cjs',
    );
    const { rules } = createDriftRules({
      packageName: '@debrief/utils',
      indexPath: syntheticIndex,
    });
    const names = new Set<string>();
    for (const rule of rules) {
      const match = rule.selector.match(/id\.name='([^']+)'/);
      if (match) {
        names.add(match[1]);
      }
    }
    expect(names.has('__sc004Probe')).toBe(true);
  });
});
