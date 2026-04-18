# Data Model: NL Search — Keyring-Unavailable Distinct Banner

**Feature**: 001-keyring-unavailable-banner
**Date**: 2026-04-18

This feature is a TypeScript-interaction-contract change, not a LinkML / Pydantic / persistent-data change. Nothing is serialised to disk, catalogued in STAC, or sent over the wire to a third party. Everything below lives inside the VS Code extension process + its webview.

---

## Entity 1 — `LiveKeyringUnavailable` (NEW)

**Represents**: The outcome of attempting to read the stored Anthropic API key from the VS Code `SecretStorage` API when that call throws. A peer of the existing `LiveNotConfigured`, `LiveAuthFailure`, `LiveTransportError` etc. inside the #191 `LiveOutcome` discriminated union.

**Shape**:

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | literal `"keyring-unavailable"` | yes | Discriminator. |
| `platform` | literal `"linux" \| "macos" \| "windows" \| "unknown"` | yes | Resolved host-side via `os.platform()`. Drives banner copy selection. Values map: `"linux"` → Linux, `"darwin"` → `"macos"`, `"win32"` → `"windows"`, anything else → `"unknown"`. |
| `durationMs` | literal `0` | yes | Constant. The outcome is raised before any network / provider I/O. |

**Validation rules**:
- `kind` MUST be the exact string `"keyring-unavailable"` — enforced by TypeScript literal type and by the exhaustive-switch `never` assertion in FilterBar's outcome dispatch.
- `platform` MUST be one of the four literal values. Any unrecognised `os.platform()` return maps to `"unknown"`; the outcome never carries the raw string.
- `durationMs` MUST be `0`. Enforces "no network was issued" at the type level.

**What this entity does NOT carry**:
- The original exception (no `error`, no `cause`, no `message` field).
- Any OS-level detail (distro, user, path, daemon socket).
- The prompt, the key, or any key fragment.

These omissions are load-bearing: they are the reason this outcome is safe to log (Article III / X).

**State transitions**: None. Each outcome value is produced once per submission and never mutates.

---

## Entity 2 — `LiveOutcome` (EXTENDED — #191 union + one member)

**Before (post-#191)**:
```text
LiveOutcome =
  | LiveSuccess
  | LiveAuthFailure
  | LiveRateLimit
  | LiveProviderError
  | LiveTransportError
  | LiveTimeout
  | LiveMalformedResponse
  | LiveNotConfigured
  | LiveCeilingReached
```

**After (this feature)**:
```text
LiveOutcome =
  | LiveSuccess
  | LiveAuthFailure
  | LiveRateLimit
  | LiveProviderError
  | LiveTransportError
  | LiveTimeout
  | LiveMalformedResponse
  | LiveNotConfigured
  | LiveCeilingReached
  | LiveKeyringUnavailable     // NEW
```

**Invariant — exhaustive switch**: Every `switch (outcome.kind)` in the codebase (FilterBar banner dispatch, `llmProxy` log emission, `nl-cql2/clients.ts` passthrough) MUST end with a `default` branch that assigns the narrowed value to `const _exhaustive: never = outcome;`. CI's `tsc --noEmit` will flag any missing `case` on the new kind.

**Invariant — narrowing `LiveNotConfigured`**: The set of conditions that produce `LiveNotConfigured` is narrowed — it NO LONGER covers the "thrown secrets access" case. This is a semantic narrowing, not a type change; `LiveNotConfigured`'s shape is unchanged.

---

## Entity 3 — `KeyReadResult` (NEW — internal to `apps/vscode/src/services/secretsAccess.ts`)

**Represents**: The return type of the new internal helper `readAnthropicApiKey(context)`. Never crosses the webview boundary. Exists only to isolate the try/catch around `context.secrets.get()` so `llmProxy` does not contain exception-handling logic.

**Shape**:

| Variant | `kind` | Additional fields | Maps to `LiveOutcome` member |
|---|---|---|---|
| ok | `"ok"` | `key: string` *(non-empty)* | proceeds to provider call; outcome depends on provider |
| empty | `"empty"` | — | `LiveNotConfigured` with `reason: "no-key"` |
| keyring-unavailable | `"keyring-unavailable"` | — | `LiveKeyringUnavailable` with host-resolved `platform` |

**Validation rules**:
- The `ok` variant's `key` is a non-empty string. An empty-string return from `context.secrets.get()` produces `empty`, not `ok`.
- `keyring-unavailable` is produced iff the secrets read threw. The helper does not inspect the exception content.

**State transitions**: none. One call, one result.

---

## Entity 4 — `TransportCallRecord` (EXTENDED — one new `outcome` value)

**Represents**: The structured log line emitted by `llmProxy` per submission (reused from #191).

**Change**: The `outcome` field's union gains one string value: `"keyring-unavailable"`. All other fields are unchanged and continue to obey their existing constraints.

| Field | Type | Change |
|---|---|---|
| `ts` | ISO-8601 string | unchanged |
| `provider` | `"anthropic"` | unchanged |
| `model` | string | unchanged |
| `durationMs` | number | `0` on keyring-unavailable |
| `outcome` | string union | **+ `"keyring-unavailable"`** |
| `responseBytes` | number \| null | `null` on keyring-unavailable |
| `callIndex` | number | unchanged |

**Validation rules (new or reaffirmed)**:
- A `TransportCallRecord` with `outcome: "keyring-unavailable"` MUST have `durationMs === 0` and `responseBytes === null`.
- No exception message, stack, platform OS string, or environment variable value is written to any field of this record.

---

## Relationships

```text
secrets.get()                 context.secrets throws or returns
      │                                     │
      ▼                                     ▼
secretsAccess.ts           ────▶     KeyReadResult (internal)
      │
      ├──  { kind: "ok", key }   ─────▶   providerCall()  ──▶  LiveSuccess / LiveAuthFailure / …
      │
      ├──  { kind: "empty" }     ─────▶   LiveNotConfigured { reason: "no-key" }
      │
      └──  { kind: "keyring-unavailable" } ─▶ LiveKeyringUnavailable { platform, durationMs: 0 }


LiveOutcome  ─postMessage─▶  webview LLMClient (clients.ts)  ─▶  FilterBar banner dispatch
     │
     └──  TransportCallRecord ─▶  structured log (console.info "[nl-search]", …)
```

**Key invariant captured in the diagram**: `LiveKeyringUnavailable` is produced on the host side, passes through the webview untouched, and fans out to exactly two consumers — the FilterBar banner dispatch (user-visible) and the structured log (operator-visible). No third consumer exists; no network call is issued on this path.

---

## What is deliberately NOT in the data model

- **No `cause` / `error` field on `LiveKeyringUnavailable`.** The underlying exception is dropped at the try/catch boundary by design (Article III / X).
- **No change to `LiveConfig`, `BrowserLiveConfig`, `VscodeLiveConfig`, or any settings schema.** The new outcome does not require a new setting.
- **No new Zustand store field, no new session-state persisted value.** The banner state is transient, owned by the existing FilterBar local state (same pattern as every other banner variant).
- **No new LinkML / Pydantic / JSON-schema artefact.** Article II does not apply.

---

## Summary

One new TypeScript interface (`LiveKeyringUnavailable`), one new union member (`LiveOutcome | LiveKeyringUnavailable`), one new internal helper type (`KeyReadResult`), and one extended log-field union (`TransportCallRecord.outcome`). Everything else is unchanged. The data-model footprint of this feature is intentionally minimal because the value comes from *semantic narrowing*, not new data.
