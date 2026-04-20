# Tasks: Drift-Prevention Rules for `@debrief/*` Re-duplication

**Feature**: 214-utils-drift-guard
**Input**: Design documents from `/specs/214-utils-drift-guard/`
**Prerequisites**: plan.md (read), spec.md (read), research.md (read), data-model.md (read), contracts/rule-contract.md (read), quickstart.md (read)

**Tests**: Tests are REQUIRED for this feature (Constitution VI.2 + VII — every rule module and the wiring-check script ship with Vitest coverage). Test tasks are marked `[test]`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Priority ordering: US1 (P1) → US4 (P1) → US5 (P2, includes US2 + US3 coverage) → US6 (P3). US2 and US3 are properties of the US1 rule rather than distinct stories — their acceptance scenarios are covered by tests within Phase 3.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the drift-prevention rules, wiring-forgotten meta-check, and grandfathered geojson script all work as expected end-to-end. These are used in the PR description and the Shipped blog post.

**Evidence Directory**: `specs/214-utils-drift-guard/evidence/`
**Media Directory**: `specs/214-utils-drift-guard/media/`

### Planned Artifacts (Infrastructure / Developer-Tooling feature type)

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest results for factory + 5 caller modules + wiring-check, with YAML front matter (feature, git_sha, captured_at, tests_passed/failed/skipped, coverage_pct) | After all Vitest tests pass (end of Phase 5) |
| `evidence/usage-example.md` | Walked example: contributor adds `apps/vscode/src/utils/bounds.ts`, runs `pnpm lint`, sees failure, fixes via import. Mirrors quickstart Walk 2. | End of Phase 3 |
| `evidence/lint-violation-transcript.txt` | Full terminal transcript of `pnpm lint` failing on each of the 5 packages' redeclaration cases (one section per package) | End of Phase 5 |
| `evidence/wiring-check-failure-transcript.txt` | Terminal transcript of `node scripts/check-eslint-drift-wiring.cjs` failing on a synthetic `apps/tutorial-sandbox/` (Walk 10) | End of Phase 4 |
| `evidence/wiring-check-pass-transcript.txt` | Terminal transcript of the same script passing on clean `main`-plus-implementation | End of Phase 4 |
| `evidence/geojson-script-wired-transcript.txt` | Terminal transcript of `task lint` failing with `check-no-geojson-feature.sh` output after a violation is introduced, and passing after removal (Walk 11) | End of Phase 6 |
| `evidence/config-sample.md` | Annotated excerpt of `apps/vscode/.eslintrc.cjs` showing the 5 `require(...)` lines and the `no-restricted-syntax` spreads | End of Phase 5 |
| `evidence/performance-measurement.md` | Wall-clock measurement of `task verify` before and after implementation on a clean checkout (verifies SC-006 ≤5 s delta) | End of Phase 6 |
| `evidence/baseline-clean.txt` | `task lint` output on the post-implementation tree with zero violations (verifies FR-020 / SC-007) | End of Phase 6 |
| `evidence/adr-entry.md` | Copy of the ADR added to `docs/project_notes/decisions.md` (for standalone reference in the PR description) | End of Phase 7 |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | EXISTING — blog post announcing the feature | Already committed during `/speckit.plan` |
| `media/linkedin-planning.md` | EXISTING — LinkedIn summary for planning | Already committed during `/speckit.plan` |
| `media/shipped-post.md` | Blog post celebrating completion: the drift-guard story, the 3 silent-failure gaps closed, the factory pattern precedent | Phase 7 |
| `media/linkedin-shipped.md` | 150–200-word LinkedIn summary | Phase 7 |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with all evidence artefacts linked | Final task (Phase 7) |
| Blog PR | PR in debrief.github.io with `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup & Shared Foundation

**Goal**: Verify prerequisites, ensure tooling is in place, and confirm the baseline assumption (FR-012 / SC-007) that `main` is clean before any guard is added.

- [ ] T001 Verify `typescript`, `eslint`, `@typescript-eslint/parser`, and `@typescript-eslint/eslint-plugin` are present in the root `package.json` / `pnpm-lock.yaml`. No new dependencies must be added. If any of the four is missing, stop and ask before adding. `package.json`
- [ ] T002 Read and confirm the current shape of `apps/loader/.eslintrc.cjs`, `apps/vscode/.eslintrc.cjs`, `apps/web-shell/.eslintrc.cjs`, and `apps/spec-navigator/.eslintrc.cjs`. Document (in working notes, not a committed file) which already have an existing `no-restricted-syntax` array vs which will gain one. `apps/*/.eslintrc.cjs`
- [ ] T003 Baseline sanity run: on clean `main`-plus-no-code-changes, run `task lint` and confirm exit 0. Keep the transcript — it becomes part of the SC-007 evidence in Phase 6 / 7. `task lint` (no file)

## Phase 2: Drift-Rule Factory (Foundation — blocks US1 and US5)

**Goal**: Implement the `drift-rule-factory.cjs` module and its full test coverage so that subsequent per-package caller modules are one-line adapters.

**Independent Test**: `pnpm --filter @debrief/utils test -- tests/eslint-rules/drift-rule-factory.test.ts` exits 0 with all assertions green. The factory, invoked with a synthetic single-name `input`, returns a `rules` array of exactly 7 entries sorted deterministically, with messages embedding the supplied `packageName`. The transitive `export *` walker visits one-hop-relative forwards and halts on cycles.

### Factory module

- [ ] T010 Create `shared/eslint-rules/drift-rule-factory.cjs` with the public signature `module.exports = function createDriftRules({ packageName, indexPath, anchorDir }) { ... }` and `// @ts-check` + JSDoc typing. Matches `contracts/rule-contract.md` §1.0. `shared/eslint-rules/drift-rule-factory.cjs`
- [ ] T011 Implement `parseIndexTs(absolutePath)` — loads `typescript`, calls `createSourceFile` at `ScriptTarget.Latest`, returns the parsed `SourceFile`. Error messages MUST name the resolved absolute path. `shared/eslint-rules/drift-rule-factory.cjs`
- [ ] T012 Implement `collectForbiddenNames(sourceFile, anchorDir, visitedSet)` — walks top-level `ExportDeclaration` and `ExportAssignment` nodes, collects explicit `ExportSpecifier` names (values + types). Returns `{ values: Set<string>, types: Set<string> }`. `shared/eslint-rules/drift-rule-factory.cjs`
- [ ] T013 Extend `collectForbiddenNames` to follow `ExportAllDeclaration` with relative specifiers (`./`, `../`). Strip `.js`/`.cjs`/`.mjs` suffixes when resolving; try `.ts`/`.tsx` extensions. Use a `visitedSet` keyed by absolute resolved path for cycle safety. Ignore bare/absolute specifiers silently. `shared/eslint-rules/drift-rule-factory.cjs`
- [ ] T014 Implement `generateRules({ values, types, packageName })` — emits the 7 `RestrictedSyntaxEntry` shapes from research.md Decision 3 per name, with messages templated per `contracts/rule-contract.md` §2.1. Sort the resulting array by `(selector, message)` lexicographically for determinism (FR-011). `shared/eslint-rules/drift-rule-factory.cjs`
- [ ] T015 Wire the factory's public function: validate inputs (throw if `packageName` does not start with `@debrief/`), resolve `indexPath`, call `parseIndexTs` → `collectForbiddenNames` → `generateRules`. Handle empty-set case per §1.3 failure table (warn to stderr, return `{ rules: [] }`). `shared/eslint-rules/drift-rule-factory.cjs`

### Test scaffolding (harness per `/speckit.review` A1a)

- [ ] T016 Create `shared/utils/tests/eslint-rules/__fixtures__/` directory and add the 7 shape fixtures referenced by `contracts/rule-contract.md`: `redeclaration-fn.ts`, `redeclaration-const.ts`, `redeclaration-class.ts`, `redeclaration-type.ts`, `redeclaration-interface.ts`, `redeclaration-enum.ts`, `redeclaration-default.ts`. Each file MUST use a name known to be exported by `@debrief/utils` (e.g. `calculateBounds` for `redeclaration-fn.ts`). `shared/utils/tests/eslint-rules/__fixtures__/`
- [ ] T017 [P] Add negative-case fixtures `reexport-named.ts` (`export { calculateBounds } from '@debrief/utils';`), `reexport-star.ts` (`export * from '@debrief/utils';`), and `local-identifier-collision.ts` (non-exported local `function calculateBounds() {...}`). `shared/utils/tests/eslint-rules/__fixtures__/`
- [ ] T018 Create `shared/utils/tests/eslint-rules/helpers.ts` — a small test helper exporting `lintSource(source, rules)` that invokes ESLint's programmatic `Linter` API against a string or file path with the supplied `no-restricted-syntax` rules and returns the violation list. `shared/utils/tests/eslint-rules/helpers.ts`

### Factory unit tests

- [ ] T019 [test] Write `shared/utils/tests/eslint-rules/drift-rule-factory.test.ts` covering: (a) single-name synthetic input produces exactly 7 entries; (b) deterministic sort order across repeated invocations; (c) messages embed the supplied `packageName`; (d) empty index → `{ rules: [] }` + stderr warning; (e) missing `indexPath` → throws with the expected error text; (f) input validation rejects `packageName` that doesn't start with `@debrief/`. `shared/utils/tests/eslint-rules/drift-rule-factory.test.ts`
- [ ] T020 [P][test] Add transitive-walk tests to the factory test file covering: (a) one-hop `export * from './sub.js'` contributes names from the sub-file; (b) two-hop chain works; (c) cycles (A exports * from B, B exports * from A) do not infinite-loop; (d) bare-specifier `export * from '@debrief/other'` is ignored; (e) absolute-path specifier is ignored; (f) `.js`/`.cjs`/`.mjs` suffix stripping resolves to the `.ts` source. Use throwaway fixture files under `shared/utils/tests/eslint-rules/__fixtures__/factory-walk/`. `shared/utils/tests/eslint-rules/drift-rule-factory.test.ts`
- [ ] T021 [test] Add AST-shape coverage tests: for each of the 7 selectors, construct a fixture that would match, lint it programmatically via the `helpers.lintSource`, and assert the violation fires with the expected message shape. Confirm the 3 negative fixtures produce zero violations. `shared/utils/tests/eslint-rules/drift-rule-factory.test.ts`
- [ ] T022 Run `pnpm --filter @debrief/utils test -- tests/eslint-rules/drift-rule-factory.test.ts` and confirm all tests pass. Fix any failures before moving to Phase 3. `shared/utils/tests/eslint-rules/drift-rule-factory.test.ts`

## Phase 3: User Story 1 (P1) — Block Reintroduction of App-Local `@debrief/utils` Redeclaration

**Story goal**: Add `apps/vscode/src/utils/bounds.ts` with `export function calculateBounds() {...}` and confirm `pnpm lint` fails with a message naming the file, the symbol, and the canonical import. Remove the file; confirm lint passes again. Barrel re-exports continue to work without any `eslint-disable` directive (US2 coverage). Failure messages are self-documenting per US3's acceptance scenarios.

**Independent Test**: Quickstart Walks 1, 2, 3, 4, 6, 7 all pass exactly as specified. Verified by running them in order from repo root on the Phase-3-complete tree.

**Covers**: US1 acceptance scenarios 1–4, US2 scenarios 1–5, US3 scenarios 1–4.

### Caller module + wiring

- [ ] T030 Create `shared/eslint-rules/no-redeclare-utils-exports.cjs` — a thin caller module that requires `./drift-rule-factory.cjs` and invokes it with `{ packageName: '@debrief/utils', indexPath: path.resolve(__dirname, '../utils/src/index.ts') }`. Re-exports the factory's return value unchanged. Total body: ~5 lines. `shared/eslint-rules/no-redeclare-utils-exports.cjs`
- [ ] T031 [P] Wire `apps/loader/.eslintrc.cjs`: add `const { rules: utilsDriftRules } = require('../../shared/eslint-rules/no-redeclare-utils-exports.cjs');` near the existing requires, and spread `...utilsDriftRules` into the `no-restricted-syntax` array with `'error'` severity. Preserve any existing entries in that array. `apps/loader/.eslintrc.cjs`
- [ ] T032 [P] Wire `apps/vscode/.eslintrc.cjs` with the same require + spread. Preserve the existing `...snakeCaseRules` spread. `apps/vscode/.eslintrc.cjs`
- [ ] T033 [P] Wire `apps/web-shell/.eslintrc.cjs` with the same require + spread. `apps/web-shell/.eslintrc.cjs`
- [ ] T034 [P] Wire `apps/spec-navigator/.eslintrc.cjs` with the same require + spread. `apps/spec-navigator/.eslintrc.cjs`

### Per-package integration tests

- [ ] T035 [test] Write `shared/utils/tests/eslint-rules/no-redeclare-utils-exports.test.ts`. Import `{ rules }` from the caller module. Use `helpers.lintSource` to exercise all 7 positive fixtures + 3 negative fixtures from Phase 2, asserting: (a) every positive fixture produces exactly one violation naming `@debrief/utils` (US1 scenarios + US3); (b) every negative fixture produces zero violations (US2); (c) the violation message contains the literal text `apps/*` and `import { <name> } from '@debrief/utils';` (US3 scenarios 1–3); (d) the message is single-line ASCII-only (US3 scenario 4). `shared/utils/tests/eslint-rules/no-redeclare-utils-exports.test.ts`
- [ ] T036 [P][test] Add a smoke test that programmatically lints `apps/vscode/src/utils/bounds.ts` (nonexistent but referenced by the test harness) on a synthetic file containing `export function mergeBounds(...) {}` and asserts the symbol-match (not filename-match) behaviour from US1 scenario 2. `shared/utils/tests/eslint-rules/no-redeclare-utils-exports.test.ts`
- [ ] T037 [test] Add an auto-extension test (SC-004 / FR-010) that monkey-patches the caller module's `indexPath` to point at a throwaway `__fixtures__/synthetic-utils-index.ts` containing `export { __sc004Probe } from './probe.js';` plus a companion `probe.ts`, then confirms the resulting `rules` include selectors for `__sc004Probe`. Restore the real module after the test. `shared/utils/tests/eslint-rules/no-redeclare-utils-exports.test.ts`

### End-to-end verification

- [ ] T038 Run `pnpm lint` from the repo root on the Phase-3-complete tree and confirm exit 0 (SC-007 for the utils rule alone). Save the transcript snippet for later evidence aggregation. `pnpm lint` (no file)
- [ ] T039 Execute Quickstart Walk 2 manually: create `apps/vscode/src/utils/bounds.ts` with `export function calculateBounds() { return [0,0,0,0]; }`, run `pnpm lint`, confirm it fails with the expected message shape, remove the file, re-run, confirm exit 0. Capture the failure transcript under `specs/214-utils-drift-guard/evidence/lint-violation-transcript.txt` (utils section; later phases append more). `specs/214-utils-drift-guard/evidence/lint-violation-transcript.txt`
- [ ] T040 Execute Quickstart Walks 3 (SC-002 general rule — `mergeBounds`, `SafeFeature`), 4 (SC-003 re-export tolerance), and 6 (non-exported locals). Capture pass/fail outcomes. `pnpm lint` (no file)

## Phase 4: User Story 4 (P1) — Wiring-Forgotten Meta-Check

**Story goal**: Any `apps/*/.eslintrc.cjs` that omits the drift-rule spreads causes `task lint` to fail with a clear, actionable report naming the offending file and each missing spread. Adding a new `apps/*` sibling without the wiring automatically fails CI; no edit to the meta-check itself is required.

**Independent Test**: Quickstart Walk 10 (10a, 10b, 10c, 10d) passes exactly as specified. The script also catches regression (spread removed from an existing file) without false-positive on a passing tree.

**Covers**: US4 acceptance scenarios 1–4, FR-016/017/018, SC-008.

- [ ] T050 Create `scripts/check-eslint-drift-wiring.cjs` following `contracts/rule-contract.md` §7.1. Hard-code the `CALLER_MODULES` array at the top. Enumerate `apps/*/` directories via `fs.readdirSync`, skip any without `.eslintrc.cjs`, `require()` each, resolve its `rules['no-restricted-syntax']` array (including `extends` chain best-effort), and assert each caller module's exported `rules` array is spread (identity check via `Array.prototype.includes` against each entry). `scripts/check-eslint-drift-wiring.cjs`
- [ ] T051 Implement the failure-report printer per `contracts/rule-contract.md` §7.2: one section per offending `.eslintrc.cjs`, listing each missing spread with its expected identifier name (`...<pkg>DriftRules`) and source path. Exit with code 1 on any defect, 0 otherwise. `scripts/check-eslint-drift-wiring.cjs`
- [ ] T052 Handle the failure-mode matrix from §7.3 (missing eslintrc → skip; `require()` throws → distinct stderr line + exit 1; no `no-restricted-syntax` rule at all → report all spreads missing; script invoked from wrong directory → fail-closed with directive to run from repo root). `scripts/check-eslint-drift-wiring.cjs`
- [ ] T053 Modify `Taskfile.yml`: add `node scripts/check-eslint-drift-wiring.cjs` to the `lint` task's `cmds:` list, alongside the existing `pnpm lint` invocation. Ensure a non-zero exit from the script fails the aggregate task. `Taskfile.yml`
- [ ] T054 [test] Write `shared/utils/tests/eslint-rules/check-eslint-drift-wiring.test.ts` covering: (a) passing case — in-memory eslintrc with all spreads → script exits 0; (b) missing-one-spread case — script exits 1 and stderr names only the missing spread; (c) missing-all-spreads case — stderr names all 5 (even though only `utilsDriftRules` exists at Phase 4; the test harness mocks the others); (d) broken eslintrc (`require()` throws) — script exits 1 with a distinct message; (e) no-`.eslintrc.cjs` directory — script ignores (FR-018). Use Vitest's `child_process` helpers to invoke the script. `shared/utils/tests/eslint-rules/check-eslint-drift-wiring.test.ts`
- [ ] T055 Execute Quickstart Walk 10a: create `apps/tutorial-sandbox/.eslintrc.cjs` with no spreads, run `node scripts/check-eslint-drift-wiring.cjs`, confirm failure + expected stderr. Capture the transcript in `specs/214-utils-drift-guard/evidence/wiring-check-failure-transcript.txt`. `specs/214-utils-drift-guard/evidence/wiring-check-failure-transcript.txt`
- [ ] T056 Execute Quickstart Walk 10c: remove the tutorial-sandbox directory, re-run the script, confirm exit 0. Capture the pass transcript in `specs/214-utils-drift-guard/evidence/wiring-check-pass-transcript.txt`. `specs/214-utils-drift-guard/evidence/wiring-check-pass-transcript.txt`
- [ ] T057 Execute Quickstart Walk 10d (regression): temporarily remove `...utilsDriftRules` from `apps/vscode/.eslintrc.cjs`, run the script, confirm it names only that specific missing spread, restore the spread, re-run, confirm exit 0. (Do NOT commit the temporary removal.) `apps/vscode/.eslintrc.cjs`

## Phase 5: User Story 5 (P2) — Generalise to `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data`

**Story goal**: A file under `apps/*/src/**` that redeclares any name from any of the four additional `@debrief/*` packages causes `pnpm lint` to fail with a message naming the *correct* source package (not `@debrief/utils`). The transitive `export *` walk contributes names reached through forwarding chains in `@debrief/session-state`. Re-exports of any of these packages remain permitted.

**Independent Test**: Quickstart Walk 9 (9a through 9d) passes exactly as specified. Each sub-walk produces a failure message whose `'<PACKAGE>'` substring matches the targeted package.

**Covers**: US5 acceptance scenarios 1–5, FR-013/014/015, SC-009, SC-011.

### Per-package caller modules (all four reuse the Phase 2 factory)

- [ ] T060 [P] Create `shared/eslint-rules/no-redeclare-schemas-exports.cjs` — invokes the factory with `{ packageName: '@debrief/schemas', indexPath: path.resolve(__dirname, '../schemas/src/generated/typescript/index.ts') }`. ~5 lines, identical shape to the utils caller. `shared/eslint-rules/no-redeclare-schemas-exports.cjs`
- [ ] T061 [P] Create `shared/eslint-rules/no-redeclare-components-exports.cjs` — invokes the factory with `{ packageName: '@debrief/components', indexPath: path.resolve(__dirname, '../components/src/index.ts') }`. `shared/eslint-rules/no-redeclare-components-exports.cjs`
- [ ] T062 [P] Create `shared/eslint-rules/no-redeclare-session-state-exports.cjs` — invokes the factory with `{ packageName: '@debrief/session-state', indexPath: path.resolve(__dirname, '../../services/session-state/src/index.ts') }`. Note the cross-directory path (from `shared/` to `services/`). `shared/eslint-rules/no-redeclare-session-state-exports.cjs`
- [ ] T063 [P] Create `shared/eslint-rules/no-redeclare-data-exports.cjs` — invokes the factory with `{ packageName: '@debrief/data', indexPath: path.resolve(__dirname, '../data/src/ts/index.ts') }`. `shared/eslint-rules/no-redeclare-data-exports.cjs`

### App wiring: add the 4 additional spreads to each `apps/*/.eslintrc.cjs`

- [ ] T064 [P] Extend `apps/loader/.eslintrc.cjs`: add the 4 new `const { rules: <pkg>DriftRules } = require(...)` lines and spread all four into the existing `no-restricted-syntax` array alongside `...utilsDriftRules`. Severity remains `'error'`. `apps/loader/.eslintrc.cjs`
- [ ] T065 [P] Extend `apps/vscode/.eslintrc.cjs` with the same 4 additional spreads. Existing `...snakeCaseRules` and `...utilsDriftRules` remain. `apps/vscode/.eslintrc.cjs`
- [ ] T066 [P] Extend `apps/web-shell/.eslintrc.cjs` with the same 4 additional spreads. `apps/web-shell/.eslintrc.cjs`
- [ ] T067 [P] Extend `apps/spec-navigator/.eslintrc.cjs` with the same 4 additional spreads. `apps/spec-navigator/.eslintrc.cjs`

### Per-package smoke fixtures (2 per package)

- [ ] T068 [P] Add `shared/utils/tests/eslint-rules/__fixtures__/schemas-redeclaration.ts` (e.g. `export type PlatformRecord = { id: string };`) and `schemas-reexport.ts` (`export type { PlatformRecord } from '@debrief/schemas';`). `shared/utils/tests/eslint-rules/__fixtures__/`
- [ ] T069 [P] Add `components-redeclaration.ts` (e.g. `export const StacBrowser = () => null;`) and `components-reexport.ts`. `shared/utils/tests/eslint-rules/__fixtures__/`
- [ ] T070 [P] Add `session-state-redeclaration.ts` — MUST use a name reached via `export *` forwarding in `services/session-state/src/index.ts` (e.g. a name from `./types/index.js`); choose `getSessionStore` or similar. Add `session-state-reexport.ts` as a negative fixture. `shared/utils/tests/eslint-rules/__fixtures__/`
- [ ] T071 [P] Add `data-redeclaration.ts` (e.g. `export function loadRegistry() { return null; }`) and `data-reexport.ts`. `shared/utils/tests/eslint-rules/__fixtures__/`

### Per-package integration tests

- [ ] T072 [P][test] Write `shared/utils/tests/eslint-rules/no-redeclare-schemas-exports.test.ts` covering: positive fixture fails with message naming `@debrief/schemas` (not utils); negative fixture passes. `shared/utils/tests/eslint-rules/no-redeclare-schemas-exports.test.ts`
- [ ] T073 [P][test] Write `shared/utils/tests/eslint-rules/no-redeclare-components-exports.test.ts` with the same pattern. `shared/utils/tests/eslint-rules/no-redeclare-components-exports.test.ts`
- [ ] T074 [P][test] Write `shared/utils/tests/eslint-rules/no-redeclare-session-state-exports.test.ts`. CRITICAL: this test MUST assert that the `rules` array includes at least one selector whose name is reached through the transitive `export *` walk (look up a known transitively-forwarded name in the generated selectors). If the walker regresses, this test fails. `shared/utils/tests/eslint-rules/no-redeclare-session-state-exports.test.ts`
- [ ] T075 [P][test] Write `shared/utils/tests/eslint-rules/no-redeclare-data-exports.test.ts` with the positive/negative pattern. `shared/utils/tests/eslint-rules/no-redeclare-data-exports.test.ts`

### Update Phase 4 test to match

- [ ] T076 [test] Update `shared/utils/tests/eslint-rules/check-eslint-drift-wiring.test.ts` to assert the missing-all-spreads case names all 5 caller modules (no longer a mocked scenario — all 5 actually exist now). Adjust any Phase 4 test fixtures that assumed only one caller-module existed. `shared/utils/tests/eslint-rules/check-eslint-drift-wiring.test.ts`

### End-to-end verification

- [ ] T077 Run `pnpm lint` on the Phase-5-complete tree and confirm exit 0 (FR-020 / SC-007 for all 5 rules simultaneously). If any violation surfaces, treat it as a pre-existing drift that must be fixed — do not suppress. `pnpm lint` (no file)
- [ ] T078 Run `node scripts/check-eslint-drift-wiring.cjs` and confirm it passes with all 5 caller modules registered. `node scripts/check-eslint-drift-wiring.cjs` (no file)
- [ ] T079 Execute Quickstart Walks 9a, 9b, 9c, 9d. Each sub-walk produces a failure message citing the correct package name. Walk 9c is the transitive-walker integration test — its failure would indicate the walker regressed. Append the terminal transcripts to `specs/214-utils-drift-guard/evidence/lint-violation-transcript.txt`. `specs/214-utils-drift-guard/evidence/lint-violation-transcript.txt`
- [ ] T080 Run all Vitest tests under `shared/utils/tests/eslint-rules/` together via `pnpm --filter @debrief/utils test` and confirm every test file passes. `shared/utils/tests/eslint-rules/`

## Phase 6: User Story 6 (P3) — Wire `check-no-geojson-feature.sh` into CI

**Story goal**: The pre-existing `scripts/check-no-geojson-feature.sh` is invoked by `task lint` such that any `interface GeoJSONFeature { ... }` redeclaration under `apps/`, `shared/`, or `services/` (outside the script's exclusion list) fails CI. Script logic is unchanged.

**Independent Test**: Quickstart Walk 11 (11a, 11b) passes exactly as specified. `bash scripts/check-no-geojson-feature.sh` also passes standalone on clean `main`-plus-implementation.

**Covers**: US6 acceptance scenarios 1–3, FR-019, SC-010.

- [ ] T090 Modify `Taskfile.yml`: add `bash scripts/check-no-geojson-feature.sh` to the `lint` task's `cmds:` list, alongside `pnpm lint` and `node scripts/check-eslint-drift-wiring.cjs` from Phase 4. Order: `pnpm lint` first (most likely to fail informatively), then the wiring check, then the geojson script. `Taskfile.yml`
- [ ] T091 Optionally add a single leading comment to `scripts/check-no-geojson-feature.sh` referencing spec #214 (`# Wired into task lint by spec 214-utils-drift-guard.`). NO other change to the script — per `contracts/rule-contract.md` §8.2 the file is otherwise immutable. `scripts/check-no-geojson-feature.sh`
- [ ] T092 Baseline verification: run `task lint` from clean `main`-plus-Phase-6-complete. Confirm exit 0 (FR-020 / SC-007 / SC-010 baseline). Save the full transcript (all three commands) under `specs/214-utils-drift-guard/evidence/baseline-clean.txt`. `specs/214-utils-drift-guard/evidence/baseline-clean.txt`
- [ ] T093 Execute Quickstart Walk 11b: create `shared/components/src/bad-geojson.ts` containing `export interface GeoJSONFeature { foo: string; }`, run `task lint`, confirm it fails with the script's `❌ GeoJSONFeature regression guard failed!` output. Remove the file, re-run `task lint`, confirm exit 0. Capture the failure + recovery transcript in `specs/214-utils-drift-guard/evidence/geojson-script-wired-transcript.txt`. `specs/214-utils-drift-guard/evidence/geojson-script-wired-transcript.txt`
- [ ] T094 Measure performance delta for SC-006: on a clean checkout, time `task verify` before and after implementation (use `time task verify` twice on the pre-Phase-1 tree, twice on the post-Phase-6 tree). Record results in `specs/214-utils-drift-guard/evidence/performance-measurement.md`. Target: aggregate guard overhead ≤ 5 seconds. `specs/214-utils-drift-guard/evidence/performance-measurement.md`

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Record the ADR, aggregate evidence into publishable shape, produce media content, verify `task verify` on a full clean checkout, and open the PR.

