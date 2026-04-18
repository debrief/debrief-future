# Phase 0 Research — NL Search Non-Anthropic Providers

**Feature**: #194 NL Search — Non-Anthropic Providers
**Branch**: `194-nl-search-providers`
**Date**: 2026-04-18

This document resolves every "NEEDS CLARIFICATION" raised during Technical Context drafting and records the architectural choices the implementation plan depends on. Each section follows the **Decision / Rationale / Alternatives considered** format.

---

## 1. Provider Adapter Seam

### Decision

Introduce a single **`ProviderAdapter`** contract (three pure functions — `composeRequest`, `parseResponse`, `mapError`) and consume it from the existing transport-neutral `providerCall()` core in `shared/components/src/nl-cql2/providerCall.ts`. The `LLMClient` factory surface (`createLiveLLMClient`, `createPostMessageLLMClient`) stays exactly as defined in `specs/191-vscode-nl-search/contracts/llm-client.ts` — provider selection happens inside `providerCall()`, not at the factory level.

### Rationale

- **Preserves the "one canonical `LLMClient`" invariant** established in #191 Decision 1. Consumers (`FilterBar`, `generateCql2`) do not need to know which provider is in use.
- **Confines provider-specific knowledge to three tiny pure functions** that operate on plain data — easy to unit-test, no transport, no globals.
- **Matches the existing co-location convention**: `buildPrompt.ts`, `parseResponse.ts`, `providerCall.ts` all live side-by-side in `shared/components/src/nl-cql2/`. A `providerAdapters/` sub-directory follows the same convention.
- **SC-007 directly exercised**: a fourth provider is a new file under `providerAdapters/` + one line in the registry. No other touch points.

### Alternatives Considered

