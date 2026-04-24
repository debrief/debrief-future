# Contracts: Code-Quality Cleanup — Small-Bucket Consolidation

**Feature**: 199-code-quality-cleanup
**Date**: 2026-04-18

This feature does not add, change, or remove any API, RPC, IPC, or MCP contract. There are no new endpoints, no new messages, and no new schemas. The "contracts" below are the file-level change contracts for each of the five bundled sub-changes — the exact inputs, outputs, and invariants that the implementation must satisfy.

Each contract maps to one or more functional requirements in `spec.md` and to a test command in `quickstart.md`.

---

## Contract 1 — `decisions.md` cycle record (FR-001, FR-002, FR-003)

**Input**: Existing `docs/project_notes/decisions.md` ending at ADR-018 (2026-04-17, per current `main`).

**Output**: File gains exactly one new ADR entry. No other section is modified.

**Invariants**:

- Entry number is the next free ADR number after the highest on `main` at merge time (expected ADR-019; if another ADR has landed first, use the next free one).
- Entry title contains the phrase "Type-Only Cycles" or equivalent so SC-005's search finds it by substring.
- Entry body mentions the two cycles by full module names: `mapPanel`, `activityPanelView`, `calcService` (cycle 1) and `activityPanelView`, `resultsPanelService` (cycle 2).
- Entry body contains both the words "cycle" (lower-case) and "type-only" so SC-005's two grep tests pass.
- Entry body explicitly names interface extraction as the eventual fix.
- Entry follows the established `**Context:** / **Decision:** / **Alternatives Considered:** / **Consequences:**` section layout used by ADR-001…ADR-018.

**Failure mode**: If any of the cycles has been eliminated by an unrelated PR before merge, reduce the entry to the remaining cycle(s) rather than record a cycle that no longer exists.

---

## Contract 2 — `LogPanelProps` consolidation (FR-004, FR-005, FR-006)

**Input**: `shared/components/src/LogPanel/types.ts` with three interfaces (`LogPanelProps`, `LogTimelineProps`, `LogByFeatureProps`); `LogTimeline.tsx`, `LogByFeature.tsx`, `shared/components/src/LogPanel/index.ts`, `shared/components/src/index.ts` all import / re-export the child interfaces.

**Output**:

1. `LogPanelProps` is the single prop interface exported for the LogPanel components.
2. Any optional field present on `LogTimelineProps` / `LogByFeatureProps` but absent from `LogPanelProps` has been added to `LogPanelProps` (see `data-model.md` Entity 1 for the complete list).
3. `LogTimelineProps` and `LogByFeatureProps` have been removed from `types.ts` and from both index re-export sites.
4. `LogTimeline.tsx` and `LogByFeature.tsx` import and annotate against `LogPanelProps`.

**Invariants**:

- `pnpm --filter @debrief/components typecheck` passes.
- `pnpm --filter @debrief/components test` passes without modification of any vitest test file beyond possibly a type import line (behaviour assertions unchanged).
- `pnpm --filter @debrief/components build-storybook` succeeds; existing stories render without per-story source edits.
- `grep` across the monorepo for `LogTimelineProps` and `LogByFeatureProps` returns zero matches after the change (spec SC-002).

**Failure mode**: If any consumer outside `shared/components/` imports the old names (e.g. an app-level component), update it in the same PR; do **not** ship a shim. The assumption (spec.md Assumptions) is that no external consumer exists; violation flips this into an explicit update.

---

## Contract 3 — `shared/components/diff/` removal (FR-007, FR-008)

**Input**: `shared/components/diff/` exists with `package.json`, `src/`, `tests/`, `tsconfig.json`, `vitest.config.ts`; not listed in `pnpm-workspace.yaml`; no import in the monorepo.

**Output**:

1. The entire `shared/components/diff/` directory is removed from the working tree.
2. Any file that still references the path — `tsconfig*.json`, workspace configs, build scripts, knip config — has been updated to drop the stale reference.

**Invariants**:

- `git log -- shared/components/diff/` still shows the deletion commit (restorability, per User Story 6 acceptance scenario 2).
- `pnpm install` succeeds.
- `task verify` passes.
- `grep -rn "shared/components/diff"` across the repo returns zero matches except within `specs/199-code-quality-cleanup/` itself (this spec is allowed to reference the deletion).

