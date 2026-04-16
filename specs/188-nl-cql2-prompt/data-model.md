# Data Model: NL → CQL2 Prompt Design + Generation

**Feature**: 188-nl-cql2-prompt
**Date**: 2026-04-14
**Last updated**: 2026-04-14 (post-`/speckit.review` — decisions 1A / 2A / 3A / 4A / 5A / 6A / 7A / 8A / 9A / 10A / 11A / 12A / 13A / 14A / 15A / 16A)

All entities are in-memory TypeScript types — no persistence, no serialisation beyond JSON corpus/fixture files on disk. Authoritative declarations live in `shared/components/src/nl-cql2/types.ts` (generator types) and `shared/components/src/filter-engine/cql2-json.ts` (the new reverse-parser additions). This document describes what the types represent and why each field exists.

## Core entities

### `AnalystPhrase` (input)

The user's natural-language query.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| *(value)* | `string` | Yes | A short English phrase, typically 2–10 words. Canonicalised before lookup in recorded fixtures: `trim() + toLowerCase() + collapsed internal whitespace`. |

Empty / whitespace-only phrases short-circuit per FR-009 and never reach the LLM.

### `GenerationResult` (output)

The single return type of the generator.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phrase` | `string` | Yes | The original (non-canonicalised) phrase, echoed for diagnostic use. |
| `cql2` | `Cql2Json` | Yes | CQL2-JSON object; `{}` means "no filter" (no-op — all items match). Round-trip validated via `cql2JsonToFilterExpression` before return. |
| `lozenges` | `readonly LozengeSeed[]` | Yes | Human-readable summary of the filter's dimensions, using the canonical chip seed shape (decision 5A). Empty array means no filter was applied. |
| `unrecognisedTerms` | `readonly string[]` | Yes | Terms from the phrase that did not match any enum value. Always present (possibly empty). |
| `error` | `GenerationError \| null` | Yes | `null` on success; populated when the LLM response failed parsing / schema validation / CQL2 evaluation. The harness treats any non-null `error` as FAIL. |
| `diagnostics` | `GenerationDiagnostics` | Yes | Non-functional metadata — never consumed by callers for logic, only for logging. |

Validation rules (enforced in `parseResponse.ts`):

- `cql2` MUST round-trip via `cql2JsonToFilterExpression` (the new reverse parser added to filter-engine under decision 1A). Parse failures populate `error` with `reason: "cql2-evaluation-failed"`.
- `cql2` MUST reference only CQL2 properties declared in `PROPERTY_MAP` (imported directly from `filter-engine/cql2-json.ts` per decision 3A); any property outside the map populates `error` with `reason: "hallucinated-field"`.
- `lozenges` MUST be non-null (empty array is valid). Each entry MUST have `filterType` in the filter-engine's `FilterType` union.
- `unrecognisedTerms` MUST NOT appear as predicate values anywhere in `cql2` (FR-013); a tree-walking visitor asserts this and populates `error` with `reason: "unrecognised-term-leaked"` on mismatch.

### `LozengeSeed`

The chip seed the LLM emits. Reuses the canonical chip fields of `LozengeItem` from `shared/components/src/FilterBar/types.ts`:

```typescript
type LozengeSeed = Pick<LozengeItem, "filterType" | "value" | "negated">;
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `filterType` | `FilterType` | Yes | One of the values in the filter-engine's `FilterType` union (`nationality`, `vessel-class`, `tag`, `track-name`, `author`, `duration`, `modified`, `title`, `filename`, `plot-contents`, `collection`). |
| `value` | `string` | Yes | The value the lozenge filters on (e.g. `"GB"` for a nationality lozenge). |
| `negated` | `boolean \| undefined` | No | Present only when the LLM emits a negation (e.g. "not UK"). |

The consumer assembles the full `LozengeItem` by adding `kind: 'lozenge'` and a generated `id` via the existing `ADD_LOZENGE` reducer action. The generator intentionally does NOT emit `id` — IDs are non-deterministic and would churn recorded fixtures.

