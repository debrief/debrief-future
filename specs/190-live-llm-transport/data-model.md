# Data Model: Live LLM Transport (#190)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

This feature is a transport layer, not a data-bearing feature. There are no persistent entities, no schema changes, no new STAC properties. The "data model" captured here is the shape of in-memory configuration, error envelopes, and observability records that cross trust boundaries (operator filesystem → proxy → browser → demo).

All types are strict-typed TypeScript — `any` is prohibited (Constitution Article XV).

---

## 1. `LiveConfig` (browser-visible runtime configuration)

**Source**: `apps/nl-demo/data/live-config.json` (gitignored).
**Consumer**: demo boot code in `demo.jsx`, narrowed before being handed to `createLiveLLMClient`.

```typescript
interface LiveConfig {
  readonly enabled: boolean;
  readonly proxyUrl: string;         // e.g. "http://127.0.0.1:8081/generate"
  readonly model: string;            // e.g. "claude-haiku-4-5-20251001"
  readonly timeoutMs: number;        // positive integer; default 12_000
  readonly maxCalls: number;         // positive integer; default 50
  readonly maxResponseBytes: number; // positive integer; default 262_144
}
```

**Validation rules** (enforced by `validateLiveConfig(raw: unknown): LiveConfig | ConfigError`):

| Field | Rule | Failure |
|---|---|---|
| `enabled` | `typeof === 'boolean'` | `ConfigError { field: 'enabled', message: 'must be boolean' }` |
| `proxyUrl` | Non-empty string, parses as absolute `http(s)://` URL, host is `127.0.0.1` or `localhost` in the default recommendation (not enforced — operators may point at a remote proxy if they accept the risk) | `ConfigError` with specific diagnostic |
| `model` | Non-empty string | `ConfigError` |
| `timeoutMs` | Integer > 0, ≤ 300 000 (5 min upper bound) | `ConfigError` |
| `maxCalls` | Integer > 0, ≤ 1 000 | `ConfigError` |
| `maxResponseBytes` | Integer ≥ 1 024, ≤ 10 485 760 (10 MB) | `ConfigError` |

**State transitions**: none. Config is read once at page load; changes require a reload (spec FR-010, FR-003). Deleting the file, setting `enabled: false`, or stopping the proxy each independently revert the demo to fixture mode on next reload (research R3).

**Security invariant**: `LiveConfig` MUST NOT contain a credential field. If a future change adds one, it violates Article X and SC-006.

---

## 2. `ProxyEnv` (proxy-only configuration)

**Source**: `apps/nl-demo/.env` (gitignored) or actual environment variables.
**Consumer**: `apps/nl-demo/scripts/live-proxy.mjs` — never crosses into the browser.

```typescript
interface ProxyEnv {
  readonly ANTHROPIC_API_KEY: string;           // REQUIRED for live mode
  readonly ANTHROPIC_ENDPOINT: string;          // default "https://api.anthropic.com/v1/messages"
  readonly PROXY_PORT: number;                  // default 8081
  readonly PROXY_BIND: string;                  // default "127.0.0.1"
  readonly ANTHROPIC_VERSION: string;           // default "2023-06-01" (Anthropic API version header)
}
```

**Validation rules**: proxy refuses to start (exits non-zero) if `ANTHROPIC_API_KEY` is missing while not running in `--stub` mode. Stub mode ignores all `ANTHROPIC_*` fields.

**Security invariant**: `ANTHROPIC_API_KEY` MUST never be logged, echoed to the response, or mirrored into any file the proxy writes.

---

## 3. `ProxyRequest` / `ProxyResponse` (proxy HTTP contract)

See [contracts/proxy-http.md](./contracts/proxy-http.md) for the full HTTP wire contract. Summary:

```typescript
// Wire body on POST /generate
interface ProxyRequest {
  readonly prompt: string;   // verbatim prompt from #188's buildPrompt
  readonly model?: string;   // optional override; else ProxyEnv default
}

// Success (HTTP 200)
interface ProxyResponseSuccess {
  readonly ok: true;
  readonly rawResponse: string;   // passed verbatim to #188's parseResponse
  readonly bytes: number;         // len(rawResponse)
  readonly providerLatencyMs: number;
}

// Structured failure (HTTP 4xx or 5xx with JSON body)
interface ProxyResponseError {
  readonly ok: false;
  readonly kind:
    | "auth-failure"
    | "rate-limit"
    | "provider-error"
    | "timeout"
    | "oversize-response"
    | "bad-request";
  readonly providerStatus: number | null;   // Anthropic HTTP status, null on network/timeout
  readonly message: string;                 // safe-to-display, NEVER includes API key
}
```

**Invariant**: the proxy NEVER returns the API key or a credential-adjacent header in any response. On error, the proxy returns a generic `kind` classification — the raw provider error body is logged server-side (to stdout) but not forwarded verbatim.

---

