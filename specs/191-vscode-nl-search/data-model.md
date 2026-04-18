# Data Model: NL Search in VS Code Catalog Overview

**Feature**: 191-vscode-nl-search
**Phase**: 1 (design, updated post-review)
**Date**: 2026-04-17

Five in-memory entities (no persistence beyond VS Code settings + SecretStorage). Full type definitions in `contracts/llm-client.ts`. This file describes the semantics, invariants, and integration — updated in line with the /speckit.review outcomes (Decisions 1–15).

---

## 1. `LiveConfig` (single discriminated type — review Decision 5)

**Purpose**: Runtime snapshot of user configuration for the NL path. **One** `LiveConfig` type serves both browser (#189/#190) and VS Code (#191) via a `transport` discriminator. Replaces the previously-drafted `LiveNlConfig` and merges with the existing `LiveConfig` from `shared/components/src/nl-cql2/types.ts`.

**Shape** (verbatim in `contracts/llm-client.ts`):

```
LiveConfig = BrowserLiveConfig | VsCodeLiveConfig
  // shared fields: enabled, model, timeoutMs, callCeiling, maxResponseBytes
  // + transport: "browser-proxy" — adds proxyUrl, proxyToken
  // + transport: "vscode-host"    — adds hasApiKey (bool, NOT the key itself)
```

**VS Code sources**:

| Field | Source | Default | Validation |
|---|---|---|---|
| `enabled` | `debrief.nlSearch.enabled` | `false` | — |
| `model` | `debrief.nlSearch.model` | `"claude-haiku-4-5-20251001"` | `^claude-[a-z0-9-]+$` |
| `callCeiling` | `debrief.nlSearch.callCeiling` | `50` | integer ≥ 1, ≤ 10000 |
| `timeoutMs` | `debrief.nlSearch.timeoutMs` | `12000` | integer ≥ 1000, ≤ 60000 |
| `maxResponseBytes` | `debrief.nlSearch.maxResponseBytes` | `262144` | integer ≥ 1024, ≤ 2097152 |
| `hasApiKey` | presence check on `context.secrets.get(…)` | `false` | — |

The actual API key value lives only in `context.secrets` (`debrief.nlSearch.anthropicApiKey`) and is cached in extension-host memory between reads (review Decision 14). A change-event listener (`context.secrets.onDidChange`) invalidates the cache.

**Invariants**:
- `transport` of a `LiveConfig` instance never changes across its lifetime.
- `enabled === true && hasApiKey === false` forces a `not-configured` outcome without touching the network (FR-004).
- The key NEVER appears in any `LiveConfig` exchanged across the webview boundary — only the `hasApiKey` bool does.

---

## 2. `NlSubmission`

**Purpose**: Lifecycle state for a single Enter-keypress in the FilterBar. Owned by the FilterBar (webview); the host sees only the resulting `generate()` call via the client.

| Field | Type | Set by | Notes |
|---|---|---|---|
| `requestId` | `string (uuid v4)` | client at `generate()` | Internal to the adapter — FilterBar never sees it |
| `phrase` | `string` | FilterBar at submit | Trimmed, length ≤ 500 |
| `status` | `"pending" \| "succeeded" \| "failed" \| "cancelled"` | FilterBar on outcome | See state machine below |
| `startedAt` | `number (epoch ms)` | FilterBar at submit | Telemetry only |
| `outcome` | `LiveOutcome \| null` | FilterBar on resolve | See `contracts/llm-client.ts` |

**State machine**:

```
          submit(phrase)
   ( — ) ────────────▶ pending
                          │
                          ├── resolve(kind=success)           ─▶ succeeded (chips applied)
                          ├── resolve(kind=<any failure>)    ─▶ failed (banner)
                          ├── new submit OR panel dispose
                          │       ├── client.abort()
                          │       └── resolve(kind=transport-error,
                          │                 reason=cancelled)  ─▶ cancelled (drop outcome)
```

**Invariants**:
- At most one `pending` submission per FilterBar. A new submit calls `client.abort()` on any prior pending one (review Decision 4 + 11).
- `failed` never clears the existing lozenges (review Decision 7, FR-006, SC-005). A regression test in `FilterBar.nl.test.tsx` enforces this.
- `cancelled` outcomes are silently dropped (no banner, no chip change) — this is explicit design, not silent failure.

---

## 3. `FailureBanner`

**Purpose**: UI state rendered above the plot list when the latest `NlSubmission` is in `failed` status. Shape mirrors #190's `LiveTransportBanner`.

| Field | Type | Notes |
|---|---|---|
| `reason` | `LiveOutcome["kind"]` minus `"success"` | One per outcome class; drives banner copy |
| `nestedReason` | string or null | e.g. `malformed-response.reason = "oversize"` |
| `message` | `string` | Human-readable; default per `reason` |
| `recovery` | `{ label: string; action: "retry" \| "rephrase" \| "open-settings" }[]` | 1–3 buttons |

**Invariants**:
- Prior chips and filter expression remain on screen while banner is visible (FR-006, SC-005 — enforced by test per Decision 7).
- Banner clears on the next `succeeded` submission OR on any chip change (remove, clear-all, manual add).

---

## 4. Webview↔Host Message Protocol (embedded in existing messages.ts — review Decision 2)

**Purpose**: Typed request/response variants added to the existing `apps/vscode/src/webview/messages.ts` union. NOT a new file. Uses the repo's existing `RequestMessage`/`ResponseMessage` base types and the `camelCase` tag convention.

| Message | Direction | Extends | Payload |
|---|---|---|---|
| `nlGenerate` | webview → host | `RequestMessage` | `{ requestId, prompt }` |
| `nlAbort` | webview → host | — | `{ requestId }` (idempotent; unknown ids are no-op) |
| `nlOutcome` | host → webview | `ResponseMessage` | `{ requestId, outcome: LiveOutcome }` |
| `nlConfig` | host → webview | — | `{ enabled, hasKey, model, callsRemaining }` |

**Invariants**:
- `requestId` is a UUID v4 generated by the `createPostMessageLLMClient` adapter; never reused.
- `nlOutcome` has at most one response per `requestId` (or zero if aborted).
- `apiKey` MUST NEVER appear in any message. A dev-build assertion in the host checks this on every `nlOutcome` emission.
- On `nlAbort` receipt the host removes the `requestId` entry from its `Map<requestId, AbortController>` in a `finally` block (review Decision 15) — cleanup also fires on the happy path.

---

## 5. `LLMClient` (adapter — single canonical interface, review Decision 1)

**Purpose**: Transport-agnostic NL → CQL2 client. The #188 shape (`generate(prompt): Promise<string>`) is REPLACED by the outcome-returning shape below, as permitted by Article XIV (pre-release freedom). Both `apps/nl-demo` and `apps/vscode` consume the same interface.

```
interface LLMClient {
  generate(prompt: string): Promise<LiveOutcome>;  // never throws
  abort(): void;                                   // idempotent
}
```

**Three implementations ship**:

| Implementation | Location | Transport | Status |
|---|---|---|---|
| `createRecordedLLMClient` | `shared/nl-cql2/clients.ts` | Hand-authored fixture map | Migrated (#190 shape → new shape) |
| `createLiveLLMClient` | `shared/nl-cql2/clients.ts` | Browser → loopback HTTP proxy | Migrated (#190 shape → new shape) |
| `createPostMessageLLMClient` | `shared/nl-cql2/clients.ts` (NEW) | VS Code webview → extension host | New in #191 |

**Invariants** (common to all implementations):
- `generate` NEVER throws. Every failure is a `LiveOutcome` with a non-`success` kind.
- `signal === aborted` or explicit `abort()` → resolves to `{ kind: "transport-error", reason: "cancelled" }`.
- No implementation sees the API key. The browser client relies on the proxy; the VS Code client relies on the extension host.
- All three delegate the actual Anthropic call into `shared/nl-cql2/providerCall.ts` (review Decision 3).

**Migration note**: the existing `LiveLLMClient` extending `LLMClient` with `abort()` becomes the only shape. The old `Promise<string>` contract and the discriminated `GenerationResultError` (`kind: "transport" \| "generation"`) collapse into: `generate()` returns `LiveOutcome`; `parseResponse()` separately turns a `success.rawResponse` into a `GenerationResult` (the #188 parsed-result type). Demo + VS Code callers both compose `generate() → parseResponse()`.
