# Feature Specification: NL → CQL2 Prompt Design + Generation

**Feature Branch**: `188-nl-cql2-prompt`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "[E10] NL → CQL2 prompt design + generation — system prompt with CQL2 schema, extracted enums, and array_filter syntax; LLM outputs CQL2 filter + chips summary; headless test harness with typical analyst phrases"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyst natural-language query produces correct CQL2 filter (Priority: P1)

A maritime analyst types a plain-English question such as "UK submarines in the 1990s" or "German frigates on Exercise Dragonfire". The system sends that phrase to a language model together with a fixed-size prompt describing the catalog's CQL2 schema, allowed field values, and vessel class taxonomy. The model returns a structured response containing (a) a CQL2 filter expression that, when evaluated against the local catalog, returns the expected matching plots, and (b) a list of chip summaries (label + field + value) that describe what was filtered on in human-readable terms.

**Why this priority**: This is the core deliverable of the item. Without a working prompt that produces correct CQL2 for the validated analyst phrases, the rest of the epic (transport wiring in #189, demo UI in #190) has nothing useful to carry. Everything else in this spec is scaffolding around this capability.

**Independent Test**: Run the prompt/generation module in isolation against the 9 validated analyst phrases from the prototype (UK submarines, German frigates, Type 23 frigates, etc.). Verify that the returned CQL2 — when evaluated by the existing filter engine against the sample catalog — yields the same match counts as the prototype's golden baseline (e.g. UK submarines = 18 hits, German frigates = 1 hit, Type 23 frigates = 25 hits).

**Acceptance Scenarios**:

1. **Given** the sample catalog and a natural-language query "UK submarines", **When** the query is sent through the NL → CQL2 generator, **Then** the returned CQL2 filter evaluates to exactly 18 matching plots and the chips summary includes a nationality=GB chip and a domain=subsurface chip.
2. **Given** a query "Type 23 frigates", **When** the generator runs, **Then** the CQL2 output uses `array_filter(platforms, ...)` syntax to express the compound predicate on `vessel_type` and the evaluated result returns 25 matching plots.
3. **Given** a query that mixes multiple dimensions — "UK submarines during Exercise Northern Edge" — **When** the generator runs, **Then** the CQL2 combines an `array_filter` on platforms with a separate predicate on the exercise field, and the chips summary contains separate chips per dimension (nationality, domain, exercise).
4. **Given** a query that references a vessel class by a common English name ("destroyers"), **When** the generator runs, **Then** the prompt's taxonomy guidance leads the model to translate it to the matching vessel role node in the taxonomy tree.

---

### User Story 2 - Developer can regress the prompt against a phrase corpus (Priority: P2)

A developer changing the prompt template or adding new enum values can run a headless test harness that replays a corpus of analyst phrases through the generator, evaluates each returned CQL2 against the sample catalog, and compares the result to a recorded expected outcome (match count and/or plot IDs). The harness reports pass/fail per phrase and a summary, and can be invoked as part of `task verify` or as a standalone command.

**Why this priority**: Without a regression harness, any future change to the prompt, the enum extraction (#187), or the catalog structure could silently break analyst queries. This item produces the baseline that downstream items (#189 transport, #190 UI) can rely on. It is second priority because it is developer-facing and only valuable once P1 is working.

**Independent Test**: Introduce a deliberate regression (e.g. remove the vessel class taxonomy from the prompt) and run the harness. Verify that relevant phrases fail with a clear diagnostic (phrase text, generated CQL2, expected count, actual count). Revert and re-run; verify all pass.

**Acceptance Scenarios**:

1. **Given** a corpus file listing analyst phrases and expected match counts (or plot ID sets), **When** the harness runs, **Then** each phrase reports PASS or FAIL with the generated CQL2 visible in the FAIL output.
2. **Given** a new analyst phrase added to the corpus, **When** the harness runs for the first time, **Then** it records the generated CQL2 and evaluated result so the author can inspect and approve it as the new baseline.
3. **Given** a prompt change that produces a different-but-still-correct CQL2 (e.g. reordered predicates), **When** the harness runs, **Then** the test passes because comparison is by evaluated catalog results rather than by CQL2 string equality.

---

### User Story 3 - Prompt handles ambiguous or out-of-vocabulary queries gracefully (Priority: P3)

When an analyst types a phrase that cannot be mapped to the catalog's enums (e.g. a nationality code that is not in the extracted enum list, a vessel class not in the taxonomy, a nonsense phrase), the generator returns a structured "no-filter" or "unrecognised" response rather than fabricating a CQL2 expression that would fail evaluation or silently return zero results with no explanation.

**Why this priority**: Important for user trust but not blocking for the validated happy-path phrases. Needed before the demo UI (#190) can show sensible empty/error states.

**Independent Test**: Run the generator on a corpus of intentionally unmatchable phrases ("Klingon warbirds", "nationality: XX"). Verify each produces an explicit "unrecognised" response with a reason (e.g. "nationality 'XX' not in catalog enum list"). Verify the chips summary is empty for these cases.

**Acceptance Scenarios**:

1. **Given** a query referencing a nationality code absent from the extracted enums, **When** the generator runs, **Then** the response flags the unrecognised term and omits it from the CQL2 (rather than emitting `nationality = 'XX'` that returns zero hits with no user-visible reason).
2. **Given** an empty query string, **When** the generator runs, **Then** it returns an empty CQL2 filter (no-op — all items match) and an empty chips summary, without calling out to the LLM.
3. **Given** a well-formed query with one recognised dimension and one unrecognised term, **When** the generator runs, **Then** the CQL2 contains the recognised predicate only and the response notes which term was dropped.

---

### Edge Cases

- What happens when the extracted enum set (from #187) is missing or empty? The generator must fail loudly at construction time, not silently emit a useless prompt.
- What happens when the LLM returns malformed output (not valid CQL2, or missing the chips summary)? The generator must detect this, surface a structured error, and not raise an exception that crashes the caller.
- What happens when the LLM returns CQL2 that parses but references a field not in the CQL2 schema (hallucinated field)? The generator must validate the returned CQL2 against the schema before returning it.
- What happens when the query is in a language other than English? Out of scope — documented in Assumptions.
- What happens when a phrase matches multiple vessel classes with the same short name (e.g. "Type 45" exists but "type-45" and "T45" are user variants)? The prompt's taxonomy description must include enough synonyms/aliases (or the prompt must instruct the model to tolerate casing/punctuation) to handle the common cases in the corpus; phrases that still miss become bugs to address by prompt iteration, not silent failures.
- What happens when the harness's expected match count drifts because the sample catalog is regenerated (e.g. after #184)? The corpus must either record canonical fixture-based expectations or tolerate a documented recalibration step.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a `generate_cql2(phrase)` capability that takes a natural-language phrase and returns a structured result containing a CQL2 filter expression (possibly empty), a list of chip summaries, and an optional list of unrecognised terms.
- **FR-002**: The generator MUST compose its LLM prompt from three inputs: (a) a static CQL2 schema description listing allowed field names, their types, allowed operators, and the `array_filter` syntax; (b) the enum JSON produced by item #187 (vessel class taxonomy tree, nationalities, exercise names, tags, feature_tags); (c) the user's phrase.
- **FR-003**: The prompt MUST NOT contain any catalog item data. Its size MUST be bounded by the schema + enums only, so that growing the catalog does not grow the prompt.
- **FR-004**: The returned CQL2 MUST parse successfully with the existing CQL2 parser used by the filter engine, and MUST reference only fields declared in the schema description passed into the prompt.
- **FR-005**: The returned CQL2 MUST use `array_filter(platforms, ...)` for any predicate that combines two or more platform-level dimensions (e.g. nationality + vessel type). The prompt MUST explicitly demonstrate this pattern with at least one worked example.
- **FR-006**: The returned chip summary list MUST contain one entry per human-intelligible dimension in the CQL2 (e.g. a single chip for a compound nationality+domain predicate, not one chip per sub-predicate). Each chip MUST carry a label, a field identifier, and a value or value list suitable for display in the filter bar (#127).
- **FR-007**: A headless test harness MUST accept a corpus file of analyst phrases with expected outcomes (match counts and/or plot ID sets) and produce a pass/fail report per phrase, with the generated CQL2 visible on failure.
- **FR-008**: The corpus MUST include at minimum the 9 validated phrases from the prototype, covering: a nationality-only query, a domain-only query, a nationality+domain compound query, a vessel-type query, a vessel-role query, an exercise-only query, a compound nationality+vessel-type query, a compound exercise+platform query, and one phrase with an unrecognised term.
- **FR-009**: The generator MUST short-circuit and return an empty CQL2 filter and empty chip list for an empty or whitespace-only phrase, without calling the LLM.
- **FR-010**: When the LLM response cannot be parsed or validated against the schema, the generator MUST return a structured error (phrase, raw response, reason) rather than raising. The harness MUST treat such errors as test failures with the raw response visible.
- **FR-011**: The generator MUST expose its LLM call via an injectable interface so that the harness can run against (a) a real LLM during authoring, (b) a deterministic stub or recorded-response fixture during CI. This decouples item 188 from the transport decision deferred to #189.
- **FR-012**: The harness MUST compare expected vs. actual results by evaluated catalog outcomes (match count or plot ID set), not by CQL2 string equality, so that semantically equivalent CQL2 permutations pass.
- **FR-013**: When the generator identifies terms in the phrase that do not match any enum value, it MUST include them in the unrecognised-terms field of the result and MUST NOT emit CQL2 predicates that reference them.

### Key Entities *(include if feature involves data)*

- **Analyst Phrase**: A short natural-language string (typically 2–10 words) describing a plot selection intent (e.g. "UK submarines"). The primary input to the generator.
- **Prompt Template**: A structured string combining a fixed CQL2 schema description, the extracted enum JSON, and placeholders for the analyst phrase. Versioned as source; regenerated whenever the CQL2 schema or enum set changes.
- **Generation Result**: A structured object containing: the CQL2 filter (possibly empty), a list of chip summaries, a list of unrecognised terms, and optional diagnostic metadata (prompt version, model identifier, raw LLM response hash).
- **Chip Summary**: A user-facing description of one dimension of the filter (label, field, value(s)). Consumed by the filter bar UI in future items (#127, #190).
- **Phrase Corpus**: A versioned test fixture (file in the repository) listing analyst phrases and their expected catalog-evaluation outcomes (match counts and/or ID sets). The baseline for regression testing.
- **LLM Interface**: An abstraction representing a single-shot text-in/text-out call to a language model. Implementations include a stub (records or replays) and a real-model wrapper. Transport details (auth, endpoint, provider) are owned by #189.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 9 validated prototype phrases (UK submarines, German frigates, Type 23 frigates, and the other 6 in the prototype's golden set) pass the harness with match counts identical to the prototype baseline.
- **SC-002**: At least one acceptance-test phrase per CQL2 dimension (nationality, domain, vessel role, vessel type, exercise, tags, year, compound platform predicate) is present in the corpus and passing.
- **SC-003**: The harness runs to completion in under 2 minutes against a recorded-response fixture in CI, and under 5 minutes against a real model during authoring.
- **SC-004**: The prompt's total size (schema + enums + taxonomy) remains under 20 KB for the current sample catalog, and is confirmed to grow only with the enum set (not with catalog item count) via a test that varies catalog size and asserts prompt size is unchanged.
- **SC-005**: When a phrase contains an out-of-vocabulary term, the harness confirms the term appears in the unrecognised-terms field and does not appear as a predicate value in the CQL2, on 100% of the intentionally-unmatched corpus entries.
- **SC-006**: Swapping the prompt template to a deliberately-broken version causes the harness to fail with a clear diagnostic on at least one phrase, demonstrating that the regression signal works.
- **SC-007**: `task verify` passes on the feature branch with the harness integrated into the standard test run (using the recorded-response fixture).

## Assumptions

- The enum extraction script (item #187) produces its output JSON at a stable repository path before this item is implemented, and its schema is stable enough to embed directly into the prompt.
- The CQL2 `array_filter` evaluator (item #185) is implemented and available, so that the harness can actually evaluate the generated CQL2 against the sample catalog.
- Analyst phrases in scope are in English only. Multi-language support is explicitly out of scope.
- The LLM used during authoring is capable of following structured-output instructions (e.g. returning JSON with declared fields). The specific choice of model is not fixed by this spec — the abstraction in FR-011 makes it swappable.
- Recorded-response fixtures (for CI determinism) are produced during authoring by running the real LLM once and committing the responses. Fixtures are re-recorded when the prompt template changes materially.
- Transport, authentication, and provider selection for the real LLM are out of scope and handled by item #189.
- The sample catalog state assumed by the corpus is the one produced by item #184 (the regenerated local-store). If the catalog is later regenerated with different counts, the corpus expected values will need recalibration — this is acknowledged as a maintenance cost.
