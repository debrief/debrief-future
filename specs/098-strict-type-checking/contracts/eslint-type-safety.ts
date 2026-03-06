// Contract: ESLint Type-Safety Configuration
// File: shared base configuration for all TypeScript packages
//
// This contract defines the minimum ESLint rules that every TypeScript
// package must include for type-safety enforcement.

/**
 * Required ESLint rules for type safety.
 * Every TypeScript package must include these rules.
 */
interface TypeSafetyRules {
  // Core: disallow any
  "@typescript-eslint/no-explicit-any": "error";

  // Require explicit return types on public functions
  "@typescript-eslint/explicit-function-return-type": ["warn", {
    allowExpressions: true;
    allowTypedFunctionExpressions: true;
  }];

  // Promise safety (requires type-aware linting)
  "@typescript-eslint/no-floating-promises": "error";
  "@typescript-eslint/await-thenable": "error";
  "@typescript-eslint/no-misused-promises": "error";

  // Strict equality
  "eqeqeq": ["error", "always"];
}

/**
 * Required parserOptions for type-aware linting.
 * Every ESLint config must include these.
 */
interface RequiredParserOptions {
  // Must point to the package's tsconfig.json
  project: string;  // e.g., "./tsconfig.json"
}

/**
 * Test file overrides.
 * Test files MAY relax no-explicit-any only with per-line justification.
 */
interface TestFileOverride {
  files: string[];  // ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**", "**/__mocks__/**"]
  rules: {
    // Still error — individual uses must use eslint-disable with justification
    "@typescript-eslint/no-explicit-any": "error";
  };
}

/**
 * Packages requiring new or updated ESLint configs:
 *
 * Existing (update):
 * - apps/vscode/.eslintrc.json — add no-explicit-any: error, remove webview exclusion
 * - apps/loader/.eslintrc.cjs — add no-explicit-any: error, add parserOptions.project
 * - shared/components/.eslintrc.cjs — set no-explicit-any: error (remove 'off' override in tests)
 *
 * New (create):
 * - apps/web-shell/.eslintrc.cjs
 * - services/session-state/.eslintrc.cjs
 * - shared/schemas/.eslintrc.cjs
 * - shared/config-ts/.eslintrc.cjs
 * - shared/utils/.eslintrc.cjs
 */