### `GenerationError`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `reason` | `GenerationErrorReason` | Yes | Discriminator for the failure. Enum values below. |
| `message` | `string` | Yes | Human-readable detail. |
| `rawResponse` | `string` | Yes | The raw LLM response, preserved so the harness can show it on FAIL. |

`GenerationErrorReason` values (decision 8A adds the last one):

| Reason | When |
|--------|------|
| `malformed-json` | LLM response is not valid JSON. |
| `schema-violation` | Parses as JSON but fails the llm-response.schema.json shape check. |
| `hallucinated-field` | CQL2 references a property not in `PROPERTY_MAP`. |
| `unrecognised-term-leaked` | An unrecognised term appears as a predicate value in `cql2`. |
| `cql2-evaluation-failed` | Shape-valid CQL2 but `cql2JsonToFilterExpression` threw (unsupported operator, bad arg arity). |

### `GenerationDiagnostics`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `promptVersion` | `string` | Yes | Bumped manually when the prompt template changes materially (e.g. `"2026-04-14.1"`). |
| `promptHash` | `string` | Yes | SHA-256 of the actual prompt string. Used by `RecordedLLMClient` to detect drift. |
| `responseHash` | `string` | Yes | SHA-256 of the raw LLM response. |
| `usedLlm` | `boolean` | Yes | `false` for short-circuited empty phrases; `true` otherwise. |

### `LLMClient` (injectable interface)

```typescript
interface LLMClient {
  generate(prompt: string): Promise<string>;
}
```

