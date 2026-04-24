import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import * as path from 'path';
import { lintFile } from './helpers';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rules } = require(
  '../../../eslint-rules/no-redeclare-session-state-exports.cjs',
) as { rules: Array<{ selector: string; message: string }> };

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__');

describe('no-redeclare-session-state-exports', () => {
  it('fires on redeclaration of a transitively-forwarded export (walker still works)', () => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, 'session-state-redeclaration.ts'),
      rules,
    );
    // This assertion specifically verifies the transitive `export *` walker
    // still contributes `getSessionStore` — a name reached via
    //   services/session-state/src/index.ts
    //     -> types/index.ts
    //       -> features.ts (where `getSessionStore` actually lives)
    // If the walker regresses to stop at the top-level index, this fails.
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].message).toContain(`'@debrief/session-state'`);
    expect(violations[0].message).toContain(`'getSessionStore'`);
  });

  it('rules array includes a selector for a transitively-forwarded name', () => {
    const names = new Set<string>();
    for (const rule of rules) {
      const match = rule.selector.match(/id\.name='([^']+)'/);
      if (match) {
        names.add(match[1]);
      }
    }
    expect(names.has('getSessionStore')).toBe(true);
  });

  it('does not fire on a legitimate re-export', () => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, 'session-state-reexport.ts'),
      rules,
    );
    expect(violations).toEqual([]);
  });
});
