---
description: "Task breakdown for 188-nl-cql2-prompt"
---

# Tasks: NL → CQL2 Prompt Design + Generation

**Input**: Design documents from `/specs/188-nl-cql2-prompt/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included and non-optional. `/speckit.review` ratified per-error-reason unit tests, PROPERTY_MAP exhaustiveness, a harness self-test, and the corpus regression harness (decisions 9A / 10A / 11A / 12A / 15A).

**Organisation**: Tasks are grouped by user story. US1 is load-bearing — US2 and US3 only add developer tooling and graceful-degradation coverage on top of it.

---

## Evidence Requirements

**Evidence Directory**: `specs/188-nl-cql2-prompt/evidence/`
**Media Directory**: `specs/188-nl-cql2-prompt/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | vitest results across new + modified test files, coverage for the new module | After Phase 6 tests green |
| `evidence/usage-example.md` | Worked example: `generateCql2("UK submarines", deps)` + showing the returned `GenerationResult` | After US1 complete |
| `evidence/harness-report.txt` | Captured `runHarness()` output for all 9 corpus phrases (PASS list with CQL2 visible per 12A) | After US2 complete |
| `evidence/prompt-size-measurements.md` | The three-row table from research.md §11 filled in (10 / 30 / 50 platforms) | During Phase 3 (US1) |
| `evidence/round-trip-evidence.md` | `filterExpressionToCql2Json` → `cql2JsonToFilterExpression` round-trip proof across the test corpus | After Phase 2 complete |
| `evidence/sample-generation-result.json` | Serialised `GenerationResult` for one corpus phrase, showing cql2 + lozenges + diagnostics | After US1 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning blog post | Already produced during `/speckit.plan` |
| `media/linkedin-planning.md` | LinkedIn planning summary | Already produced during `/speckit.plan` |
| `media/shipped-post.md` | Shipped blog post | Phase 6 |
| `media/linkedin-shipped.md` | LinkedIn shipped summary | Phase 6 |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence + media | Final task (T048) |
| Blog PR | PR in `debrief.github.io` publishing shipped-post.md | Triggered by `/speckit.pr` |

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3 or — for cross-cutting)
- File paths are absolute within the repo.

---

## Phase 1: Setup

**Purpose**: Scaffolding that blocks nothing else but must exist before implementation.

- [x] T001 Create the new module directory tree `shared/components/src/nl-cql2/`
- [x] T002 Create the test-only directory tree `shared/components/src/nl-cql2/__tests__/fixtures/`
- [x] T003 Create vitest globalSetup that resolves repo root via `pnpm-workspace.yaml` find-up and exports `DEBRIEF_REPO_ROOT` (decision 14A) `shared/components/vitest.globalSetup.ts`
- [x] T004 Wire globalSetup into vitest config (add `globalSetup: ['./vitest.globalSetup.ts']`) `shared/components/vitest.config.ts`

---

## Phase 2: Foundational — filter-engine extensions

**Purpose**: Ship the filter-engine reverse parser and `PROPERTY_MAP` export first. These block every downstream task because the generator, prompt builder, and harness all import them.

**⚠️ CRITICAL**: No user-story work can begin until Phase 2 is complete.

