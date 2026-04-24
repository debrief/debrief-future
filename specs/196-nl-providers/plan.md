# Implementation Plan: NL Search — Non-Anthropic Providers

**Branch**: `196-nl-providers` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/196-nl-providers/spec.md`

## Summary

Add OpenAI and ollama as first-class providers alongside the existing Anthropic Claude path from #191. #191 landed `providerCall.ts` as the single HTTPS-call-with-timeout-and-abort core, plus `clients.ts` exporting `createLiveLLMClient` and `createPostMessageLLMClient`. This feature refactors the Anthropic-specific request shaping and response classification out of `providerCall.ts` into an **Anthropic adapter**, introduces peer adapters for **OpenAI** and **ollama**, and adds a **provider registry** selected by a new `debrief.nlSearch.provider` VS Code setting. Each provider's API key lives in its own `SecretStorage` slot. A **provider-neutral prompt validation harness** runs in CI against canned fixtures (no network) and proves every adapter produces semantically equivalent CQL2 for a fixed fixture set. The `LiveOutcome` union is unchanged — all provider errors map to the existing seven classes.

**Technical approach**: Create `shared/components/src/nl-cql2/providers/` with three modules: `anthropic.ts` (extracted from current `providerCall.ts`), `openai.ts`, `ollama.ts`. Each module exports `{ toProviderRequest(prompt, schema, config): ProviderRequest; classifyResponse(status, body): LiveOutcome }`. A new `shared/components/src/nl-cql2/providerRegistry.ts` exports `getAdapter(providerId): ProviderAdapter`. `providerCall.ts` becomes thin: it receives an adapter, calls `toProviderRequest`, issues the HTTPS call via the existing stdlib machinery, and delegates response classification to `classifyResponse`. The extension host (`llmProxy.ts`) reads the `debrief.nlSearch.provider` setting on each submission and loads the matching `SecretStorage` slot (`debrief.nlSearch.anthropicApiKey`, `debrief.nlSearch.openaiApiKey`, `debrief.nlSearch.ollamaApiKey`). The live-mode indicator component in `FilterBar` gains a `provider` prop. The prompt validation harness is a new vitest suite at `shared/components/src/nl-cql2/__tests__/prompt-validation.test.ts` that iterates provider × fixture, stubs `providerCall.ts`'s HTTPS call with canned response bodies per provider, runs the full classify-and-parse path, and asserts the resulting CQL2 matches the expected output.

## Technical Context

**Language/Version**: TypeScript 5.x (existing toolchain; no language or version change)
**Primary Dependencies**: VS Code Extension API ^1.85.0, React 18.x, `@debrief/components` (NL-mode FilterBar + nl-cql2 module from #191), Node stdlib `https` / `http` (for ollama on loopback or TLS endpoints). No new npm packages — OpenAI and ollama are called via stdlib just like Anthropic is today.
**Storage**: VS Code `SecretStorage` with three distinct slots (anthropic / openai / ollama). VS Code configuration for non-secret settings.
**Testing**: vitest (unit — each provider adapter's `toProviderRequest` + `classifyResponse`; registry; prompt validation harness); Playwright via `@sparticuz/chromium` + code-server (webview E2E — happy path per provider, cross-provider failure matrix for all 21 combinations × stubs, indicator update on provider switch).
**Target Platform**: VS Code 1.85+ on any OS. ollama-with-loopback runs on the analyst's machine; ollama-on-org-endpoint runs on a network-reachable host.
**Project Type**: single — changes under `shared/components/src/nl-cql2/` and `apps/vscode/src/services/llmProxy.ts` + `apps/vscode/package.json`. No new top-level directories.
**Performance Goals**: Each provider must meet the #191 10 s wall-clock bar for a representative phrase. Provider-switch overhead (next-submission-after-setting-change) is bounded at one fresh `SecretStorage` read plus one provider-registry lookup — well under 50 ms.
**Constraints**: (1) Zero new runtime dependencies (no `openai`, no `ollama` npm packages). (2) Each provider's key is read only for submissions routed to that provider — no cross-provider credential leakage. (3) The seven-class `LiveOutcome` union is frozen — no new classes. (4) Anthropic remains the default; existing behaviour byte-identical when `provider = "anthropic"`. (5) Prompt validation harness must run in CI without network.
**Scale/Scope**: Two new providers, one shared adapter contract, one registry, one harness. Largest single work item in this epic.

## Constitution Check

*GATE: pre- and post-design both pass. Nothing requires justification.*

| Article | Assessment |
|---|---|
| I. Defence-Grade Reliability | **PASS** — zero regression in default path; new provider paths reuse the same timeout / abort / ceiling / failure-class taxonomy from #191. Adding providers does not change the analyst-facing failure surface. |
| III. Data Sovereignty | **PASS** — no new telemetry content. Adds provider + providerModel fields to existing records. Credentials remain per-provider in SecretStorage. ollama support strengthens sovereignty (on-prem / air-gapped possible). |
| IV. Architectural Boundaries | **PASS** — adapters are pure (no I/O, no side effects); `providerCall.ts` remains the sole I/O site; extension host is the sole credential holder. |
| VI. Testing | **PASS** — per-adapter unit tests, prompt validation harness, cross-provider E2E failure matrix. |
| IX. Dependencies | **PASS** — zero new runtime dependencies. Stdlib `https`/`http` only. |
| X. Security | **PASS** — per-provider secret isolation. Prompt validation harness uses canned data, never touches real providers in CI. |
| XIV. Pre-Release Freedom | **INVOKED** — refactor of `providerCall.ts` is permitted because v4.0.0 has not shipped. `providerCall.ts` signature gains an `adapter` parameter; `apps/nl-demo` (from #190) migrates in the same PR. |
| XV. Strict Type Safety | **PASS** — `ProviderId` is a literal union; provider registry is typed `Map<ProviderId, ProviderAdapter>`; adapter contract enforces `LiveOutcome` return from `classifyResponse`. |

No violations. **Complexity Tracking section intentionally omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/196-nl-providers/
├── plan.md              # This file
├── spec.md              # Produced by /speckit.specify
├── research.md          # Phase 0 — per-provider request/response formats, JSON mode availability, error taxonomy mapping
├── data-model.md        # Phase 1 — ProviderAdapter contract, ProviderId literal, per-provider credential slots
├── quickstart.md        # Phase 1 — how to add a fourth provider (walk-through)
├── contracts/
│   ├── provider-adapter.ts    # The shared contract both new providers implement
│   └── provider-registry.ts   # The registry lookup contract
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── tasks.md             # /speckit.tasks output — not created here
```

