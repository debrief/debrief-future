# Data Model — NL Search Non-Anthropic Providers

**Feature**: #194 NL Search — Non-Anthropic Providers
**Branch**: `194-nl-search-providers`
**Date**: 2026-04-18

This document enumerates the entities introduced or extended by this feature, the fields they carry, their relationships, and the state transitions that apply. No persistence layer is introduced — these are all in-memory runtime data types (TypeScript) plus a small amount of VS Code settings state.

---

## Entity: `ProviderId`

A nominal string enum identifying which LLM backend is in use.

| Field | Type | Notes |
|-------|------|-------|
| (value) | `"anthropic" \| "openai" \| "ollama"` | Canonical lowercase ids. Case-insensitive on VS Code settings read; normalised on write. |

**Validation rules**:

- MUST be one of the three canonical values.
- Normalisation: trim + lowercase on read from settings.

**Relationships**: Used as the discriminator in `LiveConfig`, `ProviderAdapter`, and `TransportCallRecord`.

**State transitions**: None — this is a value type. Changing the active provider is a property change on `LiveConfig`; no state machine.

---

## Entity: `Provider` (metadata, registry row)

Static metadata describing a provider. Not persisted — lives in a constant map inside the registry (`providerAdapters/index.ts`).

| Field | Type | Notes |
|-------|------|-------|
| `id` | `ProviderId` | Canonical id. |
| `displayName` | `string` | Human-readable ("Anthropic Claude", "OpenAI", "Ollama (local)"). |
| `credentialType` | `"api-key" \| "none"` | Drives VS Code settings rendering and credential-prompt flow. |
| `defaultModel` | `string` | e.g., `"claude-haiku-4-5-20251001"`, `"gpt-4o-mini"`, `"llama3.1:8b"`. |
| `defaultBaseUrl` | `string \| null` | Only meaningful for Ollama (default `"http://localhost:11434"`). `null` for cloud providers. |

**Validation rules**: Constant at runtime; frozen after module load.

---

## Entity: `LiveConfig` (extended discriminated union)

The runtime configuration passed to the `LLMClient` factories. Two transports (browser / vs-code), each carrying a `provider` tag.

```ts
interface LiveConfigBase {
  readonly enabled: boolean;
  readonly provider: ProviderId;                 // NEW — mandatory
  readonly model: string;
  readonly timeoutMs: number;
  readonly callCeiling: number;
  readonly maxResponseBytes: number;
  readonly baseUrl?: string;                     // NEW — required only when provider === "ollama"
}

interface BrowserLiveConfig extends LiveConfigBase {
  readonly transport: "browser-proxy";
  readonly proxyUrl: string;
  readonly proxyToken: string | null;
}

interface VsCodeLiveConfig extends LiveConfigBase {
  readonly transport: "vscode-host";
  readonly hasApiKey: boolean;                   // false for Ollama; key presence for cloud providers
}
```

**Validation rules** (enforced by extended `validateLiveConfig`):

- `provider` MUST be a valid `ProviderId`.
- `model` MUST be non-empty.
- `timeoutMs` ≥ 1000 and ≤ 120000.
- `callCeiling` ≥ 1 and ≤ 10000.
- `maxResponseBytes` ≥ 1024 and ≤ 10 × 1024 × 1024 (10 MiB hard cap).
- When `provider === "ollama"`, `baseUrl` MUST be a parseable URL.
- When `provider === "anthropic"` or `"openai"` in `VsCodeLiveConfig`, `hasApiKey` MUST be `true` for a call to be attempted; otherwise the client short-circuits to `LiveNotConfigured { reason: "no-key" }`.
- When `provider === "ollama"` in `VsCodeLiveConfig`, `hasApiKey` is ignored; `baseUrl` presence is the configured-ness signal.
- Back-compat: a raw config lacking a `provider` field upgrades to `provider: "anthropic"` with a console warning.

**State transitions**:

- Provider change is a **config replacement** — old config is discarded, a new `LiveConfig` is instantiated, the `LLMClient` factory is re-invoked with the new config, in-flight calls from the old config are aborted via `abort()`.

---

## Entity: `ProviderRequest`

Normalised, provider-shaped HTTP request payload — produced by `ProviderAdapter.composeRequest`.

| Field | Type | Notes |
|-------|------|-------|
| `url` | `string` | Fully-formed URL to POST to (e.g., `https://api.openai.com/v1/chat/completions`, `http://localhost:11434/api/chat`). |
| `headers` | `Record<string, string>` | Always includes `Content-Type: application/json` and `Accept: application/json`. Per-provider additions: Anthropic adds `x-api-key` + `anthropic-version`; OpenAI adds `Authorization: Bearer …`; Ollama adds nothing. |
| `body` | `string` | JSON-stringified provider-specific body. Passed verbatim to `fetch`/`https.request`. |

**Validation rules**: URL must be http/https scheme; no credential material is ever logged.

---

## Entity: `ProviderResponseEnvelope`

Normalised output of `ProviderAdapter.parseResponse` — the one-way bridge from provider-specific response JSON back to the canonical `LiveOutcome` payload.

```ts
type ProviderResponseEnvelope =
  | { readonly kind: "success"; readonly rawResponse: string; readonly responseBytes: number }
  | { readonly kind: "non-json"; readonly responseBytes: number }
  | { readonly kind: "schema-violation"; readonly responseBytes: number; readonly detail: string };
```

**Field notes**:

- `rawResponse`: the text content extracted from the provider's response envelope (Anthropic `content[0].text`; OpenAI `choices[0].message.content`; Ollama `message.content`). Downstream consumers treat this identically regardless of provider.
- `responseBytes`: UTF-8 byte count of the raw HTTP response body (used for telemetry and oversize detection).
- `non-json`: the whole HTTP body was not valid JSON.
- `schema-violation`: JSON parsed but did not match the provider's known envelope shape — `detail` is a short, non-redacted machine-readable token (e.g., `"missing-choices[0].message.content"`), safe to log.

