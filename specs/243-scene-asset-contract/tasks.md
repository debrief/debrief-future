---
description: "Task list for feature 243 implementation"
---

# Tasks: Per-Scene Asset Key Contract Formalisation

**Input**: Design documents from `/specs/243-scene-asset-contract/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/scene-thumbnail-asset.schema.json, quickstart.md

**Tests**: REQUIRED. The spec mandates schema-adherence tests (golden valid + 3 invalid fixtures), round-trip tests, and Python unit tests for the audit module (FR-011, FR-012, plus US2/US3 acceptance scenarios). Tests are first-class deliverables, not optional.

**Organisation**: Tasks are grouped by user story so each story can land as an independent increment. Story priorities mirror `spec.md`: US1 (self-documenting contract) is the foundation, US2 (validator enforcement) hardens it, US3 (lifecycle/GC) adds the orphan-detection pathway.

---

## Evidence Requirements

> **Purpose**: Capture artefacts that demonstrate the feature works — used in the PR description and the feature blog post.

**Evidence Directory**: `specs/243-scene-asset-contract/evidence/`
**Media Directory**: `specs/243-scene-asset-contract/media/`

**Feature type (per Quality Rubric)**: **Schema Change** → mandatory artefact is `round-trip-evidence.md` (Python ⇄ JSON Schema ⇄ TypeScript ⇄ Python).

### Planned Artefacts

| Artefact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | YAML front matter + pytest results across `shared/schemas/tests/` and `services/stac/tests/`; covers the 4 new fixture tests, the round-trip test, the docstring-flow-through tests, and the audit unit tests | After all tests pass (T044) |
| `evidence/usage-example.md` | Concrete demonstration: hand-craft an Item with a paired scene-thumbnail set, validate against the new overlay, then break it (drop the `-sm`, replace ULID with `foo`) and show the failure messages cite the named rule IDs | After audit module + tests complete (T045) |
| `evidence/round-trip-evidence.md` | Schema-Change rubric requirement: trace `SceneThumbnailAssetEntry` Python instance → JSON dump → TypeScript-validated parse → Python re-parse, equality preserved; covers Constitution Article II.2 | After round-trip test green (T046) |
| `evidence/before-after.md` | Side-by-side: legacy `^scene-thumbnail(-.+)?$` patternProperties + placeholder vs. new named LinkML class + overlay + audit module — including the four diagnostic questions answered from each artefact | After spec-241 rewiring complete (T047) |
| `evidence/audit-citations.txt` | Captured pytest stderr / failure output showing audit messages embed `scene-thumbnail-pair-rule-001` / `scene-thumbnail-orphan-rule-001` / `scene-thumbnail-key-format-rule-001` — proves SC-003 | After audit unit tests run (T048) |
| `evidence/grep-removal-proof.txt` | `git grep -F 'scene-thumbnail' shared/schemas/ services/stac/ specs/241-stac-best-practices-upgrade/contracts/` output post-merge — proves SC-004 (no surviving regex / placeholder) | After cleanup tasks complete (T049) |
| `evidence/opening-context.md` | Cached blog-post opener (Hook + What We're Building + How It Fits + Key Decisions) | **Already captured** during `/speckit.plan` — do not regenerate |

### Media Content

| Artefact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener — three sections + Hook | **Already captured** during `/speckit.plan` |
| `media/shipped-post.md` | Feature post; first three sections copied verbatim from `evidence/opening-context.md`, then By the Numbers / Lessons Learned / What's Next written from delivery evidence | Polish phase (T050) |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with all evidence artefacts linked | Final task (T051) |
| Blog PR | Cross-repo PR to `debrief.github.io` publishing `media/shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Carve out the directories the feature ships into. No code changes yet — pure scaffolding so subsequent phases land into existing locations and so reviewers can see the new surface from the diff stat.

- [ ] T001 [P] Create schema overlay directory `shared/schemas/contracts/.gitkeep`
- [ ] T002 [P] Create golden fixtures directory `shared/schemas/fixtures/scene-thumbnail-asset/.gitkeep`
- [ ] T003 [P] Create evidence directory `specs/243-scene-asset-contract/evidence/.gitkeep`
- [ ] T004 [P] Create media directory `specs/243-scene-asset-contract/media/.gitkeep`

