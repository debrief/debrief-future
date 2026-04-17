# Research: NL Search in VS Code Catalog Overview

**Feature**: 191-vscode-nl-search
**Phase**: 0 (outline & research)
**Date**: 2026-04-17

Unknowns carried forward from `spec.md` Assumptions and from the Technical Context in `plan.md`. Each decision below closes one unknown so Phase 1 (design) can proceed without `NEEDS CLARIFICATION` markers.

---

## Decision 1 — Transport shape: postMessage adapter, not a local HTTP proxy

**Decision**: Inside the extension, the webview sends a typed `llmRequest` message to the extension host via the VS Code webview API; the host performs the Anthropic HTTPS call and posts an `llmResponse` back. No loopback HTTP server inside VS Code.

**Rationale**:
- VS Code webviews run under a strict CSP that blocks `fetch` to arbitrary hosts (and in practice blocks `127.0.0.1:8081` unless the user edits their own CSP, which is a non-starter for a published extension).
- The extension host already has the trust boundary we need — it owns SecretStorage, network, and the webview lifecycle.
- Re-using the proxy from `apps/nl-demo/scripts/live-proxy.mjs` as a library (not a process) avoids shipping a node-http server, port-clash risk, and a child-process lifecycle.
- The `LLMClient` contract from `shared/components/src/nl-cql2/clients.ts` is already transport-agnostic — it takes a phrase and returns an outcome. A `createPostMessageLLMClient(postMessage, onMessage)` factory is a drop-in implementation.

