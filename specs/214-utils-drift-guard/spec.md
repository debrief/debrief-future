# Feature Specification: Drift-Prevention Rule for `@debrief/utils` Re-duplication

**Feature Branch**: `214-utils-drift-guard`
**Created**: 2026-04-20
**Status**: Draft
**Input**: User description: "Drift-prevention rule for `@debrief/utils` re-duplication — add a lint or CI check that fails if a file matching `apps/*/src/utils/bounds.ts` reappears, or more generally if any `apps/*` file exports a symbol already exported from `@debrief/utils`. Makes the SC-001 guarantee from #200 durable; without it, a future contributor could reintroduce a local `bounds.ts` without friction. Candidate implementations: custom ESLint rule (`no-restricted-exports`-flavoured), or a small CI script under `scripts/`. (follow-up to #200)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Block Reintroduction of App-Local Bounds Utility (Priority: P1)

A contributor working inside an `apps/*` package (for example, `apps/vscode` or `apps/web-shell`) adds a new TypeScript source file — perhaps while porting logic from an older branch, perhaps because they're unaware of the #200 consolidation — that declares and exports a local `calculateBounds` function. Without a guard, local tests pass, the change looks innocuous, and the silent duplication of `@debrief/utils` content reaches `main`. With the guard, an automated check catches the redeclaration at lint/CI time and points the contributor at `@debrief/utils` as the canonical home.

**Why this priority**: Feature #200 consolidated every `apps/*/src/utils/bounds.ts` into `@debrief/utils` and landed SC-001 — *"a monorepo-wide search for `export function calculateBounds` … returns exactly one match per symbol — both located inside `shared/utils/`"*. That guarantee is a point-in-time assertion; without a drift-prevention rule it degrades the moment the next well-meaning copy lands. Making the guarantee durable is the entire reason #200 was worth doing.

**Independent Test**: Add a file `apps/vscode/src/utils/bounds.ts` containing `export function calculateBounds(...) { ... }`, run the project's lint/CI entry point, verify it fails and names the file, the symbol, and the canonical import. Remove the file, re-run, verify it passes.

**Acceptance Scenarios**:

1. **Given** `@debrief/utils` exports `calculateBounds`, **When** a contributor adds `apps/vscode/src/utils/bounds.ts` exporting a function named `calculateBounds`, **Then** the guard fails with a message naming the offending file, the duplicated symbol, and the canonical source (`@debrief/utils`).
2. **Given** the same guard, **When** a contributor adds `apps/web-shell/src/lib/helpers.ts` exporting `mergeBounds`, **Then** the guard fails — symbol-match, not filename-match, is the rule.
3. **Given** an `apps/*` file that *imports* `calculateBounds` from `@debrief/utils` but does not re-declare it, **When** the guard runs, **Then** it passes.
4. **Given** the guard is wired into CI, **When** a PR introduces a violation, **Then** the CI pipeline reports failure and the PR is blocked by existing branch-protection rules.

---

### User Story 2 - Distinguish Legitimate Re-export from Redeclaration (Priority: P2)

Barrel re-exports — `export { calculateBounds } from '@debrief/utils'` inside an `apps/*/src/**/index.ts` — are a routine TypeScript pattern. A guard that flagged them would be silenced with disables or bypassed entirely, defeating the purpose. The guard must distinguish "new original declaration of a name owned by `@debrief/utils`" (fail) from "re-export of a `@debrief/utils` symbol via a barrel" (pass).

**Why this priority**: Without this distinction the guard creates friction for legitimate patterns and erodes trust in the rule. Once a rule is routinely disabled, it is effectively not a rule.

**Independent Test**: Create `apps/web-shell/src/utils/index.ts` containing `export { calculateBounds } from '@debrief/utils';`, run the guard, verify it passes. Replace that line with an original declaration `export function calculateBounds() { return []; }` and verify it fails.

**Acceptance Scenarios**:

1. **Given** a barrel file under `apps/*/src/**` that uses `export { calculateBounds } from '@debrief/utils'`, **When** the guard runs, **Then** it passes.
2. **Given** a barrel file that uses `export * from '@debrief/utils'`, **When** the guard runs, **Then** it passes.
3. **Given** an `apps/*` file that declares `export function calculateBounds(...) { ... }` as an original declaration, **When** the guard runs, **Then** it fails.
4. **Given** an `apps/*` file that declares `export const calculateBounds = (...) => { ... }`, **When** the guard runs, **Then** it fails.
5. **Given** a *non-exported* local `function calculateBounds(...)` inside an `apps/*` file (used only in that file, not exported), **When** the guard runs, **Then** it passes — the guard concerns the export surface, not internal identifiers.

---

### User Story 3 - Self-Documenting Failure Message (Priority: P2)

When the guard fires, the contributor who triggered it may have never heard of the #200 consolidation. Within roughly ten seconds of reading the error, they should be able to understand (a) which symbol is duplicated, (b) where their offending file lives, and (c) how to replace their declaration with the canonical import.

