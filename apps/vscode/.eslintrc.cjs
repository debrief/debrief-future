const { rules: snakeCaseRules } = require('../../shared/eslint-rules/provenance-snake-case.cjs');
const { rules: utilsDriftRules } = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
const { rules: schemasDriftRules } = require('../../shared/eslint-rules/no-redeclare-schemas-exports.cjs');
const { rules: componentsDriftRules } = require('../../shared/eslint-rules/no-redeclare-components-exports.cjs');
const { rules: sessionStateDriftRules } = require('../../shared/eslint-rules/no-redeclare-session-state-exports.cjs');
const { rules: dataDriftRules } = require('../../shared/eslint-rules/no-redeclare-data-exports.cjs');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-assertions': [
      'warn',
      {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
      },
    ],
    // 234 FR-044 — production code under apps/vscode/src/** must NEVER
    // import from a __testing__/ surface. Those surfaces (e.g. the
    // story-only mock-port helper) are scaffolding for stories + harness
    // and would leak fixture-only behaviour into the VS Code extension.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '**/__testing__/**',
              '**/__testing__/*',
              '@debrief/components/**/__testing__/*',
              '@debrief/components/**/__testing__/**',
            ],
            message:
              'Production code in apps/vscode/src/** must not import from __testing__/. Those modules are story/harness-only (Feature 234 FR-044). Move what you need into a non-__testing__/ public surface, or wire the test seam through PortContext.',
          },
        ],
      },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: "TSAsExpression[typeAnnotation.typeName.name='Record']",
        message:
          'Do not cast to Record<string, unknown> — use a generated type or Zod schema. If no type exists, create one (ADR-011, Constitution XV.7).',
      },
      {
        selector: 'TSAsExpression > TSUnknownKeyword',
        message:
          'Do not cast to unknown — validate through a typed model instead (ADR-011, Constitution XV.7).',
      },
      ...snakeCaseRules,
      ...utilsDriftRules,
      ...schemasDriftRules,
      ...componentsDriftRules,
      ...sessionStateDriftRules,
      ...dataDriftRules,
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': [
      'warn',
      {
        allowNullableBoolean: true,
        allowNullableString: true,
      },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['dist/**', 'node_modules/**', '*.js', '*.cjs', 'src/webview/web/**'],
};
