# Research: Drift-Prevention Rule for `@debrief/utils` Re-duplication

**Feature**: 214-utils-drift-guard
**Phase**: 0 (research)
**Date**: 2026-04-20

## Purpose of this document

The specification (`spec.md`) deferred the mechanism choice to the plan phase (Assumptions section, final bullet). This research document resolves that deferral, records the reasoning, and names the rejected alternatives — so a future maintainer can reopen the decision with full context rather than reverse-engineering it.

---

## Decision 1: Mechanism — custom ESLint rule vs. standalone script

### Decision

**Implement as a `no-restricted-syntax` entry-generator module at `shared/eslint-rules/no-redeclare-utils-exports.cjs`**, wired into each `apps/*/.eslintrc.cjs` via the `no-restricted-syntax` spread pattern already established by `shared/eslint-rules/provenance-snake-case.cjs`.

### Rationale

Four reasons, in priority order:

1. **Integration point already exists.** `task lint` / `pnpm lint` is an established, CI-enforced step (`CLAUDE.md`'s "Before Pushing" table, `.github/workflows/ci.yml`). Plugging a guard into ESLint inherits that CI integration for free. The spec's FR-004 (must fail CI), FR-005 (runnable locally with the same command surface), and SC-006 (≤5 s added run-time) are satisfied by construction.
2. **AST precision.** ESLint's AST distinguishes `ExportNamedDeclaration[declaration=…]` (original export with a body) from `ExportNamedDeclaration[specifiers=…, source=…]` (re-export from a package) *in the grammar itself*. FR-002 (barrel re-exports must pass) and FR-009 (no false positives on `export * from '@debrief/utils'`, non-exported collisions, or forwarding forms) become free consequences of picking the right selector shape, rather than edge-cases we hand-code around.
3. **Precedent.** `shared/eslint-rules/provenance-snake-case.cjs` is the existing pattern for monorepo-wide export-name policy. Following it means zero invention — the wiring, the testing pattern, and the author-of-next-rule experience are all already settled.
4. **IDE feedback loop.** ESLint rules surface as live squiggles in VS Code via the existing ESLint extension. A contributor who tries to reintroduce a local `calculateBounds` sees the error on the line where they wrote it, before they've even saved, let alone run `pnpm lint`. This is a much shorter remediation loop than a shell script that only runs in CI, and directly supports SC-005 (<5-minute first-time resolution).

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Standalone shell/Node script under `scripts/`** (e.g. `scripts/check-no-utils-redeclaration.sh` modelled on `scripts/check-no-geojson-feature.sh`) | The nominal precedent is itself an anti-example: `scripts/check-no-geojson-feature.sh` exists in the tree but is **not wired into CI** (confirmed by a `Grep` across `.github/`, `Taskfile.yml`, and `package.json` — zero references). A standalone script that must be independently wired into CI is, empirically in this monorepo, a guard that gets forgotten. Also: the script approach would either rely on regex (fragile against `export*from` spacing, string literals containing `export function calculateBounds(...)`, etc.) or re-implement AST parsing that ESLint already does. |
| **Custom ESLint rule as a workspace package** (e.g. create `shared/eslint-plugin-debrief/` with a `package.json`, register as `@debrief/eslint-plugin`, add to `pnpm-workspace.yaml`, wire into each app via `plugins: ['@debrief/eslint-plugin']` and `rules: { '@debrief/eslint-plugin/no-redeclare-utils-exports': 'error' }`) | Heavier than necessary. A full plugin package is the idiomatic ESLint pattern when you have *many* rules, *many* consumers outside the monorepo, or *runtime options* per consumer. We have one rule, all consumers in-repo, and no per-consumer configuration need. The existing `provenance-snake-case.cjs` precedent solves the same class of problem without a plugin package, and is the style future rules in this repo will presumably continue to follow. Adding a plugin package would fork the monorepo's custom-rule pattern for no gain. |
| **Community plugin `eslint-plugin-local-rules`** | Adds a dependency to solve a problem the existing precedent already solves (see previous row). Article IX ("every dependency is a liability") weighs against. |
| **TypeScript compiler plugin / transformer** | The guard is a static-analysis concern, not a type-system concern. TS plugins are a heavyweight mechanism, fragile across editor tooling, and have no precedent in this monorepo. |
| **Git pre-commit hook** | Client-side enforcement only. Can be skipped with `--no-verify`. Fails FR-004 (must be enforced in CI). Could be *additive* on top of the ESLint rule but adds nothing the ESLint rule doesn't already get for free via `task verify`'s lint step. |

---

## Decision 2: Forbidden-name discovery — parse `shared/utils/src/index.ts`

### Decision

At rule-module load time, **parse `shared/utils/src/index.ts`** using the TypeScript compiler's parser (`require('typescript').createSourceFile`), walk its top-level `ExportDeclaration` nodes, and collect every exported name into a `Set<string>` (values and types together). The resulting set is the "forbidden names" input used to generate `no-restricted-syntax` entries.

### Rationale

- **Single source of truth.** FR-006 requires deriving the forbidden set from `@debrief/utils`'s actual export surface. `shared/utils/src/index.ts` *is* that surface — it's the file referenced by the package's `"main"` / `"types"` fields and the one every consumer resolves via `import … from '@debrief/utils'`.
- **Auto-updating.** FR-010 requires that adding a new export to `@debrief/utils` automatically extends the guard. Parsing the file on every lint run gives us this for free; no registration step, no regeneration hook.
- **No type-checker needed.** `shared/utils/src/index.ts` is a pure re-export barrel (confirmed by reading it — lines 1–84 are all `export { … } from './…'`). An AST-only parse (no `createProgram`, no resolver) is sufficient. This keeps the rule's init cost in the tens of milliseconds.
- **TypeScript already a dependency.** `typescript` is a root devDependency in this monorepo; we're not importing a new library.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Regex scan of `shared/utils/src/index.ts`** | Brittle (multi-line `export { … }` blocks, `type` modifiers, trailing commas, comments). Not worth the "avoid `typescript` require" saving when `typescript` is already loaded. |
| **Runtime `require('@debrief/utils')` and enumerate `Object.keys`** | Misses type-only exports entirely (types erased at runtime) — violates FR-007. Also requires the package to be built first, creating a fragile ordering. |
| **Hand-maintained constant in the rule source** | Directly violates FR-006 and FR-010. Listed only for completeness. |
| **Read the package's generated `.d.ts`** | Adds a build-order dependency (rule can't run before `@debrief/utils` is built). `.ts` source is available unconditionally. |

