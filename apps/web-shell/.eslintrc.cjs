const { rules: utilsDriftRules } = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
const { rules: schemasDriftRules } = require('../../shared/eslint-rules/no-redeclare-schemas-exports.cjs');
const { rules: componentsDriftRules } = require('../../shared/eslint-rules/no-redeclare-components-exports.cjs');
const { rules: sessionStateDriftRules } = require('../../shared/eslint-rules/no-redeclare-session-state-exports.cjs');
const { rules: dataDriftRules } = require('../../shared/eslint-rules/no-redeclare-data-exports.cjs');
const {
  FORBIDDEN_BROWSER_PERSISTENCE_GLOBALS,
  FORBIDDEN_NODE_FS_IMPORTS,
} = require('../../shared/eslint-rules/no-direct-persistence-in-frontend.cjs');

module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
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
      ...utilsDriftRules,
      ...schemasDriftRules,
      ...componentsDriftRules,
      ...sessionStateDriftRules,
      ...dataDriftRules,
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-inner-declarations': 'warn',
    // Article IV.4 — frontends never persist outside the writer abstraction.
    // Node fs is browser-incompatible; ban it everywhere in web-shell.
    'no-restricted-imports': ['error', { paths: FORBIDDEN_NODE_FS_IMPORTS }],
    // Browser persistence globals are banned outside the host adaptor files.
    // The two adaptor files are exempt via the `overrides` block below.
    'no-restricted-globals': ['error', ...FORBIDDEN_BROWSER_PERSISTENCE_GLOBALS],
  },
  overrides: [
    {
      // Article IV.4 — the IndexedDB host adaptor is the ONLY production
      // file allowed to read browser persistence globals directly.
      files: [
        'src/services/stacWriterIdb.ts',
        'src/services/stacWriterCapability.ts',
      ],
      rules: {
        'no-restricted-globals': 'off',
      },
    },
    {
      // Vitest test files AND Playwright specs run in Node, not the browser —
      // they may read golden fixtures and write evidence (screenshots / JSON)
      // via Node fs. The IV.4 ban on `fs` imports protects the production
      // browser bundle, not Node-side test harnesses.
      files: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts', 'playwright/**/*.spec.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
