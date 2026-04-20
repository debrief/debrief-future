# Implementation Plan: Drift-Prevention Rule for `@debrief/utils` Re-duplication

**Branch**: `214-utils-drift-guard` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/214-utils-drift-guard/spec.md`

## Summary

Wire a `no-restricted-syntax`-flavoured ESLint check into the per-app `.eslintrc.cjs` files so that any file under `apps/*/src/**` whose *original* export (function, const, class, type, interface, enum, or default-named function) declares a name that `@debrief/utils` already exports causes `pnpm lint` to fail with a message naming the file, the symbol, and the canonical import path. The forbidden-name set is discovered at rule-init time by parsing `shared/utils/src/index.ts`, so new exports to `@debrief/utils` extend the guard automatically with zero edits to the rule itself. Re-exports (`export { x } from '@debrief/utils'`, `export * from '@debrief/utils'`) and non-exported local identifiers do not trigger the rule.

The mechanism plugs into the existing `task lint` / `pnpm lint` step used by CI and local `task verify` — no new CI job, no new runtime dependency, no new workspace package.

## Technical Context

**Language/Version**: TypeScript 5.x (the tree being enforced) · JavaScript CommonJS (the rule module itself, matching the `shared/eslint-rules/provenance-snake-case.cjs` precedent)
**Primary Dependencies**: ESLint 8.x + `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` (all already present); no new dependencies added
**Storage**: N/A — static check, no persistence
**Testing**: Vitest for rule-module unit tests (reuses the monorepo's existing Vitest runner) + small `.ts` fixtures under `shared/eslint-rules/__fixtures__/` exercised via `eslint --no-eslintrc` programmatic invocation
**Target Platform**: Node.js 20.x (ESLint runtime); runs locally during `pnpm lint` and in CI via `task lint`
**Project Type**: Single monorepo-tooling component (developer infrastructure)
**Performance Goals**: Guard adds ≤5 s to total `task verify` wall-clock on a clean checkout (SC-006). The only added work is (a) parsing `shared/utils/src/index.ts` once at rule-init and (b) ~20 additional `no-restricted-syntax` selector matches per `apps/*` file — a negligible multiple of ESLint's existing per-file cost.
**Constraints**: Deterministic across machines (FR-011). Zero false positives on `main` at t=0 (FR-012, SC-007). No hand-maintained forbidden-name list (FR-006, FR-010). No ANSI-only information in failure messages (FR-008).
**Scale/Scope**: Four `apps/*` packages today (`loader`, `vscode`, `web-shell`, `spec-navigator`); ~20 named exports in `@debrief/utils` today (values + types, counted from `shared/utils/src/index.ts`). Both sets are expected to grow; the design scales linearly with the export-surface size and is agnostic to the number of `apps/*` packages.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Assessment | Status |
|---------|-------------|------------|--------|
| **I.3** — No silent failures | Operations must succeed or fail explicitly | This feature *is* a no-silent-failure guard; converts a silent regression into an explicit CI failure | ✅ Reinforces |
| **II** — Schema integrity | Derived schema adherence tests pass | Not applicable — no schema change | N/A |
| **VI.2** — Services require unit tests | No service code without tests | Rule module has Vitest tests covering all acceptance scenarios from spec (US1–US3) | ✅ Pass |
| **VI.4** — CI must pass | Schema + unit tests + lint green before merge | Rule plugs into existing `task lint` CI step; adds no new CI job | ✅ Pass |
| **VII** — Test-Driven AI Collaboration | Tests define "done" before implementation | Spec US1–US3 acceptance scenarios + SC-001–SC-007 measurable outcomes form the test bedrock before code | ✅ Pass |
| **VIII.1** — Specs before code | No significant implementation without a spec | `spec.md` exists and was reviewed (checklist all-pass) | ✅ Pass |
| **VIII.3** — Architecture decisions recorded | Significant technical choices documented | ESLint-over-script decision captured in `research.md`; ADR-worthy enough to link from `docs/project_notes/decisions.md` during implementation | ✅ Pass |
| **IX** — Dependencies | Minimal, vetted, pinned | Zero new dependencies; reuses ESLint + @typescript-eslint already in root `package.json` | ✅ Pass |
| **XIII.3** — CI must pass | All automated checks green before merge | `task lint` is an existing required CI step; this guard runs inside it | ✅ Pass |
| **XV.1** — Explicit types everywhere | All params/returns/vars typed | Rule module follows ESLint's CJS rule convention with JSDoc type annotations (ESLint's own rule authoring pattern); enforces, rather than violates, strict typing in the tree under check | ✅ Pass |
| **XV.2** — `any` prohibited | No `any` in production code | Rule source uses `// @ts-check` + JSDoc; no `any` | ✅ Pass |

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
├── provenance-snake-case.cjs            # EXISTING precedent — unchanged
├── no-redeclare-utils-exports.cjs       # NEW — rule module
├── no-redeclare-utils-exports.test.cjs  # NEW — Vitest tests (or node:test)
└── __fixtures__/                        # NEW — small .ts files used by tests
    ├── redeclaration-fn.ts              # Positive case: original export
    ├── redeclaration-const.ts           # Positive case: const export
    ├── redeclaration-type.ts            # Positive case: type alias export
    ├── redeclaration-default.ts         # Positive case: default-named fn
    ├── reexport-named.ts                # Negative case: export { x } from '@debrief/utils'
    ├── reexport-star.ts                 # Negative case: export * from '@debrief/utils'
    └── local-identifier-collision.ts    # Negative case: non-exported local

apps/loader/.eslintrc.cjs                # MODIFIED — import utils-drift rules, spread into no-restricted-syntax
apps/vscode/.eslintrc.cjs                # MODIFIED — same
apps/web-shell/.eslintrc.cjs             # MODIFIED — same
apps/spec-navigator/.eslintrc.cjs        # MODIFIED — same

shared/utils/src/index.ts                # READ-ONLY input — rule parses at init time
```

**Structure Decision**: Single-project monorepo tooling. The rule lives in `shared/eslint-rules/` alongside the existing `provenance-snake-case.cjs` precedent and is wired into each `apps/*/.eslintrc.cjs` via the `no-restricted-syntax` spread pattern already established there. No workspace package is added (no new `package.json`, no pnpm-workspace update). This preserves the existing precedent and keeps the diff minimal.

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

**None - no interactive UI components.** This feature does not produce or modify any component with a Storybook story. The `RuleTester`-style unit tests under `shared/eslint-rules/no-redeclare-utils-exports.test.cjs` (Phase 1, Vitest + fixture files) carry the behavioural test burden equivalent to Storybook E2E for a visual feature.

## VS Code Webview E2E Testing

**None - no extension workflow changes.** This feature does not touch `apps/vscode/src/**` beyond updating `.eslintrc.cjs`. The extension's runtime behaviour is unchanged; no webview, no panels, no commands are added or modified. The existing VS Code E2E suite continues to cover its current scope without modification.

## Complexity Tracking

> *No violations recorded — table intentionally empty.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
