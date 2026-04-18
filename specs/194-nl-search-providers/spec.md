# Feature Specification: NL Search — Non-Anthropic Providers

**Feature Branch**: `194-nl-search-providers`
**Created**: 2026-04-18
**Status**: Draft
**Input**: Backlog #196 — "[E10] NL search — non-Anthropic providers — pluggable provider choice via `debrief.nlSearch.provider` setting (Claude / OpenAI / ollama); `LLMClient` abstraction already supports new factories, main work is per-provider prompt adaptation + error-class mapping (requires #191, provider-neutral prompt validation harness)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Analyst uses OpenAI to power NL search (Priority: P1)

An analyst whose organisation has an OpenAI account (but no Anthropic contract) opens the VS Code Catalog Overview, changes the NL-search provider from "Claude" to "OpenAI", pastes their API key into the secure credential prompt, and immediately types a phrase like "UK submarines since 2020" into the filter bar. The phrase is resolved into the same chip lozenges and CQL2 filter they would have received under Claude, with the catalog narrowing to matching items.

**Why this priority**: OpenAI is the most widely procured commercial LLM provider across defence and analytics organisations. Until OpenAI is supported, any customer without an Anthropic contract is blocked from using NL search altogether — this is the single largest source of locked-out users today.

**Independent Test**: Configure the VS Code extension to use OpenAI, provide a valid OpenAI API key, and run the existing NL-search prompt corpus through the provider-neutral validation harness. Verify that each corpus phrase yields the same filtered result set (within the tolerance defined by the harness) that Claude produces today.

**Acceptance Scenarios**:

1. **Given** the VS Code extension is installed and `debrief.nlSearch.provider` is set to "openai" with a valid API key, **When** the analyst types "UK submarines" into the filter bar, **Then** the catalog is filtered to the same set of items produced by the Claude provider and the chip summary reflects the phrase.
2. **Given** the provider is set to "openai" but the API key is missing, **When** the analyst submits a phrase, **Then** the UI surfaces a "credentials not configured" error with a link to the relevant settings and no network call is made.
3. **Given** the provider is set to "openai" and an invalid API key is configured, **When** the analyst submits a phrase, **Then** the UI surfaces an "authentication failed" error classed identically to the equivalent Claude auth-failure.
4. **Given** the analyst switches `debrief.nlSearch.provider` from "claude" to "openai" with the filter bar open, **When** they type a new phrase, **Then** the new provider is used on the next request without requiring a reload.

---

### User Story 2 — Offline / air-gapped analyst uses a local Ollama model (Priority: P2)

An analyst working on a classified or air-gapped network cannot call any cloud provider. They configure `debrief.nlSearch.provider` to "ollama", point `debrief.nlSearch.baseUrl` at their local Ollama server (e.g., `http://localhost:11434`), select an approved local model (e.g., `llama3.1:8b`), and run NL search against the catalog without any external network traffic.

**Why this priority**: The project constitution mandates "offline by default". A cloud-only NL search silently violates that principle for any deployment without outbound internet. Supporting a local provider unblocks classified and field deployments, but the population of users is smaller than OpenAI users today — hence P2 behind OpenAI.

**Independent Test**: Disconnect the test machine from the public internet, run a local Ollama server with an approved model, configure the extension to use it, and verify that the NL-search corpus runs end-to-end with zero outbound calls beyond `localhost`.

**Acceptance Scenarios**:

1. **Given** the provider is set to "ollama" with `baseUrl` pointing at a running local Ollama server, **When** the analyst types a phrase, **Then** the resulting chip lozenges and CQL2 filter are produced using only the local model, with no outbound requests to third-party domains.
2. **Given** the local Ollama server is unreachable (wrong URL, not running), **When** the analyst submits a phrase, **Then** a "provider unreachable" error is surfaced, distinct from rate-limit and auth errors.
3. **Given** the selected local model produces output that does not conform to the expected JSON shape, **When** the analyst submits a phrase, **Then** the error is classed as a generation-level "malformed-output" error (not as a transport error) and the analyst can see which terms were unrecognised.

---

### User Story 3 — Provider-parity validation keeps prompts in sync (Priority: P3)

A developer maintaining the NL-search prompts makes a change to the prompt template and runs the provider-neutral validation harness across all supported providers (Claude, OpenAI, Ollama) using recorded fixtures. The harness reports a per-provider pass/fail summary and flags any provider whose output diverges from the expected CQL2 / lozenge shape.

**Why this priority**: Without automated parity checks, prompt tweaks for one provider can silently break another. This is a quality safeguard for the team rather than a user-facing feature, which is why it sits at P3 — but it must exist before the feature is considered production-ready.

