# Feature Specification: Code-Quality Cleanup — Small-Bucket Consolidation

**Feature Branch**: `199-code-quality-cleanup`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "199 in BACKLOG.md"

## Context

Item #199 in `BACKLOG.md` bundles five low-risk follow-ups surfaced by the code-quality review pass on PR #465 (April 2026). Each change is individually too small to justify its own spec/PR, but they share the same profile: pure TypeScript/doc edits, no schema work, no cross-package API changes, and independent of every other PR #465 follow-up (#200–#206, E11, E12). Shipping them as a single bundled PR keeps reviewer overhead low while still capturing the cleanup.

Source idea: `docs/ideas/199-code-quality-small-bucket.md`.

## User Scenarios & Testing *(mandatory)*

The "users" of this feature are **contributors and reviewers** working in the Debrief monorepo. The value delivered is a cleaner codebase, clearer architectural record, and fewer noisy signals in code-quality tooling.

### User Story 1 — Accurate code-quality tooling signals (Priority: P1)

A reviewer runs `pnpm dlx knip` during PR review to check for unused code. Today the report is cluttered with false-positive entries for speckit contract files under `specs/**`. The reviewer cannot tell at a glance whether real unused code exists.

**Why this priority**: knip is a gating signal reviewers rely on; false-positives erode trust in the tool and increase cognitive load on every PR. Removing the noise has the highest ongoing leverage of the five cleanups.

**Independent Test**: Run knip on a clean checkout before and after the change. Confirm `specs/**` entries disappear from the report while genuine unused-code findings (if any) remain visible.

**Acceptance Scenarios**:

1. **Given** the repo on the feature branch, **When** a contributor runs knip, **Then** no files under `specs/**` are reported as unused.
2. **Given** the repo on the feature branch, **When** a contributor introduces a genuinely unused module outside `specs/**`, **Then** knip still flags it.

---

### User Story 2 — Single source of truth for LogPanel prop shape (Priority: P1)

A contributor adding a new field to the LogPanel UI needs to know which `Props` interface to update. Today there are two near-identical interfaces (`LogTimelineProps` and `LogByFeatureProps`) that consume the same shape; it is easy to update one and forget the other, leading to subtle drift.

**Why this priority**: the duplication is an active footgun for ongoing LogPanel work and the merge is mechanical, with no behaviour change expected.

**Independent Test**: TypeScript compile succeeds after replacing both call sites with a single `LogPanelProps`; both `LogTimeline` and `LogByFeature` components continue to render unchanged in their Storybook stories and Vitest tests.

**Acceptance Scenarios**:

1. **Given** the `shared/components/src/LogPanel/types.ts` module, **When** a contributor imports the panel's prop type, **Then** exactly one exported name (`LogPanelProps`) is available.
2. **Given** existing LogPanel Storybook stories and unit tests, **When** the change lands, **Then** all stories render and all tests pass without modification beyond the type rename.

---

### User Story 3 — Architectural record captures accepted cycles (Priority: P2)

A new contributor opens `docs/project_notes/decisions.md` to understand why the VS Code extension has `import type` cycles between `mapPanel`, `activityPanelView`, `calcService`, and `resultsPanelService`. Today the cycles are undocumented; the contributor cannot tell whether they are a latent bug or an accepted trade-off.

**Why this priority**: the cycles are benign (type-only, erased at runtime) but un-documented trade-offs tend to be "fixed" by well-meaning refactors that waste effort. One ADR-style entry prevents that.

**Independent Test**: a reader unfamiliar with PR #465 can, using only `decisions.md`, answer three questions: which cycles exist, why they are accepted, and what the eventual fix looks like.

**Acceptance Scenarios**:

1. **Given** `docs/project_notes/decisions.md`, **When** the feature ships, **Then** it contains an entry listing the two cycles (`mapPanel → activityPanelView → calcService`, `activityPanelView → resultsPanelService`), noting they are `import type` only and erased at runtime, and naming interface extraction as the eventual fix.
2. **Given** the new entry, **When** a reviewer searches for "cycle" in `decisions.md`, **Then** the entry is discoverable.

---

### User Story 4 — Real plot name surfaced in loader workflow (Priority: P2)

