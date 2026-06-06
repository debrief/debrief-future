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

- [x] T001 [P] Create schema overlay directory `shared/schemas/contracts/.gitkeep`
- [x] T002 [P] Create golden fixtures directory `shared/schemas/fixtures/scene-thumbnail-asset/.gitkeep`
- [x] T003 [P] Create evidence directory `specs/243-scene-asset-contract/evidence/.gitkeep`
- [x] T004 [P] Create media directory `specs/243-scene-asset-contract/media/.gitkeep`

**Checkpoint**: Empty directories committed. The build system has nothing new to discover yet — generators, tests, and audit module continue to behave exactly as before.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the LinkML class and regenerate the schema bundle. **All three user stories depend on this** — US1 needs the class to exist with its docstring; US2 needs the generated `$defs/SceneThumbnailAssetEntry` so the overlay's `$ref` resolves; US3 needs the named-rule references in the docstring.

**⚠️ CRITICAL**: No user story work can begin until T009 produces a clean regenerated bundle.

- [x] T005 Add `SceneThumbnailAssetEntry` LinkML class to `shared/schemas/src/linkml/storyboard.yaml` per data-model.md §1 (slots: `href`, `type` const `image/png`, `roles` multivalued, optional `title`; full class docstring including the four diagnostic answers and named-rule IDs `scene-thumbnail-pair-rule-001`, `scene-thumbnail-orphan-rule-001`, `scene-thumbnail-key-format-rule-001`)
- [x] T006 Regenerate Pydantic output: ran `uv run python shared/schemas/scripts/generate.py --target all`; confirmed `shared/schemas/src/generated/python/debrief_schemas/__init__.py` now contains `class SceneThumbnailAssetEntry(ConfiguredBaseModel)` (line 5270)
- [x] T007 Verify JSON Schema output: confirmed `shared/schemas/src/generated/json-schema/debrief.schema.json` contains `$defs/SceneThumbnailAssetEntry` (line 2515) with `description`, required `href` / `type` / `roles`, and `equals_string: image/png`
- [x] T008 Verify TypeScript output: confirmed `shared/schemas/src/generated/typescript/types.ts` contains `interface SceneThumbnailAssetEntry` (line 2195) with TSDoc carrying the class docstring
- [x] T009 Run schema regression suite: `uv run pytest shared/schemas/tests/` — 775 passed, 1 xfailed (existing). No regression introduced by the new class.

**Checkpoint**: `SceneThumbnailAssetEntry` exists in all three generator outputs with shared docstring. Regression suite green. **User story phases may now begin in parallel.**

---

## Phase 3: User Story 1 — Self-Documenting On-Disk Contract (Priority: P1)

**Goal**: A new contributor inspecting `item.json` and seeing `assets["scene-thumbnail-01HXYZ…"]` can answer "what is this", "why ULID", "why pairs", "what deletes it" from the schema bundle alone, without grepping TypeScript source.

**Independent Test**: With only the regenerated `storyboard.schema.json` (Phase 2 output) and the generated `storyboard.ts` TSDoc, a reviewer can answer the four diagnostic questions for a hand-crafted `scene-thumbnail-{ULID}` key in under five minutes. No reference to `sceneThumbnailService.ts` required.

### Tests for User Story 1 ⚠️

> **Write these tests FIRST and confirm they fail before implementation.** They guard FR-001, FR-002, FR-014.

- [x] T010 [P] [US1] [test] Add docstring-flow-through test for the JSON Schema output — assert `description` on `$defs/SceneThumbnailAssetEntry` contains the literal phrase `"Always appears as part of a"` and all three named-rule IDs (`shared/schemas/tests/test_scene_thumbnail_asset_docstring.py`)
- [x] T011 [P] [US1] [test] Extend the test from T010 to assert the same phrase + rule IDs in the generated Pydantic class docstring (`shared/schemas/src/generated/python/debrief_schemas/__init__.py`)
- [x] T012 [P] [US1] [test] Extend the test from T010 to assert the same phrase + rule IDs in the TypeScript TSDoc above `interface SceneThumbnailAssetEntry` (`shared/schemas/src/generated/typescript/types.ts`)
- [x] T013 [P] [US1] [test] Add structural-shape adherence test: load `debrief.schema.json#/$defs/SceneThumbnailAssetEntry` and assert the validator accepts a hand-crafted valid value and rejects: missing `href`, missing `type`, `type != image/png`, missing `roles`, additional property (`shared/schemas/tests/test_scene_thumbnail_asset_value_shape.py`)

