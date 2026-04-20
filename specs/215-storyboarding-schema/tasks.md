---

description: "Task list for 215-storyboarding-schema"
---

# Tasks: Storyboarding — Schema + CRUD Core

**Input**: Design documents from `/specs/215-storyboarding-schema/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks are INCLUDED throughout. Article II (schema adherence) and Article VI (services must be tested) both make testing mandatory for this feature.

**Organization**: Tasks are grouped by user story (US1 schema round-trip, US2 CRUD enforcement, US3 missing-data detection) so each story can be independently implemented and tested.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. Used in PR description, documentation, and the shipped blog post.

**Evidence Directory**: `specs/215-storyboarding-schema/evidence/`
**Media Directory**: `specs/215-storyboarding-schema/media/`

### Feature type

This spec combines two evidence archetypes:

1. **Schema Change** — round-trip proof (Python → JSON → TypeScript → JSON → Python) required per Article II. Gate landing in-slice per FR-TEST-023.
2. **Library/SDK** — the headless CRUD module is consumed by three sibling specs; code examples plus output are required per the Quality Rubric.

Not a UI component: **no** Storybook screenshots, no interaction GIF, no Playwright webview E2E. Plan.md explicitly records "None — backend/infrastructure feature".

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest + vitest totals (Python schema tests, TS module tests, cross-lang harness, perf bench) using YAML front matter template | After full test suite passes |
| `evidence/usage-example.md` | TypeScript code showing `createStoryboard → createScene → listScenesOrdered` end-to-end with commented output | After US2 complete |
| `evidence/round-trip-evidence.md` | Py→JSON→TS→JSON→Py walkthrough for `storyboard-single-minimal.json` and `storyboard-scene-single-minimal.json` with byte-equality assertions | After cross-lang harness passes |
| `evidence/usage-example.ts` | Runnable TS example paralleling the markdown above | After US2 complete |
| `evidence/output.txt` | Captured console output from running `usage-example.ts` via `tsx` | After US2 complete |
| `evidence/perf-bench-results.md` | Vitest bench output table for `createScene`/`updateScene`/`copySceneToOtherStoryboard` at 100/1k/10k/100k positions, with p95 < 10 ms verdict | After FR-TEST-024 task complete |
| `evidence/pydantic-vs-linkml-diff.txt` | Empty diff (or `no differences found`) output from the schema-compare test | After SC-002 task complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning blog post (regenerated after review) | Already created during /speckit.plan |
| `media/linkedin-planning.md` | LinkedIn summary for planning (regenerated after review) | Already created during /speckit.plan |
| `media/shipped-post.md` | Shipped blog post celebrating completion | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with evidence + media | Final task (runs `/speckit.pr`) |
| Blog PR | PR in `debrief/debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: Declare new runtime dependencies and create empty module scaffolding so every downstream task can write into existing folders.

- [x] T001 [P] Add `immer ^10.1.3` and `ulid ^3.0.2` to dependencies `shared/components/package.json`
- [x] T002 Run `pnpm install` at repo root to lock the new deps `pnpm-lock.yaml`
- [x] T003 [P] Create empty module scaffold with `index.ts` placeholder re-exports `shared/components/src/storyboard/index.ts`
- [x] T004 [P] Create empty `__tests__` directory with a `.gitkeep` so vitest discovers it early `shared/components/src/storyboard/__tests__/.gitkeep`
- [x] T005 [P] Re-export the new `storyboard` module from the package barrel `shared/components/src/index.ts`

**Checkpoint**: New deps are installed; empty module is importable (but exports nothing yet).

---

## Phase 2: Foundational — Schema + Generation Pipeline

**Purpose**: Land the LinkML schema delta, regenerate Pydantic/JSON-Schema/TypeScript bindings, and lift `sha256Hex` into its new shared location. Everything downstream — all three user stories and every fixture — depends on the generated types being available.

**⚠️ CRITICAL**: Phase 2 MUST complete before any user-story phase begins. The generated `@debrief/schemas` types are imported by both the Python round-trip tests and every TypeScript module.

### Schema edits