**Checkpoint**: Empty directories committed. The build system has nothing new to discover yet — generators, tests, and audit module continue to behave exactly as before.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the LinkML class and regenerate the schema bundle. **All three user stories depend on this** — US1 needs the class to exist with its docstring; US2 needs the generated `$defs/SceneThumbnailAssetEntry` so the overlay's `$ref` resolves; US3 needs the named-rule references in the docstring.

**⚠️ CRITICAL**: No user story work can begin until T009 produces a clean regenerated bundle.

- [ ] T005 Add `SceneThumbnailAssetEntry` LinkML class to `shared/schemas/src/linkml/storyboard.yaml` per data-model.md §1 (slots: `href`, `type` const `image/png`, `roles` multivalued, optional `title`; full class docstring including the four diagnostic answers and named-rule IDs `scene-thumbnail-pair-rule-001`, `scene-thumbnail-orphan-rule-001`, `scene-thumbnail-key-format-rule-001`)
- [ ] T006 Regenerate Pydantic output: `task -d shared/schemas gen` (or the project's documented schema build command); confirm `shared/schemas/dist/python/debrief_schemas/storyboard.py` now contains `class SceneThumbnailAssetEntry`
- [ ] T007 Verify JSON Schema output: confirm `shared/schemas/dist/jsonschema/storyboard.schema.json` contains `$defs/SceneThumbnailAssetEntry` with `description`, required `href` / `type` / `roles`, and `type: image/png` const (no code task — verification only; record output path in commit message)
- [ ] T008 Verify TypeScript output: confirm `shared/schemas/dist/typescript/storyboard.ts` contains `interface SceneThumbnailAssetEntry` with TSDoc carrying the class docstring (no code task — verification only)
- [ ] T009 Run schema regression suite: `uv run pytest shared/schemas/tests/` — must remain green. Catches any drift the new class introduces against existing storyboard tests / round-trip machinery.

**Checkpoint**: `SceneThumbnailAssetEntry` exists in all three generator outputs with shared docstring. Regression suite green. **User story phases may now begin in parallel.**

---

## Phase 3: User Story 1 — Self-Documenting On-Disk Contract (Priority: P1)

**Goal**: A new contributor inspecting `item.json` and seeing `assets["scene-thumbnail-01HXYZ…"]` can answer "what is this", "why ULID", "why pairs", "what deletes it" from the schema bundle alone, without grepping TypeScript source.

**Independent Test**: With only the regenerated `storyboard.schema.json` (Phase 2 output) and the generated `storyboard.ts` TSDoc, a reviewer can answer the four diagnostic questions for a hand-crafted `scene-thumbnail-{ULID}` key in under five minutes. No reference to `sceneThumbnailService.ts` required.

### Tests for User Story 1 ⚠️

> **Write these tests FIRST and confirm they fail before implementation.** They guard FR-001, FR-002, FR-014.

- [ ] T010 [P] [US1] [test] Add docstring-flow-through test for the JSON Schema output — assert `description` on `$defs/SceneThumbnailAssetEntry` contains the literal phrase `"Always appears as part of a"` and one of the named-rule IDs `shared/schemas/tests/test_scene_thumbnail_asset_docstring.py`
- [ ] T011 [P] [US1] [test] Extend the test from T010 to also assert the same phrase in `shared/schemas/dist/python/debrief_schemas/storyboard.py` (Pydantic class `__doc__`) `shared/schemas/tests/test_scene_thumbnail_asset_docstring.py`
- [ ] T012 [P] [US1] [test] Extend the test from T010 to also assert the same phrase in `shared/schemas/dist/typescript/storyboard.ts` (TSDoc above the interface) `shared/schemas/tests/test_scene_thumbnail_asset_docstring.py`
- [ ] T013 [P] [US1] [test] Add structural-shape adherence test: load `storyboard.schema.json#/$defs/SceneThumbnailAssetEntry` and assert the JSON Schema validator accepts a hand-crafted valid value object and rejects each of: missing `href`, missing `type`, `type != image/png`, missing `roles`, `roles != ["thumbnail"]` `shared/schemas/tests/test_scene_thumbnail_asset_value_shape.py`

### Implementation for User Story 1

> No implementation tasks beyond Phase 2 — the LinkML class **is** the deliverable for US1. The tests above gate that the class's docstring + slots reach the three generator outputs intact.

- [ ] T014 [US1] Run T010-T013 and confirm green: `uv run pytest shared/schemas/tests/test_scene_thumbnail_asset_docstring.py shared/schemas/tests/test_scene_thumbnail_asset_value_shape.py -v`
- [ ] T015 [US1] Smoke-test the diagnostic questions: open `shared/schemas/dist/jsonschema/storyboard.schema.json` in an editor, locate `$defs/SceneThumbnailAssetEntry`, and confirm by inspection that the description answers all four diagnostic questions (what / why-ULID / why-pairs / what-deletes). Record outcome in T040 evidence task.

**Checkpoint**: US1 standalone — the named shape exists, is documented, flows through all three generator outputs, and a contributor can answer the four diagnostic questions from the schema alone. **SC-001 in reach.** Validation enforcement (US2) and orphan detection (US3) remain absent at this checkpoint.

---

## Phase 4: User Story 2 — Validators Enforce Pairing & Key Contract (Priority: P2)

**Goal**: A regression that writes one variant without the other, or that emits a non-ULID suffix, is caught by the validator before reaching disk. The schema overlay enforces value shape + key format; the Python audit module enforces pairing — both cite stable rule IDs in their failure messages.

**Independent Test**: Take a known-good `item.json` with a paired scene-thumbnail set, (a) delete the `-sm` entry → audit fails citing `scene-thumbnail-pair-rule-001`; (b) replace the ULID suffix with `foo` → schema fails citing the patternProperties miss / `scene-thumbnail-key-format-rule-001`. Add the entry back / restore the ULID → both pass.

### Tests for User Story 2 ⚠️

> **Write these tests FIRST and confirm they fail before implementation.** They guard FR-003, FR-005, FR-008, FR-010, FR-011, plus US2 acceptance scenarios 1-4.

- [ ] T016 [P] [US2] [test] Author golden fixture `paired-valid.json` (one scene-thumbnail pair, valid value shape) `shared/schemas/fixtures/scene-thumbnail-asset/paired-valid.json`
- [ ] T017 [P] [US2] [test] Author golden fixture `unpaired-large-invalid.json` (large key only, no `-sm` sibling) `shared/schemas/fixtures/scene-thumbnail-asset/unpaired-large-invalid.json`
- [ ] T018 [P] [US2] [test] Author golden fixture `unpaired-small-invalid.json` (`-sm` key only, no large sibling) `shared/schemas/fixtures/scene-thumbnail-asset/unpaired-small-invalid.json`
- [ ] T019 [P] [US2] [test] Author golden fixture `malformed-ulid-invalid.json` (key `scene-thumbnail-foo`, non-ULID suffix) `shared/schemas/fixtures/scene-thumbnail-asset/malformed-ulid-invalid.json`
- [ ] T020 [P] [US2] [test] Author golden fixture `coexists-with-plot-thumbnails-valid.json` (plot-level `thumbnail` + `overview` + a paired scene-thumbnail set) `shared/schemas/fixtures/scene-thumbnail-asset/coexists-with-plot-thumbnails-valid.json`
- [ ] T021 [P] [US2] [test] Schema-overlay adherence test: load the new `shared/schemas/contracts/scene-thumbnail-asset.schema.json`, assert valid fixtures pass, assert `malformed-ulid-invalid.json` fails with a `patternProperties`-class error citing the unmatched key `shared/schemas/tests/test_scene_thumbnail_asset_fixtures.py`
- [ ] T022 [P] [US2] [test] Audit-pairing unit tests: assert `audit_scene_thumbnail_pairing` returns `[]` for `paired-valid.json` and `coexists-with-plot-thumbnails-valid.json`; returns one `Violation` with `rule_id == "scene-thumbnail-pair-rule-001"` for each unpaired fixture, and that the `message` field names the absent counterpart key `services/stac/tests/test_scene_thumbnail_audit.py`
- [ ] T023 [P] [US2] [test] Round-trip test (Constitution II.2 + spec FR-012): Pydantic instance of `SceneThumbnailAssetEntry` → JSON dump → re-parse via TypeScript-generated type (verified through the existing `validate-jsonschema.js` machinery) → re-parse via Pydantic → assert deep equality `shared/schemas/tests/test_scene_thumbnail_asset_roundtrip.py`
- [ ] T024 [P] [US2] [test] Spec-241 contract regression test: assert `services/stac/tests/test_plot.py::TestSpec241ItemFactoryShape::test_validates_against_contract_and_official_schema` still passes after the contract has been rewired to delegate the scene-thumbnail rule via `$ref` to the new overlay (no new test file — re-runs the existing test under the rewired contract)

### Implementation for User Story 2

- [ ] T025 [US2] Author the JSON Schema overlay at `shared/schemas/contracts/scene-thumbnail-asset.schema.json` per data-model.md §4 (the **shipped** form: replace the inline value-shape from `specs/243-scene-asset-contract/contracts/scene-thumbnail-asset.schema.json` with a `$ref` to `https://debrief.info/schemas/storyboard.schema.json#/$defs/SceneThumbnailAssetEntry`; preserve the patternProperties regex, the `$comment` documenting the audit rules, and the `_validator_notes`)
- [ ] T026 [US2] Implement `Violation` dataclass and `audit_scene_thumbnail_pairing(item: dict) -> list[Violation]` in `services/stac/src/debrief_stac/scene_thumbnail_audit.py` per quickstart.md §5; module docstring must reference the LinkML class and the named rule IDs
- [ ] T027 [US2] Add `services/stac/src/debrief_stac/__init__.py` re-export for `audit_scene_thumbnail_pairing` and `Violation` so consumers can import without crossing module boundaries `services/stac/src/debrief_stac/__init__.py`
- [ ] T028 [US2] Rewire the spec-241 contract: replace the `^scene-thumbnail(-.+)?$` patternProperties block in `specs/241-stac-best-practices-upgrade/contracts/item-shape.schema.json` (lines ~109-117) with an `allOf` that `$ref`s the new overlay; preserve the `^source(-.+)?$` block unchanged
- [ ] T029 [US2] Update `services/stac/tests/test_plot.py` ref-resolver config (one helper function near `_validate_against_contract`) to register the new overlay file with the `referencing` registry so `$ref` resolves at validation time `services/stac/tests/test_plot.py`
- [ ] T030 [US2] Run T016-T024 and confirm all green: `uv run pytest shared/schemas/tests/test_scene_thumbnail_asset_fixtures.py shared/schemas/tests/test_scene_thumbnail_asset_roundtrip.py services/stac/tests/test_scene_thumbnail_audit.py services/stac/tests/test_plot.py -v`

**Checkpoint**: US2 standalone — the schema rejects malformed scene-thumbnail keys; the audit rejects unpaired sets; both cite stable rule IDs; the spec-241 contract still validates real Items; the legacy patternProperties workaround is gone. **SC-002, SC-003 in reach. Orphan detection (US3) still pending.**

---

## Phase 5: User Story 3 — Lifecycle & GC Rules Captured in Schema (Priority: P3)

**Goal**: When a Scene is deleted but its asset pair lingers (orphan), the catalogue's audit detects it and references the schema rule by name. The schema documents the lifecycle invariant; the audit module enforces it where Storyboard context is in scope.

**Independent Test**: Take an Item whose Storyboard lists Scenes A and B; manually inject `scene-thumbnail-{ulid_C}` + `scene-thumbnail-{ulid_C}-sm` (where `ulid_C` matches no Scene); run `audit_scene_thumbnail_orphans`. Audit returns two `Violation` rows with `rule_id == "scene-thumbnail-orphan-rule-001"`, each `message` pointing at the schema rule.

### Tests for User Story 3 ⚠️

> **Write these tests FIRST and confirm they fail before implementation.** They guard FR-009 plus US3 acceptance scenarios 1-2.

- [ ] T031 [P] [US3] [test] Author golden fixture `orphan-asset-invalid.json` — Item assets containing a paired set whose ULID matches no Scene Feature in the sibling `features.geojson` (fixture is a directory bundle: an `item.json` + `features.geojson` so the audit has both inputs) `shared/schemas/fixtures/scene-thumbnail-asset/orphan-asset-invalid/`
- [ ] T032 [P] [US3] [test] Author counterpart fixture `non-orphan-valid/` — same shape, but Scene Feature with the matching ULID is present in `features.geojson` `shared/schemas/fixtures/scene-thumbnail-asset/non-orphan-valid/`
- [ ] T033 [P] [US3] [test] Audit-orphan unit tests: assert `audit_scene_thumbnail_orphans(item, scene_feature_ids)` returns `[]` for `non-orphan-valid` and returns one `Violation` per orphaned key for `orphan-asset-invalid`, each with `rule_id == "scene-thumbnail-orphan-rule-001"` and a `message` naming the schema rule `services/stac/tests/test_scene_thumbnail_audit.py` (extends the file from T022)
- [ ] T034 [P] [US3] [test] Cross-link test: parse the LinkML class docstring (or its generated JSON Schema `description`) and assert it cites `scene-thumbnail-orphan-rule-001` by name — guarantees future maintainers can navigate from a CI failure back to the schema documentation `shared/schemas/tests/test_scene_thumbnail_asset_docstring.py` (extends T010-T012)

### Implementation for User Story 3

- [ ] T035 [US3] Implement `audit_scene_thumbnail_orphans(item: dict, scene_feature_ids: set[str]) -> list[Violation]` in `services/stac/src/debrief_stac/scene_thumbnail_audit.py` (extracts ULIDs from any matching key including `-sm` variants, deduplicates, returns one Violation per orphaned ULID per variant present)
- [ ] T036 [US3] Re-export `audit_scene_thumbnail_orphans` alongside the pairing audit in `services/stac/src/debrief_stac/__init__.py`
- [ ] T037 [US3] Run T031-T034 and confirm green: `uv run pytest services/stac/tests/test_scene_thumbnail_audit.py shared/schemas/tests/test_scene_thumbnail_asset_docstring.py -v`

**Checkpoint**: US3 standalone — the schema documents the orphan rule; the audit detects orphans and cites the rule ID. All three user stories now functional and independently testable. **SC-005 in reach. Cleanup (Polish) and evidence collection remain.**

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Remove the spec-241 tactical artefacts (FR-008), refresh the only inline documentation (FR-013), regenerate sample data, run full CI, capture evidence, write the feature post, ship the PR.

### Cleanup (FR-008, FR-013)

- [ ] T038 Remove the `"scene-thumbnail"` placeholder entry from `ITEM_ASSETS_TEMPLATE` in `services/stac/src/debrief_stac/collection.py` (~lines 74-82); shorten the preceding comment to drop the "captured via the patternProperties in contracts/item-shape.schema.json" sentence and instead point at `shared/schemas/src/linkml/storyboard.yaml :: SceneThumbnailAssetEntry`
- [ ] T039 [P] Update the file-header docstring in `apps/vscode/src/services/sceneThumbnailService.ts` (lines 1-20) per data-model.md §5.3 — replace the implicit-documentation framing with an explicit pointer to the LinkML class and the overlay artefact; code below the header is unchanged
- [ ] T040 Regenerate the sample catalogue collection: re-run the existing sample-refresh task / fixture script that produces `preview/workspace/samples/local-store/catalog.json` so the placeholder `scene-thumbnail` entry vanishes from `item_assets`. If no scripted refresh exists, edit the file directly and document the manual step in the commit message.

### Validation Gates

- [ ] T041 Run quickstart.md §9 gates end-to-end: `task verify` (lint + typecheck + tests). Must be green — feature does not ship if any step fails. Capture full command output for the test-summary task (T044).
- [ ] T042 [P] Confirm Constitution Article XV: `uv run pyright services/stac shared/schemas` (strict, zero `Any`) green; `pnpm -r typecheck` green. New audit module + its tests must be type-clean without ignores.
- [ ] T043 [P] Confirm SC-004 (zero hits for legacy artefacts): run `git grep -nE 'scene-thumbnail\(-\.\+\)|"scene-thumbnail":' shared/schemas/ services/stac/ specs/241-stac-best-practices-upgrade/contracts/ preview/workspace/samples/local-store/` and confirm zero matches. Save output to T049 evidence task.

### Evidence Collection (REQUIRED)

- [ ] T044 Capture test results using the template at `.specify/templates/evidence/test-summary-template.md` in `specs/243-scene-asset-contract/evidence/test-summary.md` — YAML front matter MUST include `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`; body MUST list the new fixture tests, the round-trip test, the docstring-flow-through tests (×3 outputs), and the audit unit tests with one-line summaries each
- [ ] T045 [P] Create usage demonstration in `specs/243-scene-asset-contract/evidence/usage-example.md` — a hand-crafted Item assets block, walked through three states: (1) paired-valid → schema + audit pass; (2) `-sm` deleted → audit fails with `scene-thumbnail-pair-rule-001`; (3) ULID replaced with `foo` → schema fails citing the patternProperties miss. Each state shows exact command and exact output.
- [ ] T046 [P] [Schema-Change rubric] Capture round-trip evidence in `specs/243-scene-asset-contract/evidence/round-trip-evidence.md` — Python `SceneThumbnailAssetEntry(...)` instance → `.model_dump_json()` → TypeScript-validated parse → re-parse via Pydantic → `==` equality holds. Includes the Pydantic class snippet, the JSON, and the TS interface side-by-side.
- [ ] T047 [P] Capture before/after evidence in `specs/243-scene-asset-contract/evidence/before-after.md` — left column "before" (the spec-241 patternProperties regex + the `ITEM_ASSETS_TEMPLATE` placeholder + the TS file-header "I am the documentation" framing); right column "after" (the LinkML class docstring + overlay + audit module rule IDs); plus a four-row table answering each diagnostic question once from each side.
- [ ] T048 [P] Capture audit-citation evidence in `specs/243-scene-asset-contract/evidence/audit-citations.txt` — pytest stderr / failure output from the unpaired/malformed/orphan fixtures, demonstrating that each violation message embeds its named rule ID. Proves SC-003.
- [ ] T049 [P] Capture grep-removal evidence in `specs/243-scene-asset-contract/evidence/grep-removal-proof.txt` — output of the SC-004 grep from T043 (showing zero hits for the legacy regex / placeholder).

### Media Content

- [ ] T050 Create feature blog post in `specs/243-scene-asset-contract/media/shipped-post.md` — first three sections (`What We're Building`, `How It Fits`, `Key Decisions`) copied **verbatim** from `specs/243-scene-asset-contract/evidence/opening-context.md` (already cached during `/speckit.plan`). Add `Title` prefixed `Building `, the `Hook` (already in opening-context.md), and four delivery sections written from evidence: `Screenshots` (omitted — schema feature, link to the `before-after.md` and `round-trip-evidence.md` artefacts instead), `By the Numbers` (lines added/removed, test counts from T044, fixture count, zero new dependencies), `Lessons Learned` (LinkML's `patternProperties` boundary; named rule IDs as cross-artefact glue; "Pre-Release Freedom" letting us delete the spec-241 placeholder cleanly), `What's Next` (forward-compat recipe for `-md` variants; promoting Scene itself to a first-class shape — out of scope per spec.md). Use the Content Specialist agent (`.claude/agents/media/content.md`) for voice consistency; do not regenerate the cached opener.

### PR Creation

- [ ] T051 Create PR and publish blog: run `/speckit.pr`

**Task T051 must run last. It depends on every preceding task being checked off — particularly T041 (CI green), T044 (test-summary), T046 (round-trip evidence), and T050 (shipped post). The slash command will create the feature PR in `debrief-future` and the cross-repo blog PR in `debrief.github.io` and return both URLs.**

**Checkpoint**: Feature shipped. SC-001 through SC-006 verified. Spec-241 review-decision-5A artefacts retired.

---

## Dependencies

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T001-T004 all `[P]`.
- **Foundational (Phase 2)**: Depends on Setup. T005 → T006 → (T007 ‖ T008) → T009. **Blocks all user stories** — `SceneThumbnailAssetEntry` must exist in the generated bundle before any test or overlay $ref can reference it.
- **User Story 1 (P1)**: Depends on Phase 2 (T009 green). T010-T013 `[P]` → T014 → T015. No dependencies on US2 or US3.
- **User Story 2 (P2)**: Depends on Phase 2 (T009 green) **and** on the LinkML class docstring being present (Phase 2 output also covers this). T016-T024 `[P]` (fixtures + tests written first) → T025 (overlay) → T026 → T027 → T028 → T029 → T030. Independent of US3, but US2's overlay is what US3's orphan tests load alongside.
- **User Story 3 (P3)**: Depends on Phase 2 and on T026 (the audit module file existing — T035 extends it with a second function). Tests T031-T034 `[P]` → T035 → T036 → T037. Can run in parallel with US2 if the audit module is split into two commits, but easier to sequence US2 → US3 since they share `services/stac/src/debrief_stac/scene_thumbnail_audit.py` and `services/stac/tests/test_scene_thumbnail_audit.py`.
- **Polish (Phase 6)**: Depends on US1 + US2 + US3 complete. T038-T040 (cleanup) can land in parallel with each other; T041-T043 (validation) follow cleanup; T044-T049 (evidence) `[P]` after T041 green; T050 after evidence; T051 last.

### User Story Independence

- **US1 ships standalone**: After Phase 2 + Phase 3, the named LinkML class is documented and visible in all three generator outputs. A reviewer can confirm SC-001 and the four diagnostic questions without any validator work. The legacy patternProperties rule and placeholder are still present at this point — that's the next phase's problem.
- **US2 ships standalone after US1**: Adds the overlay + audit pairing function + spec-241 contract rewiring + placeholder removal-readiness. `services/stac/tests/test_plot.py` continues to validate the spec-241 contract; the legacy patternProperties block is gone; SC-002 + SC-003 are met.
- **US3 ships standalone after US2**: Adds the orphan audit function + tests + cross-link assertion. SC-005 is met; the LinkML class docstring closes the loop on lifecycle invariants.

### Within Each User Story

- Tests written and confirmed failing before implementation (Constitution VII.1).
- Fixtures (`[P]`) before adherence tests; adherence tests before overlay/audit code; overlay/audit code before spec-241 rewiring; rewiring before regression confirmation.
- One file = one task: no parallel tasks ever touch the same file (`.[P]` discipline).

### Parallel Opportunities

- **T001-T004** (Setup): four directories, four `[P]` tasks.
- **T010-T013** (US1 docstring + value-shape tests): four files, four `[P]` tasks.
- **T016-T024** (US2 fixtures + tests): nine `[P]` tasks (five fixtures + four test files); the largest parallel batch in the plan.
- **T031-T034** (US3 fixtures + tests): four `[P]` tasks.
- **T044-T049** (Evidence): six `[P]` tasks once T041 is green.
- Cross-story parallelism: US2 and US3 share the audit module and its test file, so they sequence naturally rather than parallelise. US1 is independent of both and could run in parallel with the start of US2.

---

### Parallel Example: User Story 2

```bash
# Launch all US2 fixture + test authoring together (nine independent files):
Task: "Author golden fixture paired-valid.json"
Task: "Author golden fixture unpaired-large-invalid.json"
Task: "Author golden fixture unpaired-small-invalid.json"
Task: "Author golden fixture malformed-ulid-invalid.json"
Task: "Author golden fixture coexists-with-plot-thumbnails-valid.json"
Task: "Schema-overlay adherence test (test_scene_thumbnail_asset_fixtures.py)"
Task: "Audit-pairing unit tests (test_scene_thumbnail_audit.py)"
Task: "Round-trip test (test_scene_thumbnail_asset_roundtrip.py)"
Task: "Spec-241 regression test confirmation (re-runs existing test_plot.py)"
```

Once the parallel batch lands, T025-T030 sequence one-after-another (each modifies a distinct file but each gates the next: overlay before audit before spec-241 rewiring before regression run).

---

## Implementation Strategy

### Incremental Delivery

1. **Setup + Foundation (T001-T009)** — empty directories committed; LinkML class added; bundle regenerated; existing tests still green. **Commit and push at this checkpoint** so reviewers can see the new shape land in isolation before any validator work touches it.
2. **US1 (T010-T015)** — docstring-flow-through + value-shape tests, no implementation beyond Phase 2. Confirms SC-001 + SC-005. **Commit and push** — the named shape is now self-documenting end-to-end.
3. **US2 (T016-T030)** — fixtures, overlay, audit pairing function, spec-241 rewiring. **Largest single increment**; this is where the legacy patternProperties workaround actually disappears and the audit starts running. Confirms SC-002 + SC-003. **Commit and push.**
4. **US3 (T031-T037)** — orphan audit function + tests + cross-link. Confirms SC-005 (orphan side). **Commit and push.**
5. **Polish (T038-T051)** — placeholder removal, TS doc pointer, sample regen, full CI, evidence, blog post, PR. Confirms SC-004 + SC-006 and ships the feature.

Each numbered increment is a candidate squash-commit (per Constitution XIII.1 atomic-commits) or a logical PR section divider.

### Sequencing notes specific to this feature

- **Phase 2 must produce a regenerated `storyboard.schema.json` on disk before the overlay is authored** (T025), because the overlay's `$ref` resolves into that file. Don't try to land the overlay before T009 is green — the test that loads the overlay (T021) will fail with an unresolvable `$ref`.
- **Spec-241 contract rewiring (T028) is a single-line edit but the riskiest task** — it changes a contract that another spec's test suite (`test_plot.py`) depends on. Run T024 (the regression confirmation) immediately after T028 lands to verify nothing downstream has broken.
- **Sample-data regeneration (T040) must run before T043** (the SC-004 grep), because the placeholder string in `preview/workspace/samples/local-store/catalog.json` is one of the matches the grep is meant to confirm gone.
- **The cached opener already exists** — T050 reads `evidence/opening-context.md` written during `/speckit.plan`; do not regenerate it. The Content Specialist's voice on the cached three sections is the contract.

### Parallel Team Strategy

This feature is small (51 tasks, schema-side, ~80 LOC of new code, ~15 LOC removed) and is best landed by a single contributor in one session. If staffed by two:

- **Contributor A** drives Phase 1 + Phase 2 + US1 + US2 (the schema-and-validator backbone).
- **Contributor B** drives US3 + Polish T038-T040 (cleanup + sample regen) once US2's audit module file lands.

Evidence collection (T044-T049) is parallelisable across as many contributors as want to share it; the PR (T051) is one person's job.

### Notes

- `[P]` tasks touch different files with no dependencies and are safe to launch concurrently.
- `[US1]` / `[US2]` / `[US3]` labels map each task to its owning user story for traceability.
- `[test]` labels mark tests; per Constitution VII.1, all `[test]` tasks **must** be confirmed failing against the unchanged codebase before the implementation tasks they gate begin.
- Commit after each user story checkpoint; do not bundle multiple stories into one commit.
- All failure messages emitted by the audit module **must** embed the named rule ID (`scene-thumbnail-pair-rule-001`, `scene-thumbnail-orphan-rule-001`, `scene-thumbnail-key-format-rule-001`) — this is the cross-artefact glue that lets a CI failure trace back to the schema documentation.
- **Do not push** until `task verify` (T041) is green end-to-end. Constitution XIII.3.
