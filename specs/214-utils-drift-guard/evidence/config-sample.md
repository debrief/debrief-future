# Config Sample — `apps/vscode/.eslintrc.cjs` wiring

Annotated excerpt of `apps/vscode/.eslintrc.cjs` showing the five
`require(...)` lines and the `no-restricted-syntax` spread pattern
prescribed by spec #214 / rule-contract §3.

```js
// ── Top of file — five new drift-rule requires alongside the existing
//    snakeCaseRules require. Each caller module loads at require time and
//    returns a frozen `{ rules }` array identity for the wiring-check.
const { rules: snakeCaseRules }         = require('../../shared/eslint-rules/provenance-snake-case.cjs');
const { rules: utilsDriftRules }        = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
const { rules: schemasDriftRules }      = require('../../shared/eslint-rules/no-redeclare-schemas-exports.cjs');
const { rules: componentsDriftRules }   = require('../../shared/eslint-rules/no-redeclare-components-exports.cjs');
const { rules: sessionStateDriftRules } = require('../../shared/eslint-rules/no-redeclare-session-state-exports.cjs');
const { rules: dataDriftRules }         = require('../../shared/eslint-rules/no-redeclare-data-exports.cjs');

module.exports = {
  root: true,
  // … unchanged parser + plugins + extends …
  rules: {
    // … unchanged typescript-eslint config …
    'no-restricted-syntax': [
      'error',                         // ← SEVERITY: MUST be 'error' for FR-004.
      // Existing rules preserved alongside the new spreads.
      {
        selector: "TSAsExpression[typeAnnotation.typeName.name='Record']",
        message: 'Do not cast to Record<string, unknown> — use a generated type or Zod schema. If no type exists, create one (ADR-011, Constitution XV.7).',
      },
      {
        selector: 'TSAsExpression > TSUnknownKeyword',
        message: 'Do not cast to unknown — validate through a typed model instead (ADR-011, Constitution XV.7).',
      },
      ...snakeCaseRules,               // existing — ADR-010 snake_case wire format.
      ...utilsDriftRules,              // spec #214 — @debrief/utils drift.
      ...schemasDriftRules,            // spec #214 — @debrief/schemas drift.
      ...componentsDriftRules,         // spec #214 — @debrief/components drift.
      ...sessionStateDriftRules,       // spec #214 — @debrief/session-state drift.
      ...dataDriftRules,               // spec #214 — @debrief/data drift.
    ],
    // … other rule entries unchanged …
  },
};
```

## Notes

- **Severity is `'error'`** (not `'warn'`), per rule-contract §3.2: warnings
  do not fail CI, and FR-004 requires CI failure on drift. Elevating this
  severity forces the pre-existing snake_case / `as Record` / `as unknown`
  rules to `'error'` too; pre-existing violations are suppressed inline with
  explicit `// eslint-disable-next-line no-restricted-syntax -- pre-existing
  ADR-010/011, unrelated to #214` comments rather than fixed (out of scope).
- **Ordering** is alphabetical by package basename for readability. The
  `...snakeCaseRules` spread appears before the drift spreads because it
  predates them (preserving diff narrative).
- **Identity preservation**: each caller module returns a single `rules`
  array by reference; the wiring-check script
  (`scripts/check-eslint-drift-wiring.cjs`) compares each element of that
  array against the resolved `no-restricted-syntax` array with
  `Array.prototype.includes`. Removing or rewrapping the spread breaks the
  identity check and fails the meta-check.
- **Adding a sixth package** is a one-line require + one-line spread here,
  plus one line in `scripts/check-eslint-drift-wiring.cjs`'s
  `CALLER_MODULES` array. No other edits required.

## Cross-reference

The same diff shape applies identically to:

- `apps/loader/.eslintrc.cjs`
- `apps/web-shell/.eslintrc.cjs`
- `apps/spec-navigator/.eslintrc.cjs`

The wiring-check script enforces consistency across all four.
