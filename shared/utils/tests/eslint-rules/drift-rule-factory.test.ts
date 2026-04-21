/**
 * Unit tests for shared/eslint-rules/drift-rule-factory.cjs
 *
 * Feature #214 — ensures the factory produces correct, deterministic
 * `no-restricted-syntax` selector entries, handles transitive `export *`
 * walking, and fails closed on malformed inputs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { lintFile, lintSource } from './helpers';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createDriftRules: (input: {
  packageName: string;
  indexPath: string;
  anchorDir?: string;
}) => { rules: Array<{ selector: string; message: string }> } = require(
  '../../../eslint-rules/drift-rule-factory.cjs',
);

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__');
const UTILS_INDEX = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'index.ts',
);

// ---------------------------------------------------------------------------
// A. Public contract — single-name synthetic input
// ---------------------------------------------------------------------------

describe('drift-rule-factory — public contract', () => {
  let syntheticDir: string;
  let syntheticIndex: string;

  beforeEach(() => {
    syntheticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-factory-'));
    syntheticIndex = path.join(syntheticDir, 'index.ts');
  });

  afterEach(() => {
    fs.rmSync(syntheticDir, { recursive: true, force: true });
  });

  it('produces exactly 7 entries for a single-name input', () => {
    fs.writeFileSync(syntheticIndex, `export { alpha } from './alpha.js';\n`);
    fs.writeFileSync(
      path.join(syntheticDir, 'alpha.ts'),
      `export const alpha = 1;\n`,
    );
    const { rules } = createDriftRules({
      packageName: '@debrief/synthetic',
      indexPath: syntheticIndex,
    });
    expect(rules).toHaveLength(7);
  });

  it('is deterministic across repeated invocations', () => {
    fs.writeFileSync(
      syntheticIndex,
      `export { alpha, beta } from './inner.js';\n`,
    );
    fs.writeFileSync(
      path.join(syntheticDir, 'inner.ts'),
      `export const alpha = 1; export const beta = 2;\n`,
    );
    const first = createDriftRules({
      packageName: '@debrief/synthetic',
      indexPath: syntheticIndex,
    }).rules;
    const second = createDriftRules({
      packageName: '@debrief/synthetic',
      indexPath: syntheticIndex,
    }).rules;
    expect(second).toEqual(first);
  });

  it('embeds the packageName in every message', () => {
    fs.writeFileSync(syntheticIndex, `export const onlyThing = 42;\n`);
    const { rules } = createDriftRules({
      packageName: '@debrief/synthetic',
      indexPath: syntheticIndex,
    });
    for (const rule of rules) {
      expect(rule.message).toContain(`'@debrief/synthetic'`);
      expect(rule.message).toContain(`'onlyThing'`);
      expect(rule.message).toContain('apps/*');
      expect(rule.message).toContain(
        `import { onlyThing } from '@debrief/synthetic';`,
      );
      expect(rule.message).not.toContain('\n');
      expect(rule.message).not.toMatch(/\x1b\[/);
    }
  });

  it('returns empty rules and warns to stderr when the index is empty', () => {
    fs.writeFileSync(syntheticIndex, `// intentionally empty\n`);
    const stderrChunks: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    (process.stderr.write as unknown as (
      chunk: string | Buffer,
      ...rest: unknown[]
    ) => boolean) = (chunk: string | Buffer): boolean => {
      stderrChunks.push(String(chunk));
      return true;
    };
    try {
      const { rules } = createDriftRules({
        packageName: '@debrief/synthetic',
        indexPath: syntheticIndex,
      });
      expect(rules).toHaveLength(0);
    } finally {
      process.stderr.write = originalWrite;
    }
    const combined = stderrChunks.join('');
    expect(combined).toContain('@debrief/synthetic');
    expect(combined).toContain('forbidden set is empty');
  });

  it('throws a clear error when indexPath does not exist', () => {
    const missing = path.join(syntheticDir, 'does-not-exist.ts');
    expect(() =>
      createDriftRules({
        packageName: '@debrief/synthetic',
        indexPath: missing,
      }),
    ).toThrow(/indexPath not readable/);
  });

  it('throws when packageName does not start with @debrief/', () => {
    fs.writeFileSync(syntheticIndex, `export const x = 1;\n`);
    expect(() =>
      createDriftRules({
        packageName: 'unscoped',
        indexPath: syntheticIndex,
      }),
    ).toThrow(/packageName must be a string starting with '@debrief\//);
  });
});

// ---------------------------------------------------------------------------
// B. Transitive `export *` walker
// ---------------------------------------------------------------------------

describe('drift-rule-factory — transitive export-star walker', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-walker-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeFile(rel: string, content: string): void {
    const abs = path.join(tmpRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }

  function collectNames(rules: Array<{ selector: string }>): Set<string> {
    const names = new Set<string>();
    for (const rule of rules) {
      const match = rule.selector.match(/id\.name='([^']+)'/);
      if (match) {
        names.add(match[1]);
      }
    }
    return names;
  }

  it('collects names reached through a one-hop relative export *', () => {
    writeFile('index.ts', `export * from './sub.js';\n`);
    writeFile('sub.ts', `export const oneHop = 1;\n`);
    const { rules } = createDriftRules({
      packageName: '@debrief/x',
      indexPath: path.join(tmpRoot, 'index.ts'),
    });
    expect(collectNames(rules).has('oneHop')).toBe(true);
  });

  it('collects names reached through a two-hop chain', () => {
    writeFile('index.ts', `export * from './a.js';\n`);
    writeFile('a.ts', `export * from './b.js';\n`);
    writeFile('b.ts', `export const twoHop = 1;\n`);
    const { rules } = createDriftRules({
      packageName: '@debrief/x',
      indexPath: path.join(tmpRoot, 'index.ts'),
    });
    expect(collectNames(rules).has('twoHop')).toBe(true);
  });

  it('cycle-breaks silently on A→B→A forwarding', () => {
    writeFile('index.ts', `export * from './a.js';\n`);
    writeFile('a.ts', `export * from './b.js';\nexport const fromA = 1;\n`);
    writeFile('b.ts', `export * from './a.js';\nexport const fromB = 1;\n`);
    const { rules } = createDriftRules({
      packageName: '@debrief/x',
      indexPath: path.join(tmpRoot, 'index.ts'),
    });
    const names = collectNames(rules);
    expect(names.has('fromA')).toBe(true);
    expect(names.has('fromB')).toBe(true);
  });

  it('ignores bare-specifier `export *`', () => {
    writeFile('index.ts', `export * from 'some-external-pkg';\n`);
    const stderrChunks: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    (process.stderr.write as unknown as (
      chunk: string | Buffer,
      ...rest: unknown[]
    ) => boolean) = (chunk: string | Buffer): boolean => {
      stderrChunks.push(String(chunk));
      return true;
    };
    try {
      const { rules } = createDriftRules({
        packageName: '@debrief/x',
        indexPath: path.join(tmpRoot, 'index.ts'),
      });
      // Nothing from the bare specifier should have been included.
      expect(rules).toHaveLength(0);
    } finally {
      process.stderr.write = originalWrite;
    }
  });

  it('ignores absolute-path `export *`', () => {
    writeFile('index.ts', `export * from '/absolute/path.js';\n`);
    const stderrChunks: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    (process.stderr.write as unknown as (
      chunk: string | Buffer,
      ...rest: unknown[]
    ) => boolean) = (chunk: string | Buffer): boolean => {
      stderrChunks.push(String(chunk));
      return true;
    };
    try {
      const { rules } = createDriftRules({
        packageName: '@debrief/x',
        indexPath: path.join(tmpRoot, 'index.ts'),
      });
      expect(rules).toHaveLength(0);
    } finally {
      process.stderr.write = originalWrite;
    }
  });

  it('strips .js/.cjs/.mjs suffixes when resolving to a .ts source', () => {
    writeFile('index.ts', `export * from './sibling.cjs';\n`);
    writeFile('sibling.ts', `export const viaCjs = 1;\n`);
    const { rules } = createDriftRules({
      packageName: '@debrief/x',
      indexPath: path.join(tmpRoot, 'index.ts'),
    });
    expect(collectNames(rules).has('viaCjs')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C. AST-shape coverage — lint real fixtures
// ---------------------------------------------------------------------------

describe('drift-rule-factory — AST shape coverage (real fixtures)', () => {
  const utilsRules = createDriftRules({
    packageName: '@debrief/utils',
    indexPath: UTILS_INDEX,
  }).rules;

  const positiveFixtures = [
    'redeclaration-fn.ts',
    'redeclaration-const.ts',
    'redeclaration-class.ts',
    'redeclaration-type.ts',
    'redeclaration-interface.ts',
    'redeclaration-enum.ts',
    'redeclaration-default.ts',
  ];

  it.each(positiveFixtures)(
    'fires on positive fixture: %s',
    (filename) => {
      const violations = lintFile(
        path.join(FIXTURES_DIR, filename),
        utilsRules,
      );
      // There may be more than one violation if multiple selectors match
      // a given AST; we require at least one and check the shape.
      expect(violations.length).toBeGreaterThanOrEqual(1);
      const first = violations[0];
      expect(first.ruleId).toBe('no-restricted-syntax');
      expect(first.message).toContain(`'@debrief/utils'`);
      expect(first.message).toContain('apps/*');
    },
  );

  const negativeFixtures = [
    'reexport-named.ts',
    'reexport-star.ts',
    'local-identifier-collision.ts',
  ];

  it.each(negativeFixtures)(
    'does NOT fire on negative fixture: %s',
    (filename) => {
      const violations = lintFile(
        path.join(FIXTURES_DIR, filename),
        utilsRules,
      );
      expect(violations).toEqual([]);
    },
  );

  it('message for a violated fixture has the contracted one-line shape', () => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, 'redeclaration-fn.ts'),
      utilsRules,
    );
    expect(violations.length).toBeGreaterThan(0);
    const msg = violations[0].message;
    expect(msg).not.toContain('\n');
    expect(msg).toMatch(
      /^'calculateBounds' is exported by '@debrief\/utils'\. Do not redeclare it under apps\/\*\. Replace this declaration with: import \{ calculateBounds \} from '@debrief\/utils';$/,
    );
  });

  it('is tolerant of a barrel that uses only `export *` from the package', () => {
    const violations = lintSource(
      `export * from '@debrief/utils';`,
      utilsRules,
      'barrel.ts',
    );
    expect(violations).toEqual([]);
  });
});