## 4. `LiveTransportError` (client-side error envelope)

**Source**: constructed by `createLiveLLMClient` when a call cannot reach success.
**Consumer**: the demo's error-handling branch, which discriminates on `kind` and selects a user-facing message.

```typescript
type LiveTransportErrorReason =
  | "auth-failure"
  | "rate-limit"
  | "provider-error"
  | "transport-error"
  | "timeout"
  | "oversize-response"
  | "usage-cap-reached";

interface LiveTransportError {
  readonly reason: LiveTransportErrorReason;
  readonly message: string;           // human-readable; safe to show the stakeholder
  readonly providerStatus: number | null;
  readonly durationMs: number;
  readonly callIndex: number;         // the usage-counter value at call time
}
```

**Lifecycle**:

1. Browser issues `fetch(proxyUrl, { signal, body })`.
2. Proxy responds:
   - `200 { ok: true, rawResponse }` → client returns `rawResponse` to `generateCql2`; no `LiveTransportError`.
   - `{ ok: false, kind, providerStatus, message }` → client constructs `LiveTransportError` with matching `reason`.
3. Fetch itself fails (DNS, connection refused) → client constructs `LiveTransportError { reason: "transport-error" }`.
4. `AbortController` fires at `timeoutMs` → client constructs `LiveTransportError { reason: "timeout" }`.
5. Response body size exceeds `maxResponseBytes` → client constructs `LiveTransportError { reason: "oversize-response" }`.
6. Usage counter already ≥ cap → short-circuit with `LiveTransportError { reason: "usage-cap-reached" }` before issuing the fetch.

`LiveTransportError` is **distinct from** #188's `GenerationError`. A call can produce exactly one of:

- Success → raw string → `parseResponse` → `GenerationResult` (possibly with `error: GenerationError` from validation).
- Transport failure → `LiveTransportError` returned via `GenerationResult.error` slot (cast to a union the demo discriminates).

To keep `generateCql2` contract-stable, the live client **returns a `LiveTransportError` by throwing a `LiveTransportError` from `generate()`**, which the demo catches at the same point it already catches `RecordedLLMClient` misses. This matches the existing try/catch structure in `demo.jsx` (line 497–506 of current `submitPhrase`) — no plumbing change to `generateCql2`.

---

## 5. `TransportCallRecord` (observability)

**Source**: emitted by `createLiveLLMClient` once per call (success or failure).
**Consumer**: browser devtools console; optionally a future structured log sink.

```typescript
interface TransportCallRecord {
  readonly ts: string;                     // ISO 8601 timestamp
  readonly provider: "anthropic";          // extensible when more providers land
  readonly model: string;                  // from config at call time
  readonly durationMs: number;
  readonly outcome:
    | "success"
    | LiveTransportErrorReason;
  readonly responseBytes: number | null;   // null on non-success
  readonly callIndex: number;              // post-increment counter value
}
```

**Emission**: `console.info("[nl-demo/live]", record)`.

**Security invariants**:

- NO prompt, NO phrase, NO rawResponse, NO credential, NO header dump.
- `durationMs` is monotonically measured via `performance.now()`.

---

## 6. `LiveStubScenario` (test-only)

**Source**: JSON scenarios file consumed by `live-proxy.mjs --stub`.
**Consumer**: deterministic test runs (vitest + Playwright).

```typescript
type LiveStubOutcome =
  | { kind: "success"; rawResponse: string; providerLatencyMs?: number }
  | { kind: "auth"; message?: string }
  | { kind: "rate-limit"; message?: string }
  | { kind: "provider-error"; providerStatus: number; message?: string }
  | { kind: "timeout" }           // stub sleeps past timeoutMs
  | { kind: "malformed"; raw: string }  // valid 200 with malformed JSON body
  | { kind: "oversize"; sizeBytes: number };

interface LiveStubScenarios {
  readonly default: LiveStubOutcome;
  readonly overrides?: Readonly<Record<string, LiveStubOutcome>>;  // keyed by canonicalised phrase
}
```

**Note**: the stub's `timeout` outcome deliberately stalls the response so the browser client's `AbortController` fires — this tests the end-to-end cancellation path, not a synthetic client-side timeout.

---

## 7. Relationship to #188 types

| Type | Source | Usage here |
|---|---|---|
| `LLMClient` | `@debrief/components/nl-cql2` | Implemented by `createLiveLLMClient` |
| `GenerationResult` | `@debrief/components/nl-cql2` | Returned by `generateCql2` unchanged |
| `GenerationError` | `@debrief/components/nl-cql2` | Raised by `parseResponse` on malformed live responses |
| `ResponseMap` | `@debrief/components/nl-cql2` | Not used — the fixture path still uses `createRecordedLLMClient` |

The new types (`LiveConfig`, `LiveTransportError`, `TransportCallRecord`, `LiveStubScenarios`) are all **additive**. #188 remains intact.