**Failure mode**: If any config or code references survive undetected, CI will fail on the affected step — tsconfig references typically surface at typecheck, script references at build or verify.

---

## Contract 4 — knip `specs/**` ignore + pinned devDep (FR-009, FR-010, FR-019)

**Input**: No `knip.json` at repo root (confirmed 2026-04-18). No `"knip"` entry in root `package.json`. `pnpm dlx knip` currently reports many `specs/**` entries as unused and resolves knip to `@latest` at every invocation — not reproducible.

**Output**:

1. New file `knip.json` at repo root. Content is the minimum needed to make knip (a) successfully run on this monorepo and (b) skip `specs/**`. At minimum:

   ```json
   {
     "$schema": "https://unpkg.com/knip@latest/schema.json",
     "ignore": ["specs/**"]
   }
   ```

   If knip refuses to run without additional workspace entry points on a monorepo of this shape, add only the minimum `workspaces` / `entry` fields required. Any addition beyond "make knip run + skip specs/**" is out of scope.

2. `knip` is added to root `package.json` `devDependencies` as an **exact pin** (e.g. `"knip": "5.31.0"`) — no `^` or `~`. This is required by FR-019: the config has no meaning without a matching runtime version.

**Invariants**:

- `knip` appears exactly once in root `package.json` `devDependencies` with an exact semver (no range operators).
- `pnpm install` succeeds and populates `node_modules/knip`.
- Running the pinned knip on the feature branch reports zero files under `specs/**` as unused (SC-001).
- Pre/post comparison of the non-`specs/**` findings is unchanged (SC-001) — no genuine finding has been hidden. Baseline is captured **from the pinned version**, not from whatever `pnpm dlx knip@latest` returns on `main` — otherwise the comparison mixes version drift with config change.
- The `knip.json` file contains no entries referencing `shared/components/diff/` (would conflict with Contract 3).
- Invocations in docs (quickstart, PR description) use `pnpm knip` or `pnpm exec knip` — **not** `pnpm dlx knip@latest`.

**Failure mode**: An overly-broad ignore rule (e.g. `"**/*"`, `node_modules/**` added unnecessarily) fails SC-001 on the "non-specs findings unchanged" check. A version range (`^5.0.0`) instead of an exact pin fails SC-009 and Article I.4.

---

## Contract 5 — `plotName` resolution + TODO promotion (FR-011, FR-012, FR-013, FR-014, FR-015)

### 5a — `plotName` resolution (FR-011, FR-012)

**Input**: `apps/loader/src/renderer/hooks/useLoadWorkflow.ts:73` — `plotName = existingPlotId; // TODO: Get actual name from plot list`. Plot list is available via `useLoadWorkflow`'s caller (or via `usePlots.ts:33`'s `window.electronAPI.listPlots`).

**Output**: At line ~73 (or equivalent after refactor), `plotName` is the plot's display name from the plot list, not its ID. The `// TODO: Get actual name from plot list` comment is removed (not replaced with `TODO(#NNN)` — this TODO is being resolved, not tracked).

**Invariants**:

- Loading into an existing plot whose display name differs from its ID surfaces the display name in the returned `LoadResult.plotName`.
- `grep -n "TODO" apps/loader/src/renderer/hooks/useLoadWorkflow.ts` returns zero matches.
- The hook's public signature may change (e.g., `executeLoad` gains a `plots` argument) but any change must be accompanied by an update to the single in-repo caller so `task verify` passes unchanged.

### 5b — TODO promotion (FR-013, FR-014, FR-015)

**Input**: Three surviving TODOs at:

- `apps/loader/src/main/ipc/config.ts:158` ("Manage Stores tab")
- `apps/loader/src/renderer/components/StoreSelector/index.tsx:4` ("Create new store button")
- `apps/vscode/src/services/stacService.ts:~1119` (already tracked as `TODO(#137)`)

**Output**:

1. For the first two: a GitHub issue exists in `debrief/debrief-future` with a short title matching the TODO summary, a remediation hint in the body, and a source-line reference.
2. The in-source TODO for each is replaced with `TODO(#NNN): <short summary>` where `NNN` is the issue number.
3. For the third (`stacService.ts`): no change — already tracked. The PR description notes "audited, already tracked as #137".
4. The PR description lists the new issue numbers and, if any listed TODO cannot be located, records its disposition explicitly (FR-015).

