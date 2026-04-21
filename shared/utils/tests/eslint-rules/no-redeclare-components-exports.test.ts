import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import * as path from 'path';
import { lintFile } from './helpers';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { rules } = require(
  '../../../eslint-rules/no-redeclare-components-exports.cjs',
) as { rules: Array<{ selector: string; message: string }> };

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__');

describe('no-redeclare-components-exports', () => {
  it('fires on redeclaration of a canonical @debrief/components export', () => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, 'components-redeclaration.ts'),
      rules,
    );
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].message).toContain(`'@debrief/components'`);
  });

  it('does not fire on a legitimate re-export', () => {
    const violations = lintFile(
      path.join(FIXTURES_DIR, 'components-reexport.ts'),
      rules,
    );
    expect(violations).toEqual([]);
  });
});