A user loading a REP file into an existing plot via the Electron loader sees the target plot referenced in UI strings and telemetry. Today the loader workflow emits the plot's **ID** where its **display name** is expected, because a placeholder (`plotName = existingPlotId; // TODO: …`) was never resolved.

**Why this priority**: user-visible string quality; low effort; fixing it removes a latent TODO marker from a user-facing code path.

**Independent Test**: load a file into an existing plot whose display name differs from its ID; confirm the loader surfaces the display name (not the ID) everywhere `plotName` is consumed.

**Acceptance Scenarios**:

1. **Given** an existing plot with a display name distinct from its ID, **When** a user selects it as the load target in the Electron loader, **Then** the subsequent workflow steps reference the plot by its display name.
2. **Given** the fix, **When** a contributor greps `apps/loader/src/renderer/hooks/useLoadWorkflow.ts` for `TODO`, **Then** the `plotName` placeholder TODO is gone.

---

### User Story 5 — Remaining in-source TODOs become tracked issues (Priority: P2)

A contributor triaging technical debt wants a single list of tracked work rather than TODO comments scattered through the code. Today there are three surviving TODOs (in `apps/loader/src/main/ipc/config.ts`, a `StoreSelector` module, and `apps/vscode/src/services/stacService.ts`) that have no GitHub issue. They cannot be prioritised alongside the rest of the backlog.

**Why this priority**: enables backlog governance; the in-source TODO becomes a one-line reference to an issue that carries the full context.

**Independent Test**: grep the repo for `TODO` outside `specs/**` and `node_modules`; every remaining `TODO` either (a) points to a GitHub issue URL/number or (b) was intentionally left by another feature branch out of scope for this spec.

**Acceptance Scenarios**:

1. **Given** each of the three surviving TODOs listed in the source idea, **When** the feature ships, **Then** a GitHub issue exists for each with a remediation hint in the body, and the in-source TODO is replaced with a reference to that issue (e.g. `TODO(#NNN): …`).
2. **Given** the `StoreSelector` TODO reference in the idea cannot be located (the module has moved or been removed), **When** the feature ships, **Then** the spec records the disposition (issue filed against the new location, or explicitly descoped with a note) rather than silently skipping it.

---

### User Story 6 — Staging artefact removed from shared components (Priority: P3)

A contributor exploring `shared/components/` encounters a `diff/` sub-package with no entry in `pnpm-workspace.yaml` and no consumers anywhere in the monorepo. They lose time trying to understand whether they should be using it.

**Why this priority**: lowest ongoing impact of the five items (most contributors never encounter it), but essentially free to delete and restorable from git history if the integration work ever resumes.

**Independent Test**: after deletion, a full `pnpm install` + CI pipeline passes; no import anywhere resolves to the removed path.

**Acceptance Scenarios**:

1. **Given** the repo on the feature branch, **When** a contributor runs `pnpm install` and the full CI verify sequence, **Then** all steps pass and no errors reference `shared/components/diff/`.
2. **Given** the commit removing the directory, **When** a future contributor wants to recover it, **Then** the deletion commit is discoverable via `git log -- shared/components/diff/`.

---

### Edge Cases

- **TODO target moved or missing**: the idea references `StoreSelector/index.tsx:4`, but that exact path does not currently exist in the working tree. The feature MUST either (a) locate the moved/renamed equivalent and file an issue against the new location, or (b) record in the PR description that this TODO was descoped because the target no longer exists. It MUST NOT silently drop the item.
- **knip ignore-rule too broad**: adding `specs/**` to the ignore list must not mask genuinely unused code that happens to live adjacent to `specs/**`. Verification requires a before/after comparison of knip's full report.
- **LogPanel consumers outside the monorepo**: if any consumer outside this repo imports `LogTimelineProps` or `LogByFeatureProps` by name, renaming to `LogPanelProps` is a breaking change. Current assumption: these types are internal-only; verification is grep across the monorepo plus a scan of any published package consumers.
- **Deleted `diff/` sub-package has hidden import path**: some tooling (knip, tsconfig paths, build scripts) may still reference `shared/components/diff/` even if no runtime code does. Removal must include a sweep of config files.
- **decisions.md entry format drift**: the file has an established entry format; the new entry MUST follow it rather than introduce a new heading style.