### ADR record (research.md Decision 10, Constitution VIII.3)

- [ ] T100 Append a new ADR entry to `docs/project_notes/decisions.md` titled *"ADR-NNN: Drift-prevention guards as ESLint rules — generalised factory, wired meta-check, and grandfathered shell scripts"*. 1–2 paragraphs covering Decisions 1 + 6–9. Use the next unused ADR number in the file. `docs/project_notes/decisions.md`
- [ ] T101 Copy the ADR entry's final rendered text to `specs/214-utils-drift-guard/evidence/adr-entry.md` so it can be referenced from the PR description without requiring the reader to scroll through the full decisions log. `specs/214-utils-drift-guard/evidence/adr-entry.md`

### Evidence aggregation

- [ ] T102 Capture test results using `.specify/templates/evidence/test-summary-template.md` into `specs/214-utils-drift-guard/evidence/test-summary.md`. Include YAML front matter with `feature`, `captured_at`, `git_sha` (from `git rev-parse HEAD`), `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body: total tests, per-file breakdown for the factory + 5 caller modules + wiring-check, key scenarios verified (one sentence per user story). `specs/214-utils-drift-guard/evidence/test-summary.md`
- [ ] T103 [P] Create `specs/214-utils-drift-guard/evidence/usage-example.md`: walk-through of the primary US1 scenario. Include the minimal redeclaration file content, the `pnpm lint` command, the exact failure message produced, and the import-based fix. Close with a pointer to the full Quickstart for the other walks. `specs/214-utils-drift-guard/evidence/usage-example.md`
- [ ] T104 [P] Create `specs/214-utils-drift-guard/evidence/config-sample.md`: annotated excerpt of `apps/vscode/.eslintrc.cjs` showing the 5 `require(...)` lines at the top and the spread pattern inside `no-restricted-syntax`. Explain why each element appears (the severity `'error'`, the ordering choice, the coexistence with `...snakeCaseRules`). `specs/214-utils-drift-guard/evidence/config-sample.md`
- [ ] T105 Verify all seven evidence transcript files from Phases 3–6 are present and readable: `lint-violation-transcript.txt`, `wiring-check-failure-transcript.txt`, `wiring-check-pass-transcript.txt`, `geojson-script-wired-transcript.txt`, `baseline-clean.txt`, `performance-measurement.md`, `adr-entry.md`. Fix any missing or truncated files by re-running the originating walk. `specs/214-utils-drift-guard/evidence/`

### Full CI-equivalent verification (Quickstart Walk 12)

- [ ] T106 Run `task verify` on the complete Phase-7-ready tree. Confirm: (a) exits with status 0; (b) the lint step invokes all three commands (`pnpm lint`, wiring-check, geojson script) in sequence; (c) the Vitest step includes the new eslint-rules test files. Record the full transcript (or the relevant tail) in `specs/214-utils-drift-guard/evidence/task-verify-transcript.txt`. `specs/214-utils-drift-guard/evidence/task-verify-transcript.txt`
- [ ] T107 Run the "bad tree" verification: create a throwaway commit that introduces *three simultaneous violations* — (1) `apps/vscode/src/utils/bounds.ts` with `export function calculateBounds()`, (2) `apps/loader/.eslintrc.cjs` with one spread removed, (3) `shared/components/src/bad-geojson.ts` with `interface GeoJSONFeature`. Run `task verify`, confirm it fails with ALL three guard components firing. Amend the commit away (or `git reset`) — do NOT commit this state. Record the combined transcript for evidence. `specs/214-utils-drift-guard/evidence/task-verify-three-violations.txt`

### Media Content

- [ ] T108 Create `specs/214-utils-drift-guard/media/shipped-post.md` using the Content Specialist agent pattern (`.claude/agents/media/content.md`). Target audience: contributors to the monorepo. Hook: the #200 consolidation story, continued — three silent-failure gaps closed in one commit. Sections: What We Built, The Three Gaps (one per US4/US5/US6), The Factory Pattern, Lessons Learned. `specs/214-utils-drift-guard/media/shipped-post.md`
- [ ] T109 [P] Create `specs/214-utils-drift-guard/media/linkedin-shipped.md`, 150–200 words. Hook opening; three-gap framing; link to full blog post. `specs/214-utils-drift-guard/media/linkedin-shipped.md`

### PR Creation (FINAL task)

- [ ] T110 Create PR and publish blog: run `/speckit.pr`. Depends on all T100–T109 being complete. Creates the feature PR in `debrief/debrief-future` linking every evidence artefact; creates the blog PR in `debrief/debrief.github.io` with `shipped-post.md`; returns both PR URLs. (no file — slash command)

## Dependencies

### Story completion order

```
Phase 1 (Setup) ──► Phase 2 (Factory) ──┬──► Phase 3 (US1 — utils rule)  ──┐
                                        │                                  │
                                        ├──► Phase 4 (US4 — wiring check) ─┤
                                        │                                  │
                                        └──► Phase 5 (US5 — generalise)  ──┼──► Phase 6 (US6 — geojson) ──► Phase 7 (Polish + PR)
                                                                           │
                                                                           (Phase 5 also tightens Phase 4 test — see T076)
