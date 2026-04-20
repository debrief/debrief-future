# Contract: `no-redeclare-utils-exports` Rule Module

**Feature**: 214-utils-drift-guard
**Phase**: 1
**Date**: 2026-04-20

## Scope note

This feature does not expose a network API, a database schema, or a user-facing command surface. Its "contract" is the module-level interface of the `no-redeclare-utils-exports.cjs` rule file and the integration contract with each `apps/*/.eslintrc.cjs`. This document defines both so that implementers, reviewers, and future maintainers can verify conformance without guessing.

---

## 1. Module interface

### 1.1 Export shape

File: `shared/eslint-rules/no-redeclare-utils-exports.cjs`

**Exports** *(exact shape)*:

```js
module.exports = {
  /** @type {Array<{ selector: string, message: string }>} */
  rules: [ /* RestrictedSyntaxEntry[] — see data-model.md */ ],
};
```

**`rules` field**: An array of `{ selector, message }` objects ready to be spread into the second-and-later elements of an ESLint `no-restricted-syntax` config array. Matches the shape `provenance-snake-case.cjs` already exports — callers can use them interchangeably.

**No other top-level exports.** The module does not expose the parsed `ForbiddenSet`, the `index.ts` parser, or any internals. This minimises the consumer-visible surface and keeps future refactors free.

### 1.2 Caller usage contract

Each `apps/*/.eslintrc.cjs` imports and spreads the `rules` array into its `no-restricted-syntax` config:

```js
const { rules: utilsDriftRules } = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
// ... other requires ...

module.exports = {
  // ...
  rules: {
    'no-restricted-syntax': [
      'error',           // ← severity MUST be 'error', not 'warn', for FR-004
      ...utilsDriftRules,
      // ... other existing entries ...
    ],
  },
};
```

**Caller obligations**:
- MUST pass severity `'error'` — `'warn'` would not fail CI (violates FR-004).
- MUST place the import at the top of the file (standard CJS convention).
- MUST spread `utilsDriftRules` (not pass the array by reference), so the caller's existing entries coexist.
- MUST NOT modify `utilsDriftRules` in place — the array is considered immutable from the caller's perspective.

### 1.3 Initialisation behaviour

**At `require()` time**:

1. Read `shared/utils/src/index.ts` (resolved relative to the rule module's own location — `path.resolve(__dirname, '../utils/src/index.ts')`).
2. Parse with `typescript.createSourceFile(...)` using `ScriptTarget.Latest`.
3. Walk top-level statements; collect every `export { … }` specifier and every `export type { … }` specifier.
4. Build the `ForbiddenSet` (values + types).
5. Generate 7 selector entries per name, combining `ForbiddenSet` with the selector shapes from research.md Decision 3.
6. Freeze the result; assign to `module.exports.rules`.

**Failure modes**:

| Condition | Behaviour |
|-----------|-----------|
| `shared/utils/src/index.ts` does not exist | Throw a clear error: `@debrief/utils drift guard: shared/utils/src/index.ts not found at <resolved path>`. Fail-closed — ESLint will report the rule-load failure, which surfaces in CI. |
| `shared/utils/src/index.ts` exists but has no `export` statements | Emit a warning to `stderr`: `@debrief/utils drift guard: shared/utils/src/index.ts has no exports — forbidden set is empty`. Return an empty `rules` array. ESLint runs cleanly; future additions to `index.ts` will automatically populate. |
| TypeScript parser throws on malformed source | Let the error propagate. A broken `index.ts` is a repo-wide problem that should surface loudly, not be swallowed. |

### 1.4 Determinism contract

Per FR-011, calling `require('./no-redeclare-utils-exports.cjs')` twice in the same Node process MUST yield the same `rules` array (Node's require cache guarantees this). Calling across separate processes, on the same working tree, MUST produce arrays whose `selector` and `message` values are element-wise equal. Specifically:

- `rules` MUST be sorted by `(selector, message)` lexicographically before export, so array ordering is stable.
- `message` strings MUST NOT embed timestamps, PIDs, usernames, working-directory paths, or random IDs.
- `selector` strings MUST NOT embed anything not derived from `ForbiddenSet`.

---

## 2. Violation message contract

### 2.1 Template

```text
'<NAME>' is exported by '@debrief/utils'. Do not redeclare it under apps/*. Replace this declaration with: import { <NAME> } from '@debrief/utils';
```

### 2.2 Formal acceptance criteria

A message MUST:

- [ ] Contain the single-quoted symbol name at the start (`'calculateBounds'`).
- [ ] Contain the literal text `'@debrief/utils'` (with single quotes).
- [ ] Contain the literal text `apps/*`.
- [ ] Contain the literal text `import { <NAME> } from '@debrief/utils';` with the correct name substituted.
- [ ] NOT contain ANSI escape codes (`\x1b[…`).
- [ ] NOT contain multiple lines (newline characters).
- [ ] NOT contain trailing whitespace.

A compliant message renders in a CI log as a single readable sentence; a contributor can copy the `import { … } from '@debrief/utils';` portion into their file as-is (modulo quote style).

### 2.3 Path information

The rule module itself MUST NOT embed the offending file path in the `message` string — ESLint prepends the file path and line/column automatically when reporting violations. Duplicating it would produce noise.

---

## 3. Wiring contract (per-app `.eslintrc.cjs`)

### 3.1 Affected files

Four files, all modified identically:

- `apps/loader/.eslintrc.cjs`
- `apps/vscode/.eslintrc.cjs`
- `apps/web-shell/.eslintrc.cjs`
- `apps/spec-navigator/.eslintrc.cjs`

### 3.2 Diff shape (per file)

**Add** near the top (after existing requires):

```js
const { rules: utilsDriftRules } = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
```

**Modify** the existing `no-restricted-syntax` entry under `rules:` to spread `utilsDriftRules` alongside any existing entries. Severity MUST be `'error'`.

### 3.3 Invariants the wiring preserves

- No `.eslintrc.cjs` gains a new top-level field.
- No `.eslintrc.cjs` changes its existing rule severities.
- `apps/vscode/.eslintrc.cjs`'s existing `...snakeCaseRules` spread continues to coexist; the new spread is additive.

### 3.4 Wiring conformance test

A reviewer (or a small check script) can verify wiring is correct by confirming for each `apps/*/.eslintrc.cjs`:

1. The `require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs')` line is present.
2. The imported `utilsDriftRules` identifier appears inside the `no-restricted-syntax` array.
3. The severity element preceding it is `'error'`.

---

## 4. Observable behaviour contract

### 4.1 Positive observation (violation present)

Given a working tree where `apps/<any-app>/src/<any-path>.ts` contains an *original* export declaration whose name is a member of `@debrief/utils`'s export surface:

- `pnpm lint` MUST exit with a non-zero status code.
- `task lint` MUST fail.
- The CI `Lint` step MUST fail.
- Standard output / standard error MUST contain a line matching the `FailureMessage` template for each violation, prefixed by ESLint's standard `<file>:<line>:<col>  error  <message>  no-restricted-syntax` formatting.

### 4.2 Negative observation (no violation)

Given the current `main` tree at feature-introduction time (post-#200):

- `pnpm lint` MUST exit with status code 0.
- `task lint` MUST succeed.
- The CI `Lint` step MUST pass.
- No line in standard output / standard error matches the `FailureMessage` template.

### 4.3 Re-export tolerance

Given any `apps/*` file that contains **only** `export { calculateBounds } from '@debrief/utils';` or `export * from '@debrief/utils';` (or combinations thereof) and no original declaration of a forbidden name:

- `pnpm lint` MUST exit with status code 0 for reasons attributable to this rule. (Other lint rules may still fire on other content; this rule specifically MUST NOT fire.)

### 4.4 Auto-extension on `@debrief/utils` growth

Given a working-tree change that adds a new `export { newHelper } from './newHelper.js';` line to `shared/utils/src/index.ts`, and a second change that adds an `apps/vscode/src/newHelper.ts` file containing `export function newHelper() {}`:

- `pnpm lint` MUST fail on the second change's lint run, with a message naming `newHelper`. No edit to `no-redeclare-utils-exports.cjs` is permitted between the two changes; the auto-extension MUST be structural (FR-010, SC-004).

---

## 5. Non-contract (explicitly)

The following are **not** part of this feature's contract and may change without notice:

- The internal structure of `ForbiddenSet` (the module's private data shape).
- The precise parser used to read `shared/utils/src/index.ts` (`typescript.createSourceFile` today; could become `@typescript-eslint/typescript-estree` tomorrow without affecting consumers, provided the output `rules` array is unchanged).
- The exact lexicographic sort order of `rules` (only that the order is deterministic — see §1.4).
- Whether the module caches the `ForbiddenSet` or recomputes on each `require()` (Node's require-cache decides, and the observable behaviour is identical either way).
- The number of selectors emitted per name (currently 7; could shrink with future ESTree additions).

---

## 6. Summary acceptance checklist

A reviewer should be able to confirm all of the following on the implementation PR:

- [ ] `shared/eslint-rules/no-redeclare-utils-exports.cjs` exists and exports `{ rules: [...] }` with the shape in §1.1.
- [ ] The module reads `shared/utils/src/index.ts` via the `typescript` parser at require time.
- [ ] The `rules` array is sorted and deterministic.
- [ ] Every message conforms to §2.1 / §2.2.
- [ ] All four `apps/*/.eslintrc.cjs` files are wired per §3.
- [ ] Vitest tests at `shared/eslint-rules/no-redeclare-utils-exports.test.cjs` cover every positive/negative fixture listed in `plan.md`'s `__fixtures__/` tree.
- [ ] `task lint` on the current `main` passes with zero violations (SC-007).
- [ ] An intentionally-introduced violation causes `task lint` to fail (SC-001, SC-002).
- [ ] A barrel re-export does not cause a violation (SC-003).
- [ ] Adding a throwaway export to `shared/utils/src/index.ts` extends the guard without editing the rule module (SC-004).
