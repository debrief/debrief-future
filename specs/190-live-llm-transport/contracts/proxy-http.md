# Contract: Proxy HTTP API

**Feature**: #190 Live LLM Transport
**Status**: Design — implementation follows `/speckit.tasks`

The proxy exposes two endpoints consumed by `createLiveLLMClient` in the browser: `POST /generate` (the work endpoint) and `GET /health` (a boot-time liveness probe the demo calls before activating live mode). No other routes are published.

---

## `POST /generate`

### Request

**Headers**

```
Content-Type: application/json
Accept: application/json
X-Proxy-Token: <required iff proxy was started with PROXY_ALLOW_REMOTE=true>
```

When the proxy was started with `PROXY_ALLOW_REMOTE=true`, every `/generate` request MUST carry `X-Proxy-Token` matching the startup-generated token. A missing or wrong token returns `401 {ok:false, kind:"auth-failure", message:"Proxy token missing or invalid"}` — the browser maps this to `reason: "auth-failure"`. When `PROXY_ALLOW_REMOTE` is `false` (the default, loopback bind), the header is ignored if present.

**Body**

```jsonc
{
  "prompt": "<verbatim prompt string from #188 buildPrompt>",
  "model": "claude-haiku-4-5-20251001"   // optional; defaults to ProxyEnv ANTHROPIC_MODEL
}
```

**Request validation** (proxy-side):

- `prompt` MUST be a non-empty string, ≤ 100 000 characters. Rejected with `400 { ok: false, kind: "bad-request" }` otherwise.
- `model` MUST be a non-empty string when present. Rejected with `400` otherwise.
- Any additional fields MUST be ignored (forwards-compat).

---

### Response — success (HTTP 200)

```jsonc
{
  "ok": true,
  "rawResponse": "{\"cql2\":{...},\"lozenges\":[...],\"unrecognised_terms\":[]}",
  "bytes": 412,
  "providerLatencyMs": 1873
}
```

- `rawResponse` is the raw text from the provider's message content, stripped of envelope metadata. The browser hands it verbatim to #188's `parseResponse`; the proxy does NOT attempt to JSON-parse or validate it.
- `bytes` is the **UTF-8 byte length** of `rawResponse`, measured by `Buffer.byteLength(rawResponse, 'utf8')` — NOT `rawResponse.length` (which counts UTF-16 code units and undercounts non-ASCII content). This is an advisory value; the browser independently enforces `maxResponseBytes` via a streaming byte accumulator built on `ReadableStream.getReader()`, aborting mid-read if the cap is exceeded.
- `providerLatencyMs` is the wall-clock time between the proxy issuing its upstream fetch and receiving the final byte.

### Response — error (HTTP 4xx or 5xx)

**Schema**

```jsonc
{
  "ok": false,
  "kind": "auth-failure" | "rate-limit" | "provider-error" | "timeout" | "oversize-response" | "bad-request",
  "providerStatus": 401,           // integer or null
  "message": "Provider rejected the credential."
}
```

**Status-code mapping**

