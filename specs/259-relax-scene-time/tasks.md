# Tasks: Relax Scene Timestamp Uniqueness

**Feature**: 259-relax-scene-time
**Branch**: `claude/relax-scene-time-constraint-hgcQs`
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contracts**: [contracts/storyboard-crud.md](./contracts/storyboard-crud.md)

## Evidence Requirements

**Evidence Directory**: `specs/259-relax-scene-time/evidence/`
**Media Directory**: `specs/259-relax-scene-time/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| evidence/test-summary.md | Vitest + pytest results across schema, components, web-shell Playwright | After Phase 6 (tests green) |
| evidence/usage-example.md | TypeScript code walk-through: create three Scenes at one timestamp, reorder, delete, observe ordering | After Phase 4 (CRUD complete) |
| evidence/round-trip-evidence.md | Pydantic → JSON Schema → TypeScript round-trip proof for the new `creation_order` slot | After Phase 1 (schema regenerated) |
| evidence/screenshots/tied-timestamps.png | Storyboard panel showing three Scenes captured at the same timestamp in capture order | After Phase 6 (Playwright workflow) |
| evidence/screenshots/missing-creation-order-error.png | The explicit load error surfaced when a pre-#259 plot is opened | After Phase 5 (validator wired in) |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| evidence/opening-context.md | Cached opener (Hook, What We're Building, How It Fits, Key Decisions) | ✅ Already cached during `/speckit.plan` |
| media/shipped-post.md | Feature post combining cached opener + delivery evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with all evidence | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` with shipped-post.md | Triggered by `/speckit.pr` |

---

## Phase 1: Schema (LinkML source of truth + regeneration)

**Goal**: Make the data model the single source of truth for the change. After this phase, generated Python and TypeScript types carry the new `creation_order` slot and the loosened `timestamp` constraint. Nothing else is wired up yet — runtime code still compiles but does not reference the new field.

**Independent test**: `pnpm -r typecheck && uv run pyright` is green; generated `SceneProperties` in both Python and TypeScript exposes `creation_order: int / number` as a required field.

- [x] T001 Drop the "MUST be unique within a Storyboard" wording from `SceneProperties.timestamp` description `shared/schemas/src/linkml/storyboard.yaml`
- [x] T002 Add new `creation_order` slot to `SceneProperties` (range `integer`, required, `minimum_value: 0`, description explains it as the secondary sort key, per-Storyboard scope, monotonic at capture) `shared/schemas/src/linkml/storyboard.yaml`
- [x] T003 Bump `StoryboardProperties.schema_version` `minimum_value` from `1` to `2`; update the slot description to record the v1 → v2 transition (no backfill; pre-v2 plots are rejected) `shared/schemas/src/linkml/storyboard.yaml`
- [x] T004 Update the comment block at the top of the schema file referencing #259 and the change of invariants (FC-I3 removed; FC-I4, FC-I5, FC-V1 added per `data-model.md`) `shared/schemas/src/linkml/storyboard.yaml`
- [x] T005 Regenerate Pydantic models from LinkML `shared/schemas/src/generated/python/debrief_schemas/storyboard.py`
- [x] T006 [P] Regenerate TypeScript types from LinkML `shared/schemas/src/generated/typescript/types.ts`
- [x] T007 [P] Regenerate JSON Schema from LinkML `shared/schemas/src/generated/json-schema/storyboard.schema.json`
- [x] T008 [test] Re-run schema adherence tests; confirm `creation_order` round-trips Python ↔ JSON ↔ TypeScript ↔ JSON ↔ Python identity-preserved `shared/schemas/tests/test_storyboard_roundtrip.py`
- [x] T009 [P] Capture round-trip evidence (paste passing pytest output + a hand-walked example) `specs/259-relax-scene-time/evidence/round-trip-evidence.md`

## Phase 2: Fixtures

**Goal**: Update the canonical fixture set so every later phase can drive its tests off real, schema-validating files. This phase is independent of source-code changes and can be done in parallel with Phase 3.

**Independent test**: All valid fixtures pass `pytest shared/schemas/tests/test_fixtures.py::test_valid_fixtures`; all invalid fixtures correctly fail schema validation with the expected error code.