### Implementation for User Story 1

> No implementation tasks beyond Phase 2 — the LinkML class **is** the deliverable for US1. The tests above gate that the class's docstring + slots reach the three generator outputs intact.

- [x] T014 [US1] Ran T010-T013 — all 13 tests green (`shared/schemas/tests/test_scene_thumbnail_asset_docstring.py` 6 passed, `shared/schemas/tests/test_scene_thumbnail_asset_value_shape.py` 7 passed)
- [x] T015 [US1] Smoke-test diagnostic questions: confirmed `$defs/SceneThumbnailAssetEntry.description` in `shared/schemas/src/generated/json-schema/debrief.schema.json` answers all four (what = "single STAC Item asset entry produced by Storyboarding (#216)"; why-ULID = "owning Scene's id; lets every per-Scene asset be traced back"; why-pairs = "capture pipeline produces both sizes atomically … defect" + pair-rule-001; what-deletes = "Deleted when the Scene is deleted (garbage-collection invariant) … orphan-rule-001"). Recorded for evidence task T044.

**Checkpoint**: US1 standalone — the named shape exists, is documented, flows through all three generator outputs, and a contributor can answer the four diagnostic questions from the schema alone. **SC-001 in reach.** Validation enforcement (US2) and orphan detection (US3) remain absent at this checkpoint.

---

## Phase 4: User Story 2 — Validators Enforce Pairing & Key Contract (Priority: P2)

**Goal**: A regression that writes one variant without the other, or that emits a non-ULID suffix, is caught by the validator before reaching disk. The schema overlay enforces value shape + key format; the Python audit module enforces pairing — both cite stable rule IDs in their failure messages.

**Independent Test**: Take a known-good `item.json` with a paired scene-thumbnail set, (a) delete the `-sm` entry → audit fails citing `scene-thumbnail-pair-rule-001`; (b) replace the ULID suffix with `foo` → schema fails citing the patternProperties miss / `scene-thumbnail-key-format-rule-001`. Add the entry back / restore the ULID → both pass.

### Tests for User Story 2 ⚠️

> **Write these tests FIRST and confirm they fail before implementation.** They guard FR-003, FR-005, FR-008, FR-010, FR-011, plus US2 acceptance scenarios 1-4.

