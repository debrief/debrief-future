# Data Model: Live LLM Transport (#190)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

This feature is a transport layer, not a data-bearing feature. There are no persistent entities, no schema changes, no new STAC properties. The "data model" captured here is the shape of in-memory configuration, error envelopes, and observability records that cross trust boundaries (operator filesystem → proxy → browser → demo).

All types are strict-typed TypeScript — `any` is prohibited (Constitution Article XV).

---

## 1. `LiveConfig` (browser-visible runtime configuration)

**Source**: `apps/nl-demo/live-config.json` (app root, gitignored). NOT in `data/` — kept physically separate from `sync-data.mjs`'s regeneration cycle.
**Consumer**: demo boot code in `demo.jsx`, narrowed before being handed to `createLiveLLMClient`.

```typescript
interface LiveConfig {
  readonly enabled: boolean;
  readonly proxyUrl: string;           // e.g. "http://127.0.0.1:8081/generate"
  readonly model: string;              // e.g. "claude-haiku-4-5-20251001"
  readonly timeoutMs: number;          // positive integer; default 12_000
  readonly maxCalls: number;           // positive integer; default 50
  readonly maxResponseBytes: number;   // UTF-8 byte count; default 262_144 (256 KB)
  readonly proxyToken?: string;        // required only when the proxy was started with
                                       // PROXY_ALLOW_REMOTE=true; empty/omitted for loopback
}
```

**Validation rules** (enforced by `validateLiveConfig(raw: unknown): { ok: true; value: LiveConfig } | { ok: false; errors: LiveConfigValidationError[] }`):

| Field | Rule | Failure |
|---|---|---|
| `enabled` | `typeof === 'boolean'` | `{ field: 'enabled', message: 'must be boolean' }` |
| `proxyUrl` | Non-empty string, parses as absolute `http(s)://` URL, host is `127.0.0.1` or `localhost` in the default recommendation (not enforced — operators may point at a remote proxy if they set `proxyToken` and the proxy was started with `PROXY_ALLOW_REMOTE=true`) | `{ field, message }` with specific diagnostic |
| `model` | Non-empty string | `{ field: 'model', message }` |
| `timeoutMs` | Integer > 0, ≤ 300 000 (5 min upper bound) | `{ field: 'timeoutMs', message }` |
| `maxCalls` | Integer > 0, ≤ 1 000 | `{ field: 'maxCalls', message }` |
| `maxResponseBytes` | Integer ≥ 1 024, ≤ 10 485 760 (10 MB); measured as UTF-8 byte count by the browser's streaming reader | `{ field: 'maxResponseBytes', message }` |
| `proxyToken` | Optional; when present, must be a non-empty string. Sent as `X-Proxy-Token` on every `/generate` request | `{ field: 'proxyToken', message }` |

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
  readonly PROXY_ALLOW_REMOTE: boolean;         // default false; required to be true when PROXY_BIND is non-loopback
  readonly ANTHROPIC_VERSION: string;           // default "2023-06-01" (Anthropic API version header)
  readonly MAX_PROVIDER_BYTES: number;          // default 524_288 (512 KB) — 2× browser default
  readonly PROVIDER_TIMEOUT_MS: number;         // default 20_000 — belt-and-braces; browser AbortController normally fires first
}
```

**Validation rules**:

- Proxy refuses to start (exits non-zero) if `ANTHROPIC_API_KEY` is missing while not running in `--stub` mode. Stub mode ignores all `ANTHROPIC_*` fields.
- Proxy refuses to start if `PROXY_BIND` is non-loopback (not `127.0.0.1`, `::1`, or `localhost`) AND `PROXY_ALLOW_REMOTE` is not `true`.
- When `PROXY_ALLOW_REMOTE=true`, the proxy generates a random `proxyToken` at startup (32-byte base64url), prints it to stderr with loud instructions ("set this in `live-config.json` as `proxyToken` — do NOT commit"), and rejects every `/generate` request whose `X-Proxy-Token` header does not match.

**Security invariants**:

- `ANTHROPIC_API_KEY` MUST never be logged, echoed to the response, or mirrored into any file the proxy writes.
- `proxyToken` is in-memory only; it is never persisted. Restarting the proxy regenerates it, forcing operators to update `live-config.json` — which is intentional friction.
- The proxy writes a startup banner to stderr showing `PROXY_BIND`, `PROXY_ALLOW_REMOTE`, and `ANTHROPIC_MODEL` so operators cannot miss an unexpected configuration.

**Upstream HTTPS agent**: the proxy constructs exactly one `https.Agent({ keepAlive: true, keepAliveMsecs: 30_000, maxSockets: 4 })` at startup and reuses it across all upstream calls. This keeps warm-call overhead under the < 50 ms p50 target (see research R9).

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
  readonly rawResponse: string;       // passed verbatim to #188's parseResponse
  readonly bytes: number;             // UTF-8 byte length of rawResponse, via Buffer.byteLength(rawResponse, 'utf8')
                                      // — NOT UTF-16 code-unit length; advisory for the browser
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

**Client-side mapping**: the browser client's `LiveTransportErrorReason` set does NOT include `bad-request`. When the proxy returns `kind: "bad-request"` (e.g. prompt exceeded 100 000 UTF-16 chars at the wire), the client maps it to `reason: "transport-error"` with a diagnostic message pointing at the client version. This case indicates a browser-client bug and is not user-actionable.

**Invariant**: the proxy NEVER returns the API key or a credential-adjacent header in any response. On error, the proxy returns a generic `kind` classification — the raw provider error body is logged server-side (to stdout) but not forwarded verbatim.

---

## 4. `LiveTransportError` (client-side error envelope)

**Source**: constructed by `createLiveLLMClient` when a call cannot reach success.
**Consumer**: the demo's error-handling branch, which discriminates on `reason` and selects a user-facing message.

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

**Shape**: a plain data interface — **NOT** an `Error` subclass. It is never thrown; it flows through the normal return path. A type guard `isLiveTransportError(value: unknown): value is LiveTransportError` lives in `clients.ts` for discriminating values received via `GenerationResult.error`.

**Lifecycle**:

1. Browser issues `fetch(proxyUrl, { signal, body, headers })` (headers include `X-Proxy-Token` when `proxyToken` is configured).
2. Proxy responds:
   - `200 { ok: true, rawResponse }` → client returns `rawResponse` to `generateCql2`; no `LiveTransportError`.
   - `400 { ok: false, kind: "bad-request" }` → client constructs `LiveTransportError { reason: "transport-error" }` (proxy rejected a malformed request; this indicates a client-version mismatch).
   - `{ ok: false, kind, providerStatus, message }` for any other `kind` → client constructs `LiveTransportError` with the matching `reason` (`kind` maps 1:1 for `auth-failure`, `rate-limit`, `provider-error`, `timeout`, `oversize-response`).
3. Fetch itself fails (DNS, connection refused) → client constructs `LiveTransportError { reason: "transport-error" }`.
4. `AbortController` fires at `timeoutMs` → client constructs `LiveTransportError { reason: "timeout" }`.
5. Response body size exceeds `maxResponseBytes` (measured via `ReadableStream.getReader()` byte accumulator — NOT `response.text().length`) → client aborts the stream and constructs `LiveTransportError { reason: "oversize-response" }`.
6. Usage counter already ≥ cap → short-circuit with `LiveTransportError { reason: "usage-cap-reached" }` before issuing the fetch.

**Return, never throw**: `LiveTransportError` is **distinct from** #188's `GenerationError`. The live client **returns** the value via `GenerationResult.error` as a discriminated union:

```typescript
type GenerationResultError =
  | { readonly kind: "generation"; readonly error: GenerationError }
  | { readonly kind: "transport";  readonly error: LiveTransportError };