### Source Code (repository root)

```text
shared/components/
└── src/
    └── nl-cql2/
        ├── providers/
        │   ├── index.ts                     # NEW: re-exports
        │   ├── anthropic.ts                 # NEW: extracted from current providerCall.ts
        │   │                                 #      toProviderRequest + classifyResponse for Anthropic v1/messages
        │   ├── openai.ts                    # NEW: toProviderRequest + classifyResponse for v1/chat/completions
        │   │                                 #      Uses JSON mode where supported (gpt-4o, gpt-4-turbo)
        │   └── ollama.ts                    # NEW: toProviderRequest + classifyResponse for ollama
        │                                    #      Defaults to /v1/chat/completions (OpenAI-compatible) per config
        ├── providerRegistry.ts              # NEW: const REGISTRY: Map<ProviderId, ProviderAdapter>
        │                                    #      export function getAdapter(id): ProviderAdapter
        ├── providerCall.ts                  # EDIT: signature gains `adapter: ProviderAdapter` parameter
        │                                    #      delegates request shaping + response classification to adapter
        │                                    #      retains HTTPS + streaming + timeout + abort responsibilities
        ├── types.ts                         # EDIT: add ProviderId literal + ProviderAdapter interface
        │                                    #      add provider + providerModel fields to TransportCallRecord
        ├── clients.ts                       # EDIT: createLiveLLMClient takes a provider arg and looks up the adapter
        └── __tests__/
            ├── prompt-validation.test.ts    # NEW: provider-neutral harness (see below)
            ├── providers/
            │   ├── anthropic.test.ts        # EDIT or NEW: per-adapter unit tests
            │   ├── openai.test.ts           # NEW
            │   └── ollama.test.ts           # NEW
            └── providerRegistry.test.ts     # NEW

apps/vscode/
├── src/
│   ├── services/
│   │   ├── llmProxy.ts                     # EDIT: read debrief.nlSearch.provider on each submission;
│   │   │                                    #      load matching SecretStorage slot; pass adapter via createLiveLLMClient
│   │   └── llmProxy.test.ts                # EDIT: tests for per-provider slot loading + provider-switch mid-cache
│   └── extension.ts                        # EDIT: register three per-provider Set Key commands
│                                            #      (Set Anthropic Key / Set OpenAI Key / Set Ollama Key)
└── package.json                            # EDIT: add debrief.nlSearch.provider (enum),
                                             #       debrief.nlSearch.ollamaEndpoint (string default http://localhost:11434),
                                             #       three SetKey commands

shared/components/
└── src/
    └── FilterBar/
        └── FilterBar.tsx                   # EDIT: live-mode indicator renders provider name + model
                                             #      (one-prop addition; no behavioural change)

apps/nl-demo/                                # (from #190)
└── scripts/live-proxy.mjs                  # EDIT: migrate to new providerCall.ts signature
                                             #      (Anthropic adapter reused; demo remains Anthropic-only)

shared/components/
└── src/
    └── nl-cql2/
        └── __tests__/
            └── fixtures/
                ├── phrases.json            # NEW: deterministic fixture set — phrase × expected CQL2
                ├── anthropic-responses.json  # NEW: canned Anthropic response bodies per phrase
                ├── openai-responses.json   # NEW: canned OpenAI response bodies per phrase
                └── ollama-responses.json   # NEW: canned ollama response bodies per phrase

tests/e2e/
└── test-vscode-nl-search.spec.ts           # EDIT (file introduced by #191): add scenarios —
                                             #   - switch-provider-mid-session preserves chips
                                             #   - happy-path per provider (parametric over 3)
                                             #   - failure matrix per provider (parametric over 7 × 3 = 21)
                                             #   - ollama-endpoint-unreachable surfaces provider-error banner
```

