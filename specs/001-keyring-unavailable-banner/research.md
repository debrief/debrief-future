# Research: NL Search — Keyring-Unavailable Distinct Banner

**Feature**: 001-keyring-unavailable-banner
**Date**: 2026-04-18
**Prerequisite**: Parent spec #191 (VS Code NL search) — this feature extends its `LiveOutcome` union

Spec Input had zero `NEEDS CLARIFICATION` markers. This research file resolves the design choices a reader would otherwise have to infer from the spec + the #191 context, and records the decisions for future reference.

---

## Decision 1 — Detection: classify every thrown exception as `keyring-unavailable`

**Decision**: A throw from `context.secrets.get()` produces `kind: "keyring-unavailable"`. A successful return of `undefined` / empty string produces the existing `kind: "not-configured", reason: "no-key"`. No attempt is made to subclassify keyring exceptions by OS error code.

**Rationale**: VS Code's `SecretStorage` API does not expose a typed error union — callers get a generic `Error`. Any heuristic over `.message` is brittle across Linux desktop variants (gnome-keyring vs libsecret vs KWallet), across VS Code releases, and across localised OS strings. The spec's FR-001 is deliberately phrased around the throw/return distinction rather than the exception shape. Over-classifying would reintroduce exactly the ambiguity we are trying to remove.

**Alternatives considered**:
- *Inspect `err.name` / `err.code` to separate "locked" from "missing backend" from "permission denied"*: rejected. Requires bespoke fixtures per distro; the fix the user needs is the same regardless ("unlock or install a keyring"); banner copy can reference multiple causes in one line.
- *Treat only a known whitelist of keyring-ish messages as `keyring-unavailable`, fall through to a new `unknown-secrets-error` kind for anything else*: rejected as scope creep. FR-001 explicitly routes any throw to `keyring-unavailable`; "fail loud, toward the least misleading message" is the spec's stated edge-case posture.

---

## Decision 2 — Placement: wrap the secrets read in a host-side helper, not in `llmProxy`

**Decision**: Introduce a thin `apps/vscode/src/services/secretsAccess.ts` module exporting `readAnthropicApiKey(context: ExtensionContext): Promise<KeyReadResult>` where `KeyReadResult = { kind: "ok"; key: string } | { kind: "empty" } | { kind: "keyring-unavailable" }`. `llmProxy.ts` calls this helper and maps its result onto the `LiveOutcome` union.