```

A call can produce exactly one of:

- **Success** → raw string → `parseResponse` → `GenerationResult` (possibly with `error: { kind: "generation", error: GenerationError }` from validation).
- **Transport failure** → `GenerationResult { error: { kind: "transport", error: LiveTransportError } }`.

`generateCql2`'s contract is preserved — it never throws on normal failure paths. The demo's existing `result.error` handler in `demo.jsx` grows a `switch (result.error.kind)` dispatch; no `try/catch` changes.

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

## 7. Proxy `GET /health` (boot-time liveness check)

**Source**: emitted by `live-proxy.mjs` on every `GET /health` request.
**Consumer**: the demo's boot code in `demo.jsx`, after `validateLiveConfig` succeeds and before activating live mode.

```typescript
// Success (HTTP 200)
interface ProxyHealthResponse {
  readonly ok: true;
  readonly provider: "anthropic";
  readonly model: string;                 // same as ProxyEnv ANTHROPIC_MODEL
  readonly mode: "live" | "stub";         // "stub" when proxy was started with --stub
  readonly bindRemote: boolean;           // true iff PROXY_BIND is non-loopback
}
```

**Demo-side check**: after successful `validateLiveConfig`, the demo issues `fetch(new URL("/health", proxyUrl))` with a 2 000 ms timeout. Headers include `X-Proxy-Token` when configured.

- Success → activate live mode; show the transport-mode indicator (FR-018) with the reported `model`.
- Failure (any kind: network error, non-2xx, timeout, missing-token rejection) → fall back to fixture mode; show a one-line diagnostic banner: `"Live mode configured but proxy unreachable at <proxyUrl> — running in fixture mode. Did you start scripts/live-proxy.mjs?"`

The health endpoint never returns provider credentials or internal state beyond what's listed above. It is the single source of truth for "is live mode actually usable right now".

---

## 8. Relationship to #188 types

| Type | Source | Usage here |
|---|---|---|
| `LLMClient` | `@debrief/components/nl-cql2` | Implemented by `createLiveLLMClient` |
| `GenerationResult` | `@debrief/components/nl-cql2` | Returned by `generateCql2` unchanged |
| `GenerationError` | `@debrief/components/nl-cql2` | Raised by `parseResponse` on malformed live responses |
| `ResponseMap` | `@debrief/components/nl-cql2` | Not used — the fixture path still uses `createRecordedLLMClient` |

The new types (`LiveConfig`, `LiveTransportError`, `TransportCallRecord`, `LiveStubScenarios`) are all **additive**. #188 remains intact.
