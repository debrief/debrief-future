# Research: NL → CQL2 Prompt Design + Generation

**Feature**: 188-nl-cql2-prompt
**Date**: 2026-04-14
**Last updated**: 2026-04-14 (post-`/speckit.review`)

This document records the design decisions made before implementation. Each entry states the decision, why it was made, and which alternatives were rejected.

## 0. Review-driven scope additions

`/speckit.review` surfaced two gaps and a missed opportunity that the user chose to fold into 188 rather than defer:

1. **Full CQL2-JSON → FilterExpression reverse parser in the filter-engine.** The original plan assumed the filter-engine would evaluate CQL2-JSON directly; it does not — it evaluates `FilterExpression`. Rather than add a narrow `filterByCql2Json` shortcut (decision 1A's minimal form), we build a complete reverse parser `cql2JsonToFilterExpression` in `filter-engine/cql2-json.ts`. The thin `filterByCql2Json` becomes a one-liner over that parser plus the existing `filter(items, expression)`. Downstream benefit: #190 can populate the filter bar state from the generator's CQL2 output via the same function.
2. **LLM chip output reuses `LozengeItem`, not a parallel `ChipSummary`.** `FilterBar/types.ts` already owns the chip shape. The LLM emits `LozengeSeed = Pick<LozengeItem, 'filterType'|'value'|'negated'>` — ID-free, deterministic, directly feeds the existing `ADD_LOZENGE` reducer action in #190.
3. **Prompt's CQL2 property paths come from `PROPERTY_MAP` in `cql2-json.ts`.** `PROPERTY_MAP` becomes exported so `schemaDescription()` is the same source of truth as the evaluator.

These three changes cascade through the remaining sections — updated wording below preserves each section's original decision record and flags the review-driven amendments inline.

## 1. Language and package placement

**Decision**: Add a new `nl-cql2/` module inside the existing `shared/components` workspace package (TypeScript 5.x, strict mode). No new package, no Python.

**Rationale**:
- The sole runtime consumer of the CQL2 the generator produces is the existing `filter-engine/` evaluator (TypeScript) in the same package. Keeping the generator next to the evaluator means the harness can import `createFilterEngine` directly — no cross-package plumbing.
- The demo UI (#190) is a no-build-step browser playground; a TypeScript library works natively there once bundled.
- The upstream artefacts the generator needs — `shared/data/enum-bundle.json`, `shared/data/platform-registry.json`, `preview/workspace/samples/local-store/` — are all plain JSON, trivially loadable from Node.
- Python would introduce a second language boundary for no benefit and would duplicate the CQL2 evaluator (or require a subprocess to call the TS engine).

**Alternatives rejected**:
- *Python package under `services/`*: Would need to either reimplement the CQL2 engine in Python or spawn Node from Python just to evaluate. Worse: the browser demo (#190) still needs a TypeScript path, so we would ship two generators.
- *New top-level workspace package (`shared/nl-cql2`)*: Adds pnpm workspace boilerplate, TS project references, and a build step for a module that is ~6 files and belongs conceptually with the filter engine. Premature packaging.

## 2. LLM interface abstraction

**Decision**: Define a minimal `LLMClient` interface with one method: `generate(prompt: string): Promise<string>`. Ship two in-tree implementations:

- `RecordedLLMClient(responses)` — looks up by phrase (canonicalised) and returns the recorded raw response. Fails loudly on miss. Used in CI.
- `PassthroughLLMClient(fn)` — trivial wrapper that forwards to a caller-supplied async function. Used when the consumer (future #189 transport, the author during corpus recording, or tests) wants to plug in their own transport.

**Rationale**:
- FR-011 requires the LLM call to be injectable. A single-method interface is the smallest surface that still honours the requirement and is trivial to mock.
- Returning a raw `string` (rather than a parsed object) keeps `LLMClient` transport-neutral and pushes response validation into the generator layer where it belongs. Different transports (MCP tool, HTTP, local model) all ultimately produce a text response.
- `RecordedLLMClient` is the determinism anchor for CI and satisfies SC-003 (harness under 2 minutes, no network).
- `PassthroughLLMClient` means #189 does not need to implement a new client — it just hands in a function; this is the smallest possible coupling between the two items.

**Alternatives rejected**:
- *Interface returning a pre-parsed `GenerationResult`*: Would force every transport to know the CQL2+chips contract, defeating the "transport is dumb" split.
- *Streaming interface*: CQL2 outputs are short; streaming adds complexity with no latency benefit at this scale.
- *Letting each transport throw its own errors up through the generator*: Harder to test. Instead the generator always catches, validates, and emits a structured error — uniform for recorded and live paths.

## 3. LLM response format

**Decision** (amended post-review): The LLM is prompted to return a single JSON object with this shape (enforced by `parseResponse.ts` at the boundary):

```jsonc
{
  "cql2": { /* CQL2-JSON object, possibly {} for "no filter" */ },
  "lozenges": [
    { "filterType": "nationality", "value": "GB" },
    { "filterType": "vessel-class", "value": "subsurface/submarine" }
  ],
  "unrecognised_terms": ["klingon"]
}
```

**Rationale**:
- CQL2-JSON (not the text form) is what the new `cql2JsonToFilterExpression` reverse parser consumes (built as part of this item — see §0). Asking the LLM for JSON skips a text→JSON parse step and lets structural validation reject hallucinated operators immediately.
- `lozenges` uses the seed shape `Pick<LozengeItem, 'filterType'|'value'|'negated'>`. This is the canonical chip model from `FilterBar/types.ts` (#127) minus the UI-owned `id` and discriminator `kind` fields — the consumer assembles a full `LozengeItem` via the existing `ADD_LOZENGE` reducer. Reusing the shape eliminates a parallel chip model and the mapper layer that would otherwise sit between 188's output and #190's filter bar.
- A single JSON object (not multiple blocks) is what current LLMs reliably produce when instructed via structured-output hints. Keeps parsing deterministic.
- All three fields are always present; empty values are `{}`, `[]`, `[]` respectively. Prevents "did the model forget a key" ambiguity.

**Alternatives rejected**:
- *A parallel `ChipSummary { label, field, values }` shape*: Duplicates `LozengeItem`. Forces a mapper layer in #190 and creates a second source of truth for chip semantics. Explicitly rejected in review (decision 2A / 5A).
- *LLM emits full `LozengeItem` including `id`*: IDs are non-deterministic; every re-record churns fixtures. Keep ID generation at the consumer.
- *CQL2 text form*: Adds a parse step and opens the door to syntactically-valid-but-semantically-wrong outputs (the parser accepts more than the filter engine evaluates). JSON catches structural errors earlier.
- *Two round-trips (first generate CQL2, then summarise lozenges)*: Doubles LLM latency and cost and risks the two responses disagreeing. A single prompt producing both is what the prototype validated.
- *Free-form explanation text*: Harder to test; not needed for the headless harness. The lozenge list is the human-readable artefact.

## 4. Schema description: hand-written vs. derived

**Decision** (amended post-review): Derive the CQL2 schema description block in the prompt from `PROPERTY_MAP` in `shared/components/src/filter-engine/cql2-json.ts`. `PROPERTY_MAP` becomes an exported constant so `schemaDescription()` (in `nl-cql2/schemaDescription.ts`) imports it directly and emits a string block pairing each `FilterType` with its exact CQL2 property path. The same module also imports the `FilterType` union and enforces exhaustiveness at compile time.

**Rationale**:
- Article II (Schema Integrity) and the spec's Assumption that the enum set is stable imply one source of truth. The evaluator already uses `PROPERTY_MAP` as the authoritative mapping from `FilterType` to CQL2 property path (`debrief:platforms[*].nationality`, `debrief:tags`, etc.). Anything less than importing it verbatim — e.g. a hand-maintained mirror in the prompt — would drift silently and produce CQL2 the evaluator cannot match (zero-hit failures with no user-visible cause — an Article I.3 silent-failure vector).
- An exhaustiveness unit test (decision 11A) asserts every value in the `FilterType` union is a key in `PROPERTY_MAP`; this catches the reverse direction (a new FilterType added without a mapping).
- The worked `array_filter` example remains the single most important teaching section of the prompt; it is pinned to a known-good CQL2-JSON that round-trips through the new `cql2JsonToFilterExpression`.

**Alternatives rejected**:
- *Hand-maintained property-path list in `schemaDescription.ts`*: Drifts from `PROPERTY_MAP`. Explicitly rejected in review (decision 3A).
- *Examples-only prompt (no explicit path list)*: LLM will guess paths it has not seen. Unreliable — rejected in review.
- *Generating the schema description at build time into a `.txt` asset*: Adds a build step; not needed when the prompt is built at runtime (cheap string composition).

## 5. Prompt composition strategy

**Decision**: `buildPrompt(phrase)` concatenates four sections in this fixed order:

1. **Role framing** (static, ~400 bytes): "You translate maritime analyst phrases into CQL2 JSON filters over a local STAC catalog. Output one JSON object matching this schema: {...}".
2. **CQL2 schema description** (derived per §4, ~3 KB): allowed fields, operators, `array_filter` syntax.
3. **Enum bundle** (loaded from `shared/data/enum-bundle.json`, currently ~2 KB): vessel class taxonomy, nationalities, exercise names, tags, feature_tags.
4. **Worked examples** (static, ~2 KB): two input → output pairs demonstrating (a) a single-dimension filter and (b) a compound `array_filter`. The input phrases are NOT drawn from the corpus (to avoid training-to-the-test).
5. **User phrase** (dynamic): "Phrase: <input>".

**Rationale**:
- The order puts stable/cacheable content first and user content last — matches the prompt-caching-friendly convention (even though we do not use prompt caching in this item; #189 may).
- Worked examples not from the corpus means corpus passes are meaningful generalisation, not memorisation.
- Total prompt size under 10 KB for the current enum set; SC-004's 20 KB ceiling has headroom.

**Alternatives rejected**:
- *Chain-of-thought instructions*: Adds tokens with no measurable benefit at this task complexity; also harder to validate a structured output when the model is encouraged to "think out loud" first.
- *Few-shot with 10+ examples*: Unnecessary for the current vocabulary; adds prompt size without moving the match-count needle in the prototype.

## 6. Corpus format

**Decision**: `fixtures/corpus.json` is an array of records:

```jsonc
[
  {
    "id": "uk-submarines",
    "phrase": "UK submarines",
    "expected": { "matchCount": 18 },
    "notes": "Nationality + domain compound; prototype baseline"
  },
  {
    "id": "unrecognised-nationality",
    "phrase": "Klingon warbirds in the 1990s",
    "expected": { "unrecognisedTerms": ["klingon", "warbirds"], "matchCount": null }
  }
]
```

**Rationale**:
- `matchCount` (a single integer) is the cheapest, most stable expectation. Order and pagination do not perturb it. Good for most phrases.
- Optional `matchIds` (array of STAC item IDs) can be added per-phrase when a count alone is insufficient (e.g. two phrases with the same count but different items). Not required for the 9 prototype phrases.
- `unrecognisedTerms` records the P3 acceptance. Phrases that only test unrecognised-term handling have `matchCount: null` meaning "do not assert on count".
- Human-readable `id` + `notes` make FAIL output grep-friendly.

**Alternatives rejected**:
- *YAML corpus*: Adds a parser dep; JSON is fine and diffs well.
- *One file per phrase*: 9+ tiny files is awkward to review; a single file is easier to diff and eyeball.
- *Inline golden CQL2 string*: Rejected by FR-012 — comparison must be by evaluated outcome, not by CQL2 string.

## 7. Recorded-response fixture format

**Decision**: `fixtures/responses.json` is a map keyed by a canonicalised phrase (lowercased, whitespace-normalised), with values `{ rawResponse: string, promptHash: string }`. The `promptHash` is a SHA-256 of the prompt that produced this response; the `RecordedLLMClient` asserts on mismatch.

**Rationale**:
- Keying by phrase (not prompt hash) makes fixtures diff-friendly when only the phrase changes.
- Including `promptHash` catches prompt drift: if the prompt changes in a way that would change the model's response, the stale fixture fails loudly with a "prompt changed, re-record" error rather than silently passing with the old response.
- Canonicalisation (trim + lowercase) matches how the generator treats user input and prevents fixture misses from stray whitespace.

**Alternatives rejected**:
- *Per-phrase fixture files*: Same objection as with the corpus.
- *Ignoring prompt drift*: A stale fixture passing against a changed prompt would defeat the whole regression harness.

## 8. Harness API

**Decision** (amended post-review): Export `runHarness(corpus, client, enums, catalog)` returning a typed report. The harness lives at `shared/components/src/nl-cql2/__tests__/harness.ts` (moved out of `src/` per decision 13A so it does not ship in the library bundle):

```typescript
interface HarnessReport {
  passed: readonly HarnessPass[];   // { id, phrase, cql2, matchCount } — CQL2 kept on PASS per 12A
  failed: readonly HarnessFail[];   // { id, phrase, reason, expected, actual, rawResponse? }
  elapsedMs: number;
  promptSizeBytes: number;          // enforced < 20480 per 15A
}
```

The vitest suite calls `runHarness(...)` once and asserts:

1. `report.failed.length === 0` — all corpus phrases pass.
2. `report.promptSizeBytes < 20_480` — SC-004 ceiling (decision 15A).
3. `report.elapsedMs < 120_000` — SC-003 ceiling.

The catalog is passed as `ReadonlyArray<StacBrowserItem>` (decision 6A) — no wrapper type. The catalog path is resolved via `DEBRIEF_REPO_ROOT` exported by a vitest globalSetup (decision 14A) so the harness works regardless of the working directory vitest is invoked from.

**Rationale**:
- One call, three assertions. Vitest's test-per-phrase granularity is not needed because the report already groups failures clearly.
- Keeping CQL2 on PASS (decision 12A) means re-record reviewers can eyeball drift — silent fixture coincidences (different CQL2, same match count) become visible at read time without adding a CI cost.
- The harness is reusable from a CLI in future without changing its API.
- Returning a typed report keeps Article XV (strict typing) clean — no `any`, no dynamic test-case generation.

**Alternatives rejected**:
- *Harness in `src/`*: Ships in `dist/` — bloats every library consumer. Moved under `__tests__/` per decision 13A.
- *Dynamic `describe.each(corpus)`*: Looks prettier in vitest's output but couples the corpus to vitest's runtime and makes it harder to run the harness from outside tests.
- *Manual SC-004 verification*: Documentation is not a gate. Decision 15A makes it an explicit assertion.

### Self-test for the harness itself (decision 9A)

A separate vitest spec (`__tests__/harness-self-test.ts`) uses a `createBadLLMClient(malformedResponse)` that returns deliberately-broken JSON. It asserts `report.failed.length > 0` and that the failure reason matches `malformed-json`. This automates SC-006 — without it, the spec's claim that "the harness detects broken prompts" is unverified.

### Error-path unit tests (decision 10A)

`parseResponse.test.ts` exercises each `GenerationErrorReason` value with a crafted malformed response fixture — including the tree-walking unrecognised-term visitor across `array_filter`, `or`, and `a_containedBy` shapes. `filter-engine/__tests__/cql2-json-reverse.test.ts` exercises the new reverse parser's throw paths (unsupported operator, bad arg arity). Together these close the gap where the `cql2-evaluation-failed` reason (decision 8A) could otherwise become dead code.

## 9. Sample catalog loading

**Decision** (amended post-review): The harness loads the catalog once via a small helper `loadSampleCatalog()` that reads `${DEBRIEF_REPO_ROOT}/preview/workspace/samples/local-store/catalog.json` + all referenced item JSONs, and returns the item collection as `StacBrowserItem[]`. The helper lives under `__tests__/` (decision 13A); it is not exported from the package's public API.

`DEBRIEF_REPO_ROOT` is populated by a vitest globalSetup that walks up from `__dirname` to the `pnpm-workspace.yaml` and exports the absolute path via `process.env.DEBRIEF_REPO_ROOT` (decision 14A). This makes the harness immune to variation in vitest's invocation CWD — the same test passes whether invoked via `pnpm -r`, `pnpm --filter @debrief/components`, or an IDE runner.

**Rationale**:
- The sample catalog is the agreed test dataset (spec's Assumption + #184 output). Loading it from the real on-disk path means the harness catches item-schema drift as well as prompt drift — a bonus signal.
- Keeping the loader private means it cannot be accidentally used as a general-purpose STAC loader; production code has its own path.
- The globalSetup approach resolves root once per test run; per-call `findUp` would repeat the walk.

**Alternatives rejected**:
- *Hard-coded relative path (`../../../../preview/...`)*: CWD-fragile; breaks when CI invokes vitest differently. Explicitly rejected in review.
- *Embed a frozen copy of the catalog in `fixtures/`*: Would silently mask catalog-structure changes that item #184 (or future items) introduce. The spec explicitly acknowledges "corpus expected values will need recalibration" when the catalog is regenerated — the real-path loader makes that recalibration loud.

## 10. Error semantics

**Decision** (amended post-review): The generator never throws on normal failure paths. It returns a `GenerationResult` whose `error` field is populated when any of the five `GenerationErrorReason` values fires:

| Reason | Trigger |
|--------|---------|
| `malformed-json` | LLM response is not parseable JSON. |
| `schema-violation` | JSON parses but fails `llm-response.schema.json`. |
| `hallucinated-field` | CQL2 uses a property path absent from `PROPERTY_MAP`. |
| `unrecognised-term-leaked` | An unrecognised term appears as a predicate value anywhere in the CQL2 tree. |
| `cql2-evaluation-failed` | Shape-valid CQL2 but `cql2JsonToFilterExpression` threw (unsupported operator, bad arg arity, etc.). |

The fifth reason is new per decision 8A and plugs the gap that would otherwise swallow filter-engine throws as opaque failures. The harness treats any present `error` as a test FAIL with the raw response visible.

The generator DOES throw on programmer errors: missing enum bundle at construction, unknown `LLMClient` protocol, etc. These are not test-harness concerns.

**Rationale**:
- FR-010 mandates structured (non-raising) handling for runtime response failures.
- Article I.3 ("no silent failures") requires every failure mode to be either caught and surfaced explicitly or thrown loudly. The five reasons cover every known failure path on the generator side.
- Distinguishing "the model returned garbage" from "the caller wired the library wrong" keeps test output focused.

**Alternatives rejected**:
- *Throw on all failures*: Violates FR-010 and forces every caller to wrap in `try/catch`.
- *Return `null`*: Loses the diagnostic information the harness needs to report.
- *Four reasons (pre-review)*: Missed the `cql2-evaluation-failed` case, which became load-bearing once the reverse parser was added.

## 11. Prompt-size scaling measurement (decision 16A)

**Decision**: During implementation, measure the prompt size produced against the current enum bundle and record the result here. Extrapolate to 30 and 50 registered platforms (the plausible near-term ranges as #180's registry fills in during samples work) and confirm the extrapolation stays under SC-004's 20 KB ceiling. If headroom is tight, note the trigger point at which enum summarisation (e.g. collapsing vessel_type → vessel_role leaves, dropping rarely-used tags) becomes necessary.

**Placeholder values — to be filled during implementation**:

| Registry size (platforms) | Enum bundle size | Prompt size (bytes) | Headroom vs 20 KB |
|---------------------------|------------------|---------------------|-------------------|
| 10 (current) | _tbc_ | _tbc_ | _tbc_ |
| 30 (projected) | _tbc_ | _tbc_ | _tbc_ |
| 50 (projected) | _tbc_ | _tbc_ | _tbc_ |

**Rationale**:
- SC-004 is enforced at runtime by decision 15A, but a CI-only gate gives no advance warning — the first sign of trouble would be a failing build during unrelated registry work. Measuring the trajectory now gives the team a documented ceiling estimate before #180 expands.
- Extrapolation is cheap: enum-bundle bytes scale roughly linearly with platform count (nationalities and exercise names saturate early; only the taxonomy tree really grows).

**Alternatives rejected**:
- *Defer measurement to a future backlog item*: Review originally recommended this path but the user chose to include it in 188. Done in-scope.

## Open items (deferred)

- **Choice of LLM for authoring-time fixture recording**: Not decided in this item. The `PassthroughLLMClient` lets the author plug in whatever they have access to (Claude, GPT, local). The prompt is designed to be model-agnostic. Recording a fixture is a one-time act per corpus change.
- **Prompt-caching strategy**: #189's concern. This item's prompt structure (stable prefix, dynamic suffix) is already caching-friendly if a future transport wants to apply it.
- **Token budgeting / cost monitoring**: Deferred with transport (#189). The `GenerationResult.diagnostics.responseHash` lets a future transport layer correlate calls to billing.
