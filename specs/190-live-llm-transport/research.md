# Research: Live LLM Transport (#190)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Date**: 2026-04-16

Resolutions for the open technical decisions the spec deferred to planning (FR-013, Assumptions §4 and §5).

---

## R1. Transport style: direct-browser vs local-proxy vs MCP tool

**Decision**: **Local proxy sidecar** (Node stdlib HTTP server on `127.0.0.1`).

**Rationale**:

- **Credential isolation (FR-004, SC-006, Article X)**: The API key MUST NOT appear in any deployed artefact. A direct-browser call requires the key to reach the browser, which means it lives in bundle-adjacent config that a CDN or cache could mirror. Even with Anthropic's `anthropic-dangerous-direct-browser-access` header, the key is still client-side and harvestable from the devtools network panel. A sidecar proxy keeps the key exclusively in the Node process's environment, never leaving the operator's machine.
- **CORS reality**: Anthropic's HTTPS endpoint requires an opt-in dangerous header to be CORS-reachable from browser origins. Even with the header, every corporate proxy and browser extension that inspects outbound calls sees the key. A localhost proxy moves the outbound call to a Node process that has no such inspection surface.
- **Failure-mode observability (FR-008)**: The proxy can normalise HTTP 401/403/429/5xx and socket errors into a single structured error envelope before the browser sees them, which simplifies the client's error-classification code and gives CI a single surface to stub.
- **Portability across providers (Article IX, V)**: Swapping Claude for a local model or OpenAI only requires changing the proxy. The browser's `LLMClient` contract stays identical — one client, many back-ends.
- **CI compatibility**: The deterministic stub harness can mount a scripted mini-proxy on a test port, so Playwright smoke tests and vitest stub tests run without any real provider call.

**Alternatives considered**:

- **Direct browser-to-provider call** (rejected): violates credential isolation in defence context; burdens every operator with API-key hygiene in the browser; creates a CORS dependency on provider-side header tolerance. Even though this would ship with fewer moving parts, the security posture is unacceptable for any stakeholder demo that might be hosted off the author's laptop.
- **MCP tool server** (rejected at this scope): MCP is tightly coupled to Claude Code / Claude Desktop runtime; exposing live NL generation through MCP adds a second integration (MCP client libs in the browser) that this item is too small to justify. Deferred — if we later want the same NL capability inside VS Code, an MCP flavour of the same client is a natural follow-up.
- **Cloud-hosted proxy** (rejected): introduces infrastructure (deployment, secrets management, uptime) and centralises credentials against Article X. The "bring-your-own-key" operator model in the spec explicitly precludes this.

---

## R2. Provider and model selection

**Decision**: **Anthropic Claude — Haiku 4.5 (`claude-haiku-4-5-20251001`) as the default model**, configurable per-operator via `live-config.json`.

**Rationale**:

- **Cost and latency fit the demo profile**: Haiku 4.5 is the cheapest and fastest Claude model. The prompts are < 20 KB (SC-004 of #188) with short JSON responses — Haiku's capability envelope is easily adequate for CQL2 generation on the bounded schema.
- **Structured output quality**: #188's prompt produces JSON-object output with a strict schema. Both Haiku 4.5 and Sonnet 4.6 reliably honour it; Opus is overkill. Running live is a stakeholder wow-factor, not a model-quality comparison.
- **Single-provider scope** (spec Assumption §5): multi-provider support is explicitly out of scope. Claude is the incumbent provider for the rest of the project (Claude Code harness, existing MCP server patterns); continuity minimises accidental divergence in prompt conventions.
- **Operator override**: `live-config.json` carries `model` as a string — operators with access to a different Anthropic model or (future) a different provider endpoint set the field without code changes.

**Alternatives considered**:

- **OpenAI / GPT-4o-mini** (rejected): same single-provider reasoning — adds no demo value while doubling the configuration surface.
- **Local model via Ollama** (rejected at this scope): appealing for offline defence scenarios, but the stakeholder demo is explicitly an online-by-operator-choice path; a local-model flavour is a natural follow-up under the same `LLMClient` contract.
- **Sonnet 4.6 as default** (rejected): higher cost and latency; Haiku 4.5 is already over-provisioned for the task.

---

## R3. Runtime configuration mechanism

**Decision**: **Two-file split** — `apps/nl-demo/data/live-config.json` (browser-visible, gitignored) and `apps/nl-demo/.env` (proxy-only, gitignored).

Shape (narrowed on load):

```jsonc
// apps/nl-demo/data/live-config.json
{
  "enabled": true,
  "proxyUrl": "http://127.0.0.1:8081/generate",
  "model": "claude-haiku-4-5-20251001",
  "timeoutMs": 12000,
  "maxCalls": 50,
  "maxResponseBytes": 262144
}
```

```
# apps/nl-demo/.env (NEVER committed)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_ENDPOINT=https://api.anthropic.com/v1/messages
PROXY_PORT=8081
```

**Rationale**:

- **Structural credential isolation** (Article X, SC-006): the browser-visible file never contains a credential. The credential lives only in the proxy's env, loaded at proxy start.
- **Default-off (FR-003)**: `live-config.json` is gitignored. A freshly-served demo bundle has no live config → the demo boots in fixture-only mode. No operator action → no live-provider call, ever.
- **Malformed-config refuse-to-activate (FR-005)**: the config loader narrows each field and surfaces a single, specific diagnostic when any required field is absent or of the wrong type. The demo then falls back to fixture mode with a visible warning rather than crashing.
- **Clear revocation path**: deleting `live-config.json` OR setting `enabled: false` OR stopping the proxy all revert the demo to fixture mode on next reload. Three independent revocation levers matches defence-grade reliability expectations.

**Alternatives considered**:

- **`sessionStorage` / `localStorage`** (rejected): convenient for the operator but leaves credential-adjacent config in the browser's storage where extensions can harvest it. Also conflicts with "reload to reset" expectations.
- **URL query string** (rejected): mirrored into browser history, logs, and referer headers. Unacceptable even for non-credential fields when used alongside a key.
- **Single combined `.env` loaded by both proxy and a boot-time Node step** (rejected): would require a build step for the browser-visible config, defeating the no-build-step invariant of #189.

---

## R4. Failure classification and mapping to `GenerationError`

**Decision**: The live client maps transport-layer failures into a **new extended error reason set** (`LiveTransportErrorReason`) that the demo UI then renders. #188's existing `GenerationError` stays untouched because response-parsing failures continue to flow through `parseResponse`.

Mapping:

| Proxy outcome | Client surfaces | UI message |
|---|---|---|
| HTTP 401 / 403 / missing-key envelope | `auth-failure` | "Provider rejected the request — check credentials." |
| HTTP 429 / quota envelope | `rate-limit` | "Provider rate limit hit — try again in a moment." |
| HTTP 5xx or provider-returned error body | `provider-error` | "The provider returned an error. Try a different phrase." |
| Network failure / DNS / proxy-unreachable | `transport-error` | "Could not reach the language-model proxy. Is it running?" |
| `AbortController` fires at `timeoutMs` | `timeout` | "The provider did not respond in time." |
| Response body exceeds `maxResponseBytes` | `oversize-response` | "Provider response was too large — ignoring." |
| Valid 200 JSON with malformed content | (falls through to `parseResponse`) | Existing `GenerationError` classes apply (malformed-json, schema-violation, hallucinated-field, etc.) |
| Usage counter at cap | `usage-cap-reached` | "Live-mode call limit reached — reload to reset." |

**Rationale**:

- Keeps the existing `GenerationError` responsibilities pure (LLM-output semantics) and introduces a parallel transport-error type that the demo renders through a shared banner component. Two orthogonal failure surfaces, two orthogonal types.
- The live client still returns a `GenerationResult` — the transport-error case populates `error` with a `LiveTransportError` object the demo discriminates on a `kind` field. #188's code path that consumes `result.error` remains compatible; the generator does not need to know about transport errors.

**Alternatives considered**:

- **Reuse `GenerationError` by adding new reason codes** (rejected): pollutes the semantic meaning of `GenerationError` (which is about LLM-output semantics) with transport concerns. Cleaner to keep them separate.
- **Throw transport errors** (rejected): `generateCql2` contract is "never throws on normal failure paths" — a transport failure is now a normal failure path.

---

## R5. In-flight cancellation and usage-cap enforcement

**Decision**: Two cooperating guards inside `createLiveLLMClient`:

- **`AbortController` per call**: each `generate(prompt)` creates an `AbortController`. The client exposes a `cancel()` method that calls `abort()` on all outstanding calls. The demo's existing submission-token pattern in `demo.jsx` extends trivially: on submit of a new phrase, call `client.cancelPending()` before issuing the new generate.
- **Closure-scoped usage counter**: a plain `let count = 0` + `const cap = config.maxCalls` inside the factory. Pre-increment before issuing the fetch. When `count > cap`, short-circuit to a `usage-cap-reached` `LiveTransportError` without calling the proxy.

**Rationale**:

- Both guards are invisible to the generator — they sit behind `LLMClient.generate(prompt)`. The existing generator code path is unchanged.
- `AbortController` is supported in every target browser. `fetch(url, { signal })` is the one-line integration.
- Counter is session-scoped because it lives in the closure — a page reload recreates the client and resets the counter. This matches the spec's "reload to reset" wording in FR-010.

**Alternatives considered**:

- **Promise cancellation via token** (rejected): `AbortController` is the canonical browser idiom and integrates with `fetch` natively.
- **Persistent call counter via `sessionStorage`** (rejected): conflicts with "reload to reset" spec language and complicates the test stub.

---

## R6. Deterministic stub for CI (FR-015)

**Decision**: Ship `apps/nl-demo/scripts/live-proxy.mjs` with a `--stub <scenarios-file>` mode that reads a JSON file describing per-phrase scripted outcomes (`success | auth | rate-limit | network | timeout | malformed | oversize | provider-error`). Playwright and vitest tests point `proxyUrl` at this stub proxy. No network calls; no credentials.

Stub script shape:

```json
{
  "default": { "kind": "success", "cql2": {}, "lozenges": [], "unrecognised_terms": [] },
  "overrides": {
    "timeout test": { "kind": "timeout" },
    "auth test":    { "kind": "auth" }
  }
}
```

**Rationale**:

- A single code path for the proxy (live vs stub) keeps behaviour identical in production and in tests — the browser client cannot tell the difference, which is exactly what FR-002 demands.
- JSON scenarios are easier to extend than compiled TypeScript stubs and can be shared between vitest and Playwright tests.
- Isolates the deterministic-failure corpus in one file instead of spreading it across test modules.

**Alternatives considered**:

- **TypeScript stub class imported directly by tests** (rejected): cannot exercise the browser's `fetch` code path against a real `http://127.0.0.1:PORT/generate` URL, which is what the live client uses in production.
- **`msw` or `nock` for HTTP mocking** (rejected): adds a dependency for something a 120-line Node script handles; conflicts with Article IX (minimal dependencies).

---

## R7. Observability / call-record logging (FR-014)

**Decision**: Emit one structured record per live call to `console.info` under a `[nl-demo/live]` prefix.

Record shape:

```typescript
type TransportCallRecord = {
  readonly ts: string;            // ISO8601
  readonly provider: string;      // "anthropic"
  readonly model: string;         // from config
  readonly durationMs: number;
  readonly outcome:
    | "success"
    | "auth-failure"
    | "rate-limit"
    | "provider-error"
    | "transport-error"
    | "timeout"
    | "oversize-response"
    | "usage-cap-reached";
  readonly responseBytes: number | null;  // null on non-success
  readonly callIndex: number;     // post-increment of the usage counter
};
```

**Rationale**:

- `console.info` keeps the record visible in devtools without polluting the `error` or `warn` streams — Article I's "no silent failures" is preserved while avoiding alarm fatigue for successful calls.
- The record has **no prompt, no phrase, no response body, no credential**. It is purely operational metadata.
- Future work could pipe the record to a structured log sink (Grafana Loki, simple HTTP POST to a collector) behind a config flag; out of scope for this item.

**Alternatives considered**:

- **Network-accessible log endpoint** (rejected): introduces a second outbound destination and potential data-leak surface.
- **Persist to `sessionStorage`** (rejected): not useful — the operator watching a demo reads devtools, not storage.

---

## R8. Default timeout, usage cap, and response size

**Decision**:

| Parameter | Default | Rationale |
|---|---|---|
| `timeoutMs` | 12 000 | SC-007 requires p95 < 10 s. 12 s gives a 20% headroom before the timeout path fires. |
| `maxCalls` | 50 | SC-008 explicitly validates the 50-call cap. A 30-minute demo typically runs < 20 queries; 50 absorbs exploratory iteration without surprises. |
| `maxResponseBytes` | 262 144 (256 KB) | Typical Claude response for this prompt is 200–1000 B; 256 KB cap is ~256× headroom while protecting the UI from a pathological runaway response. |

All three values are configurable via `live-config.json` — the spec only requires that caps exist and are configurable (FR-007, FR-010, FR-011), not that they take specific values.

---

## Summary of open questions resolved

| Spec reference | Resolution |
|---|---|
| FR-013 (transport style choice) | Local proxy (R1) |
| Assumption §4 (style deferred to plan) | Local proxy (R1) |
| Assumption §5 (provider choice) | Anthropic Claude Haiku 4.5, operator-overridable (R2) |
| FR-004 (config source) | Two-file split, both gitignored (R3) |
| FR-008 (failure classes) | New `LiveTransportErrorReason` + fall-through to `GenerationError` (R4) |
| FR-012 (in-flight supersession) | `AbortController` + `cancelPending()` (R5) |
| FR-010 (usage cap) | Closure counter, reload resets (R5) |
| FR-015 (deterministic stub) | Stub-mode flag on the same proxy script (R6) |
| FR-014 (call-record logging) | `console.info` with a scoped prefix and no sensitive fields (R7) |

No unresolved `NEEDS CLARIFICATION` items remain.
