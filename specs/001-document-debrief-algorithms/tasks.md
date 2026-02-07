# Tasks: Document Debrief Algorithms and Tools for Migration

**Input**: Design documents from `/specs/001-document-debrief-algorithms/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No executable test tasks — this is a documentation feature. Quality is validated via the 11-item Phase 4 checklist applied to each spec.

**Organization**: Tasks are grouped by user story to enable incremental, batched delivery. Each user story's work products feed into the next.

---

## Evidence Requirements

**Evidence Directory**: `specs/001-document-debrief-algorithms/evidence/`
**Media Directory**: `specs/001-document-debrief-algorithms/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Validation checklist results for all specs (pass/fail per item) | After Phase 6 validation complete |
| usage-example.md | Walkthrough of a completed tool spec with golden I/O | After first tool fully documented |
| discovery-report-summary.md | Summary statistics from discovery report | After Phase 3 discovery complete |
| sample-spec.md | Copy of a representative completed spec | After Phase 5 spec authoring |
| sample-golden-io.md | Annotated example of a golden I/O pair | After Phase 4 golden I/O capture |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (complete) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (complete) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the working environment in the legacy repo and review reference materials

- [x] T001 Create staging directory structure `_tool-migration/tools/` in legacy repo `debrief/debrief`
- [x] T002 [P] Review 4 existing reference specs in `shared/tools/track/styling/` for tone and detail level
- [x] T003 [P] Review TEMPLATE.md for the 9-section structure `shared/tools/TEMPLATE.md`
- [x] T004 [P] Review LEGACY-REPO-TASK.md for inline instructions `docs/tool-migration/LEGACY-REPO-TASK.md`
- [x] T005 [P] Review Java capture harness template `docs/tool-migration/java-harness-template/`
- [x] T006 Create reusable validation checklist document for Phase 4 `_tool-migration/validation-checklist.md`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Establish the identification patterns and discovery report skeleton before scanning begins

- [x] T007 Document initial tool identification patterns (class names, interfaces, method signatures) `_tool-migration/identification-patterns.md`
- [x] T008 [P] Create discovery report skeleton with all required sections `_tool-migration/discovery-report.md`
- [x] T009 [P] Create category directory structure for all 9 starting categories `_tool-migration/tools/{category}/`
- [x] T010 [P] Document exclusion rules (UI plumbing, deprecated code, view factories) in identification patterns

**Checkpoint**: Foundation ready — discovery scanning can now begin

---

## Phase 3: User Story 1 — Discover and Inventory All Migrateable Tools (Priority: P1) MVP

**Goal**: Produce a complete discovery report cataloguing every migrateable tool with 9 required columns, trigger type mapping, and triage.

**Independent Test**: Every tool-bearing class across the 4 package roots appears in the inventory; all 9 columns are populated; all 10 trigger types are mapped.

### Initial Scan

- [x] T011 Scan package root `org.mwc.debrief.core/src/` for tool classes using identification patterns
- [x] T012 Scan package root `org.mwc.debrief.track_shift/src/` for tool classes using identification patterns
- [x] T013 Scan package root `org.mwc.cmap.plotViewer/src/` for tool classes using identification patterns
- [x] T014 Scan package root `Debrief/` for tool classes using identification patterns

### Pattern Discovery and Re-scan

- [x] T015 Analyse initial scan results to identify additional tool patterns (base classes, common method signatures, registration hooks, package conventions) that the initial patterns missed `_tool-migration/identification-patterns.md`
- [x] T016 Re-scan all 4 package roots with expanded patterns to catch tools that fell through the initial scan
- [x] T017 Cross-reference discovered tools against Eclipse plugin.xml registrations to catch menu/toolbar-registered tools not found by class-pattern scan
- [x] T018 Review classes in utility/helper packages for embedded algorithmic logic that should be extracted as standalone tools

### Complexity Assessment

- [x] T019 Rate each discovered tool as Low/Medium/High using the 5-factor assessment (algorithm, dependencies, state, I/O shape, UI coupling)

### Trigger Type and UX Mapping

