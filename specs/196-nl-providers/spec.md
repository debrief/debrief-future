# Feature Specification: NL Search — Non-Anthropic Providers

**Feature Branch**: `196-nl-providers`
**Created**: 2026-04-18
**Status**: Draft
**Input**: Backlog #196 — "[E10] NL search — non-Anthropic providers. Pluggable provider choice via `debrief.nlSearch.provider` setting (Claude / OpenAI / ollama); `LLMClient` abstraction already supports new factories, main work is per-provider prompt adaptation + error-class mapping (requires #191, provider-neutral prompt validation harness)."

## Overview

The parent NL-search feature (#191) ships Anthropic Claude as the single built-in provider, with a `LLMClient` contract designed to accept additional factories. This feature adds two further first-class providers — **OpenAI** and **ollama** (for local / on-premise models) — selectable via a new `debrief.nlSearch.provider` setting. Each provider is a new implementation of the existing `LLMClient` contract produced by a matching factory in `shared/components/src/nl-cql2/clients.ts`. The core work is: (a) per-provider prompt adaptation (OpenAI and ollama tokenise and structure system/assistant/user roles differently from Claude and differ in JSON-mode support), (b) per-provider error-class mapping into the seven-class `LiveOutcome` union, and (c) a provider-neutral prompt validation harness that proves the NL-to-CQL2 outputs remain semantically equivalent across providers on a fixture set, without making real LLM calls in CI. No new transport, no new storage, no new banner classes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyst selects a non-Anthropic provider and uses NL search (Priority: P1)

A maritime analyst whose organisation uses OpenAI rather than Anthropic opens VS Code settings, chooses `openai` as the `debrief.nlSearch.provider`, supplies an OpenAI API key via the existing `Debrief: Set API Key` command (now per-provider), enables live NL mode, and types a phrase in the Catalog Overview. The extension host routes the call through the OpenAI-specific provider implementation, adapts the prompt to the OpenAI chat-completions format, parses the JSON-mode response into the same CQL2 shape #191 expects, and the analyst sees chips narrow the list identically to an Anthropic submission. Switching the provider to `ollama` (with a local endpoint URL configured) produces the same analyst experience against a locally-hosted model.

**Why this priority**: This is the feature. Organisations with provider lock-in (existing enterprise OpenAI contracts, air-gapped ollama deployments) cannot adopt NL search today. Without a non-Anthropic path, the feature is a non-starter for a material fraction of the user base.

**Independent Test**: Configure `debrief.nlSearch.provider = "openai"`, supply a valid key, submit a phrase against a representative fixture corpus, confirm the same chip pattern appears as the Anthropic path for that phrase (verified by the prompt validation harness). Repeat with `ollama`.

**Acceptance Scenarios**:

1. **Given** `debrief.nlSearch.provider = "openai"` with a valid OpenAI key configured, **When** the analyst submits a representative phrase, **Then** chips appear and narrow the list, and structured telemetry records `provider: "openai"` for the submission.
2. **Given** `debrief.nlSearch.provider = "ollama"` with a reachable local endpoint URL configured, **When** the analyst submits the same phrase, **Then** chips appear and narrow the list, and telemetry records `provider: "ollama"` with the endpoint URL (non-sensitive).
3. **Given** `debrief.nlSearch.provider = "anthropic"` (default, #191 behaviour), **When** the analyst submits the same phrase, **Then** behaviour is identical to #191 — no regressions in the default path.

---

### User Story 2 - Provider-specific failures surface as the correct unified failure class (Priority: P2)

When a provider produces an auth failure, rate-limit, provider error, timeout, malformed response, or transport-level failure, the `LiveOutcome` surfaced in the UI is the same unified class regardless of provider. OpenAI's 429 `rate_limit_exceeded` body, Anthropic's 429 `overloaded_error`, and ollama's local HTTP 503 all produce `{ kind: "rate-limit" }`. The analyst sees the same rate-limit banner; telemetry additionally records the provider-native code for log review.

**Why this priority**: Provider-native error taxonomies are inconsistent and would produce confusing UX if surfaced raw. The value of #191's unified seven-class taxonomy is analyst predictability; preserving it across providers is what makes this feature trustworthy in production.

**Independent Test**: For each provider × each failure class, inject a canned response in the provider-validation harness and assert the resulting `LiveOutcome.kind` equals the expected unified class. Harness runs in CI without real network calls.

**Acceptance Scenarios**:

1. **Given** OpenAI returns an HTTP 401 with `{ error: { type: "invalid_api_key" } }`, **When** the classification step runs, **Then** the outcome is `{ kind: "auth-failure" }` and the banner copy is the same as the Anthropic auth-failure banner from #191.
2. **Given** ollama returns an HTTP 503 "model not loaded", **When** the classification step runs, **Then** the outcome is `{ kind: "provider-error" }` and the banner's recovery action is "Retry".
3. **Given** OpenAI returns JSON that doesn't validate against the NL-response schema, **When** the classification runs, **Then** the outcome is `{ kind: "malformed-response" }` identical in shape to the Anthropic equivalent.

---

### User Story 3 - Prompt validation harness proves semantic equivalence across providers (Priority: P3)

A developer adding a new provider (or modifying a per-provider prompt template) runs the prompt validation harness on a deterministic fixture set of analyst phrases × expected CQL2 outputs. The harness exercises every provider against stubbed LLM responses (no network) and reports which fixtures produce equivalent CQL2 filter expressions across providers. Divergences are surfaced for human review; the harness does not auto-accept non-equivalent outputs.

**Why this priority**: Without a harness, adding a provider is gambling — per-provider prompt drift is silent and would only be caught by analyst complaints in production. P3 because the feature can ship with just Claude + OpenAI + ollama validated manually; the harness is the scaling mechanism for adding a fourth, fifth provider later.

**Independent Test**: Run the harness locally and in CI. Verify it (a) exercises each provider's prompt adapter against a deterministic stub, (b) compares parsed CQL2 outputs for equivalence, (c) reports divergences with the fixture phrase, expected output, and each provider's actual output. Confirm the harness runs to completion without real network calls.

**Acceptance Scenarios**:

1. **Given** the harness runs in CI with no API keys configured, **When** it executes against every provider × every fixture, **Then** it completes without network access and reports equivalence pass/fail per fixture.
2. **Given** a developer modifies the OpenAI prompt adapter in a way that changes output for a fixture, **When** CI runs, **Then** the harness fails the check and names the diverging fixture.
3. **Given** all three providers produce equivalent CQL2 for all fixtures, **When** the harness runs, **Then** it exits zero with a summary of `N fixtures × 3 providers: all equivalent`.

---

### Edge Cases

- **Provider setting changed mid-session**: Analyst has chips applied from an Anthropic submission, then switches `debrief.nlSearch.provider` to OpenAI. Next submission uses OpenAI; prior chips remain applied (no forced clear). The live-mode indicator updates to show the new provider + model.
- **Switched provider has no key configured**: Changing to OpenAI when no OpenAI key is stored MUST surface `not-configured` on next submission (or `keyring-unavailable` per #198 if relevant). Not a silent failure.
- **Ollama endpoint URL unreachable**: Classified as `provider-error` (not `transport-failure`, which is reserved for truly network-level failures like DNS). An unreachable `http://localhost:11434` produces a clear banner: "ollama endpoint not reachable; check it's running".
- **Model identifier invalid for chosen provider**: The analyst configures `debrief.nlSearch.model = "claude-opus-4-7"` while `provider = "openai"`. OpenAI returns a 404/400 on the model; classification produces `provider-error` with the provider's error body echoed non-sensitively in telemetry.
- **Credential cross-contamination**: The extension host MUST NOT send an OpenAI key to Anthropic or vice versa. Each provider's key is stored under a distinct `SecretStorage` key (`debrief.nlSearch.anthropicApiKey`, `debrief.nlSearch.openaiApiKey`, `debrief.nlSearch.ollamaApiKey`). Provider switch triggers a fresh secret lookup.
- **Provider returns success-shaped response with non-JSON content**: OpenAI without JSON mode can return prose; classification MUST produce `malformed-response` not `provider-error`.
- **ollama on a non-loopback endpoint**: Configuring `http://192.168.x.x:11434` is permitted (organisation-hosted ollama). Spec does NOT add a loopback-only restriction, but DOES surface a warning in settings when the configured URL is not `localhost` — an opt-in affordance, not a block.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept `debrief.nlSearch.provider` as a new VS Code setting with enumerated values `anthropic | openai | ollama`. Default MUST be `anthropic` — unchanged behaviour for existing installs.
- **FR-002**: Each non-`anthropic` provider MUST be implemented as a new `LLMClient` factory in `shared/components/src/nl-cql2/clients.ts` returning the same `LiveOutcome` union produced by the Anthropic factory.
- **FR-003**: Provider-specific prompt adaptation MUST live in per-provider adapter modules (`shared/components/src/nl-cql2/providers/anthropic.ts`, `openai.ts`, `ollama.ts`) that each export a `toProviderRequest(prompt, schema, config): ProviderRequest` function. The shared pipeline calls the adapter selected by the current provider setting.
- **FR-004**: Per-provider error-class mapping MUST produce one of the seven existing `LiveOutcome.kind` values (auth-failure, rate-limit, provider-error, timeout, malformed, not-configured, ceiling-reached) — NO new outcome classes are introduced by this feature. The #198 `keyring-unavailable` class, if shipped, MUST also apply uniformly across providers.
- **FR-005**: Each provider MUST store its API key under a distinct `SecretStorage` key; the existing `Debrief: Set API Key` command MUST prompt for the active provider's key and write to the active provider's slot. A new `Debrief: Set API Key for Other Provider` command MAY be introduced to manage non-active providers without switching.
- **FR-006**: The live-mode indicator MUST show the active provider name and model identifier, so the analyst can see at a glance which provider will be called on the next submission.
- **FR-007**: Structured telemetry (per #191 FR-007) MUST record `provider`, `providerModel`, and the provider-native error code (if any) for every submission — alongside the unified `LiveOutcome.kind`. Prompt and response content remain excluded.
- **FR-008**: A provider-neutral prompt validation harness MUST exist at `shared/components/src/nl-cql2/__tests__/prompt-validation.test.ts` (or equivalent). It MUST (a) run without real network access, (b) exercise every provider's prompt adapter against a shared fixture set of phrase → expected CQL2 pairs, (c) fail the build when any provider's adapter produces output that diverges from the expected CQL2 for any fixture, (d) print a diagnostic that names the diverging fixture + provider + actual output.
- **FR-009**: The ollama provider MUST accept a configurable endpoint URL via `debrief.nlSearch.ollamaEndpoint` (default `http://localhost:11434`). Non-loopback URLs MUST render a warning in the settings description but MUST NOT be blocked.
- **FR-010**: Switching `debrief.nlSearch.provider` MUST NOT clear prior chips or filtered list state. The next submission uses the new provider; the indicator updates to reflect the new provider's identity.
- **FR-011**: The Anthropic code path MUST remain byte-identical to #191 when `provider = "anthropic"` — this is achieved by making Anthropic one adapter among three, but the behaviour from the analyst's point of view is unchanged.
- **FR-012**: No new runtime dependencies are permitted. OpenAI is called via Node stdlib `https`; ollama is called via Node stdlib `http` (or `https` for TLS endpoints). No `openai` npm package, no `ollama` npm package. This mirrors #191's approach and matches the zero-new-deps rule.

### Key Entities

- **Provider adapter**: A module per supported provider that converts the canonical NL prompt + response-schema into the provider's native request shape, and that classifies the provider's native response / error shapes into one of the seven `LiveOutcome.kind` values. Contract: `{ toProviderRequest(prompt, schema, config): ProviderRequest; classifyResponse(status, body): LiveOutcome }`. Pure; no I/O.
- **Provider registry**: A static `Map<ProviderId, ProviderAdapter>` in the shared nl-cql2 module. The active provider is selected via the setting at call time; no hot-reload of the map.
- **Provider-specific credential slot**: A distinct `SecretStorage` key per provider. The extension host loads the slot matching the active provider on each submission (re-using the #191 key-cache pattern per-slot).
- **Prompt validation fixture**: A `{ phrase: string; expectedCql2: Cql2Expression; stubResponses: Record<ProviderId, string> }` tuple in a deterministic fixture file. The harness replays each provider's `classifyResponse` against its stub and asserts the resulting CQL2 matches `expectedCql2`.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Let the analyst (or their organisation) use whichever LLM provider their policy or infrastructure mandates, without losing the NL search capability.
- **Key Decision(s)**:
  1. Which provider best matches the organisation's existing contracts, privacy posture (on-prem ollama vs cloud), or cost model.
  2. Which model within that provider to target (provider- and model-specific capability varies).
  3. Whether to accept the warning when configuring a non-loopback ollama endpoint (organisation-hosted vs local).
- **Decision Inputs**:
  - Setting enum (`anthropic | openai | ollama`) with short descriptions.
  - Live-mode indicator showing active provider + model in the filter bar (tells the analyst which network call will happen).
  - Per-provider `Set API Key` commands (surfaces only the commands relevant to the active provider by default).
  - Provider-neutral failure banners (same seven classes regardless of provider).

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | VS Code Settings open, `debrief.nlSearch.provider = "anthropic"` | Changes to `openai` | Setting saved; no immediate UI change in open webviews |
| 2 | Catalog Overview has no chips, live-mode indicator now shows "openai · gpt-4o" | Types phrase, presses Enter | Extension host loads OpenAI key slot; OpenAI adapter runs; chips appear |
| 3 | Chips applied | Switches provider to `ollama` in settings | Indicator updates to "ollama · llama3.1:8b (localhost:11434)"; chips remain applied |
| 4 | Analyst re-submits or edits a chip | (next submission) | Uses ollama; if endpoint unreachable, provider-error banner appears with body "ollama endpoint not reachable" |
| 5 | Analyst switches back to anthropic | (next submission) | Identical to #191 behaviour; indicator shows "anthropic · claude-haiku-4-5" |

### UI States

- **Empty State**: Unchanged from #191 — when live mode is off, the filter bar is identical to pre-feature behaviour.
- **Empty State (live mode on)**: Indicator shows active provider + model; placeholder tips are neutral (e.g. "Try: UK submarines").
- **Loading State**: Unchanged from #191 — same pending indicator, same AbortController per submission.
- **Error State**: Identical banner set as #191 (seven classes). Provider-native error code is NOT shown to the analyst; it appears in telemetry only.
- **Provider-Switch State**: When the analyst changes `provider` in settings, the indicator updates on next render. In-flight submissions from the old provider still resolve (their outcome is attributed to the old provider in telemetry).
- **Ollama Endpoint Warning State**: In the Settings UI, the `ollamaEndpoint` description shows an inline warning when the configured URL is not `localhost`/`127.0.0.1`/`::1`. Non-blocking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer sampling 20 representative analyst phrases against a deterministic fixture corpus sees the prompt validation harness report ≥ 95% semantic equivalence across all three providers (Claude / OpenAI / ollama). Divergences are human-reviewed and either accepted as provider-natural variation or fixed via prompt-adapter changes before the feature ships.
- **SC-002**: With `provider = "anthropic"` and no other changes, all #191 E2E tests pass byte-identical — zero regressions in the default path.
- **SC-003**: Each of the seven unified failure classes surfaces the same banner copy regardless of provider, verified by a cross-provider E2E check against stubs for all 21 combinations (7 classes × 3 providers).
- **SC-004**: An analyst switching providers in settings with a chips-applied session retains their chips across the switch — no data loss on provider change (100% of sampled cases).
- **SC-005**: The prompt validation harness runs to completion in CI without any real LLM provider being reachable — verified by running it in an isolated container with no outbound network.
- **SC-006**: No new runtime dependency appears in `package.json` across the three workspaces (`apps/vscode`, `shared/components`, monorepo root) after this feature — verified with a diff check in CI.
- **SC-007**: A developer adding a fourth provider (e.g. `azure-openai`) can complete the work by: adding one adapter module, adding one enum value to the provider setting, adding one SecretStorage slot, and adding one row to the fixture file. No changes to core pipeline code — verified by adding a mock fourth provider in the test suite as part of this PR and confirming the pipeline is untouched.

## Assumptions

- #191 is shipped or shipping; its `LLMClient` contract, `LiveOutcome` union, `providerCall.ts` core, telemetry plumbing, and FilterBar NL-mode wiring exist unchanged. This feature composes below the `LLMClient` boundary — the webview ↔ host protocol does not change.
- Anthropic's existing call path in `providerCall.ts` is refactored into an Anthropic-specific adapter, making Anthropic "just one provider among three". The shared core that remains is HTTPS request + streaming + timeout + abort handling — provider-neutral.
- OpenAI JSON mode (`response_format: { type: "json_object" }`) is used where available to reduce malformed-response risk. For models that do not support JSON mode, a fallback strategy documented in the adapter MAY use a stricter system prompt plus post-parse validation.
- ollama's OpenAI-compatible `/v1/chat/completions` endpoint MAY be preferred where available for code reuse with the OpenAI adapter; alternatively the adapter uses ollama's native `/api/chat` endpoint. Choice is recorded in the adapter file comment and may vary per model.
- Per-provider keys live in distinct `SecretStorage` slots. Migration of an existing Anthropic key from the #191 slot to the new namespaced slot happens as a one-time read-then-write on first activation after this feature lands — or the #191 slot is renamed in this feature's PR with a simultaneous config migration. Implementation detail left to the plan.
- The provider validation harness uses canned JSON/text responses under `shared/components/src/nl-cql2/__tests__/fixtures/`. No keys, no network — all stubs.
- This feature does NOT introduce new failure classes (that is #198's job with `keyring-unavailable`), does NOT expand NL-mode to additional panels (#195), and does NOT design audit logging (#197). Cross-references only.