- [x] T016 [P] [US2] [test] Author golden fixture `paired-valid.json` (one scene-thumbnail pair, valid value shape) `shared/schemas/fixtures/scene-thumbnail-asset/paired-valid.json`
- [x] T017 [P] [US2] [test] Author golden fixture `unpaired-large-invalid.json` (large key only, no `-sm` sibling) `shared/schemas/fixtures/scene-thumbnail-asset/unpaired-large-invalid.json`
- [x] T018 [P] [US2] [test] Author golden fixture `unpaired-small-invalid.json` (`-sm` key only, no large sibling) `shared/schemas/fixtures/scene-thumbnail-asset/unpaired-small-invalid.json`
- [x] T019 [P] [US2] [test] Author golden fixture `malformed-ulid-invalid.json` (key `scene-thumbnail-foo`, non-ULID suffix) `shared/schemas/fixtures/scene-thumbnail-asset/malformed-ulid-invalid.json`
- [x] T020 [P] [US2] [test] Author golden fixture `coexists-with-plot-thumbnails-valid.json` (plot-level `thumbnail` + `overview` + a paired scene-thumbnail set) `shared/schemas/fixtures/scene-thumbnail-asset/coexists-with-plot-thumbnails-valid.json`
- [x] T021 [P] [US2] [test] Schema-overlay adherence test: loads `shared/schemas/contracts/scene-thumbnail-asset.schema.json` via `referencing.Registry`, asserts valid fixtures pass and `malformed-ulid-invalid.json` is rejected by `propertyNames` (`shared/schemas/tests/test_scene_thumbnail_asset_fixtures.py`)
- [x] T022 [P] [US2] [test] Audit-pairing unit tests: 11 cases — pair-rule pass/fail for valid/unpaired fixtures, ignored unrelated keys, empty-asset edge cases, frozen-dataclass guard (`services/stac/tests/test_scene_thumbnail_audit.py`)
- [x] T023 [P] [US2] [test] Round-trip test (Constitution II.2 + FR-012): Pydantic `SceneThumbnailAssetEntry(...)` → `model_dump_json()` → JSON Schema validate → Pydantic re-parse → equality (`shared/schemas/tests/test_scene_thumbnail_asset_roundtrip.py`)
- [x] T024 [P] [US2] [test] Spec-241 contract regression test confirmed: `TestSpec241ItemFactoryShape::test_validates_against_contract_and_official_schema` passes after rewiring the contract to `$ref` the new overlay (registry resolves the chain)

### Implementation for User Story 2

- [x] T025 [US2] Authored the JSON Schema overlay at `shared/schemas/contracts/scene-thumbnail-asset.schema.json` — uses `propertyNames` if/then for ULID key-format enforcement, `patternProperties` with `allOf` over `$ref` (LinkML-generated value shape) + a layered `roles` const constraint
- [x] T026 [US2] Implemented `Violation` (frozen dataclass), `PAIR_RULE_ID`, `ORPHAN_RULE_ID`, `audit_scene_thumbnail_pairing(item)`, `audit_scene_thumbnail_orphans(item, scene_feature_ids)` in `services/stac/src/debrief_stac/scene_thumbnail_audit.py`; module docstring references the LinkML class and all three named rule IDs
- [x] T027 [US2] Re-exported `audit_scene_thumbnail_pairing`, `audit_scene_thumbnail_orphans`, `Violation`, `PAIR_RULE_ID`, `ORPHAN_RULE_ID` from `services/stac/src/debrief_stac/__init__.py`
- [x] T028 [US2] Rewired `specs/241-stac-best-practices-upgrade/contracts/item-shape.schema.json`: removed inline `^scene-thumbnail(-.+)?$` patternProperties block; added `allOf` `$ref` to `https://debrief.info/schemas/contracts/scene-thumbnail-asset.schema.json` at the `assets` level; preserved the `^source(-.+)?$` block
- [x] T029 [US2] Updated `services/stac/tests/test_plot.py::_validate_against_contract` to use a `referencing.Registry` populated with the overlay and the LinkML bundle; switched from `jsonschema.validate()` shortcut to `Draft7Validator(... registry=...)` so the cross-bundle `$ref` chain resolves
- [x] T030 [US2] Ran combined T016-T024 suite: `uv run pytest shared/schemas/tests/test_scene_thumbnail_asset_fixtures.py shared/schemas/tests/test_scene_thumbnail_asset_roundtrip.py services/stac/tests/test_scene_thumbnail_audit.py services/stac/tests/test_plot.py` — **57 passed** (5 overlay + 3 round-trip + 11 audit + 38 plot tests)

**Checkpoint**: US2 standalone — the schema rejects malformed scene-thumbnail keys; the audit rejects unpaired sets; both cite stable rule IDs; the spec-241 contract still validates real Items; the legacy patternProperties workaround is gone. **SC-002, SC-003 in reach. Orphan detection (US3) still pending.**

---

## Phase 5: User Story 3 — Lifecycle & GC Rules Captured in Schema (Priority: P3)

**Goal**: When a Scene is deleted but its asset pair lingers (orphan), the catalogue's audit detects it and references the schema rule by name. The schema documents the lifecycle invariant; the audit module enforces it where Storyboard context is in scope.