**Independent Test**: Run the provider-neutral harness against a recorded-fixture client for each provider; confirm that every phrase in the canonical corpus produces an identical filter-result count across providers (within the harness's tolerance).

**Acceptance Scenarios**:

1. **Given** the corpus fixtures are present for all three providers, **When** a developer runs the harness, **Then** a per-provider report is produced showing phrases that match, phrases that diverge, and the divergence size.
2. **Given** a prompt template is changed in a way that breaks one provider's output shape, **When** the harness runs in CI, **Then** the build fails with a clear message naming the affected provider and failing phrases.

---

### Edge Cases

- **Missing credentials mid-session**: Analyst switches to a provider they have not configured. The filter bar surfaces a "configure credentials" prompt on the next NL-search submission; no stale cached responses from another provider are used.
- **Provider outage / rate limit**: Provider returns 429 or 503. The error is mapped to the canonical `rate-limit` or `provider-error` class and surfaced with retry guidance; the call does not count toward the `callCeiling` quota if the response is pre-auth.
- **Ollama model not pulled**: Local server is reachable but the requested model has not been pulled locally. The resulting provider-side error is mapped to `provider-error` with the underlying message preserved so the analyst knows which model to pull.
- **Large / malformed responses**: Provider returns a response exceeding the configured size cap or not parseable as JSON. Error is mapped to `oversize-response` or generation-level `malformed-json`; no partial filter is applied.
- **Mixed-case / alias provider values**: Analyst types `"OpenAI"` or `"OPENAI"` into the setting. Matching is case-insensitive on read, but normalised to the canonical value on write.
- **Provider switch during in-flight request**: Analyst changes provider while a request is in flight. The in-flight request is cancelled; only responses from the active provider update the UI.
- **Timeouts**: Each provider has different latency profiles. The shared `timeoutMs` setting applies per provider and timeout errors are classed identically regardless of provider.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow the analyst to select one of the supported NL-search providers (Claude, OpenAI, Ollama) via a single discoverable setting.
- **FR-002**: The system MUST provide a way to supply each provider's credentials (API key for Claude/OpenAI; base URL for Ollama) without exposing credentials to the webview or to logs.
- **FR-003**: The system MUST accept per-provider configuration for model identifier and (where applicable) base URL, with sensible defaults documented for each provider.
- **FR-004**: For each supported provider, the system MUST produce an NL-search response in the same canonical shape (CQL2 filter + lozenge seeds + unrecognised-terms list) that downstream components already consume.
- **FR-005**: The system MUST map every provider-specific error condition to one of the existing canonical error classes (`auth-failure`, `rate-limit`, `provider-error`, `transport-error`, `timeout`, `oversize-response`, `usage-cap-reached`) so that user-facing messages and telemetry remain provider-agnostic.
- **FR-006**: The system MUST continue to enforce the existing usage cap (`callCeiling`) per provider, with usage counted independently so switching providers does not bypass caps.
- **FR-007**: The system MUST allow the analyst to change provider at runtime without restarting the extension; the new provider MUST be used for the next submitted phrase.
- **FR-008**: The system MUST surface a clear, provider-agnostic error when credentials for the selected provider are missing, and MUST NOT attempt a network call in that state.
- **FR-009**: The system MUST support a local-only (Ollama) provider configuration that issues no outbound requests beyond the analyst-configured base URL.
- **FR-010**: The validation harness MUST accept any `LLMClient`-conforming implementation (fixture or live) and produce a per-provider parity report comparing filter-result counts against the canonical corpus.
- **FR-011**: The system MUST tag each recorded transport event with the provider identifier so that telemetry, logs, and recorded fixtures are attributable to the correct provider.
- **FR-012**: The system MUST expose the current provider identity (name and model) alongside existing NL-search diagnostics so analysts can confirm which provider produced a given result.
- **FR-013**: The system MUST preserve the existing Claude (Anthropic) behaviour unchanged for users who do not reconfigure the provider setting.

### Key Entities

- **Provider**: A named identity for an LLM backend (e.g., "claude", "openai", "ollama"). Attributes: canonical identifier, display name, credential type (API key, base URL, none), default model, supported capabilities.
- **Provider Configuration**: The per-provider settings block holding model identifier, credential reference (pointer to secure storage, not the secret itself), base URL (where applicable), timeout, and any provider-specific options.
- **LLM Client**: The provider-neutral contract used by NL search. Given a fully-composed prompt, it returns a raw response string or throws a classed error. Every provider has its own client factory that conforms to this contract.
- **Provider Error Class**: The canonical error taxonomy already in use. Each provider's raw errors are mapped into exactly one class, preserving the underlying provider message for diagnostics only.
- **Prompt Template**: The composed prompt sent to any provider. The template itself is provider-neutral; minor adaptations (e.g., system-message placement) are applied inside the provider factory without changing the semantic content.
- **Validation Corpus**: The canonical set of analyst phrases + expected filter-result counts used by the parity harness to detect cross-provider drift.
- **Transport Call Record**: The per-request audit entry recording provider identifier, model identifier, prompt hash, response size, latency, and outcome class. One record per call, regardless of provider.

## User Interface Flow *(optional — included because users select a provider via a VS Code settings dropdown)*

### Decision Analysis

- **Primary Goal**: Choose and configure the LLM provider that will power NL search.
- **Key Decisions**:
  1. Which provider to use (driven by organisational procurement, network posture, and cost).
  2. Which model identifier within that provider (driven by quality / cost / latency trade-offs).
  3. Where credentials come from (secret storage entry vs. local base URL).
- **Decision Inputs**: Provider descriptions visible in the setting UI, guidance on which providers need credentials vs. local endpoints, and a "test connection" affordance that exercises the chosen provider with a canned phrase.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | VS Code Settings — NL search section | Analyst opens setting `debrief.nlSearch.provider` and picks "openai" | Provider dropdown updates; related fields (API key, model) become relevant |
| 2 | Credential prompt | Analyst enters API key (routed to secure storage) | Credential is stored; setting pane shows "configured" indicator |
| 3 | Filter bar in Catalog Overview | Analyst types a phrase and submits | Request is routed via the selected provider; chips + filtered results appear |
| 4 | Diagnostics panel (optional) | Analyst inspects the last NL-search call | Panel shows provider name, model, latency, outcome class |

### UI States

- **Empty State (no provider configured)**: The filter bar shows a "configure NL search provider" link when the analyst first tries to submit a phrase; nothing is sent until credentials exist.
- **Loading State**: A subtle in-filter-bar spinner during the in-flight request; cancel affordance is available.
- **Error State**: Inline banner whose wording depends on canonical error class (auth, rate-limit, unreachable, timeout, malformed output). Provider name is shown so analysts can correlate with provider dashboards.
- **Success State**: Chips appear in the filter bar; catalog view updates; no modal is shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can switch NL-search provider by editing a single setting and supplying credentials, with no other reconfiguration required, in under 2 minutes from a fresh extension install.
- **SC-002**: The provider-neutral validation corpus passes for all three supported providers (Claude, OpenAI, Ollama), with per-phrase filter-result counts matching the Claude baseline for at least 90% of corpus phrases.
- **SC-003**: Every provider-specific error seen during end-to-end testing is mapped to exactly one of the seven canonical error classes, with zero "unclassified" errors recorded in telemetry during a one-week test window.
- **SC-004**: When the Ollama provider is configured with a local base URL, zero outbound network requests are issued to any domain other than the analyst-configured host during NL-search operations.
- **SC-005**: Switching provider mid-session applies to the next submitted phrase with no extension reload; measured latency overhead from provider switch is under 200 ms.
- **SC-006**: Users who do not change the provider setting see identical behaviour to the pre-feature Claude baseline across the full validation corpus (zero regressions).
- **SC-007**: Adding a future provider requires only a new client factory plus a new error-mapping table (no changes to prompt composition, response parsing, or UI surface), and this is demonstrable via a "hello-world" fourth provider implemented in under one engineering day.

## Assumptions

- The existing `LLMClient` abstraction (single-method `generate(prompt)` contract) is sufficient and does not need to change to support additional providers.
- The provider-neutral prompt and response shape (CQL2 + lozenges + unrecognised terms) produced by #188 is portable across providers; no provider-specific output parsers are needed.
- Credentials for cloud providers (Claude, OpenAI) continue to live in VS Code's secure `SecretStorage`; the webview never sees API keys directly.
- The Ollama provider does not require credentials beyond a base URL; authentication, if any, is handled by the local network.
- Existing rate-limit and usage-cap machinery remains unchanged; each provider reports its own usage separately.
- The validation harness built under #188 / #190 is already provider-neutral in structure; only provider-specific recorded fixtures need to be produced.
- The set of supported providers at launch is exactly three (Claude, OpenAI, Ollama); adding more is out of scope for this feature but must not require architectural rework.

## Dependencies

- Backlog #191 (VS Code NL search integration) — provides the settings surface, secret-storage wiring, and filter-bar UI that this feature extends.
- Backlog #190 (live LLM transport) — provides the loopback-proxy pattern for Claude; equivalent patterns for OpenAI and Ollama are within scope of this feature.
- Backlog #188 (NL→CQL2 prompt) — provides the prompt template and validation corpus that this feature reuses across providers.

## Out of Scope

- Adding providers beyond Claude, OpenAI, and Ollama (e.g., Gemini, Cohere, Bedrock) — architecture must not preclude them, but implementation is deferred.
- Automatic provider failover (if Claude is rate-limited, fall back to OpenAI). Providers are selected explicitly; cross-provider fallback is a separate concern.
- Fine-grained per-provider cost reporting or billing dashboards. Basic telemetry tagging is included, but dashboards are out of scope.
- On-device / bundled local models. Only the Ollama-style local-server pattern is in scope.
- Changes to the prompt semantics or the CQL2 output shape. Per-provider adaptations must preserve the canonical shape unchanged.