**Structure Decision**: Introduces a per-provider adapter directory under `nl-cql2/providers/` and a small `providerRegistry.ts` lookup. Everything else is additive: `llmProxy.ts` gains a provider-selection branch; the indicator gains a provider label. Anthropic code is relocated (extracted from `providerCall.ts` to `providers/anthropic.ts`) but its logic is unchanged; the default path is byte-identical from the analyst's perspective.

## Applied Design Decisions (7)

| # | Decision | Applied in |
|---|---|---|
| 1 | `ProviderAdapter` contract is pure functions (no class state, no I/O). Shared core owns all I/O. | `shared/components/src/nl-cql2/types.ts` — interface with two method signatures only |
| 2 | `ProviderId = "anthropic" \| "openai" \| "ollama"` is a literal union, not a string. Registry map is typed. Exhaustive switches in telemetry + indicator. | `shared/components/src/nl-cql2/types.ts` + `providerRegistry.ts` |
| 3 | Per-provider `SecretStorage` slots. Key migration from #191's `debrief.nlSearch.anthropicApiKey` slot: if the new feature lands after #191, the key is already in the right slot (named `debrief.nlSearch.anthropicApiKey` from day one of #191 in anticipation). No migration code needed. | `apps/vscode/src/services/llmProxy.ts` — three slot names, selected by active `providerId` |
| 4 | ollama uses OpenAI-compatible `/v1/chat/completions` endpoint by default (most ollama builds support this). Falls back to `/api/chat` only if the server returns a 404 on the compat endpoint, classified as `provider-error` with a helpful body ("ollama compat endpoint not found; configure model with chat support"). | `shared/components/src/nl-cql2/providers/ollama.ts` — URL construction uses `${endpoint}/v1/chat/completions` |
| 5 | OpenAI JSON mode is used on models that support it (`gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`). On other models, the adapter emits a stricter system prompt and post-parses. The adapter exports `supportsJsonMode(model): boolean` to keep this decision explicit and testable. | `shared/components/src/nl-cql2/providers/openai.ts` |
| 6 | Prompt validation harness uses **canned HTTPS response bodies** per provider, stubbed at the `providerCall` level (by monkey-patching the `https.request` used in the test environment — same approach as `providerCall.test.ts` from #191). No real network. Runs in CI. | `shared/components/src/nl-cql2/__tests__/prompt-validation.test.ts` |
| 7 | Non-loopback ollama endpoint triggers a warning in the settings UI description but is NOT blocked at runtime. Spec rationale: organisation-hosted ollama is a legitimate use case. | `apps/vscode/package.json` — settings description includes `markdownDescription` with ⚠️ prefix for non-loopback |

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| FilterBar — indicator with provider label | `shared/components/src/FilterBar/FilterBar.stories.tsx` — extend `NlModeWithStubClient` to add provider-switch variants | `filter-bar-nl-providers.js` | Demonstrates the indicator showing `anthropic · claude-haiku-4-5` vs `openai · gpt-4o` vs `ollama · llama3.1:8b (localhost:11434)` |

**Inclusion Criteria Applied**:
- [x] New visual component state (provider label on the indicator)
- [x] Significant visual change (yes — a visible attribution tells the analyst where their call is going)
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone
- [x] Reasonable bundle size expected (< 200 KB including three stub clients)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar--nlmodeproviderswitch`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `FilterBar.stories.tsx` — `NlModeProviderSwitch` | Indicator label correct per provider; switching stub provider re-renders label | light, dark, vscode | click provider selector (test harness control), fill, Enter |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid="nl-search-indicator"`, `data-provider`, `data-model`)
- [x] Screenshots captured for evidence (indicator-anthropic, indicator-openai, indicator-ollama)