Two in-tree implementations (both live in the production module because `PassthroughLLMClient` is consumed by #189):

| Implementation | Location | Purpose | Used in |
|----------------|----------|---------|---------|
| `createRecordedLLMClient(responses)` | `src/nl-cql2/clients.ts` | Replays fixtures. Throws on unknown phrase or prompt-hash mismatch. | CI, offline development. |
| `createPassthroughLLMClient(fn)` | `src/nl-cql2/clients.ts` | Forwards to a caller-supplied function. | Fixture recording, #189 transport integration. |

A third in-test implementation — `createBadLLMClient(malformedResponse)` — lives under `__tests__/` (decision 9A) and is used only by the SC-006 regression-signal self-test.

### `CorpusRecord`

One entry in `__tests__/fixtures/corpus.json` (moved from `src/` per decision 13A).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | Yes | Stable identifier for grep-friendly test output (e.g. `"uk-submarines"`). Must be unique within the corpus. |
| `phrase` | `string` | Yes | The analyst phrase to send through the generator. |
| `expected` | `CorpusExpectation` | Yes | See below. |
| `notes` | `string` | No | Free-form; shown in harness output on FAIL. |

### `CorpusExpectation`

The drift-guard structure per decision 4A.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `matchCount` | `number \| null` | Yes | Expected number of catalog items matching the generated CQL2. `null` means "do not assert on count" (used by unrecognised-term-only phrases). |
| `matchIds` | `readonly string[]` | No | Exact set of STAC item IDs the CQL2 must return. Asserted as a set (order-independent). Used when `matchCount` alone is insufficient to disambiguate. |
| `unrecognisedTerms` | `readonly string[]` | No | If present, the `GenerationResult.unrecognisedTerms` MUST equal this array (as a set). Drives the P3 acceptance. |

### `RecordedResponse`

One entry in `__tests__/fixtures/responses.json`, keyed by canonicalised phrase.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `rawResponse` | `string` | Yes | The exact text the LLM returned during recording. |
| `promptHash` | `string` | Yes | The prompt hash at recording time. Mismatch at replay time raises a loud "re-record" error. |
| `recordedAt` | `string` (ISO-8601) | Yes | For auditability of fixture freshness. |
| `model` | `string` | Yes | Identifier of the LLM that produced this response (e.g. `"claude-opus-4-6"`). Not used by the harness; recorded for troubleshooting. |

### `HarnessReport`

The typed output of `runHarness(corpus, client, enums, catalog)`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `passed` | `readonly HarnessPass[]` | Yes | `{ id, phrase, cql2, matchCount }`. **CQL2 is included on PASS** per decision 12A so re-record reviews can eyeball surprising drift. |
| `failed` | `readonly HarnessFail[]` | Yes | `{ id, phrase, reason, expected, actual, rawResponse? }`. |
| `elapsedMs` | `number` | Yes | Wall time. SC-003 asserts `< 120000`. |
| `promptSizeBytes` | `number` | Yes | Size of the prompt produced for the first phrase. SC-004 asserted via `expect(promptSizeBytes).toBeLessThan(20_480)` per decision 15A. |

The harness accepts the catalog as `ReadonlyArray<StacBrowserItem>` directly (decision 6A). The wrapper type proposed in the pre-review draft has been dropped.

## New types in filter-engine (scope expansion)

Adopted from the "fold CQL2-JSON reverse parser into 188" direction. All live in `shared/components/src/filter-engine/cql2-json.ts` and are exported from `filter-engine/index.ts`.

### Exported constant

```typescript
export const PROPERTY_MAP: Readonly<Record<FilterType, string>>;
```

Already exists as an internal constant — this scope change promotes it to an export. Single source of truth for the NL prompt (decision 3A).

### New function: `cql2JsonToFilterExpression`

Reverse of the existing `filterExpressionToCql2Json`. Signature:

```typescript
export function cql2JsonToFilterExpression(cql2: Cql2Json): FilterExpression;
```

Behaviour:

- Accepts a CQL2-JSON object.
- Walks the operator tree and produces the typed `FilterExpression` model (predicates + orGroups + arrayFilters).
- Throws a typed error on: unknown operator, missing `PROPERTY_MAP` entry, wrong arg arity, nested shape that the existing evaluator does not support.
- Empty object `{}` returns `{ predicates: [], orGroups: [], arrayFilters: [] }` (no-op — match all).

Supersedes and extends the existing `cql2JsonToArrayFilters`, which only extracted the `array_filter` subset. `cql2JsonToArrayFilters` remains exported for backwards compatibility with #127's filter bar imports; internally it will delegate to the new reverse parser.

### New function: `filterByCql2Json`

Convenience wrapper:

```typescript
export function filterByCql2Json<T extends StacBrowserItem>(
  items: readonly T[],
  cql2: Cql2Json,
): T[];
```

Implementation is a one-liner: parse via `cql2JsonToFilterExpression`, filter via the existing `createFilterEngine(...).filter`.

## Relationships

```
AnalystPhrase ──► buildPrompt(enums) ──► prompt (string)
                       │                     │
                       │      schemaDescription() ─── imports ──► PROPERTY_MAP (filter-engine)
                       │
                       ▼
                  LLMClient.generate() ──► rawResponse (string)
                       │
                       ▼
                  parseResponse()
                       │
                       ├─► JSON parse (malformed-json)
                       ├─► JSON Schema shape (schema-violation)
                       ├─► cql2JsonToFilterExpression (cql2-evaluation-failed)
                       ├─► PROPERTY_MAP field check (hallucinated-field)
                       ├─► visitor: unrecognised-term leak (unrecognised-term-leaked)
                       │
                       ▼
                  GenerationResult (cql2, lozenges, unrecognisedTerms, error, diagnostics)
                       │
                       ▼   (harness only — __tests__/)
                  filterByCql2Json(catalog, cql2) ──► items
                       │
                       ▼
                  HarnessReport (pass/fail — CQL2 kept on both paths per 12A)
```

## State transitions

The generator is stateless. The only stateful entity is the loaded sample catalog inside the harness, which is immutable after load. The sample catalog is resolved via `DEBRIEF_REPO_ROOT` (exported by vitest globalSetup per decision 14A).

## Volume assumptions

- Corpus: 9 entries at ship, extensible to ~50 without restructuring.
- Recorded fixtures: one per corpus phrase → 9 initially.
- Prompt size: under 10 KB at ship; ceiling of 20 KB enforced as a CI gate (SC-004 / decision 15A).
- Sample catalog: ~70 items (current #184 output).
- Enum bundle growth trajectory: measured during implementation and recorded in research.md (decision 16A); expected to stay within SC-004 headroom through at least the first 30 registered platforms.
