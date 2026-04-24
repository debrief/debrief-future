# Feature Specification: Drift-Prevention Rules for `@debrief/*` Re-duplication

**Feature Branch**: `214-utils-drift-guard`
**Created**: 2026-04-20
**Updated**: 2026-04-20 — scope expanded during `/speckit.review` (see Scope Expansion Note below).
**Status**: Draft
**Input**: User description: "Drift-prevention rule for `@debrief/utils` re-duplication — add a lint or CI check that fails if a file matching `apps/*/src/utils/bounds.ts` reappears, or more generally if any `apps/*` file exports a symbol already exported from `@debrief/utils`. Makes the SC-001 guarantee from #200 durable; without it, a future contributor could reintroduce a local `bounds.ts` without friction. Candidate implementations: custom ESLint rule (`no-restricted-exports`-flavoured), or a small CI script under `scripts/`. (follow-up to #200)"

## Scope Expansion Note *(2026-04-20, during `/speckit.review`)*

Three items originally noted as follow-up candidates were folded into this feature's scope on the reviewer's instruction:

1. **Wiring-forgotten guard** — a meta-check that fails CI if a new `apps/*/.eslintrc.cjs` omits the drift-rule spread. Closes an Article I.3 silent-failure gap: without it, a future `apps/*` sibling could be added that silently bypasses every drift rule.
2. **Generalised coverage to the other `@debrief/*` packages** — `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data`. The mechanism generalises cleanly; the original "defer until wanted" posture is upgraded to "include now so the guarantee is uniform".
3. **`scripts/check-no-geojson-feature.sh`** — an existing regression guard that is not currently wired into any CI step (confirmed by a Grep across `.github/`, `Taskfile.yml`, and root `package.json`). Wired into the lint step so the guard it already encodes is actually enforced.

These additions change the "Out of Scope" section (items 3 and 4 from the original scope are now in scope) and add User Stories 4, 5, 6; Functional Requirements FR-013 through FR-020; and Success Criteria SC-008 through SC-011. Everything else in the original spec remains authoritative.

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

### User Story 4 - Guarantee Wiring Survives New `apps/*` Siblings (Priority: P1)

A contributor adds a fifth app under `apps/` (e.g. `apps/tutorial-sandbox`) and copies a starter `.eslintrc.cjs` from an older tree, a blog post, or a competing PR that predates this feature. Without a meta-check, that `.eslintrc.cjs` does not spread the drift rules, every file under the new app escapes enforcement, and nobody notices until a violation slips through months later. With a meta-check, CI fails the instant the new app is added without the drift-rule wiring, naming the specific `.eslintrc.cjs` and the specific import line that is missing.

**Why this priority**: Article I.3 of the Constitution ("No silent failures"). A drift guard that only runs where someone remembered to wire it is a drift guard with a silent escape hatch — which is exactly the failure mode this feature exists to close. The meta-check converts "someone forgot" from a silent undetected drift back into an explicit CI failure.

**Independent Test**: Create `apps/tutorial-sandbox/.eslintrc.cjs` whose `rules` object contains no `no-restricted-syntax` entry at all (or one that omits the `...utilsDriftRules` spread), run the project's lint/CI entry point, verify it fails with a clear message naming the missing wiring. Add the spread; re-run; verify it passes.

**Acceptance Scenarios**:

1. **Given** every `apps/*/.eslintrc.cjs` correctly spreads every drift-rule set, **When** the meta-check runs, **Then** it passes.
2. **Given** a new `apps/tutorial-sandbox/.eslintrc.cjs` is added without any `...utilsDriftRules` spread, **When** the meta-check runs, **Then** it fails with a message naming the file and the rule whose spread is missing.
3. **Given** an existing `apps/vscode/.eslintrc.cjs` has its `...utilsDriftRules` spread removed (regression), **When** the meta-check runs, **Then** it fails for the same reason.
4. **Given** the meta-check runs in CI, **When** an offending `.eslintrc.cjs` is introduced by a PR, **Then** the CI pipeline fails and branch-protection blocks merge.

---

### User Story 5 - Uniform Coverage Across `@debrief/*` Packages (Priority: P2)