- [x] T010 Extend `FeatureKindEnum` with `STORYBOARD` and `STORYBOARD_SCENE` permissible values `shared/schemas/src/linkml/common.yaml`
- [x] T011 Add optional `agent: string` slot to `LogEntry` `shared/schemas/src/linkml/log-entry.yaml`
- [x] T012 Create `storyboard.yaml` LinkML module defining `StoryboardProperties`, `SceneProperties`, `Viewport` (all inheriting `BaseFeatureProperties` where applicable); encode `time_range` absent-in-v1 and `bearing equals_number 0` reserved-slot constraints per research.md R2 `shared/schemas/src/linkml/storyboard.yaml`
- [x] T013 Import `storyboard` module from the master schema `shared/schemas/src/linkml/debrief.yaml`

### Generation pipeline

- [x] T014 Run `task schemas:generate` (or `uv run python -m debrief_schemas.build`) to regenerate Pydantic, JSON Schema, and TypeScript; verify no manual edits land in generated output `shared/schemas/src/generated/`
- [x] T015 Register `StoryboardFeature` and `SceneFeature` in the generated `@debrief/schemas` TypeScript barrel (confirm the LinkML `gen-typescript` pass emits them; add manual re-exports only if the generator doesn't do it automatically) `shared/schemas/src/ts/index.ts`

### Shared utility lift

- [x] T016 Create canonical async `sha256Hex(input: string): Promise<string>` helper at new shared location `shared/components/src/utils/hash.ts`
- [x] T017 Update `nl-cql2/hash.ts` to re-export from the new shared location (no behaviour change) `shared/components/src/nl-cql2/hash.ts`
- [x] T018 [test] Confirm existing nl-cql2 tests still pass against the re-exported symbol `shared/components/src/nl-cql2/__tests__/hash.test.ts`

**Checkpoint**: Schema edits regenerate cleanly; `@debrief/schemas` exposes the new types; `sha256Hex` is in its canonical location. Ready to start fixtures + the Python adherence tests (US1).

---

## Phase 3: User Story 1 — Schema round-trips cleanly across Python and TypeScript (P1)

**Goal**: Every Storyboard/Scene fixture round-trips losslessly through Python ↔ TypeScript, the generated JSON Schemas match the LinkML-authored ones, and every invariant has both a positive and a negative fixture.

**Independent Test**: `uv run pytest shared/schemas/tests/test_roundtrip.py shared/schemas/tests/test_schema_compare.py shared/schemas/tests/test_validation.py shared/schemas/tests/test_crosslang_roundtrip.py` — all four files green with zero field drift.

### Fixtures — valid (single-Feature, for round-trip harness)

- [x] T020 [P] [US1] Create minimal single-Feature Storyboard fixture (one `create` LogEntry) `shared/schemas/src/fixtures/valid/storyboard-single-minimal.json`
- [x] T021 [P] [US1] Create minimal single-Feature Scene fixture (`visible_feature_ids: []`, hash of empty canonical list, `time_range: null`, `bearing: 0`) `shared/schemas/src/fixtures/valid/storyboard-scene-single-minimal.json`

### Fixtures — valid (FeatureCollection, for integration)

- [x] T022 [P] [US1] Create minimal FeatureCollection fixture (one Storyboard + one Scene) `shared/schemas/src/fixtures/valid/storyboard-scene-minimal.json`
- [x] T023 [P] [US1] Create full-featured FeatureCollection fixture (one Storyboard + three Scenes at distinct timestamps, realistic provenance chains) `shared/schemas/src/fixtures/valid/storyboard-full-featured.json`

### Fixtures — invalid (one per negative invariant)

- [x] T024 [P] [US1] Create duplicate-timestamp invalid fixture (two Scenes, same `storyboard_id`, same `timestamp`) `shared/schemas/src/fixtures/invalid/storyboard-scene-duplicate-timestamp.json`
- [x] T025 [P] [US1] Create non-null `time_range` invalid fixture `shared/schemas/src/fixtures/invalid/storyboard-scene-non-null-time-range.json`
- [x] T026 [P] [US1] Create `bearing: 3.14` invalid fixture `shared/schemas/src/fixtures/invalid/storyboard-scene-bearing-nonzero.json`
- [x] T027 [P] [US1] Create orphan-Scene invalid fixture (Scene `storyboard_id` has no matching Storyboard in the plot) `shared/schemas/src/fixtures/invalid/storyboard-scene-orphan.json`

### Python-side adherence tests

- [x] T028 [US1] Register `storyboard-scene` **before** `storyboard` in the `ROUNDTRIP_ENTITY_MAP` so prefix matching picks Scenes before Storyboards (filename-prefix collision called out in data-model.md §7) `shared/schemas/tests/test_roundtrip.py`
- [x] T029 [US1][test] Extend the existing positive round-trip test so both single-Feature fixtures are parsed as `StoryboardFeature` / `SceneFeature`, dumped, reparsed, and deep-equal against the loaded dict `shared/schemas/tests/test_roundtrip.py`
- [x] T030 [US1][test] Add negative cases for all four invalid fixtures; each assertion matches on the violated invariant name `shared/schemas/tests/test_validation.py`
- [x] T031 [US1][test] Add `test_storyboard_pydantic_vs_linkml_schema` — load both generated JSON Schemas and assert field-for-field equality (reuse the existing `deep_equal` helper) `shared/schemas/tests/test_schema_compare.py`

### Cross-language round-trip harness (FR-TEST-023, SC-001)

- [x] T032 [P] [US1] Create Node script that reads a JSON path from argv, parses + serialises via generated TS `StoryboardFeature`/`SceneFeature`, and prints the round-tripped JSON to stdout `shared/schemas/tests/helpers/crosslang_roundtrip_node.mjs`
- [x] T033 [US1][test] Create pytest suite that invokes the Node script via `subprocess.run(["node", ...])`, captures stdout, and deep-equals against the Pydantic-reparsed result for each single-Feature valid fixture `shared/schemas/tests/test_crosslang_roundtrip.py`

**Checkpoint**: Article II gates — SC-001, SC-002, SC-003 — are green. The schema is durable and the invariant surface is fully negative-tested. US2 can now build on it.

---

## Phase 4: User Story 2 — CRUD module enforces all invariants at the module boundary (P2)

**Goal**: Every mutation op (`createStoryboard`, `renameStoryboard`, `deleteStoryboard`, `createScene`, `updateScene`, `deleteScene`, `duplicateScene`, `copySceneToOtherStoryboard`) enforces the invariant surface from the module boundary, returns a `Promise<{plot, …}>`, uses `immer.produce` for structural sharing, appends exactly one `LogEntry` to `provenance[]`, and rolls back atomically under injected mid-op failure.

**Independent Test**: `pnpm --filter @debrief/components test -- storyboard` — every file in `src/storyboard/__tests__/` green. Negative tests match on `err.code`, positive tests deep-equal expected `LogEntry` encoding and assert reference-equality on unmodified Features.

### Types + error vocabulary

- [x] T040 [P] [US2] Define branded types (`StoryboardId`, `SceneId`, `Ulid`) and the `Plot` type alias `shared/components/src/storyboard/types.ts`
- [x] T041 [P] [US2] Define `StoryboardError` abstract base + all nine subclasses per research.md R7 (each carrying its named fields; `readonly code` assigned in constructor) `shared/components/src/storyboard/errors.ts`

### Provenance helper (shared across every mutation)

- [x] T042 [US2] Implement `buildStoryboardCrudLogEntry(input)` emitting `was_generated_by.tool = "storyboard-crud"`, `was_generated_by.tool_version = "1.0.0"`, `agent`, `activity_id` (UUID v4, overridable for tests), `execution_duration = "PT0S"` per data-model.md §4 `shared/components/src/storyboard/provenance.ts`
- [x] T043 [US2] Implement derived read accessors `getCreatedAt`, `getLastModifiedAt`, `getCreatedBy`, `getLastModifiedBy` reading `provenance[0]` / `provenance[last]` `shared/components/src/storyboard/provenance.ts`
- [x] T044 [US2][test] Positive tests: every mutation appends exactly one entry with the correct `op`; append-only invariant (prior entries unchanged) `shared/components/src/storyboard/__tests__/provenance.test.ts`

### Invariant helpers

- [x] T045 [P] [US2] Implement `canonicaliseVisibleFeatureIds` (sync: trim, reject empty → `ReservedSlotViolation`, dedupe, sort ascending) `shared/components/src/storyboard/hash.ts`
- [x] T046 [US2] Implement async `computeFeatureSetHash(ids)` calling `canonicaliseVisibleFeatureIds` then `sha256Hex(JSON.stringify(canonical))` from `utils/hash.ts` `shared/components/src/storyboard/hash.ts`
- [x] T047 [US2][test] Canonicalisation + hash tests: equal inputs → equal hash; dedup/sort/trim observably normalise; empty-string ID rejection; known-vector hash match `shared/components/src/storyboard/__tests__/hash.test.ts`

### DTG formatter

- [x] T048 [P] [US2] Implement `formatDtg(isoInstant)` returning `DDHHmmZ MMM YY`, falling back to input on parse failure `shared/components/src/storyboard/dtg.ts`
- [x] T049 [P] [US2][test] DTG round-trip tests including fallback on `"not-a-date"` and UTC boundary case `shared/components/src/storyboard/__tests__/dtg.test.ts`

### Ordering + queries (synchronous)

- [x] T050 [P] [US2] Implement `listScenesOrdered(plot, storyboardId)` sorting by `properties.timestamp` ascending `shared/components/src/storyboard/ordering.ts`
- [x] T051 [P] [US2] Implement `getStoryboard`, `getScene`, `getActiveStoryboardDefault` (first Storyboard by `name` ascending) `shared/components/src/storyboard/queries.ts`
- [x] T052 [P] [US2] Implement `readSceneWithStaleness(plot, sceneId)` returning `{scene, storedHash, canonicalVisibleIds}` — sync per research.md R11 `shared/components/src/storyboard/queries.ts`
- [x] T053 [US2][test] Ordering tests covering arbitrary insertion order, ties asserting impossibility (duplicate timestamps rejected upstream) `shared/components/src/storyboard/__tests__/ordering.test.ts`

### CRUD — Storyboards (async)

- [x] T054 [US2] Implement `createStoryboard` (ULID via `ulid`, duplicate-name check → `DuplicateStoryboardName`, `immer.produce`, provenance append) `shared/components/src/storyboard/crud.ts`
- [x] T055 [US2] Implement `renameStoryboard` (unknown → `UnknownStoryboard`, duplicate-name check, provenance append with `op: rename`) `shared/components/src/storyboard/crud.ts`
- [x] T056 [US2] Implement `deleteStoryboard` with cascading Scene removal + returned `removedSceneIds`, atomic (immer recipe) `shared/components/src/storyboard/crud.ts`

### CRUD — Scenes (async)

- [x] T057 [US2] Implement `createScene` — canonicalise `visibleFeatureIds`, compute hash (`await computeFeatureSetHash`), duplicate-timestamp check within storyboard → `DuplicateTimestamp`, orphan check → `OrphanScene`, reserved-slot checks → `ReservedSlotViolation`, default `title` from `formatDtg(timestamp)`, emit `op: create` or `op: insert-middle` based on timestamp neighbours `shared/components/src/storyboard/crud.ts`
- [x] T058 [US2] Implement `updateScene` — patch-only fields; recompute hash only if `visibleFeatureIds` in patch; select `op: describe` vs `op: update-to-current` based on which fields changed `shared/components/src/storyboard/crud.ts`
- [x] T059 [US2] Implement `deleteScene` — unknown → `UnknownScene`; provenance entry appended **before** removal (consumer-side undo buffer concern) `shared/components/src/storyboard/crud.ts`
- [x] T060 [US2] Implement `duplicateScene` — fresh ULID, `newTimestamp` differs from source's, same `storyboard_id`, recomputed hash (identical canonical IDs but still explicitly computed), `op: duplicate` `shared/components/src/storyboard/crud.ts`
- [x] T061 [US2] Implement `copySceneToOtherStoryboard` — `await input.deepCopyThumbnail(…)` inside the `immer.produce` recipe; if it rejects, wrap in `ThumbnailDeepCopyFailed` and rethrow so the draft is discarded; new Scene gets destination `storyboard_id` + fresh ULID + `op: copy-in` `shared/components/src/storyboard/crud.ts`

### CRUD tests

- [x] T062 [P] [US2][test] Happy-path tests for each CRUD op (create/rename/delete Storyboard; create/update/delete/duplicate/copy Scene) `shared/components/src/storyboard/__tests__/crud.test.ts`
- [x] T063 [P] [US2][test] Negative tests matching on `err.code` for every error class from research.md R7 `shared/components/src/storyboard/__tests__/crud-errors.test.ts`
- [x] T064 [P] [US2][test] Structural-sharing invariant (FR-MODULE-022): after any mutation, every unchanged Feature in `plot.features` is reference-equal (`===`) to its counterpart in the returned plot `shared/components/src/storyboard/__tests__/structural-sharing.test.ts`
- [x] T065 [P] [US2][test] Atomicity (SC-005): inject a `deepCopyThumbnail` that throws on second invocation; assert input plot is byte-identical post-call (deep-equal pre-snapshot) `shared/components/src/storyboard/__tests__/atomicity.test.ts`
- [x] T066 [P] [US2][test] Deep-copy-thumbnail (FR-MODULE-015): copied Scene's `thumbnail_asset_ref` differs from source's; the consumer-supplied `deepCopyThumbnail` is called exactly once with expected args `shared/components/src/storyboard/__tests__/crud.test.ts`

### Save-time validator + migration hook

- [x] T067 [P] [US2] Implement `validatePlot` throwing the first invariant violation encountered (`OrphanScene` | `DuplicateTimestamp` | `DuplicateStoryboardName` | `ReservedSlotViolation`) `shared/components/src/storyboard/validate.ts`
- [x] T068 [P] [US2][test] `validatePlot` tests: passes on `storyboard-full-featured.json`, throws on each of the four invalid fixtures `shared/components/src/storyboard/__tests__/validate.test.ts`
- [x] T069 [P] [US2] Implement `runPlotOpenMigrations(plot, registry)` chaining by target version; export `V1_MIGRATIONS` as a `Map<number, MigrationFn>` with a no-op at key `1` `shared/components/src/storyboard/migration.ts`
- [x] T070 [P] [US2][test] Migration hook tests: v1 no-op returns input reference; stub registry proves chain-by-target-version order; error inside migration wrapped as `SchemaMigrationFailed` `shared/components/src/storyboard/__tests__/migration.test.ts`

### Public barrel

- [x] T071 [US2] Populate `index.ts` with every public re-export named in contracts/crud-module-api.md §§1–9 `shared/components/src/storyboard/index.ts`
- [x] T072 [US2][test] Build-time UI-coupling check (SC-008): static import graph asserts `src/storyboard/index.ts` has zero transitive imports from `react`, `vscode`, `leaflet`, `react-leaflet`, or `@debrief/components` visual-component paths `shared/components/src/storyboard/__tests__/no-ui-imports.test.ts`

**Checkpoint**: US2 complete. The CRUD module enforces every invariant, is async-first, uses `immer` for structural sharing, and has no UI framework imports on the core path.

---

## Phase 5: User Story 3 — Missing-data detection is accurate and side-effect-free (P3)

**Goal**: `detectMissingDataForScene(scene, plotFeatures, plotTimeRange)` classifies as `ok` / `missing-features` / `out-of-range`, is synchronous, and mutates nothing.

**Independent Test**: `pnpm --filter @debrief/components test -- missing-data` — every matrix case returns the expected classification; deep-equal snapshot of inputs before/after confirms purity (SC-006).

### Implementation

- [x] T080 [US3] Implement `detectMissingDataForScene` — sync, pure, returns tagged union `{kind: "ok" | "missing-features" | "out-of-range", ...}`; intersect `scene.properties.visible_feature_ids` with `plotFeatures` IDs; bound-check `scene.properties.timestamp` against `plotTimeRange` `shared/components/src/storyboard/missing-data.ts`
- [x] T081 [US3] Wire `detectMissingDataForScene` into the public barrel `shared/components/src/storyboard/index.ts`

### Tests

- [x] T082 [P] [US3][test] Happy path: Scene with fully-resolved `visible_feature_ids` and in-range timestamp → `{kind: "ok"}` `shared/components/src/storyboard/__tests__/missing-data.test.ts`
- [x] T083 [P] [US3][test] Missing features: one/some unresolved IDs → `{kind: "missing-features", missingIds: [...]}` with exact set match `shared/components/src/storyboard/__tests__/missing-data.test.ts`
- [x] T084 [P] [US3][test] Out of range: timestamp before `plotTimeRange.start` or after `plotTimeRange.end` → `{kind: "out-of-range"}` (takes precedence over missing-features — document decision via test) `shared/components/src/storyboard/__tests__/missing-data.test.ts`
- [x] T085 [P] [US3][test] Purity (SC-006): snapshot inputs, invoke detector across all classification branches, deep-equal snapshots post-call. No in-place `sort`, `push`, or property assignment ever observable on either argument `shared/components/src/storyboard/__tests__/missing-data.test.ts`

**Checkpoint**: US3 complete. All three user stories are independently testable. Polish phase can run.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance bench, evidence collection, media content, PR.

### Performance benchmark (FR-TEST-024)

- [x] T090 [P] Create Vitest bench covering `createScene`, `updateScene`, `copySceneToOtherStoryboard` at 100 / 1k / 10k / 100k synthetic position reports; assert p95 < 10 ms at 100k on the CI runner `shared/components/src/storyboard/__tests__/perf.bench.ts`
- [x] T091 [P] Add `test:bench` script (or extend existing) so CI can invoke the bench on demand without blocking the main test run `shared/components/package.json`

### Full suite verification

- [x] T092 Run `task verify` (lint + typecheck + test) at repo root and capture pass/fail summary
- [x] T093 Run `pnpm --filter @debrief/components test:bench` and capture the bench output table

### Evidence collection (REQUIRED)

- [x] T094 Create evidence directory `specs/215-storyboarding-schema/evidence/`
- [x] T095 Capture test summary using the template at `.specify/templates/evidence/test-summary-template.md` — YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) plus narrative of key scenarios verified `specs/215-storyboarding-schema/evidence/test-summary.md`
- [x] T096 [P] Create round-trip evidence narrative walking `storyboard-single-minimal.json` and `storyboard-scene-single-minimal.json` Py → JSON → TS → JSON → Py with byte-equality proof and a small diff on an intentionally-corrupted copy (showing the harness catches drift) `specs/215-storyboarding-schema/evidence/round-trip-evidence.md`
- [x] T097 [P] Write runnable TypeScript usage example: `createStoryboard → createScene → listScenesOrdered → readSceneWithStaleness` with comments keyed to each API, designed to run under `tsx` `specs/215-storyboarding-schema/evidence/usage-example.ts`
- [x] T098 [P] Write markdown usage walkthrough paralleling the TS file, with commentary on the async boundary, structural-sharing property, and provenance encoding `specs/215-storyboarding-schema/evidence/usage-example.md`
- [x] T099 [P] Capture console output from running `npx tsx evidence/usage-example.ts` `specs/215-storyboarding-schema/evidence/output.txt`
- [x] T100 [P] Capture Vitest bench output as a markdown table with the p95 < 10 ms verdict `specs/215-storyboarding-schema/evidence/perf-bench-results.md`
- [x] T101 [P] Capture empty-diff output from the schema-compare test to prove SC-002 `specs/215-storyboarding-schema/evidence/pydantic-vs-linkml-diff.txt`

