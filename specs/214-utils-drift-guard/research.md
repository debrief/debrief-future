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

## Decision 6: Factory pattern for multi-package drift coverage *(added 2026-04-20 during `/speckit.review`)*

### Decision

**Extract a single `drift-rule-factory.cjs` module** at `shared/eslint-rules/` that takes `{ packageName, indexPath, anchorDir }` and returns `{ rules: RestrictedSyntaxEntry[] }`. Each of the five `@debrief/*` packages gets a three-line caller module (`no-redeclare-<pkg>-exports.cjs`) that imports the factory, invokes it with the package's inputs, and re-exports the resulting `rules`. Each `apps/*/.eslintrc.cjs` requires every caller module and spreads every resulting array into its `no-restricted-syntax` config.

### Rationale

- **DRY under forced plurality.** Five packages × seven selectors × one message template = five near-identical rule modules. Once the user's "fix them in this spec" directive forced plurality, the factory extraction stopped being premature abstraction and became the minimal-repetition shape.
- **Each package is a pure parameter.** The AST selectors from Decision 3 are package-agnostic; only the forbidden-name set and the package identifier embedded in the message change. Parameterising those two inputs is a 10-line change from the single-package design.
- **Adding a sixth package is a three-line file.** If `@debrief/mcp-common` or a future `@debrief/contrib-*` ever wants drift coverage, the cost is one new caller module + one line in the wiring-check parameter + one line per `apps/*/.eslintrc.cjs`. The spec's Assumptions bullet about "future drift-prevention guards SHOULD be ESLint rules" benefits from this factory as the precedent.
- **Test surface is linear, not quadratic.** The factory gets full unit-test coverage (seven shapes × a synthetic single-name forbidden set). Each caller module gets a smoke test (1 positive + 1 negative) exercised against its real package — eight fixture files total for the four non-utils packages. The `@debrief/utils` caller keeps the full seven-shape fixture coverage as the canonical test bed.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Separate, unrelated rule modules per package (no shared factory)** | Duplicates the selector-emission logic five times. When Decision 3's selector list ever grows (e.g., `TSAbstractClassDeclaration` becomes a thing), five files need the same edit. Rejected on DRY grounds. |
| **Single omnibus module that internally iterates five packages and returns one combined `rules` array** | Conflates per-package config. A reviewer reading `apps/vscode/.eslintrc.cjs` would see one opaque spread rather than five named spreads. The wiring-forgotten meta-check (Decision 8) also becomes less precise — it can't distinguish "all drift rules missing" from "only schemas drift missing". Rejected on reviewability + meta-checkability grounds. |
| **Generate the per-package caller modules from a JSON manifest at build time** | Adds a build step to a feature whose entire point is zero-infrastructure, static-analysis-only. The five caller modules are three lines each — hand-writing them is cheaper than the script that would generate them. |

---

## Decision 7: Transitive `export *` walking within a package's own `src/` tree *(added 2026-04-20 during `/speckit.review`)*

### Decision

**The factory's index-file parser MUST follow `export * from '<relative-path>'` edges within the same package's `src/` subtree** to enumerate the forwarded names. Depth is bounded by the tree's natural depth (no loops possible in a well-formed module graph; the parser does not cross package boundaries). `export * from '<bare-module-specifier>'` (non-relative) is NOT followed — cross-package forwarding is an escape hatch out of the package's own surface and outside the guard's scope.

### Rationale

- **`@debrief/session-state`'s `index.ts` uses `export * from './types/index.js'` plus several submodule forwards.** A parser that stopped at the top-level index would see literally zero forwarded names from that package and emit an empty forbidden set. The whole rule for `@debrief/session-state` would be silently degenerate — exactly the class of silent failure this feature exists to prevent (Article I.3 again).
- **`@debrief/components`' `index.ts` uses many explicit `export { … } from './<component>'` specifier forwards plus some `export *`.** Both shapes need coverage.
- **Parser is still AST-only.** Reading the forwarded module is another `typescript.createSourceFile` call. No type resolver, no symbol table, no program-wide analysis. Cost scales linearly with the forwarding tree depth (single-digit in practice).
- **Bounded within the package.** The walker refuses to cross into `node_modules/`, refuses non-relative specifiers, and refuses absolute paths. This keeps the walk's scope predictable and protects against accidentally pulling in `@debrief/schemas`'s surface when walking `@debrief/session-state`.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Do not walk `export *`; accept holes in coverage for packages that use it** | Silent-degeneracy failure mode, as above. Non-starter. |
| **Use a type-checker-backed walk (TypeScript `Program`)** | Heavier, needs a full `tsconfig`-backed compilation unit per package at rule-init time. The AST-only walk gives the same answer for the shapes used in practice. |
| **Only walk one level deep (`export *` → no further `export *`)** | Works for today's trees (verified: no package has a nested `export *` beyond one hop) but leaves a trip-wire. Full walking with depth-bounded cycle guard is ~5 extra lines and closes the question. |
| **Require every package's `index.ts` to be rewritten as explicit `export { … }` barrels** | A large unrelated refactor of five packages across the monorepo. Not worth it; the parser change is cheaper. |