The same redeclaration risk that motivates this feature for `@debrief/utils` exists — at varying severity — for every other `@debrief/*` package the monorepo ships. If an `apps/*` file declares an original `export function loadRegistry(...)`, an `export type Feature = { ... }`, or an `export const MapView = ...`, it silently shadows the canonical export in `@debrief/data`, `@debrief/schemas`, or `@debrief/components` respectively. The drift-guard mechanism generalises cleanly: the same AST selectors, the same failure-message shape, the same wiring point — only the parsed index file changes per package.

**Why this priority**: P2 because the severity of drift differs between packages. The `@debrief/utils` case is P1 because #200 specifically consolidated it and the drift history is concrete. For the other packages there is no equivalent "#200 incident", but the forward-looking risk is symmetric and the marginal cost of extending coverage is small once the factory pattern exists. Extending coverage now costs roughly N × (one rule-file + one eslintrc spread per app) and buys monorepo-wide symmetry.

**Independent Test**: For each of `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data`, pick one name from that package's export surface, add an `apps/*/src/**` file that redeclares it as an original export, run the lint step, verify it fails with a message that names (a) the symbol, (b) the source package, and (c) a copy-pasteable import hint. Remove the file; re-run; verify it passes.

**Acceptance Scenarios**:

1. **Given** `@debrief/schemas` exports `PlatformRecord`, **When** an `apps/*` file declares `export type PlatformRecord = { ... }`, **Then** the guard fails and names `@debrief/schemas` as the canonical source (not `@debrief/utils`).
2. **Given** `@debrief/components` exports `MapView`, **When** an `apps/*` file declares `export const MapView = (...) => { ... }`, **Then** the guard fails and names `@debrief/components` as the canonical source.
3. **Given** `@debrief/session-state` exports `getSessionStore`, **When** an `apps/*` file declares `export function getSessionStore() { ... }`, **Then** the guard fails and names `@debrief/session-state` as the canonical source.
4. **Given** `@debrief/data` exports `loadRegistry`, **When** an `apps/*` file declares `export function loadRegistry() { ... }`, **Then** the guard fails and names `@debrief/data` as the canonical source.
5. **Given** any `apps/*` file that imports or re-exports from any of these packages without redeclaring, **When** the guard runs, **Then** it passes — the same re-export tolerance rules from US2 apply to every package uniformly.

---

### User Story 6 - Existing `GeoJSONFeature` Regression Script Is Actually Enforced (Priority: P3)

An existing shell script, `scripts/check-no-geojson-feature.sh`, encodes a regression guard against redeclaring a local `GeoJSONFeature` interface across `apps/`, `shared/`, and `services/`. The script is correct in what it checks; its bug is that nothing in the monorepo's lint/CI pipeline runs it. A contributor who pastes back `interface GeoJSONFeature { ... }` today will not trigger it. With this feature, the script is wired into the lint step so that CI actually enforces the guard the script already encodes.

**Why this priority**: P3 because the risk is narrower (one specific identifier, not the full `@debrief/utils` export surface) and mitigated partly by the `@debrief/utils` rule introduced in US1 (which covers `apps/*`) and by the `@debrief/schemas` rule introduced in US5 (which covers the canonical `Feature` family). The script adds coverage for `shared/` and `services/` that the ESLint rules do not — those paths are explicitly *out of scope* for the `no-redeclare-utils-exports` rule but are *in scope* for this pre-existing script. Wiring an already-correct guard into CI is a cheap, high-leverage action.

**Independent Test**: On a clean working tree, confirm `task lint` runs `scripts/check-no-geojson-feature.sh` (either directly or as part of an aggregated step). Introduce `interface GeoJSONFeature { foo: string; }` in any `shared/**/*.ts` file not excluded by the script; run `task lint`; verify it fails. Remove the line; re-run; verify it passes.

**Acceptance Scenarios**:

1. **Given** `scripts/check-no-geojson-feature.sh` is wired into the lint step, **When** a PR adds a file containing `interface GeoJSONFeature { ... }` under `apps/`, `shared/`, or `services/` (and not in the script's exclusion list), **Then** CI lint fails with the script's output.
2. **Given** the same wiring, **When** CI runs on the clean `main` at feature-introduction time, **Then** the script passes (a zero-violation baseline is assumed — verified by running the script once as part of this feature's own CI gate).
3. **Given** any future contributor adds a new drift-prevention script under `scripts/`, **When** they do so without wiring it into the lint step, **Then** the reviewer is expected to point them at the precedent established by US6 and this feature (i.e., unwired guards are anti-precedent; see Assumptions).

**Decision space**: This feature commits to *wiring the script into CI* rather than deleting it. The script's `shared/` and `services/` coverage is strictly broader than the ESLint rules' `apps/*`-only scope, so deletion would lose coverage. A follow-up spec may later migrate the script's logic to a Node-based custom ESLint rule (or equivalent), at which point the shell script can be retired; that migration is out of scope here.

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

#### Expanded scope (added 2026-04-20 — see Scope Expansion Note)

- **FR-013**: The drift-guard mechanism MUST be parameterised by source-package identity. A single implementation mechanism MUST produce drift rules for each of `@debrief/utils`, `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, and `@debrief/data`, reading each package's authoritative export barrel (location determined per-package — see Key Entities).
- **FR-014**: When the guard fires for a name owned by a given `@debrief/*` package, the failure message MUST name that package (not a generic or placeholder package name). The single-line remediation hint MUST read `import { <symbol> } from '<package>'` with the correct package identifier substituted.
- **FR-015**: A `@debrief/*` index barrel may use `export * from './sub-module.js'` forwarding forms. The guard MUST transitively follow such forwards within the same package's own source tree to enumerate the forwarded names, so that names re-exported through an `export *` chain are still treated as canonical exports of the package.
- **FR-016**: A meta-check (the "wiring-forgotten guard") MUST run as part of the same lint/CI entry point and MUST fail when an `apps/*/.eslintrc.cjs` file exists without spreading every drift-rule set. Failure output MUST name the offending `.eslintrc.cjs` file and the specific drift-rule spread(s) whose absence triggered the failure.
- **FR-017**: The wiring-forgotten guard MUST handle new `apps/*` siblings automatically: no edit to the meta-check itself MUST be required when a new `apps/<new-name>/` directory with a `.eslintrc.cjs` is added.
- **FR-018**: The wiring-forgotten guard MUST NOT produce a false positive for an `apps/*` directory that has no `.eslintrc.cjs` at all (i.e., the check applies only when an `.eslintrc.cjs` exists — it does not retroactively require every sibling to have one).
- **FR-019**: The existing `scripts/check-no-geojson-feature.sh` MUST be wired into the monorepo's lint/CI entry point such that a new violation causes lint/CI to fail. The script itself MUST NOT be rewritten or ported as part of this feature (its internal logic is out of scope; only its invocation is in scope).
- **FR-020**: The baseline clean-main guarantee (FR-012, SC-007) MUST hold for *every* drift-rule set, the wiring-forgotten guard, and the geojson script simultaneously. Any violation surfaced at feature introduction is a defect in prior consolidation work, to be fixed rather than suppressed.

### Key Entities

- **`@debrief/utils` export surface**: the set of named exports (values and types) declared by `shared/utils/src/index.ts`. Canonical list of names forbidden from original redeclaration under `apps/*`.
- **`@debrief/*` export surfaces (expanded scope)**: analogous sets parsed from each package's authoritative index barrel. Locations: `@debrief/utils` → `shared/utils/src/index.ts`; `@debrief/components` → `shared/components/src/index.ts`; `@debrief/schemas` → `shared/schemas/src/generated/typescript/index.ts`; `@debrief/data` → `shared/data/src/ts/index.ts`; `@debrief/session-state` → `services/session-state/src/index.ts`. Each is a canonical list of names forbidden from original redeclaration under `apps/*`.
- **`apps/*` file**: any TypeScript source file under `apps/*/src/**`. Scope of enforcement for all drift rules.
- **Violation**: a quadruple (file path, symbol name, source-kind value-vs-type, source-package identifier) where an `apps/*` file declares an original export whose name matches any `@debrief/*` package's export.
- **Wiring defect**: a tuple (offending `.eslintrc.cjs` file path, name(s) of drift-rule spread(s) absent from that file) emitted by the wiring-forgotten guard when it fails.
- **Check report**: the aggregate pass/fail result of the drift rules + wiring-forgotten guard + geojson regression script, plus — on failure — the list of violations and wiring defects with file, symbol, package, and remediation hint.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A PR that introduces `apps/<any-app>/src/utils/bounds.ts` with an original export of `calculateBounds` is blocked from merging by an automated check. (The exact regression shape from #200 is caught.)
- **SC-002**: A PR that introduces any `apps/*` file declaring an original export whose name matches *any* `@debrief/utils` export — e.g. `mergeBounds`, `formatDuration`, `sanitizeFilename`, `assertNever`, `SafeFeature`, `parseDuration` — is blocked from merging by the same check. (The general rule is caught, not only the filename from #200.)
- **SC-003**: A PR that adds a legitimate `export { calculateBounds } from '@debrief/utils'` barrel in an `apps/*` file passes the check without any manual suppression or `eslint-disable` directive.
- **SC-004**: When a new export is added to `shared/utils/src/index.ts`, the guard extends to forbid that name's redeclaration in `apps/*` with zero edits to the guard itself. (Verified by temporarily adding a throwaway export and a colliding `apps/*` declaration in an experiment, then reverting.)
- **SC-005**: A contributor who triggers the guard for the first time — having never read the #200 spec — can resolve the failure (replace their declaration with an import from `@debrief/utils`) in under 5 minutes using only information present in the failure message.
- **SC-006**: The combined guard footprint — all five per-package drift rule sets, the wiring-forgotten meta-check, and the wired-in geojson regression script — adds no more than 5 seconds to the total `task verify` / local CI-equivalent run time on a clean checkout. (Revised from the original per-rule-only budget to reflect the expanded scope; the target remains 5 s for the aggregate cost because the marginal cost of each added rule set is sub-second.)
- **SC-007**: On the `main` tree at the time of this feature's introduction, every component of the guard (all five drift-rule sets, the wiring-forgotten meta-check, and the geojson script) reports zero violations — the baseline is clean.
- **SC-008**: A PR that adds a new `apps/<new-name>/.eslintrc.cjs` file without the `...utilsDriftRules` spread (or equivalent spreads for the other four `@debrief/*` packages) is blocked from merging by the wiring-forgotten meta-check. No edit to the meta-check itself was required between the PR being opened and CI failing on it. (Verifies FR-016, FR-017.)
- **SC-009**: For each of `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data`, a PR that declares an original export under `apps/*/src/**` whose name matches an export from that package is blocked from merging, with a failure message naming the specific source package. (Verifies FR-013, FR-014.)
- **SC-010**: A PR that adds `interface GeoJSONFeature { ... }` under `apps/`, `shared/`, or `services/` (outside the script's existing exclusion list) is blocked from merging by CI lint failure attributable to `scripts/check-no-geojson-feature.sh`. (Verifies FR-019.)
- **SC-011**: When a new export `newName` is added to any `@debrief/*` package's index barrel (including via an `export *` forwarding chain within that package's own `src/`), the corresponding drift rule extends to forbid `newName`'s redeclaration under `apps/*` with zero edits to any drift-rule module or meta-check. (Verifies FR-015 as the generalised form of FR-010 / SC-004.)

## Assumptions

- #200's consolidation is the starting baseline: every `apps/*` reference to bounds math already goes through `@debrief/utils`. The guard's job is forward-looking drift prevention, not cleanup of existing drift.
- `apps/*` is treated as a glob, not a fixed allowlist. Today's members (`apps/loader`, `apps/vscode`, `apps/web-shell`, `apps/spec-navigator`) are covered; any future sibling added under `apps/` is covered automatically.
- `shared/*` is out of scope for this feature — see "Out of Scope" below. `shared/components/src/utils/bounds.ts`, in particular, is explicitly carved out per #200.
- `contrib/*` is out of scope until that tree exists.
- `@debrief/utils` uses named exports as the canonical pattern (no default export of its own). The guard compares against the package's named-export list.
- The guard plugs into an existing CI step (lint, typecheck, or a dedicated pre-test stage). It does not add a new CI *job*; it adds a *check* to the existing pipeline, per `CLAUDE.md`'s "Before Pushing" three-step model.
- "Fails CI" in FR-004 means: the check process exits non-zero, the containing CI step fails, the pipeline reports a failure state, and branch-protection prevents merge as it does today.
- Choice between a custom ESLint rule (a `no-restricted-exports`-flavoured rule plugged into the existing per-app `.eslintrc.cjs` files) and a standalone script under `scripts/` is an **implementation decision deferred to `/speckit.plan`**. The spec describes the contract; the plan picks the mechanism, weighing the precedent in `shared/eslint-rules/provenance-snake-case.cjs` against the precedent in `scripts/check-no-geojson-feature.sh`.
- Test-harness location and fixture style were decided during `/speckit.review` (2026-04-20): Vitest-under-`shared/utils/tests/eslint-rules/` (co-located with the `@debrief/utils` package whose surface the rule protects), with real `.ts` fixture files (not inline strings). See `plan.md` "Structure Decision" and `research.md` Decision 4 for details.
- The ADR recording the ESLint-over-script choice (research.md Decision 1 & 5) will be added to `docs/project_notes/decisions.md` as part of the implementation (/speckit.tasks).
- Future drift-prevention guards added to this monorepo SHOULD be implemented as ESLint rules wired into the existing lint step, not as standalone shell scripts. The precedent `scripts/check-no-geojson-feature.sh` — whose unwiring this feature fixes — stands as the reason: a script that must be separately wired into CI is empirically forgotten. This assumption constrains future guard design; it is not retroactively enforced (the existing script is wired, not rewritten, by this feature).

## Dependencies

- Feature #200 (`200-bounds-consolidation`) must be on `main`. The current spec presupposes #200's SC-001 guarantee holds at t=0; SC-007 verifies that presupposition.
- No new *runtime* dependencies. If the ESLint-rule path is chosen during `/speckit.plan`, the existing toolchain (ESLint 8.x + `@typescript-eslint`) is sufficient. If the script path is chosen, the existing Node toolchain is sufficient.

## Out of Scope

- Enforcing the ESLint drift rules for `shared/*` or `services/*` directories. The ESLint rule scope remains `apps/*` only. (The existing `scripts/check-no-geojson-feature.sh`, which US6 wires into CI, does cover `shared/` and `services/` but only for the single `GeoJSONFeature` identifier — not a general drift rule.)
- Enforcing an import-path *style* preference (e.g. "always import from `@debrief/utils` rather than `../../shared/utils/src/bounds`") when no redeclaration is present. This feature catches redeclarations, not import-path aesthetics.
- Unifying `shared/components/src/utils/bounds.ts` with `@debrief/utils`. Separate backlog item, explicitly carved out by #200.
- ~~Drift between `@debrief/utils` and other `@debrief/*` packages~~ — **now IN scope** per the Scope Expansion Note above (US5, FR-013 through FR-015, SC-009, SC-011).
- ~~Wiring new `apps/*` siblings into the drift rules automatically~~ — **now IN scope** per the Scope Expansion Note above (US4, FR-016 through FR-018, SC-008).
- ~~Wiring `scripts/check-no-geojson-feature.sh` into CI~~ — **now IN scope** per the Scope Expansion Note above (US6, FR-019, SC-010).
- Rewriting `scripts/check-no-geojson-feature.sh` as a Node/TypeScript module or migrating its logic into an ESLint rule. US6 wires the existing shell script into CI as-is; a later spec may migrate the logic.
- Cross-repository drift (e.g. between `debrief-future` and a hypothetical downstream consumer repo). Monorepo-local only.
- Runtime behaviour. The guard is a *static* check; it does not affect runtime code paths.
- Rule coverage for `contrib/*`. The planned organisation-extension tree still does not exist; when it does, the rules will need to be re-scoped. Out of scope for this feature.
