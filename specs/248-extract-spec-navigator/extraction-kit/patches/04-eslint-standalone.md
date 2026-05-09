# Patch 04 — Standalone ESLint config

## What

Replace the ESLint config that extends monorepo-shared rules (`../../shared/eslint-rules/no-redeclare-*-exports.cjs`) with a self-contained config that doesn't reach outside the repo.

## Why

The five `no-redeclare-*-exports` rules in `shared/eslint-rules/` exist to prevent type drift across `@debrief/*` workspace packages. spec-navigator has zero `@debrief/*` imports (per the Phase 0 audit), so these rules have nothing to enforce in the extracted repo. Carrying the relative paths would error out as soon as the extracted repo is checked out — they point at directories that no longer exist relative to the new repo root.

## How

### Step 1 — Inspect the current config

```sh
cat .eslintrc.cjs
```

Expect to see something like:

```js
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    './../shared/eslint-rules/no-redeclare-utils-exports.cjs': 'error',
    './../shared/eslint-rules/no-redeclare-schemas-exports.cjs': 'error',
    './../shared/eslint-rules/no-redeclare-components-exports.cjs': 'error',
    './../shared/eslint-rules/no-redeclare-session-state-exports.cjs': 'error',
    './../shared/eslint-rules/no-redeclare-data-exports.cjs': 'error',
    // … plus app-specific rules
  },
  // …
};
```

### Step 2 — Replace with a standalone config

Rewrite `.eslintrc.cjs` to:

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    // App-specific rules from the original config go here.
    // Drop any rule referencing ../../shared/eslint-rules/.
  },
  ignorePatterns: ['dist/', 'node_modules/', 'playwright-report/', 'test-results/'],
};
```

### Step 3 — Verify

```sh
pnpm lint
```

Should run clean. If any new errors appear, they were silently masked by the broken extends path before — fix them now.

## Commit message

```
chore(eslint): standalone config; drop monorepo no-redeclare rules

The five no-redeclare-*-exports rules guarded against drift across
@debrief/* workspace packages; spec-navigator has zero @debrief/*
imports, so these rules had nothing to enforce. The relative paths
break as soon as the repo is checked out outside the monorepo.
```
