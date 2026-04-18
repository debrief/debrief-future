# Contract Delta — `shared/components/src/nl-cql2/types.ts` (or equivalent)

**Feature**: 001-keyring-unavailable-banner
**Baseline**: Parent spec #191 contract at `specs/191-vscode-nl-search/contracts/llm-client.ts`
**Audience**: Implementer. This file records the exact TypeScript surface change the feature requires, expressed as a diff against #191's contract.

This feature introduces NO new public interfaces other than the ones shown here. Factory signatures (`CreateLiveLLMClient`, `CreatePostMessageLLMClient`), `LLMClient.generate`, and `ProviderCall` are unchanged.

---

## 1. Extend the `LiveOutcome` union

```diff
 export type LiveOutcome =
   | LiveSuccess
   | LiveAuthFailure
   | LiveRateLimit
   | LiveProviderError
   | LiveTransportError
   | LiveTimeout
   | LiveMalformedResponse
   | LiveNotConfigured
-  | LiveCeilingReached;
+  | LiveCeilingReached
+  | LiveKeyringUnavailable;   // NEW — distinct from LiveNotConfigured; host-only producer
```

## 2. Introduce `LiveKeyringUnavailable`

```ts
/**
 * Raised when the VS Code SecretStorage API throws while reading the stored
 * API key (locked / missing / misconfigured OS keyring). Distinct from
 * `LiveNotConfigured` which covers "feature disabled" and "no key stored"
 * — those two produce user-actionable settings guidance; this one produces
 * "unlock your OS keyring" guidance.
 *
 * Produced exclusively by the host-side secrets access helper
 * (`apps/vscode/src/services/secretsAccess.ts`). The webview LLMClient
 * propagates this outcome unchanged; FilterBar routes it to the
 * keyring-unavailable banner variant. No network I/O is ever issued on
 * this path — `durationMs` is constant `0`.
 *
 * The underlying exception is DROPPED at the host-side try/catch boundary
 * and never crosses into this outcome value. See Decision 3 in research.md
 * (Article III Data Sovereignty, Article X Security).
 */
export interface LiveKeyringUnavailable {
  readonly kind: "keyring-unavailable";
  /**
   * Host-resolved platform hint. Drives banner-copy selection on the
   * webview side. Maps from `os.platform()`:
   *   "linux"   ← "linux"
   *   "darwin"  → "macos"
   *   "win32"   → "windows"
   *   other     → "unknown"
   *
   * The raw `os.platform()` value never leaves the host.
   */
  readonly platform: "linux" | "macos" | "windows" | "unknown";
  readonly durationMs: 0;
}
```

## 3. `LiveNotConfigured` — unchanged shape, narrowed producer

`LiveNotConfigured` keeps its existing two-reason discriminator. The CHANGE is in who produces it: the secrets-read throw path now produces `LiveKeyringUnavailable` instead of being folded into `LiveNotConfigured`.

```ts
// UNCHANGED shape:
export interface LiveNotConfigured {
  readonly kind: "not-configured";
  readonly reason: "disabled" | "no-key";
  readonly durationMs: 0;
}
```

Semantic contract change (documented, type-identical):

- BEFORE: `LiveNotConfigured` was produced when `enabled === false`, when no key had been stored, AND when a secrets read threw.
- AFTER: `LiveNotConfigured` is produced ONLY when `enabled === false` OR when `context.secrets.get()` returned an empty / absent value. Any throw routes to `LiveKeyringUnavailable`.

## 4. `TransportCallRecord` — extend the `outcome` union

The structured log record from `apps/vscode/src/services/llmProxy.ts` gains one value in its `outcome` discriminator. No new fields.

```diff
 export interface TransportCallRecord {
   readonly ts: string;
   readonly provider: "anthropic";
   readonly model: string;
   readonly durationMs: number;
   readonly outcome:
     | "success"
     | "auth-failure"
     | "rate-limit"
     | "provider-error"
     | "transport-error"
     | "timeout"
     | "malformed-response"
     | "not-configured"
-    | "ceiling-reached";
+    | "ceiling-reached"
+    | "keyring-unavailable";   // NEW
   readonly responseBytes: number | null;
   readonly callIndex: number;
 }
```

**Invariants on the new outcome value**:
- `durationMs === 0`
- `responseBytes === null`
- No exception content, stack, or OS detail recorded in any field.

## 5. Internal helper contract — `readAnthropicApiKey` (host-only, NOT exported across the webview boundary)

```ts
// apps/vscode/src/services/secretsAccess.ts

export type KeyReadResult =
  | { readonly kind: "ok"; readonly key: string }            // non-empty string
  | { readonly kind: "empty" }                                // undefined / empty return
  | { readonly kind: "keyring-unavailable" };                 // threw

/**
 * Reads the stored Anthropic API key from `context.secrets`. Classifies
 * the three possible outcomes without ever exposing the underlying
 * exception. The caller (`llmProxy`) maps each variant onto the matching
 * `LiveOutcome` member.
 *
 * This helper is the single chokepoint for `context.secrets.get()` in
 * the NL-search path. Any future reader (e.g., a #196 non-Anthropic
 * provider) should reuse it.
 */
export async function readAnthropicApiKey(
  context: ExtensionContext
): Promise<KeyReadResult>;
```

## 6. Test-only toggle (dev/E2E surface — NOT public API)

Registered only when `process.env.DEBRIEF_E2E === "true"`:

```ts
// apps/vscode/src/services/secretsAccess.ts

/**
 * E2E TEST SEAM — not part of the public contract. Registered via VS Code
 * command `debrief.nlSearch._forceSecretsThrow` under the DEBRIEF_E2E=true
 * env guard. One-shot: the next readAnthropicApiKey() call throws; after
 * that, behaviour returns to normal.
 *
 * NEVER reachable in production builds because the command is not
 * registered when DEBRIEF_E2E is absent.
 */
export function armForceSecretsThrowOnce(): void;
```

## 7. Exhaustive-switch obligation

Every existing consumer of `LiveOutcome` MUST add a `case "keyring-unavailable":` branch before its `default`. The `default` MUST contain:

```ts
default: {
  const _exhaustive: never = outcome;
  return _exhaustive;
}
```

This is already the pattern established by #191 — the obligation is to add the new case, not to restructure the switches.

Consumers updated in this feature:
- `apps/vscode/src/services/llmProxy.ts` (log-record assembly)
- `shared/components/src/nl-cql2/clients.ts` (webview LLMClient — passthrough, no logic change needed beyond the case)
- `shared/components/src/FilterBar/FilterBar.tsx` (banner dispatch — new variant rendered)

---

## Surface-area check

| Contract element | Change |
|---|---|
| `LiveOutcome` union | +1 member (`LiveKeyringUnavailable`) |
| `LiveKeyringUnavailable` interface | NEW |
| `LiveNotConfigured` shape | UNCHANGED (producer narrowed) |
| `TransportCallRecord.outcome` union | +1 value (`"keyring-unavailable"`) |
| `LLMClient.generate` | UNCHANGED |
| `LLMClient.abort` | UNCHANGED |
| `ProviderCall` | UNCHANGED |
| `CreateLiveLLMClient` | UNCHANGED |
| `CreatePostMessageLLMClient` | UNCHANGED |
| `KeyReadResult` (host-internal) | NEW |
| `readAnthropicApiKey` (host-internal) | NEW |
| `armForceSecretsThrowOnce` (host-internal, dev-only) | NEW |

Total externally-visible additions: 1 interface, 1 union member, 1 log-field value. Everything else is host-internal or test-only.
