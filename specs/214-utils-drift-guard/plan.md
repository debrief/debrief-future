# Implementation Plan: Drift-Prevention Rules for `@debrief/*` Re-duplication

**Branch**: `214-utils-drift-guard` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/214-utils-drift-guard/spec.md`
**Scope expansion**: 2026-04-20 during `/speckit.review` — see spec.md "Scope Expansion Note". Plan sections below reflect the expanded scope (five `@debrief/*` packages, a wiring-forgotten meta-check, and wiring the pre-existing `scripts/check-no-geojson-feature.sh` into CI).

## Summary

Introduce a **drift-rule factory module** at `shared/eslint-rules/drift-rule-factory.cjs` that, given a source-package identifier and the path to that package's authoritative index barrel, produces a `no-restricted-syntax`-flavoured entry set protecting every name that package exports. Five thin caller modules — one per `@debrief/*` package — invoke the factory with their specific inputs and expose the resulting `rules` array. Each `apps/*/.eslintrc.cjs` requires every caller module and spreads every resulting array into its `no-restricted-syntax` config. Any file under `apps/*/src/**` whose *original* export (function, const, class, type, interface, enum, or default-named function) declares a name that any `@debrief/*` package already exports causes `pnpm lint` to fail with a message naming the file, the symbol, and the canonical package import path. Re-exports (`export { x } from '@debrief/*'`, `export * from '@debrief/*'`) and non-exported local identifiers do not trigger any rule.

To close the Article I.3 silent-failure gap where a new `apps/*` sibling could silently skip the wiring, a **wiring-forgotten meta-check script** (`scripts/check-eslint-drift-wiring.cjs`, invoked from `task lint`) asserts that every `apps/*/.eslintrc.cjs` spreads every drift-rule array. It is parameterised by the set of caller-module paths, so adding a new drift rule in future is a one-line change.

The pre-existing **`scripts/check-no-geojson-feature.sh`**, which was present in the tree but not invoked by any CI step, is wired into the lint step (via `Taskfile.yml`'s `task lint` aggregation and the CI workflow that invokes it). Its internal logic is not modified.

The whole mechanism plugs into the existing `task lint` / `pnpm lint` step used by CI and local `task verify` — no new CI job, no new runtime dependency, no new workspace package.

## Technical Context

**Language/Version**: TypeScript 5.x (the tree being enforced, plus the rule-module tests) · JavaScript CommonJS (the rule modules and the wiring-check script, matching the `shared/eslint-rules/provenance-snake-case.cjs` precedent) · Bash (the pre-existing `scripts/check-no-geojson-feature.sh`, wired but not modified)
**Primary Dependencies**: ESLint 8.x + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` + `typescript` (all already present); no new dependencies added
**Storage**: N/A — static check, no persistence
**Testing**: Vitest for rule-factory and per-package rule-module unit tests, hosted under `shared/utils/tests/eslint-rules/` (co-located with the `@debrief/utils` package whose surface is the canonical test bed; decided during `/speckit.review`). Real `.ts` fixtures live under `shared/utils/tests/eslint-rules/__fixtures__/` and are exercised via programmatic ESLint invocation. Wiring-check script gets its own Vitest test under the same directory. Geojson script is exercised end-to-end (positive + negative) by a quickstart walk, not by a new unit test.
**Target Platform**: Node.js 20.x (ESLint runtime); runs locally during `pnpm lint` + `task lint` + `task verify`, and in CI via the same `task lint` step
**Project Type**: Single monorepo-tooling component (developer infrastructure)
**Performance Goals**: Combined guard footprint adds ≤5 s to total `task verify` wall-clock on a clean checkout (SC-006, revised). Per-component cost: (a) parsing five `@debrief/*` index barrels once at rule-module require time (`typescript.createSourceFile` each — tens of milliseconds total, one-shot per Node process); (b) ~20 × 7 × 5 = ~700 additional `no-restricted-syntax` selector entries per `apps/*` file (ESLint's selector engine handles this sub-linearly per file); (c) one pass of the wiring-check script (~4 `.eslintrc.cjs` files parsed — single-digit milliseconds); (d) the already-existing `check-no-geojson-feature.sh` grep invocation (sub-second on the monorepo-size tree). Aggregate is comfortably inside the 5 s budget.
**Constraints**: Deterministic across machines (FR-011 — extended to every component: per-package rules, wiring-check, geojson script). Zero false positives on `main` at t=0 (FR-012 / FR-020, SC-007). No hand-maintained forbidden-name list in any package (FR-006, FR-010, FR-015). No ANSI-only information in failure messages (FR-008). New `apps/*` sibling supported automatically (FR-017, FR-018).
**Scale/Scope**: Four `apps/*` packages today (`loader`, `vscode`, `web-shell`, `spec-navigator`). Five `@debrief/*` packages in scope: `@debrief/utils` (~20 names at `shared/utils/src/index.ts`), `@debrief/components` (~100+ names at `shared/components/src/index.ts`), `@debrief/schemas` (~dozens of names at `shared/schemas/src/generated/typescript/index.ts`), `@debrief/session-state` (dozens of names at `services/session-state/src/index.ts`, including transitive `export *` forwards), `@debrief/data` (a small set at `shared/data/src/ts/index.ts`). The design scales linearly with the aggregate export-surface size and is agnostic to the number of `apps/*` packages.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Assessment | Status |
|---------|-------------|------------|--------|
| **I.3** — No silent failures | Operations must succeed or fail explicitly | This feature *is* a no-silent-failure guard; converts a silent regression into an explicit CI failure. The wiring-forgotten meta-check (US4) additionally closes the secondary silent-failure mode where a new `apps/*` sibling could bypass the rules. The geojson-script wiring (US6) closes a third: an existing guard that was never run. | ✅ Triple-reinforces |
| **II** — Schema integrity | Derived schema adherence tests pass | Not applicable — no schema change | N/A |
| **VI.2** — Services require unit tests | No service code without tests | Factory + every per-package rule module has Vitest tests covering the acceptance scenarios from spec (US1–US5). Wiring-check script has its own Vitest test. Geojson script is covered by a quickstart walk (it is not new code). | ✅ Pass |
| **VI.4** — CI must pass | Schema + unit tests + lint green before merge | All guard components plug into the existing `task lint` CI step; no new CI job is added | ✅ Pass |
| **VII** — Test-Driven AI Collaboration | Tests define "done" before implementation | Spec US1–US6 acceptance scenarios + SC-001–SC-011 measurable outcomes form the test bedrock before code | ✅ Pass |
| **VIII.1** — Specs before code | No significant implementation without a spec | `spec.md` exists and was reviewed; scope-expansion update was made explicit in the spec before plan edits | ✅ Pass |
| **VIII.3** — Architecture decisions recorded | Significant technical choices documented | ESLint-over-script decision captured in `research.md`; generalisation-and-factory decision added as `research.md` Decision 6; wiring-check mechanism as Decision 8; geojson-script wiring as Decision 9. ADR entry pointed at `docs/project_notes/decisions.md` during implementation. | ✅ Pass |
| **IX** — Dependencies | Minimal, vetted, pinned | Zero new dependencies; every added piece reuses ESLint + `@typescript-eslint` + `typescript` already in root `package.json`. The wiring-check script is plain Node (`fs` + `path` + `require`). The geojson script is pre-existing Bash. | ✅ Pass |
| **XIII.3** — CI must pass | All automated checks green before merge | `task lint` is an existing required CI step; every guard component runs inside it. No new CI workflow file is added. | ✅ Pass |
| **XV.1** — Explicit types everywhere | All params/returns/vars typed | Rule factory + caller modules + wiring-check script follow ESLint's CJS convention with JSDoc type annotations + `// @ts-check`; the Vitest test files are `.test.ts` with strict TypeScript types; the enforced tree retains its existing strict typing | ✅ Pass |
| **XV.2** — `any` prohibited | No `any` in production code | All module sources use `// @ts-check` + JSDoc; test sources are `.ts`; no `any` | ✅ Pass |

**No violations. No entries required in the Complexity Tracking table.** Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/214-utils-drift-guard/
├── plan.md              # This file
├── spec.md              # Feature specification (committed in prior step)
├── research.md          # Phase 0 output — mechanism choice, precedent analysis
├── data-model.md        # Phase 1 output — rule-internal entities
├── quickstart.md        # Phase 1 output — how to run / trigger / verify
├── contracts/
│   └── rule-contract.md # Phase 1 output — rule messageIds, selectors, failure shape
├── checklists/
│   └── requirements.md  # Created in /speckit.specify (all items passing)
├── media/               # Phase 2 output (/speckit.plan media step)
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Created later by /speckit.tasks (NOT by /speckit.plan)
```

### Source Code (repository root)

```text
shared/eslint-rules/
├── provenance-snake-case.cjs              # EXISTING precedent — unchanged
├── drift-rule-factory.cjs                 # NEW — factory: given (pkgName, indexPath) → { rules }
├── no-redeclare-utils-exports.cjs         # NEW — thin caller: factory({ pkg: '@debrief/utils', path: '...' })
├── no-redeclare-schemas-exports.cjs       # NEW — thin caller for @debrief/schemas
├── no-redeclare-components-exports.cjs    # NEW — thin caller for @debrief/components
├── no-redeclare-session-state-exports.cjs # NEW — thin caller for @debrief/session-state
└── no-redeclare-data-exports.cjs          # NEW — thin caller for @debrief/data

shared/utils/tests/eslint-rules/           # NEW — test harness (A1a from /speckit.review)
├── drift-rule-factory.test.ts             # NEW — unit tests for the factory
├── no-redeclare-utils-exports.test.ts     # NEW — per-package integration tests (utils)
├── no-redeclare-schemas-exports.test.ts   # NEW — schemas smoke (1 positive + 1 negative)
├── no-redeclare-components-exports.test.ts      # NEW — components smoke
├── no-redeclare-session-state-exports.test.ts   # NEW — session-state smoke (exercises export * transitive walk)
├── no-redeclare-data-exports.test.ts      # NEW — data smoke
├── check-eslint-drift-wiring.test.ts      # NEW — meta-check test
└── __fixtures__/                          # NEW — real .ts files (A2b from /speckit.review)
    ├── redeclaration-fn.ts                # Positive case: original export (shape 1)
    ├── redeclaration-const.ts             # Positive case: const export (shape 2)
    ├── redeclaration-class.ts             # Positive case: class export (shape 3)
    ├── redeclaration-type.ts              # Positive case: type alias export (shape 4)
    ├── redeclaration-interface.ts         # Positive case: interface export (shape 5)
    ├── redeclaration-enum.ts              # Positive case: enum export (shape 6)
    ├── redeclaration-default.ts           # Positive case: default-named fn (shape 7)
    ├── reexport-named.ts                  # Negative case: export { x } from '@debrief/utils'
    ├── reexport-star.ts                   # Negative case: export * from '@debrief/utils'
    ├── local-identifier-collision.ts      # Negative case: non-exported local
    ├── schemas-redeclaration.ts           # Positive smoke: redeclares a @debrief/schemas name
    ├── schemas-reexport.ts                # Negative smoke: re-exports from @debrief/schemas
    ├── components-redeclaration.ts        # Positive smoke: redeclares a @debrief/components name
    ├── components-reexport.ts             # Negative smoke
    ├── session-state-redeclaration.ts     # Positive smoke: name reached via export *
    ├── session-state-reexport.ts          # Negative smoke
    ├── data-redeclaration.ts              # Positive smoke
    └── data-reexport.ts                   # Negative smoke

scripts/
├── check-no-geojson-feature.sh            # EXISTING — unchanged content; newly wired into task lint
└── check-eslint-drift-wiring.cjs          # NEW — parses each apps/*/.eslintrc.cjs and asserts every drift-rule spread is present

apps/loader/.eslintrc.cjs                  # MODIFIED — import + spread all 5 drift-rule arrays
apps/vscode/.eslintrc.cjs                  # MODIFIED — same
apps/web-shell/.eslintrc.cjs               # MODIFIED — same
apps/spec-navigator/.eslintrc.cjs          # MODIFIED — same

Taskfile.yml                               # MODIFIED — task lint aggregates (pnpm lint + drift-wiring check + geojson script)
.github/workflows/ci.yml                   # MODIFIED only if task lint aggregation does not already flow through this workflow (confirm during implementation; likely NO edit required since CI invokes `task lint` which now aggregates the new steps)
docs/project_notes/decisions.md            # MODIFIED — ADR entry recording ESLint-over-script precedent

shared/utils/src/index.ts                  # READ-ONLY input — @debrief/utils rule parses at init time
shared/components/src/index.ts             # READ-ONLY input — @debrief/components rule parses at init time
shared/schemas/src/generated/typescript/index.ts  # READ-ONLY input — @debrief/schemas rule parses at init time
shared/data/src/ts/index.ts                # READ-ONLY input — @debrief/data rule parses at init time
services/session-state/src/index.ts        # READ-ONLY input — @debrief/session-state rule parses at init time (with transitive export * walk)
```

**Structure Decision**: Single-project monorepo tooling. Rule modules live in `shared/eslint-rules/` alongside the existing `provenance-snake-case.cjs` precedent and are wired into each `apps/*/.eslintrc.cjs` via the `no-restricted-syntax` spread pattern already established there. No workspace package is added (no new `package.json`, no `pnpm-workspace.yaml` update). Tests live under `shared/utils/tests/eslint-rules/` per `/speckit.review` decision A1a — co-located with the `@debrief/utils` package whose surface is the primary test bed, reusing that package's existing Vitest configuration. Fixture files live alongside the tests per `/speckit.review` decision A2b — real `.ts` files rather than inline strings, for editor debuggability. This preserves the existing precedent and keeps the diff minimal.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|

**None - developer-tooling / CI-infrastructure feature.** The guard has no UI surface and no Storybook story. Its user-visible artefact is a CI log line. Planning and Shipped posts for this feature will lean on prose + a terminal-log excerpt rather than an interactive component demo.

**Inclusion Criteria Applied**:
- [ ] New visual component → **N/A** (no UI)
- [ ] Significant visual change → **N/A**
- [ ] Interactive demo adds narrative value → **N/A** (a lint-failure log is the narrative)

**Bundleability Verified**:
- [ ] Stories exist in Storybook → **N/A**
- [ ] Components render standalone → **N/A**
- [ ] Reasonable bundle size expected → **N/A**

**Storybook Link**: *Not applicable*

## Storybook E2E Testing

**None - no interactive UI components.** This feature does not produce or modify any component with a Storybook story. The Vitest tests under `shared/utils/tests/eslint-rules/` (Phase 1, Vitest + programmatic ESLint + real `.ts` fixture files) carry the behavioural test burden equivalent to Storybook E2E for a visual feature.

## VS Code Webview E2E Testing

**None - no extension workflow changes.** This feature does not touch `apps/vscode/src/**` beyond updating `.eslintrc.cjs`. The extension's runtime behaviour is unchanged; no webview, no panels, no commands are added or modified. The existing VS Code E2E suite continues to cover its current scope without modification.

## Scope-Expansion Impact Assessment *(added 2026-04-20)*

The three items folded into scope during `/speckit.review` were evaluated against the effort/risk ratio before being accepted:

| Item | Marginal effort | Marginal risk | Why in scope now rather than deferred |
|------|-----------------|---------------|--------------------------------------|
| Wiring-forgotten meta-check (US4) | +1 script (~30 lines) + +1 Vitest test + +1 line in `Taskfile.yml` | Very low — the script is additive and pure-read; failure mode is fail-closed with a clear message | The Article I.3 gap it closes is the *exact* silent-failure class this feature's existence arguments against; shipping the drift rules without the wiring check would be shipping a guard with a documented bypass. |
| Generalisation to all `@debrief/*` packages (US5) | Factory extraction + 4 additional ~3-line caller modules + 5 `.eslintrc.cjs` spreads each (4 apps × 4 extra spreads = 16 one-line edits) + 8 smoke fixtures + 4 smoke test files | Low — the factory is a pure refactor of logic that must exist anyway for `@debrief/utils`; the transitive `export *` walker is the one net-new piece of logic (localised, testable) | The user's instruction "fix them in this spec" upgraded this from deferred to current. The factory abstraction is the natural shape even for a single-package rule, so extracting it buys the generalisation for marginal extra cost. |
| Wire `scripts/check-no-geojson-feature.sh` into CI (US6) | +1 line in `Taskfile.yml` | Negligible — the script's logic is pre-existing and has its own clean baseline | The cost is smaller than the cost of explaining why we'd leave a correct guard unwired; and leaving it unwired would contradict the very principle (guards must run) this feature establishes. |

The aggregate additions remain inside the spec's original engineering posture (minimal-diff, zero-dependency, precedent-following) and inside the revised SC-006 performance budget.

## Complexity Tracking

> *No violations recorded — table intentionally empty.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