### Media content

- [x] T102 Create shipped blog post using the Content Specialist agent — structure per `.claude/agents/media/content.md`: What We Built, Design Decisions (async-first, immer, LogEntry provenance, kind discriminator), Testing Story (cross-lang harness, perf bench), Lessons Learned, What's Next (pointers to #216/#217/#218) `specs/215-storyboarding-schema/media/shipped-post.md`
- [x] T103 [P] Create LinkedIn shipped summary (150–200 words, hook opening, link to full post, 2–3 relevant tags) `specs/215-storyboarding-schema/media/linkedin-shipped.md`

### PR creation

- [ ] T104 Create PR and publish blog: run `/speckit.pr`

**Task T104 must run last. It depends on all evidence and media tasks being complete and verified.**

---

## Dependencies

### Phase ordering

- **Phase 1 (Setup)** — no dependencies; start immediately.
- **Phase 2 (Foundational)** — depends on Phase 1; **BLOCKS all user-story phases**. The generated `@debrief/schemas` types must exist before any TS module or Python test can import them.
- **Phase 3 (US1)** — depends on Phase 2. Produces fixtures consumed by Phases 4/5 tests and the round-trip evidence.
- **Phase 4 (US2)** — depends on Phase 2 (for types) and uses the valid fixtures from Phase 3 in its tests (soft dependency: Phase 4 can begin in parallel with Phase 3 once types regenerate, but structural-sharing and atomicity tests want at least one FeatureCollection fixture to be present).
- **Phase 5 (US3)** — depends on Phase 2. Can run in parallel with Phase 4.
- **Phase 6 (Polish)** — depends on all prior phases. Evidence and media tasks require a fully passing suite.

