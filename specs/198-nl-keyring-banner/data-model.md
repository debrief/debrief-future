# Data Model — `keyring-unavailable` Outcome (#198)

This document captures the **single union-variant addition** introduced by
#198, plus the rules used to populate the optional `platformHint` field and
the backwards-compatibility implications for downstream consumers.

> **Spec sources**: see `spec.md` (FR-001 through FR-010), `plan.md`
> (Decisions 1–4), and `contracts/live-outcome-addition.ts` (canonical
> diff).

## 1. The new variant

### 1.1 Shape

```typescript
interface LiveKeyringUnavailable {
  readonly kind: "keyring-unavailable";
  readonly platformHint?: "linux" | "macos" | "windows" | "unknown";
  readonly durationMs: 0;
}
```

| Field          | Type                                           | Required | Source                                |
|----------------|------------------------------------------------|----------|----------------------------------------|
| `kind`         | `"keyring-unavailable"`                        | yes      | Discriminator literal                  |
| `platformHint` | `"linux"\|"macos"\|"windows"\|"unknown"`       | no       | `detectPlatformHint()` in `llmProxy.ts` |
| `durationMs`   | `0`                                            | yes      | Constant — failure is host-side        |

The variant lives in `shared/components/src/nl-cql2/types.ts` alongside
the eight existing `LiveOutcome` variants introduced by #190/#191.

### 1.2 Detection rule

```typescript
try {
  const value = await context.secrets.get(SECRET_KEY);
  // resolved-with-value     → proceed with provider call
  // resolved-with-undefined → { kind: "not-configured", reason: "no-key" }
} catch {
  // promise rejected (ANY reason) → { kind: "keyring-unavailable", … }
}
```

The rule is purely "was the `Promise` rejected?" — no `instanceof Error`
check, no error-message string matching, no error-code inspection. Any
rejection — including non-Error throws (string, undefined, DOMException) —
classifies as `keyring-unavailable`. (Decision 1; spec edge-case
"Non-Error thrown value".)

### 1.3 `platformHint` selection rule

`detectPlatformHint()` in `apps/vscode/src/services/llmProxy.ts`:

| `process.platform` | `platformHint` | Banner secondary sentence                        |
|--------------------|----------------|--------------------------------------------------|
| `"linux"`          | `"linux"`      | "Unlock your gnome-keyring or KWallet and try again." |
| `"darwin"`         | `"macos"`      | "Unlock Keychain Access and try again."          |
| `"win32"`          | `"windows"`    | "Check Credential Manager service and try again." |
| anything else      | `"unknown"`    | (no hint paragraph rendered)                     |

The headline copy in `FilterBar.tsx` is OS-neutral regardless of
`platformHint` (FR-010). Only the optional secondary hint paragraph
varies per platform.

## 2. Where the variant is produced

The variant is produced in **exactly two places** inside
`apps/vscode/src/services/llmProxy.ts`:

1. **First-read on cache miss** (`readApiKey()`) — the current `await
   vscodeApi.secrets.get(SECRET_KEY)` is wrapped in a `try/catch`. On
   throw/reject, `handleGenerate` resolves with the new outcome. (T010.)
2. **Cache-refresh inside `onDidChange`** (the `secretsChangeListener`
   callback) — wraps the re-read in a `try/catch` that **leaves the
   existing `cachedKey` intact** on throw (FR-008). The on-failure
   `cachedKey` is unchanged; the next user submission will re-attempt the
   read, which is when `LiveKeyringUnavailable` would surface to the UI
   if the keyring is still down. (T011.)

No other producer exists. Tests in `apps/vscode/tests/unit/llmProxy.test.ts`
hold this surface invariant.

## 3. Where the variant is consumed

### 3.1 FilterBar (`shared/components/src/FilterBar/FilterBar.tsx`)

The `nlBannerMessage` and `nlBannerAction` `switch` statements gain one
new `case "keyring-unavailable":` branch each:

- `nlBannerMessage` → returns the OS-neutral headline + body, with an
  optional appended hint sentence selected by `outcome.platformHint`.
- `nlBannerAction` → returns the primary "Help: unlock your keyring"
  affordance (kind `'help'`, new) and the secondary "Open settings"
  affordance.

The exhaustive `switch` enforces that any future omission becomes a
TypeScript error (per Constitution Article XV).

### 3.2 Telemetry (`TransportCallRecord`)

`TransportCallRecord.outcome` is typed as `LiveOutcome["kind"]`. Adding
the new variant **automatically extends the literal-string union** that
`outcome` accepts; no schema migration is required (FR-009).

A simulated log-review test in T050 asserts that a record carrying
`outcome: "keyring-unavailable"` is countable and filterable
independently of records carrying `outcome: "not-configured"`.

### 3.3 Other consumers

The browser-side `nl-demo` mode produces `LiveOutcome` from a different
transport (the live-proxy sidecar) that does not touch
`SecretStorage` and therefore never produces `LiveKeyringUnavailable`.
That consumer remains unchanged; the new variant is unreachable along
the browser-proxy path by construction.

## 4. Backwards compatibility

| Consumer pattern                              | Effect of adding the variant                          |
|-----------------------------------------------|-------------------------------------------------------|
| Exhaustive `switch (outcome.kind)` (no default) | Compile-time error until a branch is added — desired (FR-005, FR-009). |
| `switch` with a `default` clause              | Compiles unchanged; new outcome falls through `default`. Acceptable for log/audit consumers because the literal `"keyring-unavailable"` is itself the persistable artefact. |
| Pattern-matching helpers (e.g. `outcome.kind === 'success'`) | Unchanged — no existing literal is removed. |

## 5. Wire-protocol mirror

`apps/vscode/src/webview/messages.ts::NlLiveOutcome` mirrors `LiveOutcome`
structurally (per #191's existing pattern). The same single variant
addition is duplicated there to keep the webview message protocol
self-contained without pulling the full `nl-cql2` graph into every
consumer. The duplication is small and intentional; if the two ever drift
by more than this single new variant, exhaustive-`switch` consumers in
the extension host (`extension.ts`) will surface the drift at type-check
time.