**Independent Test**: Take an Item whose Storyboard lists Scenes A and B; manually inject `scene-thumbnail-{ulid_C}` + `scene-thumbnail-{ulid_C}-sm` (where `ulid_C` matches no Scene); run `audit_scene_thumbnail_orphans`. Audit returns two `Violation` rows with `rule_id == "scene-thumbnail-orphan-rule-001"`, each `message` pointing at the schema rule.

### Tests for User Story 3 ⚠️

> **Write these tests FIRST and confirm they fail before implementation.** They guard FR-009 plus US3 acceptance scenarios 1-2.

- [x] T031 [P] [US3] [test] Authored fixture bundle `shared/schemas/fixtures/scene-thumbnail-asset/orphan-asset-invalid/` (item.json + features.geojson) — assets carry ULID `01HZZZZZ8M9N0P1Q2R3S4T5V6W` that matches no Scene in the bundle's features.geojson
- [x] T032 [P] [US3] [test] Authored counterpart `shared/schemas/fixtures/scene-thumbnail-asset/non-orphan-valid/` — Scene Feature with ULID `01HSCENA8M9N0P1Q2R3S4T5V6W` is present
- [x] T033 [P] [US3] [test] Audit-orphan unit tests added: `test_orphan_fixture_bundle_flagged` (2 violations, both citing `scene-thumbnail-orphan-rule-001`), `test_non_orphan_fixture_bundle_passes` (`[]`), `test_orphan_audit_partial_match` (`services/stac/tests/test_scene_thumbnail_audit.py`)
- [x] T034 [P] [US3] [test] Cross-link assertion: `test_named_rule_ids_present_in_jsonschema` parametrized over all three rule IDs (pair / orphan / key-format) — guarantees a CI failure citing any rule ID can be resolved by grep against the schema bundle (`shared/schemas/tests/test_scene_thumbnail_asset_docstring.py`)

### Implementation for User Story 3

- [x] T035 [US3] Implemented alongside T026: `audit_scene_thumbnail_orphans(item: dict, scene_feature_ids: set[str]) -> list[Violation]` returns one Violation per orphaned variant present (covers both `-sm` and large keys)
- [x] T036 [US3] `audit_scene_thumbnail_orphans` re-exported from `services/stac/src/debrief_stac/__init__.py` (done in T027)
- [x] T037 [US3] Combined T031-T034 run: 19 passed (`services/stac/tests/test_scene_thumbnail_audit.py` 13 + `shared/schemas/tests/test_scene_thumbnail_asset_docstring.py` 6)

**Checkpoint**: US3 standalone — the schema documents the orphan rule; the audit detects orphans and cites the rule ID. All three user stories now functional and independently testable. **SC-005 in reach. Cleanup (Polish) and evidence collection remain.**

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Remove the spec-241 tactical artefacts (FR-008), refresh the only inline documentation (FR-013), regenerate sample data, run full CI, capture evidence, write the feature post, ship the PR.

### Cleanup (FR-008, FR-013)

- [x] T038 Removed `"scene-thumbnail"` from `ITEM_ASSETS_TEMPLATE` in `services/stac/src/debrief_stac/collection.py` (was lines 79-86); rewrote the preceding comment to point at `shared/schemas/src/linkml/storyboard.yaml :: SceneThumbnailAssetEntry` and the overlay artefact. Also pruned the matching placeholder from `specs/241-stac-best-practices-upgrade/contracts/collection-shape.schema.json` (item_assets `required` list + `scene-thumbnail` block) and updated `services/stac/tests/test_collection.py::test_item_assets_keys_match_contract` to assert the placeholder is *absent*
- [x] T039 [P] Updated file-header docstring in `apps/vscode/src/services/sceneThumbnailService.ts` — replaced the implicit-documentation framing with explicit pointers to the LinkML class, the overlay artefact, and the audit module + named rule IDs
- [x] T040 Edited `preview/workspace/samples/local-store/catalog.json` directly to remove the `scene-thumbnail` placeholder from `item_assets` (the full sample-regen script extracts/re-imports all 73 plots — too heavy for a one-key removal). Manual edit documented in commit message.