**Why this priority**: The guard's social function is to reroute contributors to `@debrief/utils` without requiring them to read ADRs. A terse "rule violated" line shifts the burden of understanding onto every future contributor; a self-documenting message shifts it onto the author of the rule, which is the right trade.

**Independent Test**: Trigger a violation manually, read the captured CI log output, verify it names the file, the symbol, and includes a one-line `import { <symbol> } from '@debrief/utils'` replacement hint.

**Acceptance Scenarios**:

1. **Given** any violation, **When** the guard fails, **Then** the output contains the offending file's repo-root-relative path.
2. **Given** any violation, **When** the guard fails, **Then** the output contains the name of the duplicated symbol.
3. **Given** any violation, **When** the guard fails, **Then** the output contains the literal text `@debrief/utils` and a remediation hint of the form `import { <symbol> } from '@debrief/utils'`.
4. **Given** the failure message is written to a CI log, **When** the log is viewed in plain text (no ANSI interpretation), **Then** the information required for remediation is still present — the guard does not rely on colour.

---

### Edge Cases

- **Type-only exports**: `@debrief/utils` exports both values (functions like `calculateBounds`) and types (`SafeFeature`, `GeoJSONFeature`, `Bounds`). The #200 scope covered both families. The guard treats value-exports and type-exports symmetrically — an `apps/*` file that declares `export type SafeFeature = ...` causes the same silent-drift risk as a redeclared function and is blocked the same way.
- **Default exports**: `@debrief/utils` uses named exports only. An `apps/*` file whose *default* export is named `calculateBounds` (e.g. `export default function calculateBounds() { ... }`) is treated as a violation — the declared name collides with a canonical export and the drift risk is the same.
- **Tests and fixtures**: an `apps/*` test file may currently contain a private helper named `calculateBounds` for setup purposes. The guard applies uniformly to all files under `apps/*/src/**`, test files included. A fixture helper that collides with a canonical name is renamed, not exempted — the guard catches a genuine risk, not a false positive (#200 consolidated production code, and test fixtures that re-implement the same math defeat the consolidation's value).
- **`shared/components/src/utils/bounds.ts`**: explicitly *out of scope* per #200's "Out of Scope" section (it operates on LinkML-typed `DebriefFeature` arrays and carries additional helpers). The guard's scope is `apps/*` only; `shared/*` is untouched by this feature.
- **`contrib/*`**: the planned organisation-extension tree does not yet exist. When it does, this guard will need to be re-scoped — out of scope for this feature.
- **Renaming or removing a `@debrief/utils` export**: if a future change to `shared/utils/src/index.ts` removes an exported name, the guard's forbidden-name set shrinks accordingly. No stale hand-maintained list should constrain the contract.
- **Generated code**: there is no generated code under `apps/*/src/**` today. If generated files are introduced later and happen to re-export canonical names, they will surface as a violation and be addressed at that time (not pre-handled here).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The guard MUST detect when a file under `apps/*/src/**` declares an *original* export (function, const, class, type, interface, or enum) whose exported name matches a name exported from `@debrief/utils`, and MUST fail the check when such a declaration is present.
- **FR-002**: The guard MUST treat re-exports from `@debrief/utils` (`export { x } from '@debrief/utils'`, `export * from '@debrief/utils'`) as permitted — not violations.
- **FR-003**: On failure the guard MUST emit, for each violation, a message that names (a) the offending file path relative to the repo root, (b) the duplicated symbol, and (c) the canonical import source (`@debrief/utils`).
- **FR-004**: The guard MUST run as part of CI on every PR and MUST cause the CI pipeline to fail when one or more violations are present, so that branch protection blocks merge.
- **FR-005**: The guard MUST be runnable locally with the same command surface CI uses (no hidden CI-only flags), so a contributor can verify their change before pushing.
- **FR-006**: The set of names the guard forbids from redeclaration MUST be derived from `@debrief/utils`'s actual export surface at check time (for example, by parsing `shared/utils/src/index.ts` or inspecting the compiled package), rather than a hand-maintained list in the rule's own source.
- **FR-007**: The guard MUST cover both value exports and type-only exports, because #200's consolidation covered both.
- **FR-008**: Failure output MUST be human-readable in plain CI log output (no ANSI-only information) and MUST include a single-line remediation hint of the form `import { <symbol> } from '@debrief/utils'` for each violation.
- **FR-009**: The guard MUST NOT emit false positives for (a) barrel re-exports from `@debrief/utils`, (b) non-exported local identifiers inside an `apps/*` file whose names happen to collide, (c) TypeScript's forwarding re-export forms (`export * from '@debrief/utils'`).
- **FR-010**: Adding a new export to `@debrief/utils` (i.e. extending `shared/utils/src/index.ts`) MUST NOT require any edit to the guard itself; the next guard run MUST reflect the expanded forbidden-name set automatically.
- **FR-011**: The guard MUST be deterministic: given an identical working tree, its pass/fail outcome and emitted violation list MUST be identical across machines and across runs (no time-, order-, or locale-dependent behaviour).
- **FR-012**: A clean `main` at the time of this feature's introduction MUST pass the guard with zero violations — the baseline is clean because #200 has landed, and any violation surfaced at introduction is a defect in #200's consolidation (to be fixed, not suppressed).

### Key Entities

- **`@debrief/utils` export surface**: the set of named exports (values and types) declared by `shared/utils/src/index.ts`. Canonical list of names forbidden from original redeclaration under `apps/*`.
- **`apps/*` file**: any TypeScript source file under `apps/*/src/**`. Scope of enforcement.
- **Violation**: a triple (file path, symbol name, source-kind value-vs-type) where an `apps/*` file declares an original export whose name matches a `@debrief/utils` export.
- **Check report**: the guard's pass/fail result, plus — on failure — the list of violations with file, symbol, and remediation hint.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A PR that introduces `apps/<any-app>/src/utils/bounds.ts` with an original export of `calculateBounds` is blocked from merging by an automated check. (The exact regression shape from #200 is caught.)
- **SC-002**: A PR that introduces any `apps/*` file declaring an original export whose name matches *any* `@debrief/utils` export — e.g. `mergeBounds`, `formatDuration`, `sanitizeFilename`, `assertNever`, `SafeFeature`, `parseDuration` — is blocked from merging by the same check. (The general rule is caught, not only the filename from #200.)
- **SC-003**: A PR that adds a legitimate `export { calculateBounds } from '@debrief/utils'` barrel in an `apps/*` file passes the check without any manual suppression or `eslint-disable` directive.
- **SC-004**: When a new export is added to `shared/utils/src/index.ts`, the guard extends to forbid that name's redeclaration in `apps/*` with zero edits to the guard itself. (Verified by temporarily adding a throwaway export and a colliding `apps/*` declaration in an experiment, then reverting.)
- **SC-005**: A contributor who triggers the guard for the first time — having never read the #200 spec — can resolve the failure (replace their declaration with an import from `@debrief/utils`) in under 5 minutes using only information present in the failure message.
- **SC-006**: The guard adds no more than 5 seconds to the total `task verify` / local CI-equivalent run time on a clean checkout.
- **SC-007**: On the `main` tree at the time of this feature's introduction, the guard reports zero violations — the baseline is clean.

## Assumptions

- #200's consolidation is the starting baseline: every `apps/*` reference to bounds math already goes through `@debrief/utils`. The guard's job is forward-looking drift prevention, not cleanup of existing drift.
- `apps/*` is treated as a glob, not a fixed allowlist. Today's members (`apps/loader`, `apps/vscode`, `apps/web-shell`, `apps/spec-navigator`) are covered; any future sibling added under `apps/` is covered automatically.
- `shared/*` is out of scope for this feature — see "Out of Scope" below. `shared/components/src/utils/bounds.ts`, in particular, is explicitly carved out per #200.
- `contrib/*` is out of scope until that tree exists.
- `@debrief/utils` uses named exports as the canonical pattern (no default export of its own). The guard compares against the package's named-export list.
- The guard plugs into an existing CI step (lint, typecheck, or a dedicated pre-test stage). It does not add a new CI *job*; it adds a *check* to the existing pipeline, per `CLAUDE.md`'s "Before Pushing" three-step model.
- "Fails CI" in FR-004 means: the check process exits non-zero, the containing CI step fails, the pipeline reports a failure state, and branch-protection prevents merge as it does today.
- Choice between a custom ESLint rule (a `no-restricted-exports`-flavoured rule plugged into the existing per-app `.eslintrc.cjs` files) and a standalone script under `scripts/` is an **implementation decision deferred to `/speckit.plan`**. The spec describes the contract; the plan picks the mechanism, weighing the precedent in `shared/eslint-rules/provenance-snake-case.cjs` against the precedent in `scripts/check-no-geojson-feature.sh`.

## Dependencies

- Feature #200 (`200-bounds-consolidation`) must be on `main`. The current spec presupposes #200's SC-001 guarantee holds at t=0; SC-007 verifies that presupposition.
- No new *runtime* dependencies. If the ESLint-rule path is chosen during `/speckit.plan`, the existing toolchain (ESLint 8.x + `@typescript-eslint`) is sufficient. If the script path is chosen, the existing Node toolchain is sufficient.

## Out of Scope

- Enforcing the same rule for `shared/*` directories. Scope is `apps/*` only.
- Enforcing an import-path *style* preference (e.g. "always import from `@debrief/utils` rather than `../../shared/utils/src/bounds`") when no redeclaration is present. This feature catches redeclarations, not import-path aesthetics.
- Unifying `shared/components/src/utils/bounds.ts` with `@debrief/utils`. Separate backlog item, explicitly carved out by #200.
- Drift between `@debrief/utils` and other `@debrief/*` packages (`@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data`). A different scope with different policy trade-offs; would warrant its own rule if ever wanted.
- Cross-repository drift (e.g. between `debrief-future` and a hypothetical downstream consumer repo). Monorepo-local only.
- Runtime behaviour. The guard is a *static* check; it does not affect runtime code paths.
