# Contract: Drift-Rule Factory + per-package Rule Modules + Wiring Check + Geojson-Script Wiring

**Feature**: 214-utils-drift-guard
**Phase**: 1
**Date**: 2026-04-20
**Updated**: 2026-04-20 during `/speckit.review` — contract expanded to cover the drift-rule factory, five per-package caller modules (instead of one), the wiring-forgotten meta-check, and the `check-no-geojson-feature.sh` invocation contract.

## Scope note

This feature does not expose a network API, a database schema, or a user-facing command surface. Its "contract" is the module-level interface of the `drift-rule-factory.cjs` module, the five per-package caller modules it backs, the `scripts/check-eslint-drift-wiring.cjs` meta-check script, and the integration contract with each `apps/*/.eslintrc.cjs` + `Taskfile.yml`. This document defines all of them so that implementers, reviewers, and future maintainers can verify conformance without guessing.

---

## 1. Module interface

### 1.0 Factory module

File: `shared/eslint-rules/drift-rule-factory.cjs`

**Exports** *(exact shape)*:

```js
/**
 * @typedef {Object} DriftRuleFactoryInput
 * @property {string} packageName   - e.g. '@debrief/utils'
 * @property {string} indexPath     - absolute or caller-resolved path to the package's barrel .ts
 * @property {string} [anchorDir]   - directory the transitive export * walker is bounded to (defaults to path.dirname(indexPath))
 */

/**
 * @param {DriftRuleFactoryInput} input
 * @returns {{ rules: Array<{ selector: string, message: string }> }}
 */
module.exports = function createDriftRules(input) { /* ... */ };
```

**Behaviour**: invoking the factory with a well-formed `input` MUST:

1. Resolve and read `input.indexPath` via `fs.readFileSync`.
2. Parse with `typescript.createSourceFile(...)` at `ScriptTarget.Latest`.
3. Enumerate top-level `ExportDeclaration` and `ExportAssignment` nodes; collect explicit `ExportSpecifier` names (both value and type).
4. For each `ExportAllDeclaration` whose source starts with `./` or `../`, resolve against `input.anchorDir` (after stripping any `.js` / `.cjs` / `.mjs` suffix — TypeScript convention), read the target `.ts` file, and recurse. Maintain a visited-set to prevent cycle revisits. Do NOT follow non-relative or non-sibling-tree specifiers.
5. Build the `ForbiddenSet` (values + types), deduplicated.
6. Generate 7 selector entries per name, with messages templated from `input.packageName`.
7. Sort by `(selector, message)` lexicographically for determinism.
8. Return `{ rules }`.

**Failure modes** (factory-level):

| Condition | Behaviour |
|-----------|-----------|
| `input.indexPath` does not resolve to a readable file | Throw `Error(\`drift-rule-factory: indexPath not readable at <path>\`)`. Fail-closed. |
| Parse of any file (top-level or recursively-walked) throws | Let the error propagate — a broken source file is a repo-wide problem that must surface loudly. |
| Transitive walk encounters a bare-specifier `export * from '@debrief/other'` | Ignore silently (out-of-package; not an error). |
| Resulting `ForbiddenSet` is empty | Emit one-line warning to stderr including `input.packageName` and the resolved `indexPath`. Return `{ rules: [] }`. |
| `input.packageName` missing or not a string starting with `@debrief/` | Throw immediately. This is a caller-module bug, not a user-facing error. |

### 1.1 Per-package caller module export shape

Files (one per package):

- `shared/eslint-rules/no-redeclare-utils-exports.cjs`
- `shared/eslint-rules/no-redeclare-schemas-exports.cjs`
- `shared/eslint-rules/no-redeclare-components-exports.cjs`
- `shared/eslint-rules/no-redeclare-session-state-exports.cjs`
- `shared/eslint-rules/no-redeclare-data-exports.cjs`

**Exports** *(exact shape, identical across all five files)*:

```js
const path = require('path');
const createDriftRules = require('./drift-rule-factory.cjs');

module.exports = createDriftRules({
  packageName: '@debrief/<pkg>',
  indexPath: path.resolve(__dirname, /* relative path to the package's index.ts */),
});
```

The module MUST expose exactly `{ rules: Array<{ selector: string, message: string }> }` at its top level — the object returned by `createDriftRules`. Matches the shape `provenance-snake-case.cjs` already exports; callers can use any of the six `shared/eslint-rules/*.cjs` modules interchangeably at the `.eslintrc.cjs` spread point.

**No other top-level exports** from any caller module. Callers do not expose the parsed `ForbiddenSet`, the factory itself, the `index.ts` parser, or any internals. This minimises the consumer-visible surface and keeps future refactors free.

**Per-package input values** *(authoritative — use these exact strings)*:

| Caller module | `packageName` | `indexPath` relative to `__dirname` |
|---------------|---------------|-------------------------------------|
| `no-redeclare-utils-exports.cjs`         | `'@debrief/utils'`         | `'../utils/src/index.ts'` |
| `no-redeclare-components-exports.cjs`    | `'@debrief/components'`    | `'../components/src/index.ts'` |
| `no-redeclare-schemas-exports.cjs`       | `'@debrief/schemas'`       | `'../schemas/src/generated/typescript/index.ts'` |
| `no-redeclare-data-exports.cjs`          | `'@debrief/data'`          | `'../data/src/ts/index.ts'` |
| `no-redeclare-session-state-exports.cjs` | `'@debrief/session-state'` | `'../../services/session-state/src/index.ts'` |

Any future sibling added to this table MUST also be registered in `scripts/check-eslint-drift-wiring.cjs`'s caller-modules parameter (see §7 below).

### 1.2 Caller usage contract

Each `apps/*/.eslintrc.cjs` imports and spreads every per-package `rules` array into its `no-restricted-syntax` config:

```js
const { rules: utilsDriftRules }        = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
const { rules: schemasDriftRules }      = require('../../shared/eslint-rules/no-redeclare-schemas-exports.cjs');
const { rules: componentsDriftRules }   = require('../../shared/eslint-rules/no-redeclare-components-exports.cjs');
const { rules: sessionStateDriftRules } = require('../../shared/eslint-rules/no-redeclare-session-state-exports.cjs');
const { rules: dataDriftRules }         = require('../../shared/eslint-rules/no-redeclare-data-exports.cjs');
// ... other requires ...

module.exports = {
  // ...
  rules: {
    'no-restricted-syntax': [
      'error',           // ← severity MUST be 'error', not 'warn', for FR-004
      ...utilsDriftRules,
      ...schemasDriftRules,
      ...componentsDriftRules,
      ...sessionStateDriftRules,
      ...dataDriftRules,
      // ... other existing entries ...
    ],
  },
};
```

**Caller obligations**:
- MUST pass severity `'error'` — `'warn'` would not fail CI (violates FR-004).
- MUST place the imports near the top of the file (standard CJS convention; they may coexist with other existing requires such as the existing `snakeCaseRules` import in `apps/vscode/.eslintrc.cjs`).
- MUST spread **every** `<pkg>DriftRules` array by name (not pass any array by reference), so per-package identity is preserved for the wiring-forgotten meta-check (§7).
- MUST NOT modify any `<pkg>DriftRules` in place — the arrays are considered immutable from the caller's perspective.
- MUST NOT omit any of the five spreads. Omission is a wiring defect caught by §7.

### 1.3 Initialisation behaviour (per caller module)

**At `require()` time**, each caller module:

1. Resolves its package's `indexPath` relative to its own `__dirname` (per §1.1 table).
2. Delegates to `drift-rule-factory.cjs`, which:
   a. Reads the resolved `indexPath`.
   b. Parses with `typescript.createSourceFile(...)` using `ScriptTarget.Latest`.
   c. Walks top-level statements; collects every `export { … }` specifier, every `export type { … }` specifier, and every `ExportAllDeclaration` (`export * from './…'`).
   d. For each relative `export *` forward, recursively reads and parses the target file, bounded to the same package's `src/` tree (see §1.0 failure modes).
   e. Builds the `ForbiddenSet` (values + types).
   f. Generates 7 selector entries per name with messages embedding `packageName`.
   g. Sorts by `(selector, message)` lexicographically.
   h. Returns `{ rules }` (frozen).
3. Assigns the factory's return value to `module.exports`.

**Per-caller failure modes** *(inherited from the factory — see §1.0)*:

| Condition | Behaviour |
|-----------|-----------|
| The package's resolved `indexPath` does not exist | Throw a clear error: `drift-rule-factory: indexPath not readable at <resolved path>`. Fail-closed — ESLint will report the rule-load failure, which surfaces in CI. |
| Index barrel has no exports and no recursive `export *` contributions | Emit a warning to `stderr`: `drift-rule-factory: '<@debrief/pkg>' has no exports — forbidden set is empty`. Return an empty `rules` array. ESLint runs cleanly; future additions will automatically populate. |
| TypeScript parser throws on malformed source | Let the error propagate. A broken index or subfile is a repo-wide problem that should surface loudly, not be swallowed. |
| Cycle detected in transitive `export *` walk | Cycle-break silently (visited-set); do not double-count names; do not throw. |

### 1.4 Determinism contract