## Requirements *(mandatory)*

### Functional Requirements

**Documentation (P2)**

- **FR-001**: The feature MUST add a single entry to `docs/project_notes/decisions.md` recording the two accepted VS Code extension type-only cycles (`mapPanel → activityPanelView → calcService` and `activityPanelView → resultsPanelService`).
- **FR-002**: The entry MUST state explicitly that both cycles consist solely of `import type` declarations, are erased at runtime, and are therefore accepted rather than refactored.
- **FR-003**: The entry MUST name interface extraction as the eventual fix so a future reader knows the intended direction without re-deriving it.

**Type consolidation (P1)**

- **FR-004**: The exports of `shared/components/src/LogPanel/types.ts` MUST provide a single `LogPanelProps` interface used by both `LogTimeline` and `LogByFeature` components.
- **FR-005**: `LogTimelineProps` and `LogByFeatureProps` MUST be removed from the public exports of that module after the merge.
- **FR-006**: All in-repo consumers of the old prop type names MUST be updated to the consolidated name in the same PR.

**Removal of staging artefact (P3)**

- **FR-007**: The `shared/components/diff/` directory MUST be deleted from the working tree.
- **FR-008**: Any configuration entry referencing the deleted directory (tsconfig paths, workspace files, build scripts, knip config, etc.) MUST be removed or updated so no stale reference remains.

**knip ignore configuration (P1)**

- **FR-009**: knip's configuration MUST be updated so files under `specs/**` are excluded from unused-file reports.
- **FR-010**: The change MUST use knip's narrowest supported mechanism for this exclusion (e.g. a scoped ignore entry rather than a blanket project-wide exclusion) so unrelated unused-code detection remains intact.

**Loader plot-name fix (P2)**

- **FR-011**: `apps/loader/src/renderer/hooks/useLoadWorkflow.ts` MUST resolve `plotName` for the existing-plot branch to the plot's actual display name (not its ID).
- **FR-012**: The placeholder TODO on the affected line MUST be removed as part of the same change.

**TODO-to-issue promotion (P2)**

- **FR-013**: The feature MUST create a GitHub issue for each of the three surviving TODOs (or their current equivalents):
  - `apps/loader/src/main/ipc/config.ts:158` ("Manage Stores tab"),
  - the `StoreSelector` TODO referenced in the source idea (or its current equivalent — see FR-015),
  - `apps/vscode/src/services/stacService.ts` near the `TODO(#137)` marker.
- **FR-014**: Each in-source TODO MUST be replaced with a reference to its tracking issue (e.g. `TODO(#NNN): <short summary>`), keeping the short summary so the reader does not need to open the issue to understand intent.
- **FR-015**: If the `StoreSelector` reference in the source idea cannot be located because the module has moved or been removed, the PR description MUST record the disposition (issue filed against the new location, or explicitly descoped) rather than silently skipping it.

**Reproducibility & guard rails** *(added 2026-04-18 post-review)*

- **FR-019**: The feature MUST pin `knip` as a root `devDependency` in `package.json` alongside the new `knip.json`, so that `pnpm dlx knip` (or a future direct invocation) produces reproducible results over time (Article I.4).
- **FR-020**: Each promoted TODO MUST be replaced with a **real** issue number, never a literal placeholder. A pre-push self-check `grep -rn "TODO(#NNN)" apps/` MUST return zero matches before any commit in this PR is pushed. The implementation tasks list MUST encode "file issue → capture number → replace placeholder" as one atomic task per TODO, making it impossible to ship a literal `NNN` string.
- **FR-021**: The feature MUST add a vitest unit test under `apps/loader/tests/unit/` covering the `useLoadWorkflow.executeLoad` existing-plot branch. The test MUST mock a plot list where at least one plot's `name` differs from its `id`, invoke `executeLoad` with that plot's id, and assert that the returned `plotName` equals the display name (not the id). This test MUST run as part of `pnpm --filter @debrief/loader test` so a future regression is caught by CI (Article I.3 — no silent failures, Article VI — services require unit tests).

**Bundling and independence**

