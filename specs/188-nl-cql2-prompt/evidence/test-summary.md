---
feature: 188-nl-cql2-prompt
captured_at: 2026-04-16T13:14:11Z
git_sha: 47c4e65
tests_passed: 194
tests_failed: 0
tests_skipped: 3
coverage_pct: null
---

# Test Summary: NL → CQL2 Prompt Design + Generation (#188)

Run against the nl-cql2 module plus the filter-engine changes it extends
(`pnpm --filter @debrief/components exec vitest run src/nl-cql2 src/filter-engine`).

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 197 |
| Passed | 194 |
| Failed | 0 |
| Skipped | 3 (maintenance-only, env-var gated) |
| Coverage | not reported (v8 coverage not captured for this run) |

## Test Breakdown

### Filter-engine (Phase 2 additions + pre-existing)

| Suite | Tests | Notes |
|-------|------:|-------|
| `__tests__/cql2-json-reverse.test.ts` | 25 | NEW — round-trip + throw paths + integration |
| `__tests__/array-filter-cql2.test.ts` | 13 | pre-existing; unaffected |
| `__tests__/array-filter.test.ts` | 19 | pre-existing; unaffected |
| `__tests__/cql2-json.test.ts` | 11 | pre-existing (forward serialiser) |
| `__tests__/engine.test.ts` | 13 | pre-existing |
| `__tests__/integration.test.ts` | 12 | pre-existing |
| `__tests__/matchers.test.ts` | 39 | pre-existing |
| `__tests__/taxonomy.test.ts` | 19 | pre-existing |

### NL → CQL2 module (Phases 3–5)

| Suite | Tests | Notes |
|-------|------:|-------|
| `__tests__/buildPrompt.test.ts` | 7 | prompt contents, size ceiling, invariants |
| `__tests__/clients.test.ts` | 8 | RecordedLLMClient + PassthroughLLMClient |
| `__tests__/corpus.test.ts` | 1 | the corpus regression (contains 12 assertions) |
| `__tests__/generate.test.ts` | 5 | short-circuit, happy path, error propagation |
| `__tests__/harness-self-test.test.ts` | 3 | SC-006 regression signal |
| `__tests__/parseResponse.test.ts` | 14 | all 5 GenerationErrorReason values + happy path |
| `__tests__/schemaDescription.test.ts` | 5 | PROPERTY_MAP exhaustiveness + drift guard |
| `__tests__/prompt-size.test.ts` | 1 skipped | DEBRIEF_MEASURE_PROMPT=1 to run |
| `__tests__/rehash-fixtures.test.ts` | 1 skipped | DEBRIEF_REHASH_NL_FIXTURES=1 to run |
| `__tests__/harness-report-capture.test.ts` | 1 skipped | DEBRIEF_CAPTURE_HARNESS_REPORT=1 to run |

## Key Scenarios Verified

- **Corpus regression (US1 acceptance)** — all 12 corpus phrases (9 FR-008
  dimensions + 3 US3 unrecognised-term probes) produce CQL2 that evaluates
  to the expected match count on the real sample catalog at
  `preview/workspace/samples/local-store/`. Prompt size 6,018 bytes (well
  under the 20 KB ceiling).

- **Five error reasons (decision 8A + 10A)** — parseResponse emits each of
  `malformed-json`, `schema-violation`, `hallucinated-field`,
  `unrecognised-term-leaked`, `cql2-evaluation-failed` on a crafted
  malformed response. Leak visitor tested across `array_filter`, `or`, and
  `a_containedBy` nestings (T042 coverage).

- **Regression signal (SC-006)** — injecting `createBadLLMClient(garbage)`
  into the harness produces a non-zero `failed.length` with reason
  `malformed-json` (also tested for `schema-violation` and
  `cql2-evaluation-failed`).

- **Prompt integrity** — every `PROPERTY_MAP` value appears verbatim in
  both `schemaDescription()` and the full `buildPrompt()` output, with a
  compile-time exhaustiveness check that trips if a new `FilterType` is
  added without extending the operator table.

- **Reverse parser (decision 1A)** — round-trips every `FilterType`,
  negated leaves, OR groups, compound `array_filter` shapes, and AND of
  mixed leaf + array_filter. Throws typed `Cql2ReverseParseError` on
  unsupported operators, bad arg arity, unknown property paths.

- **Transport abstraction** — `RecordedLLMClient` detects phrase miss and
  prompt-hash drift with a "re-author the fixture" diagnostic, never
  silently replays a stale response. `PassthroughLLMClient` forwards the
  prompt and propagates function errors.

- **Short-circuit (FR-009)** — empty and whitespace-only phrases yield a
  `GenerationResult` with `usedLlm: false` without invoking the LLM.

## Known Issues

- 3 tests are skipped by default — these are maintenance helpers gated
  behind env vars (`DEBRIEF_MEASURE_PROMPT`, `DEBRIEF_REHASH_NL_FIXTURES`,
  `DEBRIEF_CAPTURE_HARNESS_REPORT`). They run on demand when prompt-size
  measurements, fixture rehashing, or evidence-file regeneration are
  needed. They are NOT test-case failures.
- Pre-existing `@debrief/utils` typecheck errors in
  `ExerciseListView/types.ts`, `ToolMatch/mcpAdapter.ts`, and
  `utils/types.ts` are unrelated to #188 — verified by typechecking the
  parent merge commit (19e8024) without the nl-cql2/ files.

## Environment

- Runner: vitest 1.6.1
- Branch: claude/implement-speckit-188-MLd8p
- Date: 2026-04-16
- Node: v22.22.2
- Sample catalog: `preview/workspace/samples/local-store/` (73 items)
- Enum bundle: `shared/data/enum-bundle.json` (4 nationalities, 1
  exercise, 20 tags, 16 feature_tags, vessel-class tree 10 leaves)