- [x] T010 [P] Delete the now-obsolete invalid fixture `shared/schemas/src/fixtures/invalid/storyboard-scene-duplicate-timestamp.json`
- [x] T011 [P] Add valid fixture: three Scenes in one Storyboard sharing a timestamp; `creation_order = 0, 1, 2`; `schema_version = 2` `shared/schemas/src/fixtures/valid/storyboard-tied-timestamps.json`
- [x] T012 [P] Add valid fixture: five Scenes across two timestamps (A@T0, B@T0, C@T1, D@T1, E@T2) in capture order; `creation_order = 0..4`; `schema_version = 2` `shared/schemas/src/fixtures/valid/storyboard-mixed-tied.json`
- [x] T013 [P] Add invalid fixture: two Scenes share `creation_order = 0` in the same Storyboard (triggers FC-I4 / `DuplicateCreationOrderError`) `shared/schemas/src/fixtures/invalid/storyboard-scene-duplicate-creation-order.json`
- [x] T014 [P] Add invalid fixture: pre-#259 shape — Scenes lack `creation_order`; `schema_version = 1` (triggers FC-V1 first, then FC-I5 / `MissingCreationOrderError`) `shared/schemas/src/fixtures/invalid/storyboard-scene-missing-creation-order.json`
- [x] T015 [test] Update the fixture-adherence test inventory to reference the new file names (delete the duplicate-timestamp entry; add three new entries) `shared/schemas/tests/test_fixtures.py`
- [x] T016 [P] Update the #215 usage example that deliberately inserts Scenes out-of-timestamp-order — keep the demonstration, add `creation_order` to each Scene so the example still validates `specs/215-storyboarding-schema/evidence/usage-example.ts`

## Phase 3: Errors module + index exports

**Goal**: Land the four new error classes and refresh the public surface of `@debrief/components`'s storyboard module before any caller starts throwing them. Keeps the next phases each a single concern.

**Independent test**: `import { DuplicateCreationOrderError, CreationOrderOutOfRangeError, MissingCreationOrderError, UnsupportedSchemaVersionError } from '@debrief/components'` resolves and the classes are constructible with their documented `details` payload; `DuplicateTimestampError` is no longer importable.

- [x] T017 Delete `DuplicateTimestampError` class and its code constant `shared/components/src/storyboard/errors.ts`
- [x] T018 Add `DuplicateCreationOrderError` (code `STORYBOARD_DUPLICATE_CREATION_ORDER`; details: `{ storyboardId, creationOrder, conflictingSceneIds: [string, string] }`) `shared/components/src/storyboard/errors.ts`
- [x] T019 Add `CreationOrderOutOfRangeError` (code `STORYBOARD_CREATION_ORDER_OUT_OF_RANGE`; details: `{ storyboardId, sceneId, providedIndex, tiedGroupSize }`) `shared/components/src/storyboard/errors.ts`
- [x] T020 Add `MissingCreationOrderError` (code `STORYBOARD_MISSING_CREATION_ORDER`; details: `{ storyboardId, sceneId }`) `shared/components/src/storyboard/errors.ts`
- [x] T021 Add `UnsupportedSchemaVersionError` (code `STORYBOARD_UNSUPPORTED_SCHEMA_VERSION`; details: `{ storyboardId, foundVersion: number, requiredMinimum: 2 }`) `shared/components/src/storyboard/errors.ts`
- [x] T022 Update the public-exports list: drop `DuplicateTimestampError`; add the four new classes `shared/components/src/storyboard/index.ts`
- [x] T023 [P][test] Add unit tests covering each new error's `code`, `message`, and `details` shape `shared/components/src/storyboard/__tests__/errors.test.ts`

## Phase 4: User Story 1 — Capture multiple viewports at the same instant (P1)

**Goal**: Delete every `DuplicateTimestampError` throw-site in `crud.ts` and replace it with a `creation_order` assignment. Three captures at the same timestamp succeed and appear in capture order. Maps to spec FR-001, FR-004, FR-005, FR-011.

**Independent test**: `pnpm --filter @debrief/components test crud.test.ts -t "tied timestamps"` — three sequential `createScene` calls at the same timestamp succeed; the returned plot, when fed to `listScenesOrdered`, yields the three Scenes in capture order with strictly-monotonic `creation_order`. (Story is testable as soon as `listScenesOrdered` is updated in Phase 5; the inversion of `crud.test.ts` itself lands here.)