### Validation Gates

- [x] T041 Ran the validation gates: `uv run ruff check services/stac shared/schemas` (clean), `uv run pyright services/stac shared/schemas` (0 errors), `uv run pytest` (1882 passed, 1 skipped, 1 xfailed), `pnpm -r typecheck` (clean). The 879 pre-existing apps/vscode lint errors are unrelated to spec 243 (verified: same count on main).
- [x] T042 [P] Confirmed Article XV strict typing: `uv run pyright services/stac shared/schemas` clean; new audit module + tests type-clean (one `# type: ignore[arg-type]` on the deliberate Pydantic literal-rejection test in `test_scene_thumbnail_asset_roundtrip.py`)
- [x] T043 [P] SC-004 grep result: one remaining match — the deliberate back-reference in the new `SceneThumbnailAssetEntry` docstring at `shared/schemas/src/linkml/storyboard.yaml:237` (FR-014 "Supersedes the spec-241 placeholder … rule"). This is the migration-history explanatory text, not a production rule. The placeholder block in `factory-api.md` was also rewritten to point at spec 243. **Net: zero production rule definitions or placeholder map entries survive** — SC-004 met (subject to the explicit FR-014 carve-out).

### Evidence Collection (REQUIRED)

- [x] T044 Captured `evidence/test-summary.md` with YAML front matter (`git_sha: 4e3a0cc`, captured 2026-05-04T10:57:06Z, 1882 passed / 1 skipped / 0 failed). Body breaks down the 34 new spec-243 tests across 5 files plus the 38 spec-241 regression assertions.
- [x] T045 [P] Captured `evidence/usage-example.md` — three-state walk (paired-valid → both layers pass; `-sm` deleted → audit fails with `pair-rule-001`; ULID = "foo" → schema fails citing key-format pattern in `propertyNames`).
- [x] T046 [P] [Schema-Change rubric] Captured `evidence/round-trip-evidence.md` — LinkML source ↔ Pydantic class ↔ TypeScript interface ↔ JSON Schema $defs side-by-side, with the round-trip test trace showing equal Pydantic instance before and after JSON Schema validation.
- [x] T047 [P] Captured `evidence/before-after.md` — schema source / item-shape / collection-shape / TS docstring / audit module / four-row diagnostic-question table. Shows SC-001 met (all four answerable from schema bundle alone) and the SC-004 grep result.
- [x] T048 [P] Captured `evidence/audit-citations.txt` — concrete output from running the audit module against each invalid fixture, showing every Violation message embeds its rule ID (`pair-rule-001`, `orphan-rule-001`, `key-format-rule-001`). Proves SC-003.
- [x] T049 [P] Captured `evidence/grep-removal-proof.txt` — the SC-004 grep returns 4 matches, all in the same single FR-14 sentence in the new class docstring (LinkML source + 3 generator outputs); zero production rule definitions or placeholder map entries survive.

### Media Content

- [x] T050 Created feature blog post via the Content Specialist agent at `specs/243-scene-asset-contract/media/shipped-post.md` (76 lines, ~1050 words, reading_time 5 min). Front matter: `track: [momentum]`, title prefixed `Building`, tags `[schemas, linkml, stac, tech-debt, shipped]`. First four content sections (Hook table + What We're Building + How It Fits + Key Decisions) copied verbatim from cached `evidence/opening-context.md`. New sections: Implementation Notes (replaces Screenshots — schema feature), By the Numbers (8-row metrics table), Lessons Learned (3 bullets), What's Next (3 bullets).

### PR Creation

- [x] T051 Created feature PR via `/speckit.pr`: https://github.com/debrief/debrief-future/pull/587 (navigator link populated post-create with `?pr=587`). BACKLOG.md row 243 struck through to `complete`.

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