- [x] T020 Classify legacy trigger type for each tool (context-menu, toolbar-button, menu-bar, drag-drop, property-edit, wizard, key-binding, auto/listener, view-action, bulk/batch)
- [x] T021 [P] Record selection context and intermediate UI for each tool
- [x] T022 Compile trigger type summary table (count per type)
- [x] T023 Build UX integration mapping table (10 legacy triggers × 4 Future Debrief surfaces) with gap flags
- [x] T024 Write "Tools Requiring New UX Mechanisms" section for drag-drop and wizard-triggered tools

### Triage and Report Assembly

- [x] T025 Triage all tools: mark each as Ready, Needs Review, or Out of Scope with rationale
- [x] T026 [P] Refine category taxonomy based on actual tool groupings (merge/split/add categories as needed)
- [x] T027 Assemble full inventory table with all 9 columns populated for every tool
- [x] T028 Write summary table (tools per category by complexity and scope)
- [x] T029 [P] Write "Ready for Migration" section listing Low-complexity tools first
- [x] T030 [P] Write "Needs Review" section with notes per tool
- [x] T031 [P] Write "Out of Scope" section with exclusion reasons
- [x] T032 Review discovery report for completeness: verify every tool-bearing class is present, all columns filled, all sections non-empty

**Checkpoint**: Discovery report complete — golden I/O capture can begin for Ready tools

---

## Phase 4: User Story 2 — Capture Golden Input/Output Examples (Priority: P2)

**Goal**: Produce matched JSON input/output pairs for every Ready tool, meeting minimum example counts by complexity level.

**Independent Test**: Every Ready tool has golden files meeting its complexity minimum (1/3/4+); all JSON parses correctly; serialisation rules followed.

### Harness Setup

- [x] T033 Determine which Ready tools can run in isolation (Approach A: harness) vs require manual construction (Approach B)
- [x] T034 Integrate Java capture harness into legacy Maven build for Approach A tools (if applicable) `_tool-migration/harness-setup.md`

### Low-Complexity Tools — Batch 1 (track/styling, track/measurement)

- [x] T035 [P] Capture golden I/O for Low-complexity `track/styling` tools (1 basic pair each) `_tool-migration/tools/track/styling/`
- [x] T036 [P] Capture golden I/O for Low-complexity `track/measurement` tools (1 basic pair each) `_tool-migration/tools/track/measurement/`

### Low-Complexity Tools — Batch 2 (dataset/export, narrative/formatting)

- [x] T037 [P] Capture golden I/O for Low-complexity `dataset/export` tools (1 basic pair each) `_tool-migration/tools/dataset/export/`
- [x] T038 [P] Capture golden I/O for Low-complexity `narrative/formatting` tools (1 basic pair each) `_tool-migration/tools/narrative/formatting/`

### Medium-Complexity Tools

- [x] T039 Capture golden I/O for Medium-complexity tools (3 pairs each: basic, edge, complex) `_tool-migration/tools/{category}/`

### High-Complexity Tools

- [x] T040 Capture golden I/O for High-complexity tools (4+ pairs each: basic, edge-1, edge-2, complex) `_tool-migration/tools/{category}/`

### Eclipse-Coupled Tools (Manual Construction)

- [x] T041 Manually construct golden I/O for tools that cannot run in isolation; annotate status in discovery report `_tool-migration/tools/{category}/`

### Validation

- [x] T042 Validate all golden JSON files: parse check, floating-point precision, UTC timestamps, GeoJSON coordinates, deterministic ordering
- [x] T043 Verify example counts meet minimums: Low ≥ 1, Medium ≥ 3, High ≥ 4

**Checkpoint**: Golden I/O complete for all Ready tools — spec authoring can begin

---

## Phase 5: User Story 3 — Author Language-Neutral Tool Specifications (Priority: P3)

**Goal**: Write a complete 9-section specification for every tool with golden I/O, using pseudocode and the TEMPLATE.md structure.

**Independent Test**: Each spec has all 9 sections, pseudocode uses only approved keywords, result subtypes match naming patterns, golden examples are referenced, edge cases table has 5+ entries.

