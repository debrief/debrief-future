/**
 * Shared test helper: run ESLint programmatically against a source string
 * with a supplied `no-restricted-syntax` rule array, return violation list.
 *
 * Used by the factory + per-package integration tests.
 */
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import fs from 'fs';

export interface LintViolation {
  line: number;
  column: number;
  message: string;
  ruleId: string | null;
}

type RestrictedSyntaxEntry = { selector: string; message: string };

export function lintSource(
  source: string,
  rules: RestrictedSyntaxEntry[],
  filename = 'test.ts',
): LintViolation[] {
  const linter = new Linter();
  linter.defineParser('@typescript-eslint/parser', parser as unknown as Linter.ParserModule);

  const messages = linter.verify(
    source,
    {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: false },
      },
      rules: {
        'no-restricted-syntax': ['error', ...rules],
      },
    },
    { filename },
  );

  return messages.map((m) => ({
    line: m.line,
    column: m.column,
    message: m.message,
    ruleId: m.ruleId,
  }));
}

export function lintFile(
  absolutePath: string,
  rules: RestrictedSyntaxEntry[],
): LintViolation[] {
  const source = fs.readFileSync(absolutePath, 'utf8');
  return lintSource(source, rules, absolutePath);
}