**Test File Location**: `shared/components/e2e/FilterBar-nl.spec.ts`

**Theme Variant URLs**:
```
/iframe.html?id=filterbar--nlmodeproviderswitch&globals=theme:light
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Happy path per provider | Catalog Overview webview | Provider-scoped test hooks | Parametric over 3 providers: set provider + key, submit phrase, assert chips + indicator label |
| Cross-provider failure matrix | Same | `[data-transport-reason]` | Parametric over 21 combinations (7 classes × 3 providers); assert banner reason + copy identical per class regardless of provider |
| Provider switch mid-session preserves chips | Same | Chip selectors + indicator | Apply chips via Anthropic; switch setting to OpenAI; assert chips remain + indicator updated |
| Ollama endpoint unreachable | Same | Banner reason | Configure ollama with unreachable URL; submit; assert `provider-error` banner with ollama-specific body |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server for all three providers
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects extended with provider-scoped selectors
- [x] Screenshots captured for evidence (21 failure banners, 3 indicator labels, provider-switch-preserves-chips)

**Test File Location**: `tests/e2e/test-vscode-nl-search.spec.ts` (extends the #191 file)

**Infrastructure**: reuses the `xvfb-run` + `@sparticuz/chromium` harness. The failure matrix parametrisation reuses the stub-injection pattern from #191 — the three per-provider response fixtures are loaded from `shared/components/src/nl-cql2/__tests__/fixtures/` to keep fixtures shared between the prompt-validation harness and the E2E suite.

## Deferred / Out of Scope

- **Azure OpenAI** — a fourth provider via a similar adapter. Deliberately excluded from v1 to cap PR scope; the quickstart walk-through demonstrates how to add it in a follow-up issue.
- **Tool-call / function-calling APIs** — each provider's native tool-call mechanism might replace the current "JSON-mode + response schema" pattern. Deferred — would require a rewrite of the prompt adapter contract.
- **Per-panel provider selection** — explicitly rejected. One provider per session.
- **Dynamic model discovery** — the analyst types the model ID into a string setting; we do not probe the provider for available models. Reduces network surface and keeps the settings surface offline-capable.
- **NL in additional panels** — #195.
- **Audit trail** — #197.
- **Keyring-unavailable banner split** — #198.