---

## Decision 3: `no-restricted-syntax` selectors — the seven export shapes

### Decision

For each name `N` in the forbidden set, emit these `no-restricted-syntax` entries:

| # | Selector | Matches |
|---|----------|---------|
| 1 | `ExportNamedDeclaration > FunctionDeclaration[id.name='N']` | `export function N(...) { ... }` |
| 2 | `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='N']` | `export const N = …` / `export let N = …` |
| 3 | `ExportNamedDeclaration > ClassDeclaration[id.name='N']` | `export class N { ... }` |
| 4 | `ExportNamedDeclaration > TSTypeAliasDeclaration[id.name='N']` | `export type N = …` |
| 5 | `ExportNamedDeclaration > TSInterfaceDeclaration[id.name='N']` | `export interface N { ... }` |
| 6 | `ExportNamedDeclaration > TSEnumDeclaration[id.name='N']` | `export enum N { ... }` |
| 7 | `ExportDefaultDeclaration > FunctionDeclaration[id.name='N']` | `export default function N(...) { ... }` |

For each match, the `message` string is:

```text
'N' is exported by '@debrief/utils'. Do not redeclare it under apps/*. Replace this declaration with: import { N } from '@debrief/utils';
```

### Rationale

- **Exhaustive coverage of the shapes #200 consolidated.** Functions (`calculateBounds`, `mergeBounds`, `formatDuration`, …), types (`SafeFeature`, `GeoJSONFeature`, `Bounds`, …), enums if ever added. Every shape `@debrief/utils` uses today or might use in future is a separate ESTree/TS-ESTree node type; enumerating them is verbose but precise.
- **Re-exports explicitly NOT matched.** `ExportNamedDeclaration > FunctionDeclaration` fires only when the export statement carries a *declaration child*. `export { N } from '@debrief/utils'` has `specifiers` + `source` and no declaration child — it does not match any of the seven selectors. This makes FR-002 / FR-009 structural, not conditional.
- **`export * from` explicitly NOT matched.** That form is an `ExportAllDeclaration`, a different node type; none of the selectors mention it. Structural guarantee.
- **Default-anonymous exports NOT matched.** `export default function() { ... }` has no `id.name` and cannot collide with any name in the forbidden set — so selector 7 will not fire on it. (And anonymous default exports don't create a name that could compete with `@debrief/utils`'s named surface anyway.)
- **Nested scopes NOT matched.** `function outer() { function calculateBounds() {} }` is an internal declaration, not an `ExportNamedDeclaration` child. Non-exported local identifiers are free.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Single broad selector `ExportNamedDeclaration`** | Also matches re-exports and `export *` forms. Would require custom messaging logic and runtime filtering — the point of using selectors is to avoid that. |
| **Custom ESLint rule with `create(context)` visitor** (instead of selector-based) | More power than needed. The seven selectors cover everything FR-001/007 demands without writing visitor code. If the rule ever needs options-based configuration or cross-file analysis, we can escalate to a full rule; today it doesn't. |