- [x] T005 Export `PROPERTY_MAP` from `cql2-json.ts` (promote existing internal constant; decision 3A) `shared/components/src/filter-engine/cql2-json.ts`
- [x] T006 Implement `cql2JsonToFilterExpression(cql2)` reverse parser covering `=`, `like`, `a_containedBy`, `not`, `and`, `or`, and `array_filter` operators; throw typed errors for unsupported operators and bad arg arity `shared/components/src/filter-engine/cql2-json.ts`
- [x] T007 Implement `filterByCql2Json(items, cql2)` one-liner convenience wrapper `shared/components/src/filter-engine/engine.ts`
- [x] T008 Export `PROPERTY_MAP`, `cql2JsonToFilterExpression`, and `filterByCql2Json` from the filter-engine barrel `shared/components/src/filter-engine/index.ts`
- [x] T009 [P][test] Reverse-parser happy-path tests — round-trip `filterExpressionToCql2Json` → `cql2JsonToFilterExpression` across all `FilterType` values and one compound `array_filter` `shared/components/src/filter-engine/__tests__/cql2-json-reverse.test.ts`
- [x] T010 [P][test] Reverse-parser throw-path tests — unsupported operator, bad arg arity, unknown property path (decision 10A, feeds `cql2-evaluation-failed` reason) `shared/components/src/filter-engine/__tests__/cql2-json-reverse.test.ts`
- [x] T011 [P][test] `filterByCql2Json` integration test — evaluate one CQL2 expression against `StacBrowserItem[]` and assert match counts align with `filter(items, filterExpressionToCql2Json…)` invoked via the forward path `shared/components/src/filter-engine/__tests__/cql2-json-reverse.test.ts`
- [x] T012 Capture round-trip evidence across the corpus (forward + reverse) `specs/188-nl-cql2-prompt/evidence/round-trip-evidence.md`

**Checkpoint**: Filter-engine extensions merged and green. US1/US2/US3 work can now begin.

---

## Phase 3: User Story 1 — Analyst phrase produces correct CQL2 (Priority: P1)

**Goal**: `generateCql2("UK submarines", deps)` returns a `GenerationResult` whose CQL2 evaluates to 18 hits on the sample catalog, whose `lozenges` include nationality+domain, and whose `unrecognisedTerms` is empty.

**Independent Test**: `pnpm --filter @debrief/components test corpus` passes — all 9 prototype phrases match their recorded match counts against `preview/workspace/samples/local-store/`.

### Shared types and enum-bundle access

- [ ] T013 [US1] Define all exported types in `types.ts`: `Cql2Json`, `LozengeSeed` (`Pick<LozengeItem, 'filterType'|'value'|'negated'>`), `GenerationErrorReason` (5 values per 8A), `GenerationError`, `GenerationDiagnostics`, `GenerationResult`, `LLMClient`, `RecordedResponse`, `ResponseMap`, `EnumBundle`, `GenerateDeps`, `CorpusRecord`, `CorpusExpectation`, `HarnessPass`, `HarnessFail`, `HarnessReport` `shared/components/src/nl-cql2/types.ts`
- [ ] T014 [US1] Implement enum-bundle loader that reads `shared/data/enum-bundle.json` via `DEBRIEF_REPO_ROOT`, narrows to the `EnumBundle` interface, and throws loudly if required keys are missing `shared/components/src/nl-cql2/loadEnumBundle.ts`

### Prompt composition

- [ ] T015 [US1] Implement `schemaDescription()` importing `PROPERTY_MAP` + `FilterType` union from filter-engine, emitting a string block pairing each filter type with its CQL2 property path, with a compile-time `never`-default that forces exhaustiveness (decision 3A) `shared/components/src/nl-cql2/schemaDescription.ts`
- [ ] T016 [US1] Implement `buildPrompt(phrase, enums)` concatenating role framing, schema description, enum bundle, two worked examples (one single-dimension, one compound `array_filter`), and the user phrase in the fixed order from research.md §5 `shared/components/src/nl-cql2/buildPrompt.ts`
- [ ] T017 [P][test] [US1] Test that `buildPrompt` output contains every `FilterType` property path, the worked examples, and ends with the phrase suffix; also assert prompt size < 20480 bytes for the current enum bundle `shared/components/src/nl-cql2/__tests__/buildPrompt.test.ts`
- [ ] T018 [P][test] [US1] PROPERTY_MAP exhaustiveness test — every value of the `FilterType` union is a key in `PROPERTY_MAP` (decision 11A) `shared/components/src/nl-cql2/__tests__/schemaDescription.test.ts`
- [ ] T019 [P][test] [US1] Test that `schemaDescription()` output references every `PROPERTY_MAP` value verbatim (guards against drift at the prompt-assembly boundary) `shared/components/src/nl-cql2/__tests__/schemaDescription.test.ts`

### Response parsing and validation

