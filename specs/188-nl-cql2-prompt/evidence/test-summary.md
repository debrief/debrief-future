---
feature: 188-nl-cql2-prompt
captured_at: 2026-04-15T00:00:00Z
git_sha: 43dfed92
tests_passed: 197
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary — 188 NL → CQL2 Prompt Design + Generation

Scope: the filter-engine reverse parser (Phase 2) and the `nl-cql2` module
(Phases 3–5). Counts cover **every new + modified test file** under
`shared/components/src/filter-engine/__tests__/` and
`shared/components/src/nl-cql2/__tests__/`.

## Totals

| Suite                                                           | Tests | Passed | Failed | Skipped |
|-----------------------------------------------------------------|:-----:|:------:|:------:|:-------:|
| `filter-engine/__tests__/` (existing + new reverse parser)      | 152   | 152    | 0      | 0       |
| `nl-cql2/__tests__/`                                            | 45    | 45     | 0      | 0       |
| **Total**                                                       | **197** | **197** | **0** | **0** |

Wall time: ~17 s for the combined suite.

## Files added or modified in 188

### Filter-engine (Phase 2)

| File                                                      | Kind    | Tests |
|-----------------------------------------------------------|---------|:-----:|
| `filter-engine/__tests__/cql2-json-reverse.test.ts`       | new     | 26    |
| `filter-engine/cql2-json.ts`                              | modified (PROPERTY_MAP export + `cql2JsonToFilterExpression` + `Cql2ParseError`) | — |
| `filter-engine/engine.ts`                                 | modified (`filterByCql2Json`) | — |
| `filter-engine/index.ts`                                  | modified (barrel) | — |

### nl-cql2 (Phases 3–5)

| File                                                       | Kind | Tests |
|------------------------------------------------------------|------|:-----:|
| `nl-cql2/__tests__/schemaDescription.test.ts`              | new  | 5     |
| `nl-cql2/__tests__/buildPrompt.test.ts`                    | new  | 6     |
| `nl-cql2/__tests__/parseResponse.test.ts`                  | new  | 18    |
| `nl-cql2/__tests__/clients.test.ts`                        | new  | 8     |
| `nl-cql2/__tests__/generate.test.ts`                       | new  | 5     |
| `nl-cql2/__tests__/promptSize.test.ts`                     | new  | 1     |
| `nl-cql2/__tests__/corpus.test.ts` (T034)                  | new  | 1     |
| `nl-cql2/__tests__/harness-self.test.ts` (T037)            | new  | 1     |
| `nl-cql2/types.ts`, `loadEnumBundle.ts`, `schemaDescription.ts`, `buildPrompt.ts`, `parseResponse.ts`, `clients.ts`, `generate.ts`, `index.ts` | new | — |
| `nl-cql2/__tests__/harness.ts`                             | new (T030 + T031) | — |
| `nl-cql2/__tests__/badClient.ts`                           | new (T036)        | — |
| `nl-cql2/__tests__/fixtures/corpus.json`                   | new (T032 + T040, 11 phrases) | — |
| `nl-cql2/__tests__/fixtures/responses.json`                | new (T033-interim, hand-crafted) | — |
| `components/scripts/generate-interim-fixtures.ts`          | new (produces `responses.json`) | — |
| `components/scripts/record-nl-fixtures.ts`                 | new (T038 — ready for #189) | — |
| `components/scripts/print-harness-report.ts`               | new (captures T039 evidence) | — |
| `components/vitest.globalSetup.ts`                         | new (T003) | — |
| `components/vitest.config.ts`                              | modified (T004, globalSetup wired) | — |

## Key scenarios verified

### US1 (P1 — analyst phrases produce correct CQL2)

- Corpus regression test (`corpus.test.ts`) runs all **11 phrases** through
  `generateCql2` + `RecordedLLMClient` and asserts zero harness failures.
- `report.promptSizeBytes < 20 480` (SC-004, decision 15A).
- `report.elapsedMs < 120 000` (SC-003).
- Prompt size measured at **5 111 B** current, **7 452 B** at 5× registry
  (`promptSize.test.ts`).

### US2 (P2 — developer harness self-signals regressions)

- `harness-self.test.ts` injects `createBadLLMClient("not-valid-json {{{")`
  and asserts every phrase fails with reason `malformed-json`. Regression
  signal per SC-006 / decision 9A.

### US3 (P3 — unrecognised terms handled gracefully)

- Three unrecognised-term phrases in corpus covering (a) unknown
  nationality (`Ruritanian navy`), (b) one recognised + one unrecognised
  (`UK warbirds`), (c) entirely out-of-vocabulary (`Klingon warbirds`).
- `parseResponse.test.ts` asserts leak-visitor coverage through
  `array_filter`, `or`, and `a_containedBy` nestings (T042).

### Cross-cutting

- **PROPERTY_MAP exhaustiveness** — every `FilterType` has a mapping; every
  mapping value appears in the prompt's schema block (decision 11A).
- **Round-trip** — `filterExpressionToCql2Json` ↔ `cql2JsonToFilterExpression`
  holds across every `FilterType`, negation, OR groups, compound
  `array_filter`, and negated `array_filter`. `evidence/round-trip-evidence.md`.
- **Five `GenerationErrorReason` values** — one test per reason (T022).

## Known issues / caveats

- **T033 is interim**: fixtures are hand-crafted schema-valid responses, not
  real-model recordings. #189 will replace them one phrase at a time via
  `scripts/record-nl-fixtures.ts`. This is a deliberate 188→189 split, not
  a gap.
- **`filterByCql2Json` uses empty taxonomy** by design (per the contract
  signature). Harness callers needing vessel-class descendant matching
  should build their own engine via `createFilterEngine({ taxonomy })`.
- **`vessel_class_tree`** is the enum-bundle key; the research-doc
  placeholder `vessel_classes` was aligned with the actual data.
- **`parseResponse` stage order**: `hallucinated-field` now runs before the
  CQL2 round-trip so unknown properties surface with the specific reason
  instead of the generic `cql2-evaluation-failed`. The reverse parser's
  `Cql2ParseError` fires on the same condition otherwise. No change to the
  set of reasons that can be raised.

## Reproduction

```
pnpm --filter @debrief/components vitest run src/nl-cql2/ src/filter-engine/
```

Expected output: `197 passed (197)`.