### Key task-level edges

- T002 `pnpm install` must finish before any TS compile (T005, T016, T040+).
- T014 schema regeneration must finish before T028 (Python roundtrip map) and T040 (TS types import).
- T016 (utils/hash.ts) must finish before T046 (`computeFeatureSetHash`).
- T041 (errors) must finish before any CRUD task throwing them (T054+).
- T042 (`buildStoryboardCrudLogEntry`) must finish before every CRUD op (T054–T061).
- T045 (canonicalise) before T046 (hash) before T057 (createScene).
- T032 (Node helper) before T033 (pytest cross-lang harness).
- T067 (`validatePlot`) before T068 (its tests).
- T071 (public barrel) before T081 (adding missing-data export to the same barrel) — sequence them; same file.
- T092 + T093 (full verify) before every evidence task (T094–T101).
- T104 (`/speckit.pr`) after all evidence + media tasks.

### Parallel opportunities

- Phase 1: T001, T003, T004, T005 all parallel (different files).
- Phase 2: schema edits T010 + T011 parallel (different YAML files); T012 sequential after them (imports the enum). Generation pipeline T014 is serial.
- Phase 3 fixtures: T020–T027 all parallel (different JSON files).
- Phase 4 types / errors: T040 + T041 parallel. Hash + DTG + queries are all parallel (T045, T048, T050, T051, T052 different files). CRUD ops T054–T061 sequential — they all write to `crud.ts`. CRUD tests T062–T066 parallel once CRUD ops exist.
- Phase 5: T082–T085 parallel (all in the same file, but each test is independent — "parallel" here means they can be authored by separate developers merging to the same file without conflicts if they grab distinct `describe` blocks).
- Phase 6: T096–T101 (all evidence artefacts in separate files) parallel.