- [ ] T020 [US1] Implement `parseResponse(phrase, rawResponse, promptHash, promptVersion)` with the five-stage pipeline: JSON parse → JSON Schema shape → `cql2JsonToFilterExpression` round-trip → `PROPERTY_MAP` field check → unrecognised-term leak visitor; returns `GenerationResult` with `error` populated on any failure (decisions 8A, 10A) `shared/components/src/nl-cql2/parseResponse.ts`
- [ ] T021 [US1] Implement the unrecognised-term leak visitor as a pure tree walker over CQL2-JSON that descends into `args[]`, `array_filter` predicates, `and`/`or` children, and `a_containedBy` value arrays `shared/components/src/nl-cql2/parseResponse.ts`
- [ ] T022 [P][test] [US1] One test per `GenerationErrorReason` value (5 reasons × minimum 1 test each) — malformed JSON, schema violation, hallucinated field, unrecognised-term leaked across `array_filter`/`or`/`a_containedBy` nestings, CQL2 evaluation failure (decision 10A) `shared/components/src/nl-cql2/__tests__/parseResponse.test.ts`
- [ ] T023 [P][test] [US1] Happy-path test — a well-formed recorded response parses to a `GenerationResult` with `error: null` and the expected `lozenges`/`unrecognisedTerms` `shared/components/src/nl-cql2/__tests__/parseResponse.test.ts`

### LLM clients

- [ ] T024 [US1] Implement `createRecordedLLMClient(responses)` — canonicalises phrase on lookup, throws loudly on miss or `promptHash` mismatch with a "re-author the fixture" diagnostic `shared/components/src/nl-cql2/clients.ts`
- [ ] T025 [US1] Implement `createPassthroughLLMClient(fn)` trivial wrapper `shared/components/src/nl-cql2/clients.ts`
- [ ] T026 [P][test] [US1] Client unit tests — RecordedLLMClient hit/miss/hash-mismatch, PassthroughLLMClient forwards correctly `shared/components/src/nl-cql2/__tests__/clients.test.ts`

### Generator

- [ ] T027 [US1] Implement `generateCql2(phrase, deps)` — short-circuit empty/whitespace phrases (`usedLlm: false`, empty CQL2, empty lozenges), otherwise build prompt → call `LLMClient.generate` → delegate to `parseResponse` → return `GenerationResult` `shared/components/src/nl-cql2/generate.ts`
- [ ] T028 [US1] Implement public barrel exporting `generateCql2`, `buildPrompt`, `schemaDescription`, `createRecordedLLMClient`, `createPassthroughLLMClient`, and all public types (but NOT the harness, which stays under `__tests__/`) `shared/components/src/nl-cql2/index.ts`
- [ ] T029 [P][test] [US1] Generator tests — empty phrase short-circuit, whitespace-only phrase short-circuit, happy path calls LLM once and returns populated result, LLM client throwing surfaces the error correctly `shared/components/src/nl-cql2/__tests__/generate.test.ts`

### Harness — only the core corpus runner (US1's acceptance)

- [ ] T030 [US1] Implement `loadSampleCatalog()` under `__tests__/` — reads `${DEBRIEF_REPO_ROOT}/preview/workspace/samples/local-store/catalog.json` plus referenced items, returns `StacBrowserItem[]` `shared/components/src/nl-cql2/__tests__/harness.ts`
- [ ] T031 [US1] Implement `runHarness(corpus, client, enums, catalog)` — per-phrase loop calling `generateCql2` then `filterByCql2Json`, capturing CQL2 on PASS (decision 12A), returning typed `HarnessReport` with `promptSizeBytes` and `elapsedMs` `shared/components/src/nl-cql2/__tests__/harness.ts`
- [ ] T032 [US1] Author the 9-phrase corpus fixture covering every CQL2 dimension (nationality, domain, vessel role, vessel type, exercise, tags, year, compound platform predicate, unrecognised term) `shared/components/src/nl-cql2/__tests__/fixtures/corpus.json`
- [ ] T033 [US1] Hand-author LLM response fixtures for each corpus phrase — write `{ rawResponse, promptHash, authoredAt, authoredBy }` entries conforming to `llm-response.schema.json`. Authoring should be realistic (the CQL2 must actually evaluate to the expected match count via `filterByCql2Json`) rather than fabricated. No live model is invoked during authoring. `shared/components/src/nl-cql2/__tests__/fixtures/responses.json`
- [ ] T034 [test] [US1] Corpus regression test — single assertion block: `report.failed.length === 0`, `report.promptSizeBytes < 20_480` (SC-004 per 15A), `report.elapsedMs < 120_000` (SC-003), formatting failures into the vitest error message `shared/components/src/nl-cql2/__tests__/corpus.test.ts`