### Low-Complexity Specs — Batch 1

- [x] T044 [P] Author specs for `track/styling` tools `_tool-migration/tools/track/styling/{tool}.1.0.md`
- [x] T045 [P] Author specs for `track/measurement` tools `_tool-migration/tools/track/measurement/{tool}.1.0.md`

### Low-Complexity Specs — Batch 2

- [x] T046 [P] Author specs for `dataset/export` tools `_tool-migration/tools/dataset/export/{tool}.1.0.md`
- [x] T047 [P] Author specs for `narrative/formatting` tools `_tool-migration/tools/narrative/formatting/{tool}.1.0.md`

### Medium-Complexity Specs

- [x] T048 Author specs for `track/analysis` tools `_tool-migration/tools/track/analysis/{tool}.1.0.md`
- [x] T049 [P] Author specs for `sensor/calibration` tools `_tool-migration/tools/sensor/calibration/{tool}.1.0.md`
- [x] T050 [P] Author specs for `track/manipulation` tools `_tool-migration/tools/track/manipulation/{tool}.1.0.md`

### High-Complexity Specs

- [x] T051 Author specs for `spatial/geometry` tools `_tool-migration/tools/spatial/geometry/{tool}.1.0.md`
- [x] T052 [P] Author specs for `sensor/analysis` tools `_tool-migration/tools/sensor/analysis/{tool}.1.0.md`
- [x] T053 Author specs for any remaining High-complexity tools in other categories `_tool-migration/tools/{category}/{tool}.1.0.md`

**Checkpoint**: All specs authored — validation can begin

---

## Phase 6: User Story 4 — Validate Specs Against Quality Checklist (Priority: P4)

**Goal**: Every spec passes all 11 items on the validation checklist. Discovery report statuses updated to reflect final state.

**Independent Test**: Run the checklist against each spec; confirm pass on all items or documented remediation.

### Validation Pass

- [x] T054 Run 11-item validation checklist against all Low-complexity specs
- [x] T055 [P] Run 11-item validation checklist against all Medium-complexity specs
- [x] T056 [P] Run 11-item validation checklist against all High-complexity specs

### Remediation

- [x] T057 Fix any checklist failures (missing sections, keyword violations, naming issues, missing golden references)
- [x] T058 Re-validate fixed specs until all pass

### Status Update

- [x] T059 Update discovery report tool statuses to reflect final state (Ready → Spec-Complete, or unchanged if still pending) `_tool-migration/discovery-report.md`
- [x] T060 Write final summary section in discovery report with counts: total tools, Spec-Complete, Needs Review, Out of Scope

**Checkpoint**: All specs validated — ready for transfer and PR

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Transfer deliverables to debrief-future, collect evidence, create media content, and submit PR

### Transfer to debrief-future

- [x] T061 Copy discovery report to `docs/tool-migration/discovery-report.md`
- [x] T062 Copy tool specs and golden I/O from `_tool-migration/tools/` to `shared/tools/` (preserving category structure)
- [x] T063 Verify transferred files are intact (file count, no corruption, paths correct)

### Evidence Collection

- [x] T064 Capture validation results summary in `specs/001-document-debrief-algorithms/evidence/test-summary.md`
- [x] T065 Create usage example walkthrough of a completed tool spec with golden I/O `specs/001-document-debrief-algorithms/evidence/usage-example.md`
- [x] T066 [P] Capture discovery report statistics (tool count, complexity distribution, category breakdown) `specs/001-document-debrief-algorithms/evidence/discovery-report-summary.md`
- [x] T067 [P] Copy a representative completed spec as evidence `specs/001-document-debrief-algorithms/evidence/sample-spec.md`
- [x] T068 [P] Create annotated golden I/O example as evidence `specs/001-document-debrief-algorithms/evidence/sample-golden-io.md`

### Media Content

- [x] T069 Create shipped blog post `specs/001-document-debrief-algorithms/media/shipped-post.md`
- [x] T070 [P] Create LinkedIn shipped summary `specs/001-document-debrief-algorithms/media/linkedin-shipped.md`

### PR Creation

