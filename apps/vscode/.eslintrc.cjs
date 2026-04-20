const { rules: snakeCaseRules } = require('../../shared/eslint-rules/provenance-snake-case.cjs');
const { rules: utilsDriftRules } = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');

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
