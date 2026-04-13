# Tasks: Nuke and Regenerate Sample Catalog

**Input**: Design documents from `/specs/184-regenerate-sample-catalog/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Tests are included as validation tasks — the orchestration script itself is validated by running the regeneration and checking the output against acceptance criteria.

**Organization**: Tasks are grouped by user story. US1 (Clean Regeneration) and US3 (Source File Preservation) share the same orchestration script and are combined into a single phase since source preservation is a prerequisite for regeneration.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/184-regenerate-sample-catalog/evidence/`
**Media Directory**: `specs/184-regenerate-sample-catalog/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | `task verify` results after regeneration | After all tests pass |
| usage-example.md | Full script invocation with output | After script works end-to-end |
| validation-output.txt | Script output showing item count, warnings, duration | After regeneration completes |
| item-before.json | Sample item.json BEFORE regeneration (flat fields) | Before nuking catalog |
| item-after.json | Sample item.json AFTER regeneration (debrief:platforms) | After regeneration completes |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Already created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create the orchestration script skeleton and verify prerequisites

- [ ] T001 Capture a sample item.json before regeneration for before/after evidence `specs/184-regenerate-sample-catalog/evidence/item-before.json`
- [ ] T002 Create orchestration script skeleton with argument parsing and logging `scripts/regenerate-sample-catalog.py`
- [ ] T003 Add script docstring with usage instructions matching quickstart.md `scripts/regenerate-sample-catalog.py`

---

## Phase 2: Foundation — Source File Extraction (US3 prerequisite)

**Purpose**: Implement safe source file extraction from the existing catalog before any destructive operations. This BLOCKS the regeneration pipeline.

- [ ] T004 [US3] Implement source file discovery — walk `local-store/*/assets/` and collect all `.rep`/`.dpf`/`.dsf` file paths `scripts/regenerate-sample-catalog.py`
- [ ] T005 [US3] Implement staging — copy discovered source files to a temporary directory preserving filenames `scripts/regenerate-sample-catalog.py`
- [ ] T006 [US3] Add source file count logging — report total files found and staged `scripts/regenerate-sample-catalog.py`
- [ ] T007 [US3] Add error handling — abort if no source files found or if staging fails `scripts/regenerate-sample-catalog.py`

**Checkpoint**: Source files can be safely extracted to a staging directory. No destructive operations yet.

---

## Phase 3: US1 + US3 — Core Regeneration Pipeline (Priority: P1)

**Goal**: Delete the existing catalog and reimport all source files through the current pipeline, producing a fresh catalog with `debrief:platforms` and no deprecated flat fields. Source files survive the process as STAC assets.

**Independent Test**: Run the script, then verify: (a) item count matches expectations, (b) every item.json has `debrief:platforms`, (c) no item.json has `debrief:vessel_classes`/`debrief:nationalities`/`debrief:track_names`, (d) every item has its source file as an asset.

### Implementation

- [ ] T008 [US1] Implement catalog deletion — `shutil.rmtree` on `local-store/` with safety check that staging completed `scripts/regenerate-sample-catalog.py`
- [ ] T009 [US1] Implement reimport — call `import_legacy_data(staging_dir, catalog_path)` from debrief_io `scripts/regenerate-sample-catalog.py`
- [ ] T010 [US1] Add import result logging — report files processed, succeeded, failed, warnings `scripts/regenerate-sample-catalog.py`
- [ ] T011 [US1] Add staging directory cleanup after successful import `scripts/regenerate-sample-catalog.py`
- [ ] T012 [US1] Wire end-to-end flow: extract → nuke → import → cleanup `scripts/regenerate-sample-catalog.py`
- [ ] T013 [US1] Run the script against the actual catalog and verify item count `scripts/regenerate-sample-catalog.py`
- [ ] T014 [US1] Validate no deprecated flat fields in any regenerated item.json `preview/workspace/samples/local-store/`
- [ ] T015 [US3] Validate every regenerated item has a source file asset in its `assets/` directory `preview/workspace/samples/local-store/`

**Checkpoint**: Fresh catalog exists with raw imported data. Source files preserved as assets. No flat aggregate fields.

---

## Phase 4: US2 — Platform Registry Verification (Priority: P1)

**Goal**: Verify the platform registry contains entries for all known platforms and that import warnings are emitted for unregistered platforms.

**Independent Test**: After regeneration, check that all 10 known platform IDs resolve against the registry. Check that unregistered platforms produced import warnings.

### Implementation

- [ ] T016 [US2] Verify platform registry contains all 10 known legacy platforms from `PLATFORM_VESSEL_MAP` `shared/data/platform-registry.json`
- [ ] T017 [US2] Check import result warnings for `UNREGISTERED_PLATFORM` entries and log unregistered platform IDs `scripts/regenerate-sample-catalog.py`
- [ ] T018 [US2] Add any missing platforms to registry if needed `shared/data/platform-registry.json`

**Checkpoint**: Platform registry is complete for known platforms. Unregistered platforms are documented via import warnings.

---

## Phase 5: US4 — Enrichment with Exercise Metadata (Priority: P2)

**Goal**: Run the enrichment script post-import to populate `debrief:platforms`, `debrief:tags`, `debrief:feature_tags`, exercise titles, and descriptions on all items.

**Independent Test**: After enrichment, inspect any item.json — it should have `debrief:platforms` with populated records, `debrief:tags`, `debrief:feature_tags`, a descriptive title, and a description. Collection summaries should aggregate correctly.

### Implementation

- [ ] T019 [US4] Add enrichment step to orchestration script — invoke `enrich-legacy-catalog.py` as subprocess after import `scripts/regenerate-sample-catalog.py`
- [ ] T020 [US4] Add enrichment result logging — report enriched item count `scripts/regenerate-sample-catalog.py`
- [ ] T021 [US4] Validate enrichment output — check sample item has `debrief:platforms` with name, nationality, vessel_class, vessel_type, vessel_role, domain `preview/workspace/samples/local-store/`
- [ ] T022 [US4] Validate collection summaries in catalog.json contain `debrief:platforms` and `debrief:tags` (no flat aggregate fields) `preview/workspace/samples/local-store/catalog.json`
- [ ] T023 [US4] Capture a sample item.json after enrichment for before/after evidence `specs/184-regenerate-sample-catalog/evidence/item-after.json`

**Checkpoint**: All items enriched with exercise metadata and structured platform records. Collection summaries clean.

---

## Phase 6: US5 — Idempotent and Scriptable Process (Priority: P2)

**Goal**: Verify the regeneration is repeatable and passes all CI checks.

**Independent Test**: Run the script twice in sequence (deleting local-store between runs). Verify item count and structure are consistent. Run `task verify` and confirm all checks pass.

### Implementation

- [ ] T024 [US5] Add `main()` entry point with `if __name__ == "__main__"` guard `scripts/regenerate-sample-catalog.py`
- [ ] T025 [US5] Add type annotations to all functions and run pyright to verify `scripts/regenerate-sample-catalog.py`
- [ ] T026 [US5] Run ruff linter on the script and fix any issues `scripts/regenerate-sample-catalog.py`
- [ ] T027 [US5] Run full `task verify` — lint, typecheck, test must all pass
- [ ] T028 [US5] Verify idempotency — run the full regeneration a second time (nuke + reimport + enrich) and confirm same item count

**Checkpoint**: Script is CI-clean, typed, linted, and produces consistent output across runs.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Collect evidence, create media content, commit regenerated catalog, and create PR.

### Evidence Collection

- [ ] T029 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) `specs/184-regenerate-sample-catalog/evidence/test-summary.md`
- [ ] T030 Create usage demonstration showing full script invocation and output `specs/184-regenerate-sample-catalog/evidence/usage-example.md`
- [ ] T031 [P] Capture validation output from regeneration run `specs/184-regenerate-sample-catalog/evidence/validation-output.txt`

### Media Content

- [ ] T032 Create shipped blog post `specs/184-regenerate-sample-catalog/media/shipped-post.md`
- [ ] T033 [P] Create LinkedIn shipped summary `specs/184-regenerate-sample-catalog/media/linkedin-shipped.md`

### PR Creation

- [ ] T034 Create PR and publish blog: run /speckit.pr

**Task T034 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup — implements source extraction (US3 prerequisite)
- **Core Regeneration (Phase 3)**: Depends on Foundation — BLOCKS enrichment and verification
- **Registry Verification (Phase 4)**: Depends on Core Regeneration — checks registry state post-import
- **Enrichment (Phase 5)**: Depends on Core Regeneration — adds metadata to raw catalog
- **Idempotency (Phase 6)**: Depends on Enrichment — validates full end-to-end flow
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US3 (P1, Source Preservation)**: Foundation phase — must complete before any deletion
- **US1 (P1, Clean Regeneration)**: Depends on US3 — cannot nuke without safe extraction
- **US2 (P1, Registry Verification)**: Depends on US1 — registry checked after import
- **US4 (P2, Enrichment)**: Depends on US1 — enriches the raw imported catalog
- **US5 (P2, Idempotency)**: Depends on US4 — validates the complete pipeline

### Within Each Phase

- Tasks within a phase are sequential unless marked `[P]`
- Complete each checkpoint before proceeding

### Parallel Opportunities

- T002 and T003 can run in parallel (script skeleton + docstring)
- T004 and T001 are independent (discovery logic vs evidence capture)
- T016 and T017 can run in parallel (registry check vs warning check)
- T031, T032, T033 can run in parallel (evidence + media capture)

---

## Parallel Example: Phase 7

```bash
# Launch evidence and media tasks together:
Task: "Capture validation output" (T031)
Task: "Create shipped blog post" (T032)
Task: "Create LinkedIn shipped summary" (T033)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Source extraction works
2. Add Core Regeneration (US1 + US3) → Fresh catalog exists, source files preserved
3. Verify Registry (US2) → Known platforms confirmed
4. Add Enrichment (US4) → Full metadata on all items
5. Validate Idempotency (US5) → CI passes, repeatable
6. Polish → Evidence captured, PR created via `/speckit.pr`

### Key Risk: Source File Loss

The single highest-risk operation is deleting `local-store/` (T008). Mitigation:
- Source extraction (T004-T007) must complete and be verified before T008 runs
- T008 includes a safety check that staging completed successfully
- Source files are also tracked in git as a last-resort recovery path

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- This feature has a single new file (`scripts/regenerate-sample-catalog.py`) — most tasks modify the same file sequentially
- The regenerated catalog (~63 item directories) is committed to the repository as data
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