### Tests (write first — Article VII)

- [x] T024 [P][test] **AT-001** (FR-001): `createScene` succeeds when a Scene already exists at the same timestamp; returned Storyboard contains both Scenes; new Scene last in the tied group `shared/components/src/storyboard/__tests__/crud.test.ts`
- [x] T025 [P][test] **AT-004** (FR-004, FR-011): three sequential `createScene` calls at the same timestamp produce strictly-monotonic `creation_order` values; new Scene always appended to tied group `shared/components/src/storyboard/__tests__/crud.test.ts`
- [x] T026 [P][test] **AT-005** (FR-005): after `createScene`, returned Scene's `creation_order` is present, an integer, ≥ 0, on `properties.creation_order` (not a sidecar) `shared/components/src/storyboard/__tests__/crud.test.ts`
- [x] T027 [P][test] **AT-002** (FR-002): preserved-behaviour test — `createScene` at an *earlier* timestamp than the latest still behaves as today (whatever today does) `shared/components/src/storyboard/__tests__/crud.test.ts`

### Implementation

- [x] T028 Add private helper `nextCreationOrder(plot, storyboardId)` near the top of the CRUD module (max over existing Scenes' `creation_order` + 1; returns 0 for empty Storyboards) `shared/components/src/storyboard/crud.ts`
- [x] T029 Delete `findConflictingSceneTimestamp` and all five call-sites; remove the `DuplicateTimestampError` throws in: `createScene`, `updateScene`, `duplicateScene`, `copySceneToOtherStoryboard`, `restoreScene` `shared/components/src/storyboard/crud.ts`
- [x] T030 In `createScene`: assign `creation_order = nextCreationOrder(plot, storyboardId)` on the new SceneProperties before write `shared/components/src/storyboard/crud.ts`
- [x] T031 In `updateScene`: preserve the existing Scene's `creation_order` on update (do not touch unless an explicit reorder is requested — that lives in Phase 6) `shared/components/src/storyboard/crud.ts`
- [x] T032 In `duplicateScene`: assign a *new* `creation_order` to the duplicate via `nextCreationOrder` (do not copy the source's value — would violate FC-I4 within the same Storyboard) `shared/components/src/storyboard/crud.ts`
- [x] T033 In `copySceneToOtherStoryboard`: assign `creation_order = nextCreationOrder(plot, destinationStoryboardId)` (target Storyboard scope, not source) `shared/components/src/storyboard/crud.ts`
- [x] T034 In `restoreScene`: assign `creation_order = nextCreationOrder(plot, storyboardId)` (restored Scene is treated as a new append; original creation_order is not honoured to avoid mid-sequence collision with Scenes captured after the original deletion) `shared/components/src/storyboard/crud.ts`

## Phase 5: User Story 2 — Mixed timestamps remain time-ordered + legacy hard-fail (P1)

**Goal**: Extend the canonical sort to `(timestamp, creation_order)`; wire the two VS Code call-sites onto it; install the validator gates (FC-I4, FC-I5, FC-V1) so legacy plots fail loudly on load. Maps to spec FR-003, FR-006, FR-010.

**Independent test**: `pnpm --filter @debrief/components test ordering.test.ts validate.test.ts` — `listScenesOrdered` is deterministic across permutations; loading the missing-creation-order fixture throws `MissingCreationOrderError`; loading a `schema_version: 1` plot throws `UnsupportedSchemaVersionError`.

### Tests (write first)

- [x] T035 [P][test] **AT-003** (FR-003): `listScenesOrdered` returns Scenes ordered by `(timestamp, creation_order)` — two Scenes at same timestamp with `creation_order` 5 then 6 come back in that order `shared/components/src/storyboard/__tests__/ordering.test.ts`
- [x] T036 [P][test] **AT-006** (FR-006): `listScenesOrdered` produces identical output for two arbitrary permutations of the same Scene set (sort is deterministic) `shared/components/src/storyboard/__tests__/ordering.test.ts`
- [x] T037 [P][test] Mixed-tied scenario (Story 2 acceptance scenario 2): Scenes A@T0, B@T0, C@T1, D@T1, E@T2 in capture order; assert `listScenesOrdered` returns exactly A, B, C, D, E `shared/components/src/storyboard/__tests__/ordering.test.ts`
- [x] T038 [P][test] **AT-010** (FR-010): loading `storyboard-scene-missing-creation-order.json` fixture throws `MissingCreationOrderError`; error payload names the offending Storyboard ID and Scene ID `shared/components/src/storyboard/__tests__/validate.test.ts`
- [x] T039 [P][test] **AT-013** (FC-I4): loading `storyboard-scene-duplicate-creation-order.json` throws `DuplicateCreationOrderError` `shared/components/src/storyboard/__tests__/validate.test.ts`
- [x] T040 [P][test] **AT-015** (R-007 / FC-V1): a plot with `schema_version = 1` throws `UnsupportedSchemaVersionError` *before* the FC-I5 check has a chance to fire (ordering of validator passes) `shared/components/src/storyboard/__tests__/validate.test.ts`

### Implementation

- [x] T041 Extend the sort comparator from `(a.timestamp).localeCompare(b.timestamp)` to a tuple compare with `creation_order` as the secondary key; update the SC-I1 comment block at the top of the file to match the revised wording in `data-model.md` `shared/components/src/storyboard/ordering.ts`
- [x] T042 Drop the FC-I3 (duplicate-timestamp) check from the plot validator `shared/components/src/storyboard/validate.ts`
- [x] T043 Add FC-V1 entry check: for each Storyboard, assert `properties.schema_version >= 2`; throw `UnsupportedSchemaVersionError` on failure. Place this gate *first* so it fires before FC-I5 on pre-#259 plots `shared/components/src/storyboard/validate.ts`
- [x] T044 Add FC-I5 check: for every Scene, assert `typeof properties.creation_order === 'number'`; throw `MissingCreationOrderError(storyboardId, sceneId)` on the first offender `shared/components/src/storyboard/validate.ts`
- [x] T045 Add FC-I4 check: Map-based uniqueness on the key `${storyboard_id}|${creation_order}`; throw `DuplicateCreationOrderError` with both conflicting Scene IDs `shared/components/src/storyboard/validate.ts`
- [x] T046 Replace the inline `.sort((a, b) => a.timestamp.localeCompare(b.timestamp))` (~line 465) with a call to `listScenesOrdered(plot, storyboardId)` `apps/vscode/src/views/storyboardPanelView.ts`
- [x] T047 Replace the inline `.sort((a, b) => ...)` (~line 798) with a call to `listScenesOrdered(plot, storyboardId)` `apps/vscode/src/services/storyboardPlayback.ts`

## Phase 6: User Story 3 — Reorder, delete, edit within a tied group (P2)

**Goal**: Add the `reorderSceneInTiedGroup` operation; confirm delete and update operations do not perturb tied-group ordering. Maps to spec FR-007, FR-008, FR-009.

**Independent test**: `pnpm --filter @debrief/components test reorder.test.ts` — moving B to the end of `[A, B, C]` yields `[A, C, B]`; deleting B yields `[A, C]` with a creation_order gap; updating B's viewport leaves position unchanged; out-of-range index throws.

### Tests (write first)

- [x] T048 [P][test] **AT-007** (FR-007): `reorderSceneInTiedGroup(B, newPositionInGroup=2)` on tied group `[A (co=5), B (co=6), C (co=7)]` yields ordering `[A, C, B]` with re-sequenced `creation_order` `5, 6, 7` `shared/components/src/storyboard/__tests__/reorder.test.ts`
- [x] T049 [P][test] Reorder variant — move last to first: `reorderSceneInTiedGroup(C, newPositionInGroup=0)` on `[A, B, C]` yields `[C, A, B]` `shared/components/src/storyboard/__tests__/reorder.test.ts`
- [x] T050 [P][test] Reorder preserves Scenes outside the tied group: a tied group of three sits between two non-tied Scenes; reordering inside the group leaves the non-tied Scenes' `creation_order` untouched `shared/components/src/storyboard/__tests__/reorder.test.ts`
- [x] T051 [P][test] **AT-008** (FR-008): `deleteScene(B)` on tied group `[A (co=5), B (co=6), C (co=7)]` yields `[A, C]` with `creation_order` `5, 7` (gap allowed, no renumber) `shared/components/src/storyboard/__tests__/reorder.test.ts`
- [x] T052 [P][test] **AT-009** (FR-009): `updateScene(B, { viewport: newViewport })` leaves B's `creation_order` and position unchanged `shared/components/src/storyboard/__tests__/reorder.test.ts`
- [x] T053 [P][test] **AT-014** (defensive): `reorderSceneInTiedGroup(A, newPositionInGroup=99)` on a 3-Scene tied group throws `CreationOrderOutOfRangeError` with `providedIndex: 99` and `tiedGroupSize: 3` in the error details `shared/components/src/storyboard/__tests__/reorder.test.ts`
- [x] T054 [P][test] Reorder of a Scene whose timestamp is unique (tied group size 1): `newPositionInGroup=0` is a no-op; any other index throws `CreationOrderOutOfRangeError` `shared/components/src/storyboard/__tests__/reorder.test.ts`

### Implementation

- [x] T055 Add new exported function `reorderSceneInTiedGroup(plot, { sceneId, newPositionInGroup }): { plot }` per the contract in `contracts/storyboard-crud.md` (locate target → compute tied group → bounds-check → re-sequence using `group_min_creation_order + i`) `shared/components/src/storyboard/crud.ts`
- [x] T056 Export `reorderSceneInTiedGroup` from the module index `shared/components/src/storyboard/index.ts`

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: End-to-end Playwright workflow proves the change in a real browser; evidence is collected; the feature blog post is written; the PR ships.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit the Playwright E2E task. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

### E2E workflow (web-shell)

- [x] T057 [test] New Playwright workflow: open sample plot → freeze time controller → capture Scene → pan viewport → capture Scene → pan again → capture Scene → assert three rows present in the StoryboardPanel in capture order → write screenshot directly into `specs/259-relax-scene-time/evidence/screenshots/tied-timestamps.png` `apps/web-shell/playwright/tests/storyboard-tied-timestamps.spec.ts`
- [x] T058 [P] Add `StoryboardPanelPage` helper (or extend the existing analysis page object) with a `getSceneRows()` enumeration method `apps/web-shell/playwright/pages/storyboardPanelPage.ts`
- [x] T059 [test] Second Playwright workflow: attempt to load a fixture plot with `schema_version: 1` → assert the explicit load error dialogue surfaces with the `MissingCreationOrderError` / `UnsupportedSchemaVersionError` text → screenshot into `specs/259-relax-scene-time/evidence/screenshots/missing-creation-order-error.png` `apps/web-shell/playwright/tests/storyboard-legacy-rejection.spec.ts`

### Full verification gate

- [x] T060 Run `task verify` from the repo root; confirm lint + typecheck + unit + Playwright all pass; resolve anything red before evidence capture

### Evidence Collection

- [x] T061 Capture test results using the template at `.specify/templates/evidence/test-summary-template.md` (YAML front matter with `feature: 259-relax-scene-time`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`; body summarises scenarios verified) `specs/259-relax-scene-time/evidence/test-summary.md`
- [x] T062 Write usage demonstration: short TypeScript walk-through showing `createScene` × 3 at one timestamp, `listScenesOrdered`, `reorderSceneInTiedGroup`, `deleteScene` with expected before/after states inline `specs/259-relax-scene-time/evidence/usage-example.md`
- [x] T063 [P] Confirm round-trip evidence file from Phase 1 (T009) is still accurate post-implementation; touch if needed `specs/259-relax-scene-time/evidence/round-trip-evidence.md`

### Media Content

- [x] T064 Spawn the Content Specialist (`.claude/agents/media/content.md`) to write the Feature Post: title prefixed with `Building `, first three sections copied verbatim from `evidence/opening-context.md` (already cached), remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from the evidence collected in T061–T063 and the Playwright screenshots from T057, T059 `specs/259-relax-scene-time/media/shipped-post.md`

### PR Creation

- [ ] T065 Create PR and publish blog: run `/speckit.pr`

**Task T065 must run last. It depends on all evidence and media tasks (T057–T064) being complete.**

## Dependencies

**Phase ordering** (strict — each phase depends on the prior unless noted):

- **Phase 1 (Schema)** — gates everything. Generated types must exist before any TypeScript code references `creation_order`.
- **Phase 2 (Fixtures)** — can run in parallel with Phase 3; both are independent of each other but both depend on Phase 1 (fixtures must satisfy the regenerated JSON Schema; errors module imports nothing from fixtures).
- **Phase 3 (Errors)** — gates Phase 4 + Phase 5 (those phases throw the new error classes).
- **Phase 4 (Story 1 — capture at same timestamp)** — independent of Phase 5 *for the CRUD changes*, but the `ordering.test.ts` cases assume the Phase 5 ordering update. The story-1 acceptance test (`listScenesOrdered` returns three Scenes in capture order) is genuinely runnable only after Phase 5 lands. Either complete Phase 5 first or develop Phases 4 and 5 in lockstep on one branch and assert them together at the end. Recommended: Phase 4 → Phase 5 → run both test files together.
- **Phase 5 (Story 2 — ordering + legacy hard-fail)** — depends on Phase 3 (error classes), Phase 4 (CRUD assignment), and Phase 2 (legacy fixture).
- **Phase 6 (Story 3 — reorder)** — depends on Phase 4 (the `nextCreationOrder` helper and the post-#259 SceneProperties shape).
- **Phase 7 (Polish)** — depends on Phases 1–6. The Playwright tasks need the full pipeline live; the blog post needs the evidence files first; the PR task runs last.

**Story-completion order**: Story 1 (Phase 4) → Story 2 (Phase 5) → Story 3 (Phase 6). Stories 1 and 2 are both P1; Story 1 is sequenced first because it removes the constraint, and Story 2 is the regression guard against the removal.

**Parallel opportunities within each phase** (tasks marked `[P]`):

- Phase 1: T006, T007 parallel after T005; T009 parallel with T008's pass.
- Phase 2: T010–T014 all parallel; T016 parallel with the others.
- Phase 3: T023 parallel with T017–T022 (test file is new, separate from implementation file).
- Phase 4: T024–T027 all parallel (different test cases in same file but distinct `describe` blocks — author them in parallel branches or in one pass).
- Phase 5: T035–T040 all parallel (test files independent); T046 + T047 parallel (independent files).
- Phase 6: T048–T054 all parallel (single new test file, distinct cases).
- Phase 7: T058 parallel with T057; T061–T063 parallel with each other.

## Implementation Strategy

**Incremental delivery in three commits** (per `quickstart.md` §13):

1. **Schema commit** (Phases 1 + 2): `259: schema — drop timestamp uniqueness, add creation_order to SceneProperties`. Includes storyboard.yaml edits, regenerated Python + TS + JSON Schema, and the full fixture refresh. `task verify` runs schema adherence tests only at this point; full TypeScript build will fail until the next commit — that's expected, and the schema commit can stand alone on a feature sub-branch if the implementer wants the breakdown for review.

   *Alternative if a single passing commit is preferred*: bundle this with the next commit, accepting a larger diff.

2. **CRUD + errors commit** (Phases 3 + 4 + 5 + 6 implementation tasks): `259: crud — remove DuplicateTimestamp throws, add creation_order + reorder op + legacy hard-fail`. All source-code changes in `shared/components/src/storyboard/` plus the two VS Code call-site updates. Tests are *also* updated here in lockstep with the source so each commit passes `task verify` independently (Article XIII atomic-commit guidance — tests and implementation move together when one would invalidate the other).

3. **Evidence + media + PR commit** (Phase 7): `259: tests + evidence + post — Playwright workflow + shipped-post`. The Playwright workflow tests, the test-summary, usage-example, screenshots, and shipped-post.md. The PR task (T065) is invoked from within this commit's chat session, not committed itself.

**Tests-first discipline** (Article VII): each phase's Tests section lists the AT-### IDs from `contracts/storyboard-crud.md`. Write those first against the still-throwing CRUD; watch them fail with the *expected* `DuplicateTimestampError` (or, for Phase 5/6, with "not implemented"); then land the implementation and watch them go green. Do not skip the failing-test step — it is what verifies the test actually exercises the new behaviour.

**MVP boundary**: Story 1 (Phase 4) alone is *not* a useful release — its acceptance test depends on Story 2's ordering work. The first publishable increment is Phase 4 + Phase 5 together (Stories 1 and 2 both P1). Story 3 (Phase 6) is a P2 add-on that can land in the same PR; it is small enough not to warrant a separate cut.

**Rollback strategy**: each commit is a clean revert. The schema commit is the only one that changes the on-disk format; reverting it is safe because no production data carries the new field yet (Article XIV — pre-release; user data does not exist).