---

## Decision 4: Testing strategy — Vitest with programmatic ESLint

### Decision

**Vitest-based unit test** at `shared/eslint-rules/no-redeclare-utils-exports.test.cjs` that:

1. Stubs `shared/utils/src/index.ts` (or uses the real file — see below) to establish a known forbidden-name set.
2. Runs ESLint programmatically (`new ESLint({ baseConfig: { rules: { 'no-restricted-syntax': ['error', ...entries] } } })`) against each fixture file under `__fixtures__/`.
3. Asserts: positive fixtures produce the expected violations with the expected message shape; negative fixtures produce zero violations.

**Fixture files** are real `.ts` files (not inline strings) so the test exercises the same parser path ESLint uses on real `apps/*` code.

**Using the real `shared/utils/src/index.ts`**: the tests import the module (not a stub), so if the export surface of `@debrief/utils` changes, the tests re-run against the current surface. This doubles as an integration test of FR-010 (new exports extend the guard automatically).

### Rationale

- **Vitest is the monorepo's TS test runner.** Matches `task test` / `pnpm test` already wired into CI.
- **Fixture files over inline strings.** Inline strings in test cases work for a `RuleTester` approach, but real files in `__fixtures__/` (a) read more like actual `apps/*` source to a reviewer, (b) are parseable by the same `@typescript-eslint/parser` configuration the apps use, and (c) can be opened in an editor for debugging.
- **Programmatic ESLint over `RuleTester`**. `RuleTester` is the canonical choice for custom rules, but our "rule" is a configuration generator (a function that returns `no-restricted-syntax` entries); the entries themselves are exercised by ESLint's built-in rule. Programmatic ESLint is a better fit for the shape of what we're testing.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **`RuleTester` from `eslint`** | Designed for custom rules with their own `create()`. We're generating config for the built-in `no-restricted-syntax` rule; `RuleTester` adds indirection without adding rigour. |
| **Snapshot tests over real `apps/*` source** | Would couple test stability to app-code churn. Dedicated fixtures decouple concerns. |
| **Stub `shared/utils/src/index.ts` via mock** | Loses the FR-010 auto-coverage integration property. We want the tests to *also* fail if, e.g., someone deletes an export from `@debrief/utils` that one of our fixtures assumed existed. |

---

## Decision 5: ADR record

### Decision

**Add a short ADR (1–2 paragraphs) to `docs/project_notes/decisions.md`** during the implementation task, capturing Decision 1 (ESLint over script) as a durable record. Title: *"ADR-NNN: Drift-prevention guards implemented as ESLint rules, not standalone scripts"*.

### Rationale

Article VIII.3 requires significant technical choices to be documented with rationale. This decision establishes a pattern future "guard-style" features will follow; pinning it in `decisions.md` avoids re-litigation.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Skip the ADR** (rely on this research.md) | `specs/*/research.md` is archival per-feature documentation; decisions that establish monorepo-wide patterns belong in the central log. |
| **Full-length ADR** | Overkill for a follow-up to #200 with a pre-existing precedent. One or two paragraphs suffice. |

---

## Open questions

**None.** All four deferrals from `spec.md`'s Assumptions section are resolved:

- Mechanism choice → Decision 1 (ESLint `no-restricted-syntax` generator).
- Forbidden-name source → Decision 2 (parse `shared/utils/src/index.ts`).
- Selector shape and coverage → Decision 3 (seven selectors).
- Test harness → Decision 4 (Vitest + programmatic ESLint + fixture files).

---

## Summary table

| Question | Decision | Key FR / SC satisfied |
|----------|----------|----------------------|
| How is the guard implemented? | Config-generator module at `shared/eslint-rules/no-redeclare-utils-exports.cjs`, spread into `no-restricted-syntax` in each `apps/*/.eslintrc.cjs` | FR-001, FR-004, FR-005, SC-006 |
| How does the guard know which names to forbid? | Parses `shared/utils/src/index.ts` at rule-init time using `typescript`'s AST | FR-006, FR-007, FR-010, SC-004 |
| How does the guard distinguish redeclaration from re-export? | Structural: AST selectors match only `ExportNamedDeclaration > <declaration>`, not specifier-based re-exports or `export *` | FR-002, FR-009, SC-003 |
| How is the failure message shaped? | `'<N>' is exported by '@debrief/utils'. Do not redeclare it under apps/*. Replace this declaration with: import { <N> } from '@debrief/utils';` | FR-003, FR-008, SC-005 |
| How is the rule tested? | Vitest + programmatic ESLint + real `.ts` fixtures under `shared/eslint-rules/__fixtures__/` | FR-011, FR-012, SC-007 |
| How is the decision recorded? | ADR added to `docs/project_notes/decisions.md` during implementation | Article VIII.3 |