**State transitions**: None — values are returned by the adapter and immediately consumed by `providerCall`.

---

## Entity: `ProviderAdapter` (contract)

The extension seam for per-provider differences. Three pure functions.

```ts
interface ProviderAdapter {
  readonly id: ProviderId;
  composeRequest(input: ComposeRequestInput): ProviderRequest;
  parseResponse(input: ParseResponseInput): ProviderResponseEnvelope;
  mapError(input: MapErrorInput): LiveOutcome;  // produces auth-failure / rate-limit / provider-error / etc.
}
```

Where:

```ts
interface ComposeRequestInput {
  readonly prompt: string;        // canonical, provider-neutral prompt
  readonly model: string;
  readonly apiKey: string | null; // null for Ollama
  readonly baseUrl: string | null; // for Ollama; ignored otherwise
}

interface ParseResponseInput {
  readonly httpStatus: number;
  readonly bodyText: string;
  readonly responseBytes: number;
}

interface MapErrorInput {
  readonly condition:
    | { readonly kind: "http-error"; readonly status: number; readonly bodyText: string }
    | { readonly kind: "network-error"; readonly reason: "refused" | "dns" | "other" }
    | { readonly kind: "timeout" }
    | { readonly kind: "aborted" }
    | { readonly kind: "oversize"; readonly responseBytes: number }
    | { readonly kind: "non-json"; readonly responseBytes: number };
  readonly durationMs: number;
  readonly callIndex: number;
}
```

**Validation rules**:

- All three methods MUST be pure (no I/O, no globals, no time reads).
- `composeRequest` MUST NOT include the API key anywhere except the `headers` field of its output.
- `mapError` MUST produce a `LiveOutcome` whose `kind` is one of the existing seven `LiveOutcome.kind` values — no new kinds.

**Relationships**: `providerCall()` consumes exactly one adapter per call, chosen from the registry by `config.provider`.

**State transitions**: None — stateless.

---

## Entity: `TransportCallRecord` (extended)

Existing call-record shape from #190, extended with a `provider` field (previously hard-coded to `"anthropic"`).

```ts
interface TransportCallRecord {
  readonly ts: string;              // ISO-8601
  readonly provider: ProviderId;    // EXTENDED — was the literal "anthropic"
  readonly model: string;
  readonly durationMs: number;
  readonly outcome: "success" | LiveOutcome["kind"];
  readonly responseBytes: number | null;
  readonly callIndex: number;
}
```

**Validation rules**: Never contains the prompt, response, credential, or provider-specific body fields.

**State transitions**: One record per `generate()` call, emitted to `console.info` and (in VS Code) to the host-side log ring buffer.

---

## Entity: VS Code Settings Surface (extended)

The `contributes.configuration` in `apps/vscode/package.json` gains the following entries. Existing entries (`debrief.nlSearch.enabled`, `.model`, `.timeoutMs`, `.callCeiling`, `.maxResponseBytes`) are unchanged.

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `debrief.nlSearch.provider` | `enum` (`"anthropic" \| "openai" \| "ollama"`) | `"anthropic"` | Active provider. |
| `debrief.nlSearch.ollama.baseUrl` | `string` | `"http://localhost:11434"` | URL of local Ollama server; ignored when provider is not Ollama. |

**New commands**:

| Command id | Notes |
|------------|-------|
| `debrief.setOpenAIApiKey` | Prompts for an OpenAI key, writes to `SecretStorage` under `debrief.nlSearch.openai.apiKey`. |
| `debrief.clearOpenAIApiKey` | Deletes the OpenAI key from `SecretStorage`. |

No new commands are needed for Ollama (no secret) or Anthropic (already shipped).

**State transitions**:

- `provider` change → `llmProxy.reload()` → loads the matching SecretStorage slot (if applicable), aborts in-flight calls, emits a new `nlConfig` message to the webview.

---

## Entity: Webview Message Protocol (extended)

The `nlConfig` message (host → webview) gains a `provider` field so the webview can display provider identity in diagnostics banners (FR-012).

```ts
interface NlConfigMessage {
  readonly type: "nlConfig";
  readonly enabled: boolean;
  readonly provider: ProviderId;  // NEW
  readonly model?: string;
  readonly hasApiKey: boolean;    // For cloud providers. For Ollama, always true when baseUrl is set.
}
```

Other messages (`nlGenerate`, `nlAbort`, `nlOutcome`) are unchanged — they already carry `LiveOutcome` which is provider-neutral.

---

## Entity Relationships (summary)

```text
ProviderId ──┬── Provider (registry entry; metadata)
             ├── LiveConfig.provider (discriminator)
             ├── TransportCallRecord.provider (telemetry)
             └── NlConfigMessage.provider (webview display)

LiveConfig ──▶ providerCall() ──▶ adapter = registry[config.provider]
                                       ├── composeRequest()
                                       ├── parseResponse()
                                       └── mapError()

adapter output ──▶ LiveOutcome (unchanged union)
```

---

## Out-of-Scope Entities (explicitly)

- **PerProviderUsageRecord** — a separate usage counter per provider is **not** introduced; the existing `callCeiling` applies to the active provider. Switching provider does not reset or share the counter (FR-006 — usage counted independently per session per provider would be a follow-up if needed).
- **AzureOpenAIConfig** — Azure deployments are served by the plain `"openai"` adapter today (same API shape, just a different `baseUrl`); a distinct entity is deferred to a future feature.