**Rationale**:
- Keeps `llmProxy.ts` focused on provider-call orchestration — it never touches `try/catch` around the VS Code secrets API directly.
- Gives us one obvious place to add a test-only toggle for E2E (`_forceSecretsThrow`), guarded by `DEBRIEF_E2E=true`, without polluting `llmProxy`.
- The helper is reusable if future features (e.g., #196 non-Anthropic providers) need the same discipline.
- Unit-testable in isolation against a mocked `SecretStorage`.

**Alternatives considered**:
- *Inline try/catch inside `llmProxy.ts`*: rejected — tightly couples secrets failure classification to NL-search-specific code; pollutes `llmProxy` with a test-seam toggle.
- *A full "credentials service" abstraction*: rejected as over-engineering per the "don't add abstractions beyond what the task requires" guidance. A 30-line helper with one call-site is not an abstraction worth building yet.

---

## Decision 3 — Log shape: add `kind` value, log nothing from the exception itself

**Decision**: Extend the structured log record produced by `llmProxy` with `kind: "keyring-unavailable"` as a new discriminated value. Record `ts`, `durationMs: 0`, `responseBytes: 0`, `model: <configured-model>`. Do NOT record the exception message, stack, or any OS-level detail.

**Rationale**: Article III (Data Sovereignty) and Article X (Security). VS Code secret-store exceptions on Linux can contain user paths, daemon-socket paths, and occasional fragments of key names; nothing here is safe to persist. Operators who need more detail already have access to the VS Code developer log — the structured log is deliberately metadata-only.

**Alternatives considered**:
- *Log a hashed / redacted form of `err.message` for diagnosis*: rejected — a redaction policy adds a maintenance burden and a risk surface; the classification is the useful datum.
- *Add an `osPlatform` field so operators can see which platform the failure happened on*: rejected for v1 but noted as a cheap follow-on if operator feedback asks for it.

---

## Decision 4 — Banner copy: one copy key per platform, selected by `os.platform()` at render time

**Decision**: Three copy keys — `banner.keyringUnavailable.linux`, `banner.keyringUnavailable.macos`, `banner.keyringUnavailable.windows` — resolved in the FilterBar `case "keyring-unavailable"` branch using the platform hint the extension host sends alongside the outcome (added as a single new field on `LiveKeyringUnavailable`). An explicit `unknown` / fallback variant exists for environments we cannot identify (containers, headless tests).

**Rationale**:
- Article XI (Internationalisation): copy must externalise. One key per platform remains externalisable.
- Analysts on Linux overwhelmingly dominate the target population for this bug; platform-specific phrasing ("unlock your gnome-keyring / KWallet") is materially more actionable than generic "unlock your OS credential store".
- Resolving the platform hint in the outcome (host-side) rather than in the webview keeps the architectural boundary clean — the webview never calls `process.platform`.

**Alternatives considered**:
- *Single copy string*: rejected — it is less helpful to a Linux analyst at the exact moment they need help, for negligible code savings.
- *Webview detects platform via `navigator.userAgent`*: rejected — crosses the boundary (Article IV), less reliable than host-side `os.platform()`.

---

## Decision 5 — Retry semantics: re-run the full NL path, counted against the call ceiling only on success

**Decision**: The banner's Retry button re-submits the last phrase through the same code path as a fresh submission. The retry attempt's `context.secrets.get()` re-runs, and if the keyring is now open the submission proceeds as a normal live call. The call-ceiling counter increments only when the call actually reaches the provider — a retry that again fails with `keyring-unavailable` does not consume a ceiling slot.

**Rationale**:
- The keyring-unavailable path made zero provider calls, so charging the retry to the ceiling would penalise the user for an OS configuration problem outside their tool-use.
- Implementation is trivial: the existing #191 ceiling increment happens inside `providerCall.ts`, which is only reached after the key read succeeds.

**Alternatives considered**:
- *Retry bypasses the secrets read entirely and uses a cached key*: rejected — defeats the purpose of the feature; caching in memory was explicitly discussed in #191 (review Decision 14) as an in-memory cache invalidated on `secrets.onDidChange`, which does not help here because the failure is reading from storage.

---

## Decision 6 — Outcome kind name: `keyring-unavailable` (hyphenated, not `keyringUnavailable`)

**Decision**: The new union member's discriminator value is exactly `"keyring-unavailable"`, matching the existing hyphenated style used across the #191 union (`auth-failure`, `rate-limit`, `provider-error`, `transport-error`, `malformed-response`, `not-configured`, `ceiling-reached`).

**Rationale**: Consistency with the sibling kinds makes the exhaustive-switch grep-friendly and the log-filter names stable. No ambiguity with the `LiveKeyringUnavailable` interface name (PascalCase) that wraps it.

**Alternatives considered**:
- *`secrets-unavailable`*: rejected — less recognisable to users reading logs; the common vocabulary in user forums and Linux docs is "keyring".
- *`credential-store-unavailable`*: rejected — more accurate cross-platform but less recognisable to the affected audience (Linux analysts).

---

## Decision 7 — E2E forcing mechanism: dev-only command behind `DEBRIEF_E2E=true`

**Decision**: Expose a one-shot `debrief.nlSearch._forceSecretsThrow` command registered only when `process.env.DEBRIEF_E2E === "true"`. Playwright calls this command before submitting the NL phrase; the next `readAnthropicApiKey()` throws a synthetic `Error("forced e2e keyring throw")`; any subsequent call resumes normal behaviour. The command never ships in production builds because the env guard prevents registration.

**Rationale**:
- Gives us a real end-to-end trigger for the `keyring-unavailable` path without depending on a real locked keyring in CI (not feasible in containerised Chromium runs).
- The command is invisible outside E2E (unregistered at activation time), so it does not show up in the VS Code command palette for end users.
- Keeps the seam co-located with the feature's wrapper (`secretsAccess.ts`), not inside `llmProxy` or FilterBar.

**Alternatives considered**:
- *Mock `context.secrets` directly in the test harness*: rejected — requires patching the VS Code host object, fragile across VS Code versions.
- *Unit-test only, skip E2E for this variant*: rejected — the spec's SC-001 through SC-003 require end-to-end evidence that the banner (not just the outcome value) is correct.

---

## Decision 8 — Narrowing `not-configured`: keep existing variant shape, keep both `reason` values

**Decision**: The existing `LiveNotConfigured` interface is unchanged — `kind: "not-configured"` with `reason: "disabled" | "no-key"` both remain. This feature only narrows *when* `not-configured` is produced (never on throw), not its shape.

**Rationale**: Minimum-diff principle. The existing callers (FilterBar branch, structured log, telemetry) keep working; only the host-side classification rule changes. Anyone reading the log can still distinguish "feature off" from "no key stored" — both remain meaningful.

**Alternatives considered**:
- *Collapse `not-configured` to just "disabled" and introduce `no-key` as its own kind alongside `keyring-unavailable`*: rejected — larger surface-area change for no additional user value; the existing `reason` discriminator already covers the distinction for operators.

---

## Decision 9 — Documentation: a single troubleshooting page, linked from the banner

**Decision**: Add `docs/nl-search-troubleshooting.md` with three short sections (Linux / macOS / Windows) explaining how to unlock or install the platform keyring. The banner contains a "Learn more" link pointing at this page's Linux / macOS / Windows anchor based on the platform the outcome carries.

**Rationale**:
- Meets Article VIII (user-facing docs required for any feature exposed to users).
- Keeps the banner itself short (one sentence of guidance + Retry + Learn more), respecting the pre-feature banner UX.
- Anchors make the link actionable: a Linux user lands on the Linux section directly.

**Alternatives considered**:
- *No docs, just banner copy*: rejected — banner can only fit a one-liner; fixes vary per distro.
- *Inline the platform-specific fix into the banner itself*: rejected — pushes the banner into a help-card shape, visually inconsistent with sibling banners.

---

## Summary of resolved design parameters

| Parameter | Value |
|---|---|
| Outcome `kind` value | `"keyring-unavailable"` |
| Outcome shape | `{ kind, platform: "linux"\|"macos"\|"windows"\|"unknown", durationMs: 0 }` |
| Detection rule | any throw from `context.secrets.get()` |
| Not-configured shape | unchanged (`reason: "disabled" \| "no-key"`) |
| Banner copy keys | 3 platform-specific + 1 fallback (`banner.keyringUnavailable.{linux,macos,windows,unknown}`) |
| Banner affordances | Primary: Retry. Secondary: "Learn more" (links to troubleshooting doc anchor). |
| Retry call-ceiling debit | only on successful provider call |
| Log shape | reuse existing structured-log record with new `kind` value |
| Exception content in log | NEVER (message, stack, OS details all excluded) |
| Test-only throw trigger | `debrief.nlSearch._forceSecretsThrow` command, gated by `DEBRIEF_E2E=true` |
| New troubleshooting doc | `docs/nl-search-troubleshooting.md` (3 sections + banner anchor link) |

No open `NEEDS CLARIFICATION` items remain. Ready for Phase 1.