| `kind` | HTTP status | When | Browser `LiveTransportErrorReason` |
|---|---|---|---|
| `bad-request` | 400 | Request body fails validation (e.g. prompt absent, too long, or JSON malformed) | `transport-error` — indicates a client-version mismatch, not a user-actionable failure |
| `auth-failure` | 401 | Provider returns 401 or 403, OR proxy lacks `ANTHROPIC_API_KEY`, OR `X-Proxy-Token` missing/wrong when `PROXY_ALLOW_REMOTE=true` | `auth-failure` |
| `rate-limit` | 429 | Provider returns 429 | `rate-limit` |
| `provider-error` | 502 | Provider returns 5xx OR non-enveloped provider error | `provider-error` |
| `timeout` | 504 | Provider does not respond within proxy-side `PROVIDER_TIMEOUT_MS` (default 20 s; longer than the browser-side `timeoutMs` so the browser's AbortController fires first) | `timeout` |
| `oversize-response` | 502 | Upstream response exceeds proxy-side `MAX_PROVIDER_BYTES` (default **524 288 bytes / 512 KB** — 2× the browser default so the browser cap fires first in default config, defence-in-depth only when the operator has raised the browser cap). Measured via a chunk-by-chunk UTF-8 byte accumulator on the upstream stream, which is destroyed once the cap is exceeded — NOT buffer-then-measure. | `oversize-response` |

**Invariants**

- `message` is ASCII-safe, ≤ 200 characters, and NEVER contains the API key, headers, or any secret-adjacent token. Sensitive detail is logged to proxy stdout only.
- `providerStatus` is `null` for `timeout` and for purely proxy-side rejections like `bad-request`.

---

---

## `GET /health`

A lightweight liveness probe the demo calls at boot, after `validateLiveConfig` succeeds and before activating live mode. Lets the operator discover "I forgot to start the proxy" at page load instead of after the first submission.

### Request

**Headers**

```
Accept: application/json
X-Proxy-Token: <required iff PROXY_ALLOW_REMOTE=true>
```

No body.

### Response — success (HTTP 200)

```jsonc
{
  "ok": true,
  "provider": "anthropic",
  "model": "claude-haiku-4-5-20251001",
  "mode": "live",          // "stub" when the proxy was started with --stub
  "bindRemote": false       // true iff PROXY_BIND is non-loopback
}
```

### Response — failure

Any of:

- `401 {ok:false, kind:"auth-failure"}` — missing or invalid `X-Proxy-Token` when `PROXY_ALLOW_REMOTE=true`.
- Connection refused / DNS failure — the proxy is not running.
- Timeout (> 2 000 ms on the browser side) — proxy is wedged.

**Browser behaviour on any failure**: the demo falls back to fixture mode and shows a one-line banner: `"Live mode configured but proxy unreachable at <proxyUrl> — running in fixture mode. Did you start scripts/live-proxy.mjs?"`

The health endpoint never exposes credentials or upstream provider state beyond what is listed above.

---

### Stub mode (`--stub <scenarios-file>`)

When launched with `--stub`, the proxy reads the scenarios file at startup and serves responses from it instead of calling the upstream provider. Request-body validation is unchanged. `ANTHROPIC_API_KEY` is not required.

Scenarios file shape: see [data-model.md §6](../data-model.md#6-livestubscenario-test-only).

Lookup rule: extract the phrase from the prompt's `Phrase: <text>` suffix (the same extraction `createRecordedLLMClient` uses from #188's `clients.ts`). If `scenarios.overrides[canonicalise(phrase)]` exists, use it; else use `scenarios.default`. The `timeout` outcome stalls the response indefinitely so the browser client's `AbortController` path is exercised.

---

## Performance requirements

- **Upstream HTTPS agent**: the proxy MUST construct a single `https.Agent({ keepAlive: true, keepAliveMsecs: 30_000, maxSockets: 4 })` at startup and pass it to every `https.request()` call. NOT `https.globalAgent` (which defaults to `keepAlive: false`). This is the mechanism by which the < 50 ms p50 warm-overhead target is met; without keepalive every call pays a fresh TLS handshake.
- **Cold-start tolerance**: the first call after proxy startup may add up to ~300 ms for the TLS handshake. Operators should expect the first live query to be slower than subsequent ones; this is intentional and not a bug.

---

## Non-goals

- **No streaming to the browser** — the proxy waits for the full provider response before replying (matches spec Assumption §7, out of scope). The proxy does stream-and-count internally to enforce `MAX_PROVIDER_BYTES` without buffering oversize responses.
- **No retries** — a failed call surfaces directly; any retry is operator-driven from the demo.
- **No caching** — each call hits the provider fresh (matches FR-006).
- **No auth on the proxy when bound to loopback** — the proxy binds to `127.0.0.1` by default and relies on loopback isolation. Non-loopback bind is refused unless `PROXY_ALLOW_REMOTE=true` is set, AND requires a matching `X-Proxy-Token` header on every request. This prevents an accidental `0.0.0.0` bind from becoming an open relay on the operator's paid provider key.
- **No CORS handling beyond default** — proxy serves only the demo origin (`http://127.0.0.1:8080`). Explicit `Access-Control-Allow-Origin` headers match the configured allowed origin; defaults are restrictive.

---

## Observability

Proxy stdout emits one line per request in a structured format:

```
[proxy] ts=2026-04-16T12:34:56.789Z method=POST path=/generate status=200 durationMs=1873 providerStatus=200 outcome=success bytes=412
[proxy] ts=2026-04-16T12:34:58.012Z method=POST path=/generate status=429 durationMs=102  providerStatus=429 outcome=rate-limit bytes=0
```

No request body, no response body, no headers logged. Operators debugging malformed responses set `PROXY_LOG_BODIES=1` to opt into body logging for their own session (never a default; never in CI).
