# Contract: Proxy HTTP API

**Feature**: #190 Live LLM Transport
**Status**: Design — implementation follows `/speckit.tasks`

The proxy exposes a single endpoint consumed by `createLiveLLMClient` in the browser. No other routes are published.

---

## `POST /generate`

### Request

**Headers**

```
Content-Type: application/json
Accept: application/json
```

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
- `bytes` equals `rawResponse.length` (UTF-16 code units) — the browser uses this for the max-size check. This is an advisory value; the browser independently enforces `maxResponseBytes`.
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

| `kind` | HTTP status | When |
|---|---|---|
| `bad-request` | 400 | Request body fails validation |
| `auth-failure` | 401 | Provider returns 401 or 403, OR proxy lacks `ANTHROPIC_API_KEY` |
| `rate-limit` | 429 | Provider returns 429 |
| `provider-error` | 502 | Provider returns 5xx OR non-enveloped provider error |
| `timeout` | 504 | Provider does not respond within proxy-side `PROVIDER_TIMEOUT_MS` (default 20 s; longer than the browser-side `timeoutMs` so the browser's AbortController fires first) |
| `oversize-response` | 502 | Provider response exceeds proxy-side `MAX_PROVIDER_BYTES` (default 1 MB) |

**Invariants**

- `message` is ASCII-safe, ≤ 200 characters, and NEVER contains the API key, headers, or any secret-adjacent token. Sensitive detail is logged to proxy stdout only.
- `providerStatus` is `null` for `timeout` and for purely proxy-side rejections like `bad-request`.

---

### Stub mode (`--stub <scenarios-file>`)

When launched with `--stub`, the proxy reads the scenarios file at startup and serves responses from it instead of calling the upstream provider. Request-body validation is unchanged. `ANTHROPIC_API_KEY` is not required.

Scenarios file shape: see [data-model.md §6](../data-model.md#6-livestubscenario-test-only).

Lookup rule: extract the phrase from the prompt's `Phrase: <text>` suffix (the same extraction `createRecordedLLMClient` uses from #188's `clients.ts`). If `scenarios.overrides[canonicalise(phrase)]` exists, use it; else use `scenarios.default`. The `timeout` outcome stalls the response indefinitely so the browser client's `AbortController` path is exercised.

---

## Non-goals

- **No streaming** — the proxy waits for the full provider response before replying (matches spec Assumption §7, out of scope).
- **No retries** — a failed call surfaces directly; any retry is operator-driven from the demo.
- **No caching** — each call hits the provider fresh (matches FR-006).
- **No auth on the proxy itself** — the proxy binds to `127.0.0.1` by default and relies on loopback isolation. Operators who bind to a non-loopback interface accept the risk.
- **No CORS handling beyond default** — proxy serves only the demo origin (`http://127.0.0.1:8080`). Explicit `Access-Control-Allow-Origin` headers match the configured allowed origin; defaults are restrictive.

---

## Observability

Proxy stdout emits one line per request in a structured format:

```
[proxy] ts=2026-04-16T12:34:56.789Z method=POST path=/generate status=200 durationMs=1873 providerStatus=200 outcome=success bytes=412
[proxy] ts=2026-04-16T12:34:58.012Z method=POST path=/generate status=429 durationMs=102  providerStatus=429 outcome=rate-limit bytes=0
```

No request body, no response body, no headers logged. Operators debugging malformed responses set `PROXY_LOG_BODIES=1` to opt into body logging for their own session (never a default; never in CI).
