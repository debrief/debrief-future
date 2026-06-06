module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'tests'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Spec 240: the writer depends on @debrief/components for ONE type
    // (PropertiesProvenanceEntry, via the leaf subpath /PropertiesPanel/provenanceTypes).
    // Runtime imports from components would pull React/Leaflet/etc into the writer's
    // runtime graph and break its "browser-safe; no heavy deps" property. Type-only
    // imports remain allowed — they emit no runtime code.
    '@typescript-eslint/no-restricted-imports': ['error', {
      patterns: [{
        group: ['@debrief/components', '@debrief/components/*'],
        message: 'Runtime imports from @debrief/components are banned in @debrief/stac-writer to keep the writer\'s runtime dep graph minimal. Use `import type` for types; for runtime symbols, route through a different path or open an issue.',
        allowTypeImports: true,
      }],
    }],
  },
};