### Prompt-size measurement

- [ ] T035 [US1] Measure current prompt size for the current enum bundle; extrapolate to 30 and 50 platform registry sizes (duplicate platform entries in a throwaway bundle, re-run `buildPrompt`, record bytes); fill in research.md §11 table and copy to evidence `specs/188-nl-cql2-prompt/research.md` + `specs/188-nl-cql2-prompt/evidence/prompt-size-measurements.md`

**Checkpoint**: US1 green. `pnpm --filter @debrief/components test` passes including corpus.test.ts. Analyst phrases produce correct CQL2 against the sample catalog.

---

## Phase 4: User Story 2 — Developer regression harness tooling (Priority: P2)

**Goal**: A developer changing the prompt template can run the harness, get a structured report, and trust that a deliberate regression produces a clear FAIL.

**Independent Test**: Run `__tests__/harness-self-test.ts` — it uses `createBadLLMClient(...)` to inject a malformed response and asserts the report contains failures with readable diagnostics.

- [ ] T036 [US2] Implement `createBadLLMClient(rawResponse)` test helper returning a client that always yields the given (deliberately-broken) response `shared/components/src/nl-cql2/__tests__/badClient.ts`
- [ ] T037 [test] [US2] Harness self-test — asserts `report.failed.length > 0` with reason `malformed-json` when `BadLLMClient` is injected, automating SC-006 (decision 9A) `shared/components/src/nl-cql2/__tests__/harness-self-test.ts`
- [ ] T038 [US2] Write a fixture-maintenance script that rebuilds the prompt for each corpus phrase, recomputes `promptHash`, and rewrites those hashes into `responses.json` (leaving `rawResponse` bodies untouched). This lets an author update the prompt template, re-hash in one command, then hand-edit response bodies where semantic changes are needed. `shared/components/scripts/rehash-nl-fixtures.ts`
- [ ] T039 [US2] Capture the harness report as evidence (all 9 phrases, CQL2 visible on PASS per 12A) `specs/188-nl-cql2-prompt/evidence/harness-report.txt`

**Checkpoint**: US2 green. Developers have a self-verified harness plus a fixture-maintenance tool.

---

## Phase 5: User Story 3 — Unrecognised terms handled gracefully (Priority: P3)

**Goal**: A phrase with an out-of-vocabulary term yields a `GenerationResult` whose `unrecognisedTerms` surfaces the term and whose `cql2` omits it, rather than silently returning zero hits.

**Independent Test**: The corpus includes phrases like "Klingon warbirds" (expected `unrecognisedTerms: ["klingon", "warbirds"]`, `matchCount: null`); these phrases pass the harness.

- [ ] T040 [US3] Add three unrecognised-term corpus phrases covering: (a) unknown nationality code, (b) well-formed query with one recognised + one unrecognised term, (c) entirely unrecognisable phrase `shared/components/src/nl-cql2/__tests__/fixtures/corpus.json`
- [ ] T041 [US3] Hand-author LLM response fixtures for the three new unrecognised-term phrases and append to `responses.json` (same format as T033; no live model invoked) `shared/components/src/nl-cql2/__tests__/fixtures/responses.json`
- [ ] T042 [P][test] [US3] Targeted parseResponse tests for the leak-visitor walking through `array_filter(platforms, nationality='leaked')`, `or` groups containing leaked values, and `a_containedBy` value arrays (extends T022 coverage with realistic shapes) `shared/components/src/nl-cql2/__tests__/parseResponse.test.ts`

**Checkpoint**: US3 green. The corpus now provably covers the P3 acceptance.

---

## Phase 6: Polish & Cross-Cutting Concerns

