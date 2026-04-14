# 188 — Implementation Handoff

**Status**: Phases 1–2 complete; Phase 3 code-only + T035 complete; blocked
at T030–T034 (sample catalog loader + harness + recorded fixtures).

## What landed in this session

### Phase 1 — Setup (T001–T004)

- Module tree: `shared/components/src/nl-cql2/` + `__tests__/fixtures/`.
- `shared/components/vitest.globalSetup.ts` exports `DEBRIEF_REPO_ROOT` via
  find-up on `pnpm-workspace.yaml` (decision 14A).
- Wired into `shared/components/vitest.config.ts`.

### Phase 2 — filter-engine extensions (T005–T012)

- `PROPERTY_MAP` promoted to an exported constant (decision 3A).
- New `cql2JsonToFilterExpression(cql2)` reverse parser with typed
  `Cql2ParseError` throws (decisions 1A, 10A).
- New `filterByCql2Json(items, cql2)` one-liner convenience wrapper
  (empty-taxonomy engine internally).
- 26 round-trip + throw-path tests;
  `evidence/round-trip-evidence.md` captured.

### Phase 3 — generator module (T013–T029 + T035)

- `types.ts` — full public type surface per the contract.
- `loadEnumBundle.ts` — file-based loader that narrows `shared/data/enum-bundle.json`
  via `DEBRIEF_REPO_ROOT`. Uses `vessel_class_tree` key (matches actual
  enum-bundle, not the `vessel_classes` placeholder from the contract).
- `schemaDescription.ts` — derived from `PROPERTY_MAP` with compile-time
  `never`-default for exhaustiveness.
- `buildPrompt.ts` — 5-section prompt (role → schema → enums → 2 worked
  examples → phrase); `PROMPT_VERSION = "2026-04-14.1"`.
- `parseResponse.ts` — five-stage pipeline (json → shape → hallucinated-field →
  cql2-eval → unrecognised-term-leaked). **Note**: hallucinated-field check
  moved BEFORE the round-trip so unknown properties get the specific reason
  instead of the generic `cql2-evaluation-failed`.
- `clients.ts` — `createRecordedLLMClient` (phrase-canonicalised lookup +
  promptHash drift guard) and `createPassthroughLLMClient`.
- `generate.ts` — orchestrator, short-circuits blank phrases.
- `index.ts` — public barrel; harness deliberately NOT exported (decision 13A).
- **42 unit tests passing**, covering all 5 `GenerationErrorReason` values,
  leak-visitor coverage across `array_filter`/`or`/`a_containedBy`, client
  hit/miss/hash-mismatch, and the generator short-circuit + happy-path.
- Prompt-size: **5 112 B current, 7 452 B at 5× registry**. Well under the
  20 480 B SC-004 ceiling. See `evidence/prompt-size-measurements.md`.

## What's blocked / remaining

### T030–T034 (US1 harness and corpus)

- **T030** `loadSampleCatalog()` — needs to walk
  `preview/workspace/samples/local-store/catalog.json` + referenced items and
  return `StacBrowserItem[]`. Code-only; unblock as soon as someone picks up.
- **T031** `runHarness()` — per-phrase loop calling `generateCql2` then
  `filterByCql2Json`. Code-only.
- **T032** 9-phrase corpus fixture — covers nationality, domain, vessel role,
  vessel type, exercise, tags, year, compound platform predicate, unrecognised
  term. Authoring exercise.
- **T033 [BLOCKER]** — **Record LLM responses against a real model**
  (one-time cost per corpus change; no LLM SDK in the repo yet). Options:
  1. Add `@anthropic-ai/sdk` under a new `shared/components/scripts/` entry
     and run once with an API key.
  2. Use the `createPassthroughLLMClient` forwarded to an external script
     (e.g. `claude-cli ask < prompt.txt`) and capture stdout.
  3. Hand-craft schema-valid fixtures that exercise every corpus dimension
     (pragmatic; tests the pipeline rather than real model behaviour).
- **T034** Corpus regression test — `report.failed.length === 0`, prompt
  size and elapsedMs assertions. Runs once T030–T033 land.

### Phase 4 (US2 — developer tooling)

- **T036** `createBadLLMClient` test helper (under `__tests__/`).
- **T037** Harness self-test (malformed-json injection).
- **T038** Fixture-recording script (`shared/components/scripts/record-nl-fixtures.ts`).
- **T039** Harness-report evidence capture.

### Phase 5 (US3 — unrecognised terms)

- **T040** Add three unrecognised-term corpus phrases.
- **T041** Record their LLM responses.
- **T042** Extra leak-visitor tests for realistic shapes — **already covered**
  by the existing Phase 3 tests (leak through `array_filter` + `or` +
  `a_containedBy` all asserted). This task can be marked complete after
  corpus phrases are added.

### Phase 6 (Polish)

- **T043** test-summary.md with YAML front matter.
- **T044** usage-example.md.
- **T045** sample-generation-result.json (requires recorded corpus).
- **T046/T047** shipped-post.md + linkedin-shipped.md via Content Specialist.
- **T048** `/speckit.pr`.

## Verification state at handoff

```
pnpm --filter @debrief/components vitest run
  Test Files  88 passed (88)
       Tests  1373 passed (1373)

pnpm --filter @debrief/components tsc --noEmit
  (3 pre-existing ToolMatch errors unrelated to #188 — same before this branch)

pnpm --filter @debrief/components lint
  0 errors, 13 warnings (4 new warnings on loadEnumBundle/parseResponse
  flagging `no-restricted-syntax` / ADR-011 — same pattern as existing
  boundary-narrowing code in sensor-utils.ts)
```

## Deviations from the plan

1. **Enum bundle key**: contract and research used `vessel_classes`; actual
   bundle uses `vessel_class_tree`. Code + types aligned with the actual
   data.
2. **`filterByCql2Json`**: contract does not take taxonomy; implementation
   uses empty taxonomy. Vessel-class hierarchical matching (descendant
   expansion) is out of scope for the wrapper — harness callers needing it
   should `createFilterEngine({ taxonomy })` directly.
3. **parseResponse stage order**: moved hallucinated-field check before the
   reverse-parser round-trip so property errors surface with the specific
   reason rather than the generic `cql2-evaluation-failed` — the reverse
   parser throws first for the same condition otherwise. The total set of
   reasons that can be raised is unchanged.
4. **`@types/node` added to `shared/components` devDependencies** because
   `loadEnumBundle`, `parseResponse`, `clients`, and `generate` use
   `node:fs` / `node:path` / `node:crypto`. Needed for tsc on production code.

## When resuming

1. Pick one of the three T033 strategies above. Hand-crafted fixtures is the
   fastest path to green CI without external dependencies.
2. Implement T030–T032 (catalog loader, harness, corpus). These are code-only.
3. Add T033 fixtures.
4. Run `pnpm --filter @debrief/components vitest run src/nl-cql2/__tests__/corpus.test.ts`
   and iterate.
5. Continue through Phases 4–6.