**Alternatives considered**:
- *Spawn the existing `live-proxy.mjs` as a child process on extension activation* — rejected: adds port allocation, process-lifecycle bugs, and a second binary surface for security review. No user-facing benefit.
- *Direct `fetch` from the webview to Anthropic* — rejected: places the API key in the webview process and exposes it in DevTools network. Violates FR-002 and spec SC-003.
- *A WebSocket or SharedWorker bridge* — rejected: overkill for a request/response workload with no streaming (the Anthropic call is a single POST; we don't stream tokens into the filter bar).

---

## Decision 2 — API key lives in VS Code SecretStorage, not user settings

**Decision**: Persist the Anthropic credential via `vscode.ExtensionContext.secrets` under the key `debrief.nlSearch.anthropicApiKey`. Settings (`debrief.nlSearch.*`) hold only the non-secret toggle, model, ceiling, and timeout. A dedicated command (`Debrief: Set Anthropic API Key`) collects the secret via `window.showInputBox({ password: true })`.

**Rationale**:
- SecretStorage is designed for this: host-OS keyring on macOS/Windows/Linux; not in settings.json; not sync'd by Settings Sync.
- Committing an API key to a shared workspace-level settings file is a well-known footgun; SecretStorage removes that path entirely.
- The webview never observes the key — the extension host reads it at request time and injects it only into the outgoing Anthropic call.
- The `Debrief: ...` command contribution makes the onboarding path obvious without requiring the user to know the settings schema.

**Alternatives considered**:
- *User settings (settings.json)* — rejected: encourages the user to commit a key to workspace settings by mistake; visible in most dotfile backups.
- *Environment variable only* — rejected: doesn't work for the GUI VS Code launcher on macOS/Windows (only inherits env from the shell that launched it), and would force every user to understand their shell environment.
- *External `.env` file* — rejected: same failure mode as workspace settings; adds a file to the repo root that invites accidental commits.

---

## Decision 3 — Cancellation is driven by the webview's `AbortController`, mirrored in the host via a request-id

**Decision**: Each `llmRequest` carries a stable `requestId` (UUID). The webview tracks the in-flight request's `AbortController`. On panel dispose, webview reload, or a new phrase submit, the webview sends an `llmCancel(requestId)` message. The extension host keeps a `Map<requestId, AbortController>` and invokes `.abort()` on receipt. An aborted Anthropic call resolves to `{ outcome: "transport-error", reason: "cancelled" }` and is dropped (no banner) so the UI shows the new request's state, not a stale cancellation banner.

**Rationale**:
- The webview owns "which request's result do I care about" — only it knows about reloads and UI state.
- The host owns "how do I tear down the HTTPS socket" — it has the `AbortController` bound to `https.request`.
- Carrying a `requestId` means we don't confuse responses across panel reloads (each new panel gets fresh IDs).
- `{ outcome: "transport-error", reason: "cancelled" }` is a first-class outcome, so all telemetry records stay uniform and the banner logic can explicitly ignore cancellations.

**Alternatives considered**:
- *Host-side timeout only, no explicit cancel* — rejected: leaves in-flight requests running (and burning credit) after the user has dismissed the panel.
- *One pending request at a time, queued in the host* — rejected: the webview's fetch-oriented mental model expects concurrency; serialising at the host adds latency on rapid re-submits and complicates the banner state machine.

---

## Decision 4 — Per-session call ceiling enforced in the host, not the webview

**Decision**: The extension host keeps a counter `callsThisActivation` reset on extension-activation. Each `llmRequest` increments before the HTTPS call; if the post-increment value exceeds `debrief.nlSearch.callCeiling` (default 50), the host returns `{ outcome: "ceiling-reached" }` without making a network call. Reload-the-window is the reset affordance; the banner tells the user exactly that.

**Rationale**:
- The host is the only place that can enforce a ceiling honestly — a rogue webview or future second panel could otherwise bypass a webview-side counter.
- Activation-scoped (not daily/monthly) avoids persisting a counter and matches how users actually work — "I've been typing for 20 minutes, I've hit 50 calls, let me reload".
- The default (50) matches the `maxCalls` default proved in #190 and keeps the two codebases aligned.

**Alternatives considered**:
- *Persistent counter across activations* — rejected: forces state-management surface (where does it live? when does it reset?) for no user benefit. Anthropic bills per call; users reload to reset anyway.
- *Webview-side counter* — rejected: trivially bypassable by opening a second Catalog Overview panel.

---

## Decision 5 — Configuration schema mirrors `live-config.json` shape from #190

**Decision**: VS Code configuration contributions:
- `debrief.nlSearch.enabled` — boolean, default `false`
- `debrief.nlSearch.model` — string, default `"claude-haiku-4-5-20251001"`
- `debrief.nlSearch.callCeiling` — number, default `50`, min `1`
- `debrief.nlSearch.timeoutMs` — number, default `12000`, min `1000`
- `debrief.nlSearch.maxResponseBytes` — number, default `262144`, min `1024`

SecretStorage key: `debrief.nlSearch.anthropicApiKey`.

**Rationale**:
- Alignment with `apps/nl-demo/live-config.json` means operators with existing familiarity know what they're configuring. Only the transport binding differs.
- Keeping `maxResponseBytes` configurable defends against runaway responses with the same belt-and-braces philosophy as #190 (FR-007 in #190).
- A single `enabled` flag is the master switch; when false the extension doesn't even read SecretStorage (FR-003 in this spec).

**Alternatives considered**:
- *Infer model from the API key* — rejected: Anthropic doesn't expose model capability per key; forces a roundtrip just to choose a default.
- *Ship only `enabled`; everything else hard-coded* — rejected: operators with tight budgets or slow networks need `callCeiling` and `timeoutMs`.

---

## Decision 6 — FilterBar stays transport-agnostic; NL mode is a prop

**Decision**: `FilterBar` accepts an optional prop:

```ts
interface FilterBarProps {
  // …existing props
  llmClient?: LLMClient;        // from shared/components/nl-cql2
  liveModeLabel?: string;       // e.g. "Live · Anthropic · claude-haiku-4-5-20251001"
  onLiveOutcome?: (outcome: LiveOutcome) => void;
}
```

When `llmClient` is present, the existing Enter handler dispatches the phrase through the `buildPrompt` + `llmClient.generate` + `parseResponse` pipeline instead of graduating to a literal title lozenge. When absent, behaviour is identical to today.

**Rationale**:
- Keeps the NL path additive — existing FilterBar consumers (non-VS-Code) are unaffected.
- Lets Storybook swap in a deterministic stub `LLMClient` for the bundled blog post demo without pulling in any VS-Code or provider code.
- The two consumers (`apps/nl-demo/demo.jsx` and VS Code's `catalogOverview.tsx`) each construct and pass their own `LLMClient` — the component doesn't know about proxies, postMessage, or Anthropic.

**Alternatives considered**:
- *Move the NL pipeline into a new `NlFilterBar` component* — rejected: duplicates the chip-management surface area; means consumers have to choose a component up front; doubles the maintenance cost.
- *React context for the LLMClient* — rejected: over-engineered for a single prop; context is only justified when many descendants need the value.

---

## Decision 7 — Default provider is Claude; architecture does not preclude a future second provider

**Decision**: v1 ships Claude-family only. The `LLMClient` interface already abstracts "generate(phrase) → outcome", so a future OpenAI / Azure / local-model client slots in without changing FilterBar, StacBrowser, or the message protocol. No feature flag for provider choice in v1; the `model` setting implicitly identifies the family.

**Rationale**:
- Matches #190's transport work and avoids forking the prompt engineering for two model families in one feature.
- Keeps the user-facing settings surface small (one setting, not a provider dropdown).
- The architectural commitment to `LLMClient` means provider expansion is a change in one place (new factory), not a rewrite.

**Alternatives considered**:
- *Ship with a provider setting enumerating Claude / OpenAI / ollama* — rejected: untested providers in v1 dilute the quality bar and the prompt (which was hand-tuned for Claude's JSON-following behaviour).
- *Pluggable-at-runtime via URL* — rejected: would require per-provider request/response adapters; scope explosion.

---

## Decision 8 — Telemetry mirrors #190's structured log; no prompt/response body ever captured

**Decision**: On each outcome the host emits one structured line via the existing `LogService` channel (`[nl-search/live]`), with: ISO timestamp, provider, model, outcome, `durationMs`, `responseBytes`, `callIndex`. No `prompt`, no `rawResponse`, no phrase text. The webview receives the same structured object (minus the raw response body) via `llmResponse` and uses it to drive banners + indicator.

**Rationale**:
- Matches #190's log shape (verified in browser DevTools console during verification — see `specs/190-live-llm-transport/evidence/`).
- Satisfies FR-007 (structured record without capturing prompt/response content) and spec SC-003 (key/body not present in logs).
- One log format across the live-transport feature set means one mental model for operators.

**Alternatives considered**:
- *Capture the phrase for debugging* — rejected: analyst phrases are plausibly sensitive (operation names, exercise identifiers) and belong in user notes, not extension logs.
- *Skip the log entirely* — rejected: without a structured record operators have no way to answer "did the extension make calls, and with what latency?" — a basic operability question.

---

## Addendum — /speckit.review outcomes (2026-04-17)

The review produced 15 decisions that refine the eight above. Summary in the order they surface in the plan:

| # | Review decision | Effect on the design above |
|---|---|---|
| 1 | **Migrate `LLMClient` to one shape** (Article XIV pre-release freedom) | Supersedes the implicit assumption that the new VS Code client would coexist with the #188 `Promise<string>` shape. The interface in `shared/nl-cql2/types.ts` is replaced by `generate(prompt): Promise<LiveOutcome>`; `apps/nl-demo` migrates in the same PR. |
| 2 | **No new `contracts/messages.ts`** — extend existing webview union | Supersedes Decision 1 above's unstated assumption that a fresh contracts file was needed. Four variants (`nlGenerate`, `nlAbort`, `nlOutcome`, `nlConfig`) land in `apps/vscode/src/webview/messages.ts` using the repo's existing `camelCase` tag convention and `RequestMessage`/`ResponseMessage` bases. |
| 3 | **Extract `providerCall.ts` as the shared core** | Refines Decision 1 above: the "port proxy logic in-process" hand-wave is replaced with an explicit shared module in `shared/nl-cql2/providerCall.ts`. Both `live-proxy.mjs` and `apps/vscode/src/services/llmProxy.ts` delegate into it. One test surface (`providerCall.test.ts`), one security review surface. |
| 4 | **`client.abort()`, not `close()`** (and not a caller-passed signal) | Refines Decision 3 above: the implementation owns the signal internally; FilterBar calls `abort()` on supersession. Matches the existing `LiveLLMClient.abort()` already shipped in #190. |
| 5 | **One discriminated `LiveConfig`** | Supersedes the draft `LiveNlConfig` in data-model.md. A single type with `transport: "browser-proxy" \| "vscode-host"` tag serves both consumers. Shared fields at top level; variant-specific fields under the discriminator. |
| 6 | **One canonical `LiveOutcome` union** | `ceiling-reached` replaces `usage-cap-reached` (clearer name); `malformed-response` absorbs `oversize-response` via a nested `reason` field; `not-configured` is the new variant for enabled-but-no-key. |
| 7 | **Explicit test + inline doc for "lozenges survive failure"** | Refines Decision 6 above: spec FR-006 / SC-005 were asserted but untested. `FilterBar.nl.test.tsx` adds a dedicated test; a comment above the NL handler in FilterBar.tsx documents the invariant. |
| 8 | **Drop `close()`** | `abort()` is idempotent and releases listeners. One well-named method per Article XV. |
| 9 | **Dedicated `providerCall.test.ts`** | Refines Decision 3 above: the extracted core is security-sensitive and gets its own unit suite with mocked `https.request` covering every outcome class, oversize truncation, and abort-mid-stream. |
| 10 | **Add `not-configured` + `ceiling-reached` to the VS Code E2E matrix** | Refines Decision 4 above: the per-session ceiling and enabled-without-key paths are both quiet short-circuits that must be exercised end-to-end to prove the banner wiring. |
| 11 | **Cancellation-race tested at both layers** | Refines Decision 3 above: `FilterBar.nl.test.tsx` covers the call-site supersession; `providerCall.test.ts` covers the HTTPS abort-mid-stream. Single most likely production defect category. |
| 12 | **FilterBar regression gate declared** | New: existing `useFilterBar.test.ts` gains one assertion proving the no-`llmClient`-prop path is byte-identical to today. |
| 13 | **Lazy-init `llmProxy`** | New: `activate()` registers only the message handler (cheap); `llmProxy` constructs on first `nlGenerate`. Users who never enable the feature pay zero activation cost. |
| 14 | **Cache API key in host memory, invalidate on change event** | New: `context.secrets.get()` can cost 50–200 ms on OS keyrings. Cache with `context.secrets.onDidChange` listener. Data-model.md's "read on every submission" claim is superseded. |
| 15 | **`finally`-delete `Map<requestId, AbortController>` entries** | New: entries removed on success, failure, and abort. Prevents unbounded growth over a session. |

Four deferred items are tracked as BACKLOG.md entries #192–#195.

