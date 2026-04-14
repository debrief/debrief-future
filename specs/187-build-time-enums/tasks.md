---

description: "Task list for feature 187-build-time-enums"
---

# Tasks: Build-Time Enum Extraction

**Input**: Design documents from `/specs/187-build-time-enums/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Tests**: Included — Article VI (mandatory test coverage for shared library code) and Article VII (test-driven AI collaboration) require executable acceptance criteria. The plan also commits to "pytest unit + integration tests cover all FRs".

**Organization**: Tasks are grouped by user story so each can be implemented and verified independently. P1 (US1) delivers the bundle producer; P2 (US2) layers determinism/drift verification on top; P3 (US3) confirms diagnostic visibility for unknown vocabulary.

**Revision history**: Updated after `/speckit.analyze` to close MEDIUM findings C1 (bundle-size assertion), C2 (CLI exit-code tests), C3 (vessel-class drift test) and LOW findings U1 (granular missing-field coverage), C4 (explicit dependency-surface check).

---

## Evidence Requirements

**Evidence Directory**: `specs/187-build-time-enums/evidence/`
**Media Directory**: `specs/187-build-time-enums/media/`

This is an **Infrastructure / CLI Tool / Library** feature. Evidence proves the script is reproducible, the bundle is well-formed, and the contract with the LLM prompt builder (#188) is honoured.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest results with YAML front matter (REQUIRED) | After all tests pass |
| `evidence/usage-example.md` | One-command invocation + expected count summary (REQUIRED) | After CLI works |
| `evidence/cli-demo.txt` | Terminal session showing the standard run + a fixture-overrides run | After CLI works |
| `evidence/sample-bundle.json` | Snapshot of the real generated bundle for review (truncated if needed) | After end-to-end run |
| `evidence/schema-validation-output.txt` | `jsonschema.validate` confirming bundle conforms to `contracts/enum-bundle.schema.json` | After end-to-end run |
| `evidence/determinism-proof.txt` | Two consecutive `sha256sum` runs of the bundle showing identical hashes | After end-to-end run |
| `evidence/config-sample.txt` | `--help` output documenting CLI flags | After CLI works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature | During /speckit.plan ✅ already created |
| `media/linkedin-planning.md` | LinkedIn summary for planning | During /speckit.plan ✅ already created |
| `media/shipped-post.md` | Blog post celebrating completion | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Triggered |
|--------|-------------|-----------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with shipped post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding for the new module and its test file. No logic yet.

- [x] T001 Add empty `enum_bundle` module exporting `BundleMeta`/`EnumBundle` `TypedDict`s and the `CatalogScanResult` dataclass + public function signatures (no implementation) `shared/data/src/debrief_data/enum_bundle.py`
- [x] T002 [P] Re-export `enum_bundle` symbols from the package `__init__` so callers import via `debrief_data` `shared/data/src/debrief_data/__init__.py`
- [x] T003 [P] Create empty pytest test file with imports and the fixture-catalog directory `shared/data/tests/test_enum_bundle.py`
- [x] T004 [P] Create the smallest possible fixture catalog (catalog.json + 2 item.json files covering tags, feature_tags, exercise prefix, and platform nationality) `shared/data/tests/fixtures/catalog/`

**Checkpoint**: Module importable, test file runnable (collects zero tests), fixtures on disk.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure helpers that every user story depends on. Each is a small, named function rather than a hidden private detail.

**⚠️ CRITICAL**: No user story work begins until Phase 2 is complete.

- [x] T005 Implement `_canonical_key(value: str) -> str` (trim + casefold) for deduplication `shared/data/src/debrief_data/enum_bundle.py`
- [x] T006 [P] Implement `_dedup_preserving_first(values: Iterable[str]) -> list[str]` that returns sorted (case-insensitive) values with first-seen casing preserved `shared/data/src/debrief_data/enum_bundle.py`
- [x] T007 [P] Implement `_parse_exercise_name(title: str | None) -> str | None` returning the substring before the first `": "`, or `None` if absent `shared/data/src/debrief_data/enum_bundle.py`
- [x] T008 Implement `_BUNDLE_META_DEFAULTS` constant — the values written to the bundle's `_meta` block `shared/data/src/debrief_data/enum_bundle.py`
- [x] T009 [test] Write unit tests for `_canonical_key`, `_dedup_preserving_first`, and `_parse_exercise_name` covering the canonicalisation rule (whitespace, case) and the conservative title-parse rule (no `": "` → `None`) `shared/data/tests/test_enum_bundle.py`

**Checkpoint**: Foundational helpers green; user-story implementation can start.

---

## Phase 3: User Story 1 - Generate enum bundle for the LLM prompt (Priority: P1)

**Goal**: A single command produces a compact, well-formed JSON bundle containing every controlled vocabulary the LLM prompt needs.

**Independent Test**: Run the script against the real registry and the regenerated sample catalog. Bundle file appears at the documented output path; opening it shows `_meta`, `vessel_class_tree`, `nationalities`, `exercise_names`, `tags`, `feature_tags`. Spot-check a sample item — every tag/nationality on it is reachable from the bundle.

### Tests for User Story 1 (write FIRST, ensure they FAIL before implementation)

- [x] T010 [P][test] [US1] Test `extract_class_tree(registry)` strips platform-instance leaves and preserves interior nodes including `_class` blocks `shared/data/tests/test_enum_bundle.py`
- [x] T011 [P][test] [US1] Test `scan_catalog(catalog_dir)` returns a `CatalogScanResult` with deduplicated tags + feature_tags + nationalities + exercise names from the fixture catalog `shared/data/tests/test_enum_bundle.py`
- [x] T012 [P][test] [US1] Test `scan_catalog(catalog_dir)` skips each optional field independently without crashing: (a) item with no `debrief:tags` → `tags` empty/unpolluted; (b) item with no `debrief:feature_tags` → `feature_tags` empty/unpolluted; (c) item with no `properties.title` → no exercise contribution; (d) item with no `debrief:platforms` → no nationality contribution; (e) item with `debrief:platforms[].nationality` absent on an individual entry → entry skipped, others preserved `shared/data/tests/test_enum_bundle.py`
- [x] T013 [P][test] [US1] Test `build_bundle(registry, catalog_dir)` unions registry + catalog nationalities and includes the `_meta` header `shared/data/tests/test_enum_bundle.py`
- [x] T014 [P][test] [US1] Test `serialize(bundle)` produces JSON that conforms to `specs/187-build-time-enums/contracts/enum-bundle.schema.json` (use `jsonschema`) `shared/data/tests/test_enum_bundle.py`
- [x] T015 [P][test] [US1] Test `serialize(build_bundle(real_registry, real_catalog))` produces output under 65,536 bytes — enforces FR-009 / SC-002 so the bundle cannot silently balloon beyond an LLM-prompt-friendly size `shared/data/tests/test_enum_bundle.py`
- [x] T016 [P][test] [US1] Test CLI exit codes via subprocess: (a) missing `--registry` path exits with code 1 and prints the missing path to stderr; (b) malformed registry JSON exits with code 2 and names the offending key/path to stderr — enforces FR-010 `shared/data/tests/test_enum_bundle.py`

### Implementation for User Story 1

- [x] T017 [US1] Implement `extract_class_tree(registry: PlatformRegistry) -> dict[str, object]` walking the registry's `_tree` and dropping nodes that match `_is_platform_entry` `shared/data/src/debrief_data/enum_bundle.py`
- [x] T018 [US1] Implement `scan_catalog(catalog_dir: Path) -> CatalogScanResult` that walks `local-store/*/item.json` in sorted order, harvesting tags, feature_tags, nationalities (from `debrief:platforms[].nationality`), and exercise names (from titles via `_parse_exercise_name`) `shared/data/src/debrief_data/enum_bundle.py`
- [x] T019 [US1] Implement `build_bundle(registry: PlatformRegistry, catalog_dir: Path) -> EnumBundle` composing the five sections and `_meta` `shared/data/src/debrief_data/enum_bundle.py`
- [x] T020 [US1] Implement `serialize(bundle: EnumBundle) -> str` using `json.dumps(..., indent=2, sort_keys=True, ensure_ascii=False)` plus trailing newline `shared/data/src/debrief_data/enum_bundle.py`
- [x] T021 [US1] Implement `scripts/extract-enum-bundle.py` CLI: `argparse` with `--registry`/`--catalog`/`--output` flags defaulting to canonical paths; loads registry, calls `build_bundle`, writes file, prints count summary to stdout, errors to stderr with non-zero exit codes (1 = missing input, 2 = malformed registry) `scripts/extract-enum-bundle.py`
- [x] T022 [US1] Run the script against real inputs and commit the generated artefact `shared/data/enum-bundle.json`

**Checkpoint**: Bundle exists in the repo; counts match the registry + catalog; all US1 tests green including size (T015) and exit-code (T016) assertions.

---

## Phase 4: User Story 2 - Detect drift when registry or catalog changes (Priority: P2)

**Goal**: Re-running the script after an input change updates the bundle predictably; re-running with no change produces a byte-identical file.

**Independent Test**: `sha256sum` the bundle, re-run the script, `sha256sum` again — identical hashes. Add a fake nationality (or vessel class, or tag) to the registry/catalog, re-run, observe the new code in the bundle.

### Tests for User Story 2

- [x] T023 [P][test] [US2] Test `serialize(build_bundle(...))` is byte-identical across two consecutive runs with the same fixture inputs `shared/data/tests/test_enum_bundle.py`
- [x] T024 [P][test] [US2] Test that adding a new interior vessel class (e.g. `surface/warship/cruiser`) to a fixture registry causes that class to appear in the bundle's `vessel_class_tree` — enforces US2 AC1 `shared/data/tests/test_enum_bundle.py`
- [x] T025 [P][test] [US2] Test that adding a new nationality to a fixture registry causes that nationality to appear in the resulting bundle `shared/data/tests/test_enum_bundle.py`
- [x] T026 [P][test] [US2] Test that adding a new tag to a fixture item causes that tag to appear in the bundle `shared/data/tests/test_enum_bundle.py`
- [x] T027 [P][test] [US2] Test that adding a new exercise prefix to a fixture item title causes that exercise to appear in the bundle `shared/data/tests/test_enum_bundle.py`

### Implementation for User Story 2

No new production code — US2 confirms determinism/drift behaviour delivered by US1. If any test fails, fix the underlying bug in `enum_bundle.py` (likely a non-deterministic iteration or a missed deduplication site).

**Checkpoint**: Determinism proven; drift detection works for all four dimensions (vessel class, nationality, tag, exercise); US1 + US2 green.

---

## Phase 5: User Story 3 - Discover unknown vocabulary during catalog evolution (Priority: P3)

**Goal**: Values present in the catalog but absent from the registry still appear in the bundle, so reviewers can spot intentional additions vs typos.

**Independent Test**: Add a deliberately misspelled tag to a fixture item; run the script; confirm the misspelled tag is in the bundle (proves the script does not silently drop it).

### Tests for User Story 3

- [x] T028 [P][test] [US3] Test that a tag appearing in only one fixture item still surfaces in the bundle's `tags` list `shared/data/tests/test_enum_bundle.py`
- [x] T029 [P][test] [US3] Test that a nationality appearing only on a catalog item (not in the registry) appears in the bundle's `nationalities` list `shared/data/tests/test_enum_bundle.py`
- [x] T030 [P][test] [US3] Test that an item whose title has no `": "` separator contributes no exercise name (no spurious entries) `shared/data/tests/test_enum_bundle.py`

### Implementation for User Story 3

No new production code — US3 confirms the conservative-extraction behaviour delivered by US1. Failures here also point to bugs in the existing implementation.

**Checkpoint**: All three user stories green; full pytest suite passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Sanity checks, documentation, evidence, media, and PR.

### Quality Gates

- [x] T031 Run `task verify` from repo root; fix any lint/typecheck/test failures introduced
- [x] T032 [P] Confirm `pyright` passes on `shared/data/src/debrief_data/enum_bundle.py` with strict typing (no `Any`)
- [x] T033 [P] Run `quickstart.md` end-to-end as a documentation smoke test (steps 1–5 produce expected output) `specs/187-build-time-enums/quickstart.md`
- [x] T034 [P] Verify no new third-party dependencies were introduced: diff `pyproject.toml`, `shared/data/pyproject.toml`, and `uv.lock` against `main` and confirm only the new module is added — enforces FR-013 `pyproject.toml`

### Evidence Collection (REQUIRED)

- [x] T035 Create evidence directory `specs/187-build-time-enums/evidence/`
- [x] T036 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) `specs/187-build-time-enums/evidence/test-summary.md`
- [x] T037 [P] Create usage demonstration with one-command invocation, sample stdout, and screenshot of the bundle contents `specs/187-build-time-enums/evidence/usage-example.md`
- [x] T038 [P] Capture full terminal session (default run + fixture-overrides run) `specs/187-build-time-enums/evidence/cli-demo.txt`
- [x] T039 [P] Snapshot the generated bundle (truncated to the first ~200 lines if large) `specs/187-build-time-enums/evidence/sample-bundle.json`
- [x] T040 [P] Capture `jsonschema.validate(bundle, schema)` output proving conformance with `contracts/enum-bundle.schema.json` `specs/187-build-time-enums/evidence/schema-validation-output.txt`
- [x] T041 [P] Capture two consecutive `sha256sum shared/data/enum-bundle.json` runs proving byte-identical output `specs/187-build-time-enums/evidence/determinism-proof.txt`
- [x] T042 [P] Capture `python scripts/extract-enum-bundle.py --help` output documenting the CLI surface `specs/187-build-time-enums/evidence/config-sample.txt`

### Media Content

- [x] T043 Create shipped blog post via Content Specialist agent (read `.claude/agents/media/content.md`); include "What We Built", lessons learned (e.g. canonicalisation trade-off, decision to commit the artefact), what's next (#188 prompt design) `specs/187-build-time-enums/media/shipped-post.md`
- [x] T044 [P] Create LinkedIn shipped summary (150–200 words, hook opening, link placeholder) `specs/187-build-time-enums/media/linkedin-shipped.md`

### PR Creation

- [ ] T045 Create PR and publish blog: run `/speckit.pr`

**Task T045 must run last. It depends on every preceding task being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks every user story.
- **Phase 3 (US1 — P1)**: Depends on Phase 2. Delivers the producing capability.
- **Phase 4 (US2 — P2)**: Depends on Phase 3 (no new production code, just confirmation tests).
- **Phase 5 (US3 — P3)**: Depends on Phase 3 (no new production code, just confirmation tests).
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5.

### User Story Dependencies

- **US1 (P1)**: Standalone — requires only Phase 2 helpers.
- **US2 (P2)**: Logically depends on US1 (validates US1's determinism and drift behaviour). Cannot ship before US1.
- **US3 (P3)**: Logically depends on US1 (validates US1's conservative-extraction behaviour). Cannot ship before US1.

### Within Each User Story

- Tests written first and failing before implementation (Article VII).
- Pure helpers before composing functions: `_canonical_key` → `_dedup_preserving_first` → `scan_catalog` → `build_bundle`.
- Library logic before CLI script (so the script is a thin orchestrator).
- End-to-end run against real inputs after the library is green.

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 are all `[P]` — different files, no shared state.
- **Phase 2**: T006, T007 are `[P]` — independent helpers. T009 depends on T005–T008.
- **Phase 3 tests (T010–T016)**: All `[P]` — same file, but each test function is independent. Authors can write them in parallel.
- **Phase 4/5 tests (T023–T030)**: All `[P]` — independent confirmation tests.
- **Polish evidence tasks (T036–T042)**: T037–T042 are `[P]` — different files. T036 (test summary) waits on T031.

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests in parallel:
Task: "Test extract_class_tree strips platform leaves"          # T010
Task: "Test scan_catalog deduplicates harvested values"         # T011
Task: "Test scan_catalog skips each optional field"             # T012
Task: "Test build_bundle unions registry + catalog data"        # T013
Task: "Test serialize produces JSON conforming to schema"       # T014
Task: "Test serialized bundle stays under 65 KiB"               # T015
Task: "Test CLI exit codes via subprocess"                      # T016

# Then implement sequentially (each depends on the previous):
Task: "Implement extract_class_tree"      # T017
Task: "Implement scan_catalog"            # T018
Task: "Implement build_bundle"            # T019
Task: "Implement serialize"               # T020
Task: "Implement CLI script"              # T021
Task: "Run end-to-end and commit bundle"  # T022
```

---

## Implementation Strategy

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready.
2. Phase 3 (US1) → Bundle producer works end-to-end; commit `enum-bundle.json`.
3. Phase 4 (US2) → Determinism and drift coverage in place.
4. Phase 5 (US3) → Conservative-extraction coverage in place.
5. Phase 6 → Quality gates, evidence, media, PR.

### Single-Developer Path (most likely)

Sequential pass through phases, committing after each user story so the PR diff has clear stops. Phase 3 is the only phase that adds production code; Phases 4/5 should mostly add tests and possibly tighten Phase 3's implementation if a test fails.

---

## Notes

- `[P]` tasks operate on different files OR independent test functions in the same file.
- `[US1|US2|US3]` traces tasks back to their user story.
- Tests written first and required to fail before implementation (Article VII; plan.md).
- Commit per user story or per logical group; PR contains every commit.
- Evidence is required — `/speckit.pr` will refuse to run without it.
- The committed `shared/data/enum-bundle.json` is the primary review surface. Re-run the script and re-commit the artefact whenever any input changes.