---

## Implementation Strategy

### Incremental delivery

1. **Phase 1 + 2 → foundation ready.** Deps installed, schema + types regenerated, `sha256Hex` lifted. No behaviour change observable yet.
2. **Phase 3 → Article II gate green.** Fixtures + Python/TS cross-language round-trip prove the schema is durable before any CRUD code exists. Hitting SC-001 / SC-002 / SC-003 at this point lets every downstream spec (#216–#218) plan against the types with confidence.
3. **Phase 4 → headless CRUD.** `createStoryboard`, `createScene`, and friends land with async / immer / provenance wiring. The module is importable from `@debrief/components/storyboard` but still not wired into any UI.
4. **Phase 5 → missing-data detector.** Pure, sync, independently testable. Downstream playback (#217) and edit (#218) now have a shared classifier.
5. **Phase 6 → perf, evidence, media, PR.** Bench proves the p95 < 10 ms target; evidence artefacts are captured; shipped blog post is drafted; `/speckit.pr` runs last to create the feature PR and the blog PR in parallel.

### Parallel team strategy

With three developers available:

1. All three land Phase 1 + 2 together (one owns schema edits, one owns `utils/hash.ts` lift, one owns the empty scaffold and package.json).
2. Once Phase 2 is green:
   - **Dev A — Phase 3 (US1)**: fixtures + Python adherence tests + cross-lang harness.
   - **Dev B — Phase 4 (US2)**: CRUD module.
   - **Dev C — Phase 5 (US3)**: missing-data detector (smallest phase; Dev C rolls onto the Phase 6 bench + evidence prep once US3 lands).
3. Phase 6 converges — one developer drives `/speckit.pr` once evidence and media are complete.

### Commit discipline

- Commit after each task or logically grouped pair (e.g. implementation + its test).
- Keep Phase 2 commits atomic: a single "schema regeneration" commit contains `storyboard.yaml`, enum extension, log-entry edit, and the regenerated artefacts — reviewers can revert as one unit.
- Never commit hand-edits to `shared/schemas/src/generated/`; if regeneration fails to re-emit expected output, treat it as a LinkML source-authoring bug and fix in `src/linkml/`.

### Notes

- `[P]` tasks = different files, no dependencies inside their phase.
- `[US1] / [US2] / [US3]` labels trace each task to its user story; Phase 1, 2, and 6 tasks have no story label because they're cross-cutting.
- `[test]` labels mark tests explicitly (this feature requires tests per Articles II + VI).
- Verify tests fail before implementing (canonical TDD) for every `[test]` task whose implementation task is paired with it.
- Stop at any checkpoint (end of Phase 3, end of Phase 4, end of Phase 5) to validate a story independently.
- Evidence is required — capture artefacts that prove each success criterion.
- `/speckit.pr` at T104 is the final hand-off; do not run earlier.