- **FR-016**: All items (FR-001 through FR-015's work plus the post-review FR-019/020/021 guard rails) MUST be delivered in a single PR against the feature branch.
- **FR-017**: The feature MUST NOT introduce any dependency on other PR #465 follow-up items (#200, #201, #202, #206, or the LinkML-layer items #203/#204/#205, E11, E12).
- **FR-018**: The feature MUST NOT modify any generated schema output, public TypeScript API surface outside the LogPanel prop rename, or any Python module.

### Key Entities

- **Decision record entry**: one entry in `docs/project_notes/decisions.md` documenting the accepted type-only cycles. Attributes: affected modules, nature of the cycles, rationale for acceptance, pointer to the eventual fix.
- **Consolidated prop type (`LogPanelProps`)**: the single interface consumed by both LogPanel variants. Attributes: the union of fields previously held by `LogTimelineProps` and `LogByFeatureProps` (expected to be identical pre-merge).
- **Tracked TODO**: a GitHub issue replacing an in-source TODO. Attributes: issue number, short description, remediation hint in issue body, reference back from the source file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the PR merges, `pnpm dlx knip` reports zero files under `specs/**` as unused, while the set of genuine findings outside `specs/**` is unchanged from the pre-change baseline.
- **SC-002**: After the PR merges, `shared/components/src/LogPanel/types.ts` exports exactly one prop interface for the LogPanel components (no `LogTimelineProps` or `LogByFeatureProps` remain in the public exports).
- **SC-003**: After the PR merges, `shared/components/diff/` does not exist anywhere in the working tree, and no configuration file references that path.
- **SC-004**: After the PR merges, grep-for-`TODO` across the repo (excluding `specs/**` and `node_modules`) shows zero un-tracked TODOs among the three listed in the source idea — every remaining TODO carries an issue reference of the form `TODO(#NNN)` or equivalent.
- **SC-005**: After the PR merges, `docs/project_notes/decisions.md` contains exactly one new entry referencing the two VS Code extension type-only cycles, discoverable by searching for the words "cycle" and "type-only" in that file.
- **SC-006**: After the PR merges, a user loading a REP file into an existing plot sees the plot's display name (not its ID) in the loader's workflow UI strings and telemetry.
- **SC-007**: The full CI verify sequence (`task verify` — lint, typecheck, unit tests, Playwright E2E) passes on the feature branch with no new failures, warnings, or regressions introduced by this change.
- **SC-008**: Reviewer time for the resulting PR is bounded: the diff is confined to TypeScript, doc, and configuration edits (no Python, no generated schema files, no cross-package API changes beyond the LogPanel type rename).
- **SC-009**: After the PR merges, `knip` appears as a pinned entry in root `package.json`'s `devDependencies`, and running `pnpm knip` (or equivalent) produces the same report across fresh clones.
- **SC-010**: After the PR merges, a repo-wide grep for `TODO(#NNN)` (literal string) returns zero matches; every `TODO(#...)` in the diff resolves to an existing, open issue in `debrief/debrief-future`.
- **SC-011**: After the PR merges, `pnpm --filter @debrief/loader test` includes a test that fails if the `useLoadWorkflow` existing-plot branch ever regresses to returning the plot id in place of the display name.

## Assumptions

- The two LogPanel prop interfaces are consumed only inside this monorepo; no external published-package consumer imports them by the old names.
- knip's configuration file is the canonical place to add the `specs/**` exclusion (no parallel ignore mechanism needs to be updated).
- The `StoreSelector` TODO referenced in the source idea has a current equivalent somewhere in `shared/components/` or `apps/*/`; if it does not, FR-015 applies.
- GitHub issues filed for the promoted TODOs can be created against the existing `debrief/debrief-future` repository without additional approval.
- The VS Code type-only cycles described in the source idea still exist as described at the time of implementation; if any have already been resolved by another PR, FR-001 applies only to those that remain.

## Out of Scope

- Actually resolving any of the three promoted TODOs (only promotion to issue + in-source reference is in scope).
- Interface extraction to eliminate the VS Code type-only cycles (only documenting them is in scope).
- Any refactor of LogPanel component internals beyond the prop-type rename.
- Any change to knip's treatment of paths outside `specs/**`.
- Any work listed in sibling backlog items #200, #201, #202, #206, #203, #204, #205, E11, or E12.