```

### Inter-phase dependencies (hard)

- **Phase 2 → Phase 3**: The factory (T010–T022) must exist and pass tests before the utils caller module (T030) can invoke it. The 7 shape fixtures (T016) must exist before the integration tests (T035).
- **Phase 3 → Phase 4**: The utils caller module (T030) must exist before the wiring-check script (T050) can assert its spread is present. Phase 4's Vitest tests (T054) reference the caller module.
- **Phase 2 → Phase 5**: Each of the four additional caller modules (T060–T063) reuses the same factory. They are **independent of Phase 3** at the factory level — Phase 3 and Phase 5 could in principle run in parallel, but the shared `apps/*/.eslintrc.cjs` edits (Phase 3 T031–T034 vs Phase 5 T064–T067) would create merge conflicts if done concurrently. Recommended order: Phase 3 → Phase 5 sequentially.
- **Phase 4 ↔ Phase 5 (bidirectional tightening)**: Phase 4 introduces the wiring check against *one* caller module; Phase 5 introduces four more and updates the Phase 4 test (T076). Phase 4 must land before Phase 5 starts (otherwise the wiring-check script has no meaningful contract); Phase 5 must land before Phase 6 starts (otherwise the wiring check is incomplete and would pass while only guarding utils).
- **Phase 6 is effectively independent of Phases 3–5** (it wires a pre-existing script), but it shares `Taskfile.yml` with Phase 4 T053 — do Phase 4 first, then amend the same file in Phase 6 T090.
- **Phase 7 depends on everything**: evidence aggregation (T102–T107) needs every guard component live; the ADR (T100) can only be written after all the decisions are implemented; the PR (T110) is the final task.

### Intra-phase parallelism

- **Phase 3**: T031–T034 are `[P]` (independent `apps/*/.eslintrc.cjs` files, no conflicts). T035–T037 are `[test]` but share one test file — NOT parallel with each other; can be written as three `describe()` blocks in the same test file.
- **Phase 5**: T060–T063 are `[P]` (four independent caller-module files). T064–T067 are `[P]` (four independent `.eslintrc.cjs` edits). T068–T071 are `[P]` (four independent fixture-pair files). T072–T075 are `[P][test]` (four independent test files).
- **Phase 7**: T102–T104 are largely independent evidence files. T108–T109 are `[P]` (blog + LinkedIn are separate files). T110 is strictly last.

### Parallel-execution examples

**Within Phase 3, after T030 lands:**

```
T031 + T032 + T033 + T034  (four .eslintrc.cjs edits, in parallel)
```

**Within Phase 5, after Phase 4 is complete:**

```
Wave 1 (caller modules + fixtures, parallel):
  T060 + T061 + T062 + T063 + T068 + T069 + T070 + T071

