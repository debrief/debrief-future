const { rules: snakeCaseRules } = require('../eslint-rules/provenance-snake-case.cjs');

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
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', '*.stories.tsx'],
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
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-assertions': [
      'warn',
      {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
      },
    ],
    'no-restricted-syntax': [
      'warn',
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
      {
        // ADR-035: an inline object-type assertion (`x as { foo: ... }`)
        // fabricates a shape the type system cannot verify — it was how
        // `feature.properties as { id }` invented a `properties.id` that the
        // schema never defines, silently dropping tracks from briefings.
        // Use a generated type / type guard (@debrief/schemas/unions.ts) or a
        // typed accessor instead. Staged to `error` once the existing backlog
        // is cleared (see backlog item #274 / Constitution XV.7).
        selector: 'TSAsExpression > TSTypeLiteral',
        message:
          'Do not cast to an inline object type (`x as { … }`) — it fabricates a shape the type system cannot verify. Use a generated type, a type guard, or a typed accessor (ADR-035, Constitution XV.7).',
      },
      ...snakeCaseRules,
    ],
  },
};