Per FR-011 and FR-020, calling `require('./no-redeclare-<pkg>-exports.cjs')` (for any `<pkg>`) twice in the same Node process MUST yield the same `rules` array (Node's require cache guarantees this). Calling across separate processes, on the same working tree, MUST produce arrays whose `selector` and `message` values are element-wise equal. Specifically:

- `rules` MUST be sorted by `(selector, message)` lexicographically before export, so array ordering is stable.
- `message` strings MUST NOT embed timestamps, PIDs, usernames, working-directory paths, or random IDs.
- `selector` strings MUST NOT embed anything not derived from `ForbiddenSet`.
- The transitive `export *` walk (Decision 7 / §1.0.4) MUST visit nodes in a deterministic order (depth-first, specifier-source-string sorted) so the resulting `ForbiddenSet` order is reproducible.

---

## 2. Violation message contract

### 2.1 Template

```text
'<NAME>' is exported by '<PACKAGE>'. Do not redeclare it under apps/*. Replace this declaration with: import { <NAME> } from '<PACKAGE>';
```

where `<PACKAGE>` is the `packageName` input to the factory for the caller module that contributed the match (e.g. `@debrief/utils`, `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data`).

### 2.2 Formal acceptance criteria

A message MUST:

- [ ] Contain the single-quoted symbol name at the start (`'calculateBounds'`).
- [ ] Contain the literal text `'<PACKAGE>'` (with single quotes) where `<PACKAGE>` is the caller module's `packageName`. Must match exactly one of: `'@debrief/utils'`, `'@debrief/schemas'`, `'@debrief/components'`, `'@debrief/session-state'`, `'@debrief/data'`.
- [ ] Contain the literal text `apps/*`.
- [ ] Contain the literal text `import { <NAME> } from '<PACKAGE>';` with the correct name and package substituted.
- [ ] NOT contain ANSI escape codes (`\x1b[…`).
- [ ] NOT contain multiple lines (newline characters).
- [ ] NOT contain trailing whitespace.

A compliant message renders in a CI log as a single readable sentence; a contributor can copy the `import { … } from '<PACKAGE>';` portion into their file as-is (modulo quote style).

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

**Add** near the top (after existing requires) — five lines:

```js
const { rules: utilsDriftRules }        = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');
const { rules: schemasDriftRules }      = require('../../shared/eslint-rules/no-redeclare-schemas-exports.cjs');
const { rules: componentsDriftRules }   = require('../../shared/eslint-rules/no-redeclare-components-exports.cjs');
const { rules: sessionStateDriftRules } = require('../../shared/eslint-rules/no-redeclare-session-state-exports.cjs');
const { rules: dataDriftRules }         = require('../../shared/eslint-rules/no-redeclare-data-exports.cjs');
```

**Modify** the existing `no-restricted-syntax` entry under `rules:` to spread every `<pkg>DriftRules` alongside any existing entries. Severity MUST be `'error'`. The five spreads MAY appear in any order but MUST all be present.

### 3.3 Invariants the wiring preserves

- No `.eslintrc.cjs` gains a new top-level field.
- No `.eslintrc.cjs` changes its existing rule severities.
- `apps/vscode/.eslintrc.cjs`'s existing `...snakeCaseRules` spread continues to coexist; the new spreads are additive.
- No `.eslintrc.cjs` removes or modifies any drift-rule spread once added — if a spread is removed, the wiring-forgotten meta-check (§7) fails.

### 3.4 Wiring conformance test

A reviewer (or the check script defined in §7) can verify wiring is correct by confirming for each `apps/*/.eslintrc.cjs`:

1. Each of the five `require('../../shared/eslint-rules/no-redeclare-<pkg>-exports.cjs')` lines is present.
2. Each imported `<pkg>DriftRules` identifier appears inside the `no-restricted-syntax` array (by reference-identity comparison against the caller module's exported array).
3. The severity element preceding the spreads is `'error'`.

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

- The internal structure of `ForbiddenSet` (the factory's private data shape).
- The precise parser used to read each package's index barrel (`typescript.createSourceFile` today; could become `@typescript-eslint/typescript-estree` tomorrow without affecting consumers, provided the output `rules` array is unchanged).
- The exact lexicographic sort order of `rules` (only that the order is deterministic — see §1.4).
- Whether each caller module caches the `ForbiddenSet` or recomputes on each `require()` (Node's require-cache decides, and the observable behaviour is identical either way).
- The number of selectors emitted per name (currently 7; could shrink with future ESTree additions).
- The internal implementation of the transitive `export *` walker (iterative vs recursive, visited-set representation, file-read caching) — only the invariants in §1.0 steps 3–4 and §1.4 are contractual.
- The internal implementation of the wiring-check script (§7) — only its invocation contract and failure-output shape are contractual.

---

## 6. Summary acceptance checklist

A reviewer should be able to confirm all of the following on the implementation PR:

**Factory + per-package caller modules:**
- [ ] `shared/eslint-rules/drift-rule-factory.cjs` exists and matches the factory shape in §1.0.
- [ ] All five `shared/eslint-rules/no-redeclare-<pkg>-exports.cjs` caller modules exist and each exports `{ rules: [...] }` with the shape in §1.1.
- [ ] Each caller module invokes the factory with exactly the inputs listed in §1.1's table.
- [ ] Each caller module's `rules` array is sorted and deterministic (§1.4).
- [ ] Every message conforms to §2.1 / §2.2 and names the correct package.
- [ ] The `@debrief/session-state` caller module's `ForbiddenSet` includes at least one name reached only via `export *` forwarding (otherwise the transitive walker is regressing).

**Wiring in `apps/*`:**
- [ ] All four `apps/*/.eslintrc.cjs` files are wired per §3 (five spreads, severity `'error'`).

**Wiring-forgotten meta-check (§7):**
- [ ] `scripts/check-eslint-drift-wiring.cjs` exists and meets its invocation contract (§7).
- [ ] `task lint` (Taskfile.yml) invokes the meta-check.
- [ ] Removing any one `<pkg>DriftRules` spread from any `apps/*/.eslintrc.cjs` causes `task lint` to fail with the expected message shape (§7.2).
- [ ] Adding a new `apps/<new>/.eslintrc.cjs` missing any spread causes `task lint` to fail similarly, with no edit to the meta-check script required.

**Geojson-script wiring (§8):**
- [ ] `task lint` (Taskfile.yml) invokes `bash scripts/check-no-geojson-feature.sh`.
- [ ] `scripts/check-no-geojson-feature.sh` itself is unchanged (byte-for-byte identical to its pre-feature content, except optional addition of a leading comment referencing #214).

**Tests:**
- [ ] Vitest tests at `shared/utils/tests/eslint-rules/` cover every positive/negative fixture listed in `plan.md`'s `__fixtures__/` tree, including smoke tests for each of the five packages.
- [ ] The factory has its own unit tests covering all seven AST shapes + transitive `export *` walking + cycle guard.
- [ ] The wiring-check script has its own Vitest test.

**ADR:**
- [ ] `docs/project_notes/decisions.md` gains an ADR entry per research.md Decision 10.

**Success criteria verifiable by CI-equivalent runs:**
- [ ] `task lint` on the current `main`-plus-implementation tree passes with zero violations from any guard component (FR-020, SC-007).
- [ ] An intentionally-introduced redeclaration from any of the five packages causes `task lint` to fail (SC-001, SC-002, SC-009).
- [ ] A barrel re-export (any package) does not cause a violation (SC-003).
- [ ] Adding a throwaway export to any `@debrief/*` index barrel extends the guard without editing any rule module (SC-004, SC-011).
- [ ] Intentionally removing a spread from an `apps/*/.eslintrc.cjs` causes the wiring-check to fail (SC-008).
- [ ] Adding a file containing `interface GeoJSONFeature { ... }` anywhere non-excluded causes the geojson script to fail (SC-010).
- [ ] Aggregate guard cost is ≤5 s added to `task verify` on a clean checkout (SC-006).

---

## 7. Wiring-forgotten meta-check script contract

### 7.1 Script interface

File: `scripts/check-eslint-drift-wiring.cjs`

**Invocation**: `node scripts/check-eslint-drift-wiring.cjs` from repo root. No arguments, no stdin. Exits `0` on pass, `1` on failure.

**Behaviour**:

1. Enumerate every direct child directory of `apps/` matching the pattern `apps/*/`. For each, check whether `<dir>/.eslintrc.cjs` exists.
2. For each `.eslintrc.cjs` that exists: `require()` it, then recursively flatten any `extends` chain if present (best-effort — skip if unsupported shape). Obtain the resolved `rules['no-restricted-syntax']` value.
3. For each of the five caller modules listed in §1.1's table: `require()` the caller module, obtain its exported `rules` array reference, and verify that *every* element of that array is present (by `Array.prototype.includes(element)` against the resolved `no-restricted-syntax` array from step 2) — which holds iff the spread occurred at that `.eslintrc.cjs`.
4. If any `(apps/<dir>, caller-module)` pair fails the check, collect it. After iterating all pairs, emit a failure report (§7.2) and exit `1`. Otherwise emit a single pass line and exit `0`.

**Inputs** (hard-coded in the script, matching §1.1's table):

```js
const CALLER_MODULES = [
  '../shared/eslint-rules/no-redeclare-utils-exports.cjs',
  '../shared/eslint-rules/no-redeclare-schemas-exports.cjs',
  '../shared/eslint-rules/no-redeclare-components-exports.cjs',
  '../shared/eslint-rules/no-redeclare-session-state-exports.cjs',
  '../shared/eslint-rules/no-redeclare-data-exports.cjs',
];
```

Future packages: add a line here. The script has no further parameterisation; its simplicity is the point.

### 7.2 Failure output shape

On failure, the script MUST print (to stderr) a report of approximately this shape:

```text
❌ ESLint drift-rule wiring check failed.

The following apps/*/.eslintrc.cjs files are missing one or more drift-rule spreads:

  apps/tutorial-sandbox/.eslintrc.cjs
    Missing: ...utilsDriftRules        (expected from shared/eslint-rules/no-redeclare-utils-exports.cjs)
    Missing: ...schemasDriftRules      (expected from shared/eslint-rules/no-redeclare-schemas-exports.cjs)

Fix: add the missing require(...) lines and ensure each ...<pkg>DriftRules is spread into the `no-restricted-syntax` rule array.
See shared/eslint-rules/README (or specs/214-utils-drift-guard/contracts/rule-contract.md §3) for the exact diff shape.
```

Each missing-pair entry MUST name:

- The offending `.eslintrc.cjs` file (repo-root-relative).
- The identifier name of the expected spread (`...<pkg>DriftRules`).
- The caller-module path the spread should come from.

### 7.3 Failure mode matrix

| Condition | Behaviour | Rationale |
|-----------|-----------|-----------|
| `apps/<dir>/.eslintrc.cjs` missing entirely | Skip that directory (pass) | FR-018: only check dirs that have an eslintrc |
| `apps/<dir>/.eslintrc.cjs` exists but `require()` throws | Emit a distinct stderr line naming the file and the exception; exit `1` | Config is broken — not a wiring defect but a CI blocker |
| `apps/<dir>/.eslintrc.cjs` has no `no-restricted-syntax` rule at all | Treated as missing every spread; report all five as missing | Most common new-app failure mode; actionable |
| A caller module throws at `require()` | Let the error propagate (the script exits with a non-zero Node error) | A broken caller-module is a repo-wide problem, handled upstream in §1.0 |
| Script invoked from a directory other than repo root | Detect via absence of expected paths; fail with a clear error asking the user to run from repo root | Operator error; fail-closed |

### 7.4 Invocation contract (from `task lint`)

`Taskfile.yml`'s `lint` task MUST invoke the script as a discrete aggregated command alongside `pnpm lint`, such that any non-zero exit from the script causes `task lint` to fail. Example (illustrative; implementer may adjust to match existing Taskfile idioms):

```yaml
lint:
  desc: Lint everything
  cmds:
    - pnpm lint
    - node scripts/check-eslint-drift-wiring.cjs
    - bash scripts/check-no-geojson-feature.sh
```

---

## 8. `scripts/check-no-geojson-feature.sh` wiring contract

### 8.1 Invocation contract

`Taskfile.yml`'s `lint` task MUST invoke `bash scripts/check-no-geojson-feature.sh` as a discrete aggregated command (see §7.4's example). The script's `set -euo pipefail` + explicit `exit 1` on violations ensures `task lint` fails on a non-zero exit.

### 8.2 Script immutability

The file `scripts/check-no-geojson-feature.sh` MUST NOT be modified by this feature's implementation PR, with ONE optional exception: a leading comment referencing this spec (e.g., `# Wired into task lint by spec 214-utils-drift-guard.`). No other change — no exclusion-list edits, no logic tweaks, no refactoring. If the script needs any change whatsoever beyond the optional leading-comment, the change belongs in a separate spec.

### 8.3 Baseline assumption

Per FR-020 / SC-007 / SC-010, the script MUST report zero violations on `main` at feature-introduction time. If the implementer's first `task lint` on the post-implementation tree fails on the geojson script, that is a pre-existing drift in `shared/` or `services/` that must be fixed (not suppressed) before this feature merges.

### 8.4 Future migration (non-normative)

A separate backlog item MAY later migrate this script's logic into the drift-rule factory's scope (i.e., expand the rule coverage from `apps/*` to `apps/*` + `shared/*` + `services/*` for the `GeoJSONFeature`-specific pattern — or, more likely, generalise the AST-based rule to cover those directories for the same reasons the `apps/*` rule covers `apps/*`). That migration is not scheduled, not promised, and not part of this feature's contract.