**Invariants**:

- `grep -rn "TODO:" apps/loader/src/main/ipc/config.ts apps/loader/src/renderer/components/StoreSelector/index.tsx` returns zero matches (the `:` immediately after `TODO` without an issue number is the signal of an un-tracked TODO).
- `grep -rn "TODO(" apps/loader/src/main/ipc/config.ts apps/loader/src/renderer/components/StoreSelector/index.tsx` returns at least one match each, pointing at a real, open issue.
- The three issues referenced exist and are open at merge time.
- **Pre-push guard (FR-020)**: `grep -rn "TODO(#NNN)" apps/ services/ shared/` MUST return zero matches before any commit in this PR is pushed. The literal three-character string `NNN` is an anti-pattern that would otherwise silently ship as a broken reference.
- **Ordering discipline (FR-020)**: The implementation task list (tasks.md) MUST encode a single atomic unit per promoted TODO — *"file issue → capture number → replace in-source comment"* — so that no commit exists in which the issue is filed but the source still reads `TODO:` (or conversely, a source references an issue that does not yet exist). No placeholder-then-swap dance.

**Failure mode**: If the GitHub API call to create an issue fails, the sub-change can be deferred by filing the issue manually and updating the `TODO(#NNN)` reference before the PR merges. If the location cannot be found, FR-015 + User Story 5 acceptance scenario 2 require the disposition to be recorded in the PR description — silent omission is a contract violation. If a literal `TODO(#NNN)` string reaches the remote, the pre-push guard has been bypassed and the PR MUST be rewritten (not patched) to replace the placeholder before review.

---

---

## Contract 6 — Loader `plotName` regression test (FR-021)

**Input**: `apps/loader/` package has an existing vitest setup (`apps/loader/vitest.config.ts`, include pattern `tests/unit/**/*.test.{ts,tsx}`). No test currently exists for `useLoadWorkflow`.

**Output**: New file `apps/loader/tests/unit/useLoadWorkflow.test.ts` containing at minimum one test case asserting that the existing-plot branch of `executeLoad` returns the plot's display name in the `plotName` field of the `LoadResult` (not the plot's id).

**Required test behaviour** (see `data-model.md` Entity 5 for the schematic shape):

- Mock a plot list where at least one plot's `name` field differs from its `id` field.
- Mock the IPC surface consumed by `executeLoad` (`parseFile`, `addFeatures`, `copyAsset`, `markOperationPending`, `clearOperationPending`) so the test is deterministic and offline.
- Invoke `executeLoad` with `mode: 'existing'`, the target `existingPlotId`, and the mocked plot list.
- Assert `output.plotName === '<display name>'` AND `output.plotName !== '<existingPlotId>'`.

**Invariants**:

- `pnpm --filter @debrief/loader test` runs the test and it passes on the feature branch.
- The test fails (red) when temporarily reverting the `plotName` line in `useLoadWorkflow.ts` back to `plotName = existingPlotId` — this verifies the test actually gates the behaviour it claims to.
- Test is deterministic — no real filesystem, no real IPC, no network.

**Failure mode**: A test that passes both before and after the placeholder-vs-real-name change is a **false gate** and violates FR-021. The "revert and watch it fail" check above is the canonical way to catch this.

---

## Cross-cutting invariants

These apply to the whole bundle, not any single sub-change:

- **CI**: `task verify` (lint + typecheck + unit tests + Playwright E2E) passes on the feature branch with no new failures, warnings, or regressions (SC-007).
- **Scope**: No Python file is modified. No generated schema file is modified. No public TypeScript API outside the `LogPanel` prop rename is modified. (FR-018.)
- **Independence**: No file modified in this PR is also modified by any concurrent `#200`–`#206`, `E11`, or `E12` branch at the time of merge. If a conflict surfaces, rebase rather than co-ordinate — the bundle is explicitly designed to be independent.
- **Reviewability**: The final diff remains within the "TypeScript + doc + config edits" envelope — any drift beyond that (e.g., touching a Python file) requires a scope review before merge.