### Evidence Collection

- [ ] T043 Capture test summary using the template at `.specify/templates/evidence/test-summary-template.md`; include YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) and list every new/modified test file `specs/188-nl-cql2-prompt/evidence/test-summary.md`
- [ ] T044 [P] Write a library-style usage example showing `generateCql2("UK submarines", deps)`, the returned `GenerationResult` (including `lozenges`), and how a consumer would feed `result.cql2` into `filterByCql2Json` `specs/188-nl-cql2-prompt/evidence/usage-example.md`
- [ ] T045 [P] Export one corpus phrase's full `GenerationResult` as JSON for inspection `specs/188-nl-cql2-prompt/evidence/sample-generation-result.json`

### Media Content

- [ ] T046 Spawn Content Specialist (`.claude/agents/media/content.md`) to author the shipped blog post: What We Built, Screenshots (harness output), Lessons Learned (review decisions 1A/2A/3A), What's Next (#189 Stakeholder Demo UI, #190 Live LLM Transport) `specs/188-nl-cql2-prompt/media/shipped-post.md`
- [ ] T047 [P] Draft the LinkedIn shipped summary (150–200 words, hook, link placeholder to shipped-post.md) `specs/188-nl-cql2-prompt/media/linkedin-shipped.md`

### PR Creation

- [ ] T048 Create PR and publish blog: run `/speckit.pr`

**Task T048 must run last. It depends on every evidence artefact, both media files, and all prior tests being green.**

---

## Dependencies

```
Phase 1 (Setup) ──► Phase 2 (Foundational: filter-engine) ──► Phase 3 (US1) ──┬──► Phase 4 (US2)
                                                                              │
                                                                              └──► Phase 5 (US3)
                                                                              │
                                                                              └──► Phase 6 (Polish)

Within Phase 3:
  T013 (types) ──► T014 (loadEnumBundle) ──► T020 (parseResponse)
  T015 (schemaDescription) ──► T016 (buildPrompt) ──► T027 (generateCql2)
  T024/T025 (clients) ──► T027
  T027 ──► T031 (runHarness) ──► T034 (corpus.test.ts)
  T032 (corpus fixture) ──► T033 (hand-authored response fixtures) ──► T034
  T035 (prompt-size) depends only on T016.

Within Phase 4: T036 ──► T037. T038 can run in parallel with T036/T037.
Within Phase 5: T040 ──► T041. T042 is independent.
Polish: T043/T044/T045 can run in parallel after all tests pass.
         T046 ──► T047 (same media agent session).
         T048 depends on everything above.
```

## Parallel execution examples

- **Phase 2**: T009, T010, T011 share one test file but cover orthogonal paths; author them in one sitting and mark `[P]` because the module under test is complete after T005–T008.
- **Phase 3**: T017, T018, T019, T022, T023, T026, T029 all live in separate test files and can be authored in parallel once their respective production files land.
- **Phase 5**: T042 is independent of T040/T041.
- **Phase 6**: T044 and T045 touch separate evidence files; T047 only depends on T046.

## Implementation strategy

Deliver in three landings:

1. **Foundational** (Phases 1–2). Filter-engine reverse parser + `PROPERTY_MAP` export, green tests, round-trip evidence. Small, reviewable; can ship as a standalone PR if needed though the plan is to keep it bundled with 188.
2. **US1 increment** (Phase 3). Full generator + corpus + 9 phrases green. This is the acceptance gate for the spec.
3. **Polish + downstream unlocks** (Phases 4–6). Self-tests, fixture-maintenance script, evidence, media, PR.

Each phase ends green with `task verify` passing before the next begins.

## Independent test criteria

- **US1**: `pnpm --filter @debrief/components test corpus` reports 9 PASS with the prototype match counts (18 / 1 / 25 / …) and `report.promptSizeBytes < 20_480`.
- **US2**: `pnpm --filter @debrief/components test harness-self-test` reports ≥1 FAIL with reason `malformed-json`.
- **US3**: The three unrecognised-term corpus phrases pass the harness with `unrecognisedTerms` populated and `cql2` free of those terms.
