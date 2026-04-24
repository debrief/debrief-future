# Implementation Plan: NL → CQL2 Prompt Design + Generation

**Branch**: `188-nl-cql2-prompt` | **Date**: 2026-04-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/188-nl-cql2-prompt/spec.md`
**Last updated**: 2026-04-14 (post-`/speckit.review` — 16 review decisions adopted + CQL2 reverse parser folded in)

## Summary

Build a natural-language → CQL2 generator that composes a fixed-size prompt (CQL2 schema + extracted enums + array_filter syntax) and returns a structured `GenerationResult` (CQL2 filter + `LozengeSeed[]` + unrecognised terms). Ship with a headless regression harness that replays a corpus of analyst phrases through the generator, evaluates the generated CQL2 against the local sample catalog using the existing filter-engine, and compares match counts to recorded baselines.

The generator module lives inside the existing `shared/components` package next to the `filter-engine/`. The LLM call is behind an injectable `LLMClient` interface so a future live-transport implementation (owned by item #190 — Live LLM Transport) can plug in without touching the generator. 188 itself ships only recorded/stub clients; CI and offline stakeholder demos run against a hand-authored fixture corpus for full determinism and zero live-LLM dependency.

**Scope additions adopted from `/speckit.review`**:

- The filter-engine gains a full CQL2-JSON → FilterExpression reverse parser (`cql2JsonToFilterExpression`) plus a thin `filterByCql2Json` convenience method. `PROPERTY_MAP` becomes exported so the prompt builder imports it directly.
- The generator emits chips as `LozengeSeed = Pick<LozengeItem, 'filterType'|'value'|'negated'>`, reusing the existing FilterBar chip shape rather than inventing a parallel `ChipSummary` type.
- Prompt-size scaling is measured during implementation and recorded in `research.md` §11.

These are in-scope for 188; the user chose to include them rather than defer.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode). No Python needed — all three upstream artefacts (`shared/data/enum-bundle.json`, `shared/data/platform-registry.json`, `preview/workspace/samples/local-store/`) are JSON consumable directly from Node/TS.
**Primary Dependencies**: existing `@debrief/components` workspace package; existing `filter-engine/` module (#126 + #185) — **modified** in 188 to add `cql2JsonToFilterExpression`, `filterByCql2Json`, and an exported `PROPERTY_MAP`; existing `FilterBar/types.ts` (#127) supplies the `LozengeItem` shape the generator reuses; `cql2-filters-parser` (already a transitive dep). No new runtime dependencies.
**Storage**: None. Inputs are read-only JSON files on disk. The generator is stateless; the harness writes reports to stdout / vitest output only.
**Testing**: vitest (already used across `shared/components`). The regression harness lives under `__tests__/` (per review decision 13A, not shipped in `dist/`) and runs as part of `pnpm --filter @debrief/components test`. Unit tests cover prompt composition, each `GenerationErrorReason` value, the new reverse parser's throw paths, `PROPERTY_MAP` exhaustiveness against the `FilterType` union, the harness self-test with a `BadLLMClient`, and the short-circuit for empty/whitespace phrases.
**Target Platform**: Node 20+ for CI + harness; browser-compatible for future direct consumption in #189 (Stakeholder Demo UI) and #190 (Live LLM Transport) — no Node-only APIs used in the production module; only the harness under `__tests__/` touches `fs`.
**Project Type**: single TypeScript monorepo (pnpm workspaces); this feature adds one new module inside `@debrief/components` and modifies `filter-engine/`.
**Performance Goals**: Harness completes in under 2 minutes against recorded fixtures (SC-003, asserted); prompt build for a single phrase under 10 ms (trivial string composition).
**Constraints**: Offline by default — recorded-fixture mode MUST NOT attempt any network I/O. Prompt size under 20 KB for the current sample catalog (SC-004, asserted by decision 15A). No `any` types (Article XV). Strict-mode TypeScript.
**Scale/Scope**: One new module (~8 production source files after splitting clients / types / generator / parser / prompt / schema-description + index), one corpus (9+ phrases, extensible), one recorded-fixture file, one harness test + one harness self-test + targeted unit tests. Filter-engine gains two new functions + one promoted constant. Current enum bundle is ~2 KB; prompt template + worked examples estimated at 8–12 KB — exact numbers to be recorded in `research.md` §11 during implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applies? | How this plan complies |
|---------|----------|------------------------|
| I. Defence-Grade Reliability | Yes | The harness runs fully offline and reproducible against hand-authored fixtures (same prompt + fixture → identical result). 188 does not invoke any live model; live-transport concerns are owned by #190. No silent failures: five enumerated `GenerationErrorReason` values cover every generator failure path; decision 8A's `cql2-evaluation-failed` closes the last loophole. Decision 12A keeps CQL2 visible on PASS so fixture drift cannot hide behind coincidental match counts. |
| II. Schema Integrity | Yes | No LinkML changes. The prompt's CQL2 schema block imports `PROPERTY_MAP` from `filter-engine/cql2-json.ts` (decision 3A) — a single source of truth. Decision 11A adds an exhaustiveness test asserting every `FilterType` union value is a key in `PROPERTY_MAP`. The new reverse parser (`cql2JsonToFilterExpression`) is the canonical CQL2-JSON → FilterExpression path, replacing the risk of ad-hoc partial parsers drifting from the evaluator. |
| III. Data Sovereignty | Yes | No telemetry. No network calls in default (recorded) mode. Provenance captured in `GenerationResult.diagnostics` (prompt version, response hash). |
| IV. Architectural Boundaries | Yes | This is a library module — no UI, no persistence. Consumed by future frontends (#189 Stakeholder Demo UI) without coupling. Returns data only. Chip output uses the canonical `LozengeItem` shape (via `LozengeSeed`) so frontends need no mapper layer. |
| V. Extensibility | Yes | `LLMClient` interface is the extension point; organisations can plug in alternative transports (MCP tool, proxy, local model) via #190 (Live LLM Transport) without editing the generator. |
| VI. Testing | Yes | Vitest unit tests for prompt composition, each `GenerationErrorReason`, reverse parser throw paths, and `PROPERTY_MAP` exhaustiveness. Corpus-driven integration test is the acceptance gate. A dedicated harness self-test (decision 9A) automates SC-006 — the harness's own regression-detection capability. Wired into CI via the existing `pnpm test` step. |
| VII. Test-Driven AI Collaboration | Yes | The phrase corpus IS the executable acceptance spec for the prompt. Checklist in the spec feeds the harness's comparison logic (by match count, not string equality). |
| VIII. Documentation | Yes | Spec + plan + research captured in `specs/188-nl-cql2-prompt/`. Public API of the new module documented via TSDoc. |
| IX. Dependencies | Yes | Zero new runtime dependencies. Harness uses only stdlib + existing dev-deps. |
| X. Security | Yes | No secrets. LLM transport (where real API keys would live) is #190's concern; this item's library accepts a pre-configured `LLMClient` and never sees credentials. 188 has no live-model code path at all. |
| XI. Internationalisation | Noted | English-only in scope (documented assumption in spec). `LozengeSeed.value` is a plain string and the consumer's `Lozenge` component owns display formatting — future i18n sits at the display layer, not in the generator output. |
| XII. Community Engagement | N/A | No user-visible feature here; #189 (Stakeholder Demo UI) will handle stakeholder preview. |
| XIII. Contribution Standards | Yes | Single feature branch; atomic commits; CI-gated. |
| XIV. Pre-Release Freedom | Yes | Pre-v4.0.0 — free to evolve the prompt API as feedback arrives. |
| XV. Strict Type Safety | Yes | No `any`. Every LLM-returned value crosses a typed validation boundary (`parseGenerationResult`) before entering application code. |

**Gate status**: PASS — no violations, no justifications required.

## Project Structure

### Documentation (this feature)

```text
specs/188-nl-cql2-prompt/
├── plan.md              # This file
├── research.md          # Phase 0 output (LLM interface, prompt composition, fixture format)
├── data-model.md        # Phase 1 output (GenerationResult / LozengeSeed / corpus record)
├── quickstart.md        # Phase 1 output (run-the-harness instructions)
├── contracts/           # Phase 1 output (LLMClient interface, GenerationResult schema)
└── tasks.md             # Phase 2 output (/speckit.tasks — not this command)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   ├── filter-engine/                    # MODIFIED in 188
│   │   ├── cql2-json.ts                  # ADD: export PROPERTY_MAP; add cql2JsonToFilterExpression
│   │   ├── engine.ts                     # ADD: filterByCql2Json free function
│   │   ├── index.ts                      # ADD: export new symbols
│   │   └── __tests__/
│   │       └── cql2-json-reverse.test.ts # NEW: reverse parser happy + throw paths (10A)
│   │
│   ├── FilterBar/types.ts                # UNCHANGED — LozengeItem consumed by generator (2A / 5A)
│   │
│   └── nl-cql2/                          # NEW — this feature (production code)
│       ├── index.ts                      # Public exports (generator, buildPrompt, clients, types)
│       ├── types.ts                      # GenerationResult, LozengeSeed, LLMClient, diagnostics
│       ├── buildPrompt.ts                # Composes role + schema + enums + examples + phrase
│       ├── schemaDescription.ts          # Imports PROPERTY_MAP from filter-engine (3A); FilterType exhaustiveness (11A)
│       ├── generate.ts                   # generateCql2(phrase, deps) → GenerationResult
│       ├── parseResponse.ts              # Validates + narrows LLM output to typed result (5 error reasons per 8A)
│       └── clients.ts                    # createRecordedLLMClient + createPassthroughLLMClient
│
│       __tests__/                        # UNDER nl-cql2/ — not shipped in dist/ (13A)
│       ├── buildPrompt.test.ts
│       ├── schemaDescription.test.ts     # PROPERTY_MAP exhaustiveness (11A)
│       ├── parseResponse.test.ts         # One test per GenerationErrorReason (10A)
│       ├── generate.test.ts              # Empty input, short-circuit, client wiring
│       ├── harness.ts                    # runHarness() + loadSampleCatalog() — test infra, not src
│       ├── harness-self-test.ts          # BadLLMClient → asserts report.failed > 0 (9A)
│       ├── corpus.test.ts                # The P1/P2 regression harness — 3 assertions (15A + SC-003 + failed===0)
│       └── fixtures/
│           ├── corpus.json               # Phrases + expected match counts / ID sets
│           └── responses.json            # Recorded LLM responses keyed by canonicalised phrase
│
├── vitest.globalSetup.ts                 # NEW — exports DEBRIEF_REPO_ROOT env var (14A)
└── package.json                          # Update vitest config to reference globalSetup
```

**Structure Decision**: Add `nl-cql2/` as a sibling of `filter-engine/` inside the existing `@debrief/components` package. The filter-engine is modified in-place to add the reverse parser, `filterByCql2Json`, and export `PROPERTY_MAP` — the generator imports these directly. Harness code, fixtures, and helpers all live under `src/nl-cql2/__tests__/` so they are excluded from `dist/` and never ship to library consumers (VS Code extension, web-shell, #190 demo). A single `vitest.globalSetup.ts` resolves the repo root once per test run via `pnpm-workspace.yaml` find-up, making path-dependent tests CWD-independent.

## Media Components

None - backend/infrastructure feature. This item produces a library module and a headless test harness; it has no visual components. The stakeholder-facing UI that consumes the generated chips lives in item #189.

## Storybook E2E Testing

None - no interactive UI components.

## VS Code Webview E2E Testing

None - no extension workflow changes.

## Complexity Tracking

*No constitutional violations — section intentionally empty.*
