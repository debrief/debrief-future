// Fixture: a .test.ts file — must be EXCLUDED when `**/*.test.ts` is
// applied as an exclude glob. The scan.enumerate.test runs the scanner
// with that exclusion enabled and asserts this file's declaration does
// NOT appear in the output.
export interface TestLocalHelper {
  mocked: boolean;
}