### Testing implication

The `session-state` smoke test specifically asserts that the forbidden set includes a name that is only reachable via `export *`. If a future refactor regresses the walker to stop at the top level, this test catches it.

---

## Decision 8: Wiring-forgotten meta-check — plain Node script invoked from `task lint` *(added 2026-04-20 during `/speckit.review`)*

### Decision

**Implement the wiring-forgotten meta-check as a standalone Node script** at `scripts/check-eslint-drift-wiring.cjs`, invoked from `task lint` alongside `pnpm lint`. The script enumerates `apps/*/`, for each sibling that contains a `.eslintrc.cjs` file it `require()`s the file and asserts the resulting config's `rules['no-restricted-syntax']` array contains (by identity comparison, not shallow-equal) every element of every per-package drift-rule array. It fails-closed with a clear message naming each offending `.eslintrc.cjs` and the specific caller-module whose spread is missing.

### Rationale

- **"Check that a check is wired" is meta-logic, not an ESLint rule.** ESLint rules run on source files; the wiring-forgotten check runs on `.eslintrc.cjs` files *as programs*, not as source to be lint-checked. A plain Node script is a better fit than a contrived meta-lint-rule.
- **Identity comparison is the right contract.** Because each caller module's `rules` array is exported by reference (Node's require cache ensures the same array object is used across the whole lint run), identity comparison between the array stored in the caller module and the array spread into the apps' config is both cheap and precise. No need to compare element shapes; reference equality between the two says "this exact array was or wasn't spread".
- **Doesn't duplicate the spec's "unwired script is anti-precedent" lesson.** The script is *itself* invoked from `task lint` — not deposited in `scripts/` without wiring. Being an example of its own principle is design-consistency, not irony.
- **Reports actionable failures.** The script prints the offending `apps/<name>/.eslintrc.cjs` path and the specific missing `no-redeclare-<pkg>-exports.cjs` path, so the fix is an obvious two-line edit.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **A custom ESLint rule that lints `.eslintrc.cjs` files themselves** | ESLint-on-ESLint-configs is supported but bizarre. The config file must itself be listed in an `overrides:` section somewhere, and the rule would have to reverse-engineer what the config "means". The plain Node script's direct `require()` of the config is both simpler and more honest. |
| **A `.eslintrc.base.cjs` that every apps/*/.eslintrc.cjs extends** | Would make the wiring structurally impossible to forget (good) but requires every app to adopt the shared base, which existing apps don't (and the per-app `.eslintrc.cjs` files already have file-local overrides for their own concerns). A larger refactor. Could be a follow-up if a second wiring-forgotten class ever emerges. |
| **A Git pre-commit hook that greps for the spread** | Client-side only; can be skipped with `--no-verify`. Fails FR-016 (MUST run in CI). |

---

## Decision 9: `scripts/check-no-geojson-feature.sh` — wire into `task lint`, don't rewrite *(added 2026-04-20 during `/speckit.review`)*

### Decision

**Add a single line to `task lint` (in `Taskfile.yml`) that invokes `bash scripts/check-no-geojson-feature.sh`** alongside `pnpm lint` and the new `node scripts/check-eslint-drift-wiring.cjs`. The script's internal logic is NOT modified or ported. If the script ever grows enough complexity to justify a TypeScript/Node port, that migration is a separate backlog item.

### Rationale

- **Maximum leverage, minimum change.** The script is already correct, already has its own clean baseline, and already documents what it checks. The only bug is that it isn't invoked. Wiring it is a one-line edit that buys back the entire check's value immediately.
- **Scope differs from the ESLint rules.** The script covers `apps/`, `shared/`, and `services/` for one specific identifier (`GeoJSONFeature`). The new ESLint drift rules cover `apps/*` only (per spec §Out of Scope). So the script is **not redundant** with the ESLint rules; it adds complementary coverage.
- **Consistent with the spec's new Assumption.** The spec's final Assumption bullet says future drift-prevention guards SHOULD be ESLint rules rather than shell scripts. The existing script is grandfathered — this feature does not retroactively port it, but it does wire it so the spec's "unwired scripts are anti-precedent" claim becomes true at this commit.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Delete the script** | Loses the `shared/` and `services/` coverage it provides. The ESLint rules do not cover those directories. Net loss. |
| **Port the script to a Node module** | Doubles the delta of this feature without adding coverage (the ported script would be functionally identical). Good candidate for a later spec if motivation emerges. |
| **Migrate the script's logic into the generalised drift-rule factory** | Would require expanding the factory's scope from `apps/*` to `apps/*` + `shared/*` + `services/*`, which reopens every scope decision in this spec and its predecessor. Rejected as out-of-proportion to the goal (wire one guard). |

---

## Decision 10: ADR record — updated scope *(revised 2026-04-20 during `/speckit.review`)*

### Decision

**Add a short ADR (1–2 paragraphs) to `docs/project_notes/decisions.md`** during the implementation task, capturing Decisions 1 *and* 6–9 as a single entry titled *"ADR-NNN: Drift-prevention guards as ESLint rules — generalised factory, wired meta-check, and grandfathered shell scripts"*. The entry names the precedent future guards should follow and lists the grandfathered exception (`check-no-geojson-feature.sh`).

### Rationale

Article VIII.3 requires significant technical choices to be documented with rationale. This decision set establishes *and* tightens the pattern future "guard-style" features will follow; pinning it in `decisions.md` avoids re-litigation. Replaces the original single-decision ADR (Decision 5) with the broader one reflecting the expanded scope.

### Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Keep Decision 5's single-issue ADR; add nothing for the new decisions** | Understates the scope of the pattern the implementation PR will establish. A future maintainer reading only Decision 5's ADR would not learn that the factory+meta-check+wired-script triad is the intended shape. |
| **Split into three separate ADRs (one per new decision)** | Creates three tiny ADRs on closely-related topics. A single ADR covering "drift-prevention guards: shape, wiring, exceptions" is the right unit. |

---

## Open questions

**None.** The four deferrals from `spec.md`'s original Assumptions section are resolved by Decisions 1–4. The three scope-expansion items folded in during `/speckit.review` are resolved by Decisions 6–9. ADR scope is captured by Decision 10.

- Mechanism choice → Decision 1 (ESLint `no-restricted-syntax` generator).
- Forbidden-name source → Decision 2 (parse each package's index barrel with a bounded transitive `export *` walk per Decision 7).
- Selector shape and coverage → Decision 3 (seven selectors, package-agnostic).
- Test harness → Decision 4 (Vitest + programmatic ESLint + fixture files), **with location per `/speckit.review` decision A1a: `shared/utils/tests/eslint-rules/`**.
- Multi-package generalisation → Decision 6 (factory).
- Transitive `export *` → Decision 7 (walk within package `src/`).
- Wiring-forgotten meta-check → Decision 8 (plain Node script, `task lint` invocation).
- `check-no-geojson-feature.sh` → Decision 9 (wire, don't rewrite).
- ADR shape → Decision 10 (single combined ADR).

---

## Summary table

| Question | Decision | Key FR / SC satisfied |
|----------|----------|----------------------|
| How is the guard implemented? | **Factory** at `shared/eslint-rules/drift-rule-factory.cjs` + five thin caller modules, each spread into `no-restricted-syntax` in each `apps/*/.eslintrc.cjs` | FR-001, FR-004, FR-005, FR-013, SC-006 |
| How does the guard know which names to forbid? | Each caller module parses its package's index barrel at require time using `typescript`'s AST, **with a bounded transitive `export *` walk within the package's own `src/`** | FR-006, FR-007, FR-010, FR-015, SC-004, SC-011 |
| How does the guard distinguish redeclaration from re-export? | Structural: AST selectors match only `ExportNamedDeclaration > <declaration>`, not specifier-based re-exports or `export *` | FR-002, FR-009, SC-003 |
| How is the failure message shaped? | `'<N>' is exported by '<@debrief/pkg>'. Do not redeclare it under apps/*. Replace this declaration with: import { <N> } from '<@debrief/pkg>';` (package name substituted per caller module) | FR-003, FR-008, FR-014, SC-005, SC-009 |
| How does the monorepo guarantee the wiring is present everywhere? | Plain Node script `scripts/check-eslint-drift-wiring.cjs` invoked from `task lint`; asserts every `apps/*/.eslintrc.cjs` spreads every caller-module's `rules` array (identity comparison) | FR-016, FR-017, FR-018, SC-008 |
| How is the pre-existing `check-no-geojson-feature.sh` enforced? | One-line addition to `task lint` invoking `bash scripts/check-no-geojson-feature.sh`; script logic unchanged | FR-019, SC-010 |
| How is the rule tested? | Vitest + programmatic ESLint + real `.ts` fixtures under `shared/utils/tests/eslint-rules/__fixtures__/` (co-located with the `@debrief/utils` package per `/speckit.review` decision A1a) | FR-011, FR-012, FR-020, SC-007 |
| How is the decision recorded? | Single combined ADR added to `docs/project_notes/decisions.md` during implementation, covering Decisions 1 + 6–9 | Article VIII.3 |
