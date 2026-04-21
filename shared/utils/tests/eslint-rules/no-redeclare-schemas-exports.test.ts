import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import * as path from 'path';
import { lintFile } from './helpers';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rules } = require(
  '../../../eslint-rules/no-redeclare-schemas-exports.cjs',
) as { rules: Array<{ selector: string; message: string }> };

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__');

describe('no-redeclare-schemas-exports', () => {
  it('fires on redeclaration of a canonical @debrief/schemas export', () => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, 'schemas-redeclaration.ts'),
      rules,
    );
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].message).toContain(`'@debrief/schemas'`);
    expect(violations[0].message).not.toContain(`'@debrief/utils'`);
  });

  it('does not fire on a legitimate re-export', () => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, 'schemas-reexport.ts'),
      rules,
    );
    expect(violations).toEqual([]);
  });
});
