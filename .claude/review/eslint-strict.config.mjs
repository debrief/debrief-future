// Report-only strict ESLint flat config for /repo-review (spec 282, R-005).
//
// ESLint in this repo is per-package (`pnpm -r lint`), so there is no single
// root config to extend. This self-contained flat config layers
// typescript-eslint's strict-type-checked preset plus the floating-promise /
// misused-promise family (the CB-05 lead source) over a package's own rules.
// The evidence phase points it at a package's src to surface *leads* — every
// hit still needs adversarial verification before it can become a finding. It
// never modifies any package's real eslint config (FR-011). Invoke explicitly,
// e.g.:
//
//   pnpm exec eslint --config .claude/review/eslint-strict.config.mjs \
//     --no-config-lookup shared/stac-writer/src
//
// Requires a tsconfig with type information; projectService picks it up.

import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/generated/**', // findings here attribute to the generator (FR-014)
    ],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // Correctness leads that matter most for this review's CB-* heuristics.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-explicit-any': 'error', // Article XV / CC-18 leads
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      // These are noisy as leads; downgrade so they don't drown the signal.
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
)