- [x] T071 Create PR and publish blog: run /speckit.pr

**Task T071 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup — BLOCKS discovery scanning
- **US1 Discovery (Phase 3)**: Depends on Foundation — BLOCKS golden I/O capture
- **US2 Golden I/O (Phase 4)**: Depends on Discovery report (Ready tools identified) — BLOCKS spec authoring
- **US3 Spec Authoring (Phase 5)**: Depends on Golden I/O for each tool — BLOCKS validation
- **US4 Validation (Phase 6)**: Depends on completed specs — BLOCKS transfer
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation (Phase 2) — no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 — needs the list of Ready tools and their categories
- **User Story 3 (P3)**: Depends on US2 — needs golden I/O pairs to reference in specs
- **User Story 4 (P4)**: Depends on US3 — needs completed specs to validate

### Within Each Batch

- Low-complexity tools are processed first (validate the pipeline)
- Within a complexity level, tools are batched by category (shared context)
- A tool's golden I/O must exist before its spec can be authored
- A spec must be authored before it can be validated

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002-T005)
- Foundation tasks T008-T010 can run in parallel
- Package root scans (T011-T014) are sequential (context builds across scans) but pattern re-scan (T016-T018) can leverage all findings at once
- Within golden I/O capture: Low-complexity batches 1 and 2 are independent ([P] tasks T035-T038)
- Within spec authoring: tools in different categories can be authored in parallel ([P] tasks)
- Validation of Low/Medium/High specs can run in parallel (T054-T056)
- Evidence collection tasks marked [P] can run in parallel (T066-T068)

---

## Parallel Example: Golden I/O Capture (Phase 4)

```bash
# Launch Low-complexity batch 1 and batch 2 in parallel:
Task: "Capture golden I/O for track/styling tools"    # T035
Task: "Capture golden I/O for track/measurement tools" # T036
Task: "Capture golden I/O for dataset/export tools"    # T037
Task: "Capture golden I/O for narrative/formatting tools" # T038
```

## Parallel Example: Spec Authoring (Phase 5)

```bash
# Launch Low-complexity spec authoring in parallel across categories:
Task: "Author specs for track/styling tools"     # T044
Task: "Author specs for track/measurement tools" # T045
Task: "Author specs for dataset/export tools"    # T046
Task: "Author specs for narrative/formatting tools" # T047
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: Discovery (User Story 1)
4. **STOP and VALIDATE**: Review discovery report with stakeholders
5. Share discovery report for feedback and triage review

### Incremental Delivery

1. Setup + Foundation → Infrastructure ready
2. Discovery (US1) → Authoritative inventory (MVP!)
3. Golden I/O for Low tools (US2 partial) → First test oracles
4. Specs for Low tools (US3 partial) + Validation (US4 partial) → First complete tool docs
5. Repeat for Medium tools → Expanding coverage
6. Repeat for High tools → Full documentation
7. Each batch adds validated specs without disrupting previous work

### Recommended Batch Progression

| Batch | Categories | Complexity | Expected Tools |
|-------|-----------|------------|----------------|
| 1 | track/styling | Low | ~2-4 remaining |
| 2 | track/measurement, dataset/export | Low | ~5-8 |
| 3 | narrative/formatting | Low | ~2-4 |
| 4 | track/analysis | Medium-High | ~5-8 |
| 5 | sensor/calibration | Medium | ~3-5 |
| 6 | track/manipulation | Medium-High | ~4-6 |
| 7 | spatial/geometry, sensor/analysis | High | ~3-6 |

---

## Notes

- [P] tasks = different files/categories, no dependencies
- Each user story depends on the previous one's output
- Discovery is the foundational MVP — all other work depends on it
- The pattern discovery step (T015-T018) is critical: initial patterns will miss tools, so actively look for new patterns to catch them
- Categories are a starting hypothesis — T026 refines them during discovery
- Commit after each batch of related tools completes its full pipeline (golden I/O + spec + validation)
- Evidence is required — capture artifacts that prove the documentation is complete and correct
- Run `/speckit.pr` after all tasks complete to create PR with evidence