Wave 2 (eslintrc wiring, parallel) — depends on Wave 1:
  T064 + T065 + T066 + T067

Wave 3 (integration tests, parallel) — depends on Wave 1:
  T072 + T073 + T074 + T075
```

**Within Phase 7:**

```
Wave 1 (evidence + media, parallel):
  T102 + T103 + T104 + T108 + T109

Wave 2 (verification, sequential — shares tree state):
  T105 → T106 → T107

Wave 3 (final, sequential):
  T100 → T101 → T110
```

## Implementation Strategy

### Incremental delivery posture

Every phase from 3 onwards is **independently verifiable**. After each phase, the tree should satisfy the phase's "Independent Test" criterion and `task lint` should pass on clean code. Do not roll multiple phases into a single commit unless they genuinely coupled.

Recommended commit cadence (one commit per bullet — adjust if a phase naturally splits):

1. `feat(#214): drift-rule factory + @debrief/utils tests` — Phases 1 + 2 (factory only, no wiring yet).
2. `feat(#214): wire @debrief/utils drift rule into all apps` — Phase 3 (caller module + 4 eslintrc edits + integration tests). Tree passes `pnpm lint`; a redeclaration of `calculateBounds` is blocked.
3. `feat(#214): wiring-forgotten meta-check` — Phase 4 (script + taskfile wiring + tests). Removing any spread from any `apps/*/.eslintrc.cjs` fails the check.
4. `feat(#214): extend drift guard to 4 additional @debrief/* packages` — Phase 5 (4 caller modules + 16 eslintrc edits + 8 fixtures + 4 test files). All five packages now protected.
5. `fix(#214): wire scripts/check-no-geojson-feature.sh into task lint` — Phase 6. Complements the ESLint rules with `shared/` + `services/` coverage for `GeoJSONFeature`.
6. `docs(#214): evidence + ADR + media for drift-guard feature` — Phase 7 T100–T109. All artefacts ready for the PR.
7. `/speckit.pr` → PR opens (T110).

### Risk-first ordering inside Phase 2

The factory is the highest-leverage piece of new logic. Write it in this order to fail fast on the riskiest parts:

1. T010 module scaffold (trivially correct).
2. T011 + T012 AST walk on the existing `shared/utils/src/index.ts` (real input, no transitive work yet) — the rule module stood up against real data catches 80% of parser-surprise bugs early.
3. T014 generator — produces 7 selectors for every name discovered so far. Run the test from T019 against this intermediate state.
4. T013 transitive walker — add LAST because it is the most likely to have edge-case bugs. The walker test (T020) MUST be fully green before Phase 3 begins, otherwise `@debrief/session-state` support in Phase 5 will silently degrade.
5. T015 input validation + empty-set handling — cheap, belongs near the end.

### Baseline-clean gating (FR-020 / SC-007)

After every phase from 3 onwards, re-run `task lint` from repo root and confirm exit 0 on the unmodified tree. If it fails, stop and investigate:

- **Caused by new rule finding real drift**: a pre-existing drift incident has surfaced. Fix the offending `apps/*` file — do not suppress the rule. This is the intended behaviour of the guard; embrace it.
- **Caused by a rule bug**: fix the rule module or factory. Do not amend the eslintrc to work around it.

The `spec.md` posture (FR-020 / SC-007) is explicit: on `main` at feature-introduction time, all guards MUST pass with zero violations. Anything else is a bug in either the guard or a prior feature, not a configuration knob.

### Suggested MVP cut-off (if timing pressure emerges)

If the full 110-task list must be trimmed, these cut-lines are sound:

- **Phase 3 alone (T001–T040)**: minimum shippable value — closes the original #200 follow-up. Skips US4, US5, US6 entirely. Re-open a separate spec for those three.
- **Phases 1–4 (T001–T057)**: original utils rule + wiring-check. Skips the generalisation and the geojson script. Re-open a separate spec for Phase 5/6.
- **Phases 1–6 (T001–T094)**: complete feature, minimal evidence. Phase 7 is polish.

Preferred: ship all 7 phases as one PR. The factory pattern (Phase 2) becomes far harder to justify retrofitting after the utils-only rule ships standalone.