- **Factory-per-provider at the `LLMClient` level** — e.g., `createOpenAILLMClient(config)`, `createOllamaLLMClient(config)`. Rejected because it forces consumers to know about providers (violates #191 Decision 1) and duplicates the `providerCall` / usage-counter / abort plumbing three times.
- **Plug-in / entry-point registry discovery** — rejected as over-engineered for a known fixed set of three providers; easy to add later if a contrib extension point is needed.
- **Inheritance (abstract `BaseProvider` class)** — rejected because it conflicts with the codebase's strong preference for pure functions over OO hierarchies, and it makes tree-shaking harder.

---

## 2. Proxy Architecture — Single-Process vs Per-Provider

### Decision

**One** loopback proxy (`apps/nl-demo/scripts/live-proxy.mjs`) that switches on a `provider` field in its runtime config (env var `LLM_PROVIDER` or `live-config.json` `provider` field). The proxy's `POST /generate` handler dispatches to the selected `ProviderAdapter` via a minimal Node-side wrapper that mirrors the browser-side `ProviderAdapter` contract.

### Rationale

- **Single HTTP endpoint for the browser**, so `BrowserLiveConfig` remains a single shape with a single `proxyUrl`. Consumers need not re-home the proxyUrl when switching providers.
- **One stub harness** for all providers (`--stub scenarios.json` already supports per-phrase overrides; extending it with provider-keyed scenarios is a small change).
- **Shares keep-alive pools and byte-counting logic** across providers — the 50 ms p50 overhead budget is met without duplicating code.
- **Heroku review apps and CI config stay unchanged** — one `webServer` entry in Playwright config, one port, one health probe.

### Alternatives Considered

- **Separate proxy processes per provider** — rejected because it multiplies ports, environment variables, CI services, and operator cognitive load. No benefit for three providers; a theoretical benefit for isolation never materialises in practice (all providers run in the same Node process trust boundary anyway).
- **Direct browser → provider calls (no proxy)** for OpenAI/Ollama — rejected for OpenAI because it exposes the API key to the webview (violates Constitution X), and rejected for Ollama for uniformity and because the stub harness relies on the proxy layer to inject deterministic responses in CI.

---

## 3. OpenAI API Surface Choice

### Decision

Use the **Chat Completions API** (`POST /v1/chat/completions`) at launch, with `response_format: { type: "json_object" }` to coerce JSON output. Model default: `gpt-4o-mini`. Compatible with Azure OpenAI and OpenAI-compatible gateways (Groq, Together, Perplexity) as a side-benefit.

### Rationale

- **Stability and ubiquity** — Chat Completions is the most broadly-deployed OpenAI surface; every OpenAI-compatible service (Azure, Groq, Together, LiteLLM, many self-hosted gateways) implements it. This maximises the set of analyst environments that "just work" behind a single provider id.
- **`json_object` response format** is widely supported and gives us a deterministic JSON response without needing tool-calling or strict JSON Schema validation.
- **Lower launch risk** — the Responses API is newer and has had shape changes in 2024–2026; adopting it can be a clean follow-up feature once we need its ergonomics.

### Alternatives Considered

- **Responses API (`/v1/responses`)** — deferred. Would unlock structured output via JSON Schema and server-side tool use, but we don't need either for NL→CQL2 at launch.
- **Legacy Completions API** — not viable; deprecated and not supported for modern models.
- **Azure-specific endpoints only** — rejected; would exclude analysts using OpenAI directly.

---

## 4. Ollama Endpoint Choice

### Decision

Use **`POST {baseUrl}/api/chat`** with `stream: false`. Response is a single JSON object `{ message: { role, content } }`. Model identifier is the operator-supplied local model name (e.g., `llama3.1:8b`).

### Rationale

- **Messages shape is consistent with OpenAI/Anthropic** — keeps the adapter's `composeRequest` trivial (same messages array, same system-message placement).
- **Non-streaming simplifies parsing and byte-counting** — matches the `providerCall` buffer-and-count pattern.
- **Ollama's `/api/chat` endpoint is present on every recent version** and is the canonical chat endpoint per Ollama's own documentation.

### Alternatives Considered

- **`/api/generate`** — rejected; older, prompt-string-based surface. Less ergonomic for system+user role separation.
- **Streaming mode (`stream: true`)** — deferred. Could enable a progressive "typing" UI in future, but adds SSE parsing and cancellation complexity; the canonical `LiveOutcome` shape is already non-streaming.

---

## 5. Prompt Adaptation Strategy

### Decision

**Keep the canonical prompt body verbatim.** The per-provider adapter is only responsible for placing the existing body into the provider's preferred message structure:

- **Anthropic**: `messages: [{ role: "user", content: <canonical prompt> }]` with `system: <system text>` top-level field (existing behaviour).
- **OpenAI**: `messages: [{ role: "system", content: <system text> }, { role: "user", content: <canonical prompt> }]`.
- **Ollama**: same as OpenAI.

No semantic rewrites, no provider-specific instructions, no extra few-shot examples.

### Rationale

- **Preserves the provider-parity contract (FR-004 / SC-006)** — all providers receive the same instructions in the same order, so the validation corpus is a genuine apples-to-apples comparison.
- **Keeps the prompt builder (`buildPrompt.ts`) provider-neutral** — the one place where prompt content is constructed stays untouched.
- **Minimises the surface where drift can happen** — "prompt adaptation" is limited to a handful of lines in each adapter's `composeRequest`, reviewed alongside the HTTP request shape.

### Alternatives Considered

- **Per-provider prompt variants** — rejected as a maintenance burden and a parity-destroying move. If a provider underperforms on the canonical prompt, the fix is a common prompt improvement, not a provider-specific branch.
- **Few-shot examples tailored per provider** — rejected for the same reason.
- **Move system content into user content uniformly** (as Anthropic does today) — rejected; OpenAI and Ollama handle a dedicated system role more effectively, and we want each provider in its "best mode".

---

## 6. Error-Class Mapping Per Provider

### Decision

Explicit per-provider mapping tables live in each adapter's `mapError`. The canonical target taxonomy is the **existing `LiveOutcome` union** from `specs/191-vscode-nl-search/contracts/llm-client.ts` — no new error kinds are introduced by this feature.

**Mapping tables**:

| Condition | Anthropic | OpenAI | Ollama |
|-----------|-----------|--------|--------|
| 401 / 403 | `auth-failure` | `auth-failure` | (not applicable — no auth) |
| 429 | `rate-limit` | `rate-limit` | (not applicable in practice) |
| 5xx | `provider-error` | `provider-error` | `provider-error` |
| 404 (model/endpoint missing) | `provider-error` | `provider-error` | `provider-error` (usually "model not pulled") |
| Socket ECONNREFUSED / DNS fail | `transport-error { reason: "network" }` | `transport-error { reason: "network" }` | `transport-error { reason: "network" }` |
| `AbortController.abort()` (supersession) | `transport-error { reason: "cancelled" }` | same | same |
| Provider request took > `timeoutMs` | `timeout` | `timeout` | `timeout` |
| Response not JSON | `malformed-response { reason: "non-json" }` | same | same |
| Response exceeded `maxResponseBytes` | `malformed-response { reason: "oversize" }` | same | same |
| Response JSON but schema-invalid (for `LiveOutcome`) — rare, handled by `parseResponse` downstream | (passes through as raw text; classified as `generation` error downstream) | same | same |
| Usage counter reached | `ceiling-reached` (pre-call) | `ceiling-reached` | `ceiling-reached` |
| Enabled but no key | `not-configured { reason: "no-key" }` | same | (Ollama: `not-configured { reason: "no-baseUrl" }`) |
| Disabled | `not-configured { reason: "disabled" }` | same | same |

**Underlying provider message is always preserved** in a debug-log-only field (never surfaced in webview telemetry without redaction), which makes analyst diagnosis tractable (e.g., Ollama's "model X not pulled" text is visible to developers).

### Rationale

- Zero new error kinds → zero downstream (FilterBar / UI / telemetry) changes.
- Per-provider mapping is tiny and easy to audit in review.
- Constitution I ("no silent failures") is preserved — every raw condition has a named class.

### Alternatives Considered

- **Add provider-specific error kinds** (e.g., `ollama-model-not-pulled`) — rejected; users don't need that granularity, and the UI banner copy can be tuned with the underlying message instead.
- **Single shared `mapError` with a provider-id branch** — rejected; harder to read than three small tables living next to their `composeRequest`.

---

## 7. Discriminator Placement in `LiveConfig`

### Decision

Extend both `BrowserLiveConfig` and `VsCodeLiveConfig` with a mandatory `provider: "anthropic" | "openai" | "ollama"` field. Per-provider optional fields are added alongside existing ones:

```ts
interface LiveConfigBase {
  readonly enabled: boolean;
  readonly provider: "anthropic" | "openai" | "ollama";  // NEW
  readonly model: string;                                 // model id within the chosen provider
  readonly timeoutMs: number;
  readonly callCeiling: number;
  readonly maxResponseBytes: number;
  // Ollama-only:
  readonly baseUrl?: string;                              // NEW (required when provider === "ollama")
}
```

The `BrowserLiveConfig` adds `proxyUrl` + `proxyToken` as before; the `VsCodeLiveConfig` adds `hasApiKey` (presence bool) as before. `hasApiKey` is naturally irrelevant for Ollama, which validates against `baseUrl` instead.

### Rationale

- **One flat provider tag is easier to reason about** than nested per-provider sub-configs (e.g., `{ anthropic: {...}, openai: {...} }`), both for settings UX and for validation.
- **Existing fields (`model`, `timeoutMs`, etc.) remain shared** — they have the same semantic meaning across providers and shouldn't be duplicated per sub-config.
- **Validation can use a single tagged-union narrow** (`if (cfg.provider === "ollama") assert(cfg.baseUrl)`).

### Alternatives Considered

- **Nested per-provider config** (`{ anthropic: {model}, openai: {model}, ollama: {model, baseUrl} }`) — rejected. Doubles the settings surface, makes the VS Code settings UI noisier, and doesn't reflect how analysts think ("I'm using OpenAI with this model", not "I'm configuring all three simultaneously").
- **Implicit provider derivation from model name** — rejected; fragile and couples provider choice to a free-text field.

---

## 8. VS Code Credential Management

### Decision

- **Anthropic**: already stored under the SecretStorage key `debrief.nlSearch.anthropic.apiKey` (via existing command `debrief.setAnthropicApiKey`). No change.
- **OpenAI**: new SecretStorage key `debrief.nlSearch.openai.apiKey`. New commands: `debrief.setOpenAIApiKey`, `debrief.clearOpenAIApiKey`. Mirrors the Anthropic pattern one-for-one.
- **Ollama**: no secret. The `baseUrl` lives in `debrief.nlSearch.ollama.baseUrl` as a plain setting (default `http://localhost:11434`).

`llmProxy.ts` caches the active provider's key in host memory; `context.secrets.onDidChange` invalidates. Provider switch triggers a reload of the active key from the matching SecretStorage slot.

### Rationale

- Matches the existing Constitution X security discipline and the #191 design.
- One SecretStorage slot per provider is easy to rotate independently and survives provider-switch operations.

### Alternatives Considered

- **Shared single SecretStorage slot with provider prefix in the value** — rejected; complicates rotation and audit.
- **OS keyring directly** (bypass SecretStorage) — rejected; VS Code's SecretStorage is the sanctioned path and already deputises to the OS keyring.

---

## 9. Browser Demo (`apps/nl-demo`) Credential Handling

### Decision

- Proxy reads each provider's key from its own env var: `ANTHROPIC_API_KEY` (existing), `OPENAI_API_KEY` (new), and no key for Ollama. `.env` (already gitignored) carries all three. Operator selects the active provider via `LLM_PROVIDER` env (`anthropic` | `openai` | `ollama`) or via the `provider` field in `live-config.json`.
- Browser never sees any key. `live-config.json` (browser-visible, gitignored) carries `{ enabled, provider, proxyUrl, model, timeoutMs, callCeiling, maxResponseBytes, proxyToken? }` — plus `baseUrl?` when `provider === "ollama"` so the proxy knows where to reach the local Ollama server (or the browser can directly construct Ollama requests if we ever skip the proxy; for now, proxy only).

### Rationale

- Credential boundary stays exactly where #190 put it: keys live in the proxy process only.
- Operator convenience: one `.env` for all three providers; switch provider with a single env var.

### Alternatives Considered

- **Separate `.env` per provider** — rejected; not worth the operational cost for three providers.
- **Browser-side OpenAI calls** — rejected (same security reason as § 2).

---

## 10. Validation Corpus & Per-Provider Fixtures

### Decision

The existing provider-neutral harness (`shared/components/src/nl-cql2/__tests__/harness.ts`) is extended by adding per-provider recorded-fixture files:

```text
shared/components/src/nl-cql2/__tests__/fixtures/
├── corpus.json                # the canonical phrases + expected filter-result counts (existing)
├── corpus-anthropic.json      # provider-replayed responses (existing; renamed from current fixture)
├── corpus-openai.json         # NEW
└── corpus-ollama.json         # NEW
```

Each per-provider corpus file is a `RecordedLLMClient` fixture captured during a live run against the actual provider, committed as a JSON blob. Tests run in three parallel vitest suites (one per provider) plus one meta-suite that asserts **pairwise parity** (Anthropic vs OpenAI, Anthropic vs Ollama) using the filter-result-count metric with the tolerance documented in the harness.

### Rationale

- **Fast, deterministic CI**: no live provider calls from the test job. Constitution I (offline by default) preserved.
- **Real-world grounding**: the per-provider fixture captures actual provider output at a known date, so drift from prompt template changes or model upgrades is caught by the harness failing.
- **Separation of concerns**: unit tests for `ProviderAdapter` are about request/response mechanics; corpus tests are about prompt quality.

### Alternatives Considered

- **Live provider calls in CI** — rejected on cost, secrecy, and reliability grounds.
- **Single merged fixture per phrase with all three providers' responses** — rejected; harder to diff in review, and makes the per-provider vitest suite slower to surface a failure.

---

## 11. Backward Compatibility

### Decision

- Default `debrief.nlSearch.provider` is `"anthropic"` so users who upgrade without reconfiguring see zero behaviour change (SC-006).
- The existing `debrief.nlSearch.model` default remains `claude-haiku-4-5-20251001`. When the provider changes, the VS Code settings UI shows a hint that the model default may need updating; runtime logic validates that the model string is plausible for the selected provider (plausibility is a soft check — a warning, not a hard block, since Azure / custom gateway deployments may use non-standard model ids).
- The `LiveConfig` discriminator is mandatory, but the `validateLiveConfig` function in `clients.ts` gains a back-compat branch: a config object without a `provider` field is upgraded to `provider: "anthropic"` with a console warning, so existing `live-config.json` files in contributors' working trees continue to load.

### Rationale

Pre-release freedom (Constitution XIV) allows a harder break, but this back-compat is cheap and prevents a whole class of review-app breakages.

### Alternatives Considered

- **No default — require explicit provider selection** — rejected; hostile to SC-006 (zero regressions for existing users).

---

## Open Questions / Deferred

- **Model auto-detection for Ollama** — the `/api/tags` endpoint enumerates pulled models; offering a picker in VS Code settings is a nice-to-have, not part of launch scope.
- **Streaming responses** — not at launch; provider pipeline and `LiveOutcome` are non-streaming. Revisit after #194 ships if progressive chip rendering becomes a UX priority.
- **Azure OpenAI as a distinct provider id** — at launch, `"openai"` covers OpenAI + Azure + any OpenAI-compatible gateway (distinguished only by `baseUrl` if we extend to allow one). A distinct `"azure-openai"` id is a future refinement if Azure's auth model (token-based or managed-identity) needs its own adapter.
