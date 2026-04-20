# Feature Specification: NL Search — Keyring-Unavailable Distinct Banner

**Feature Branch**: `198-nl-keyring-banner`
**Created**: 2026-04-18
**Status**: Draft
**Input**: Backlog #198 — "[E10] NL search — keyring-unavailable distinct banner. When `context.secrets.get()` throws (locked/missing OS keyring on Linux), surface a specific `keyring-unavailable` outcome + banner rather than folding it into the generic `not-configured` path; different diagnosis (unlock keyring vs re-enter key)."

## Overview

The parent NL-search feature (#191) classifies "enabled, but we cannot reach a working API key" as a single `not-configured` outcome, surfaced as a banner telling the analyst to open settings and set their API key. That conflation hides an important diagnosis: on Linux, the OS credential keyring (gnome-keyring / KWallet / libsecret) is frequently locked, not running, or broken — meaning the key was saved successfully but cannot now be read. Telling such users to "set your API key" sends them in circles: they set it, it appears to save, but the next submission still fails the same way.

This feature splits one new failure class — `keyring-unavailable` — out of the existing `not-configured` path, so analysts see targeted guidance ("unlock your OS keyring") rather than generic guidance ("re-enter your API key"). This is a small, surgical enhancement: one new outcome value, one new banner copy, one new detection branch. No changes to the NL pipeline, credential storage, transport, or filter logic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Linux analyst sees "unlock your keyring" instead of "set your API key" (Priority: P1)

A Debrief analyst on a Linux workstation has previously set their Anthropic API key via the `Debrief: Set Anthropic API Key` command. Today they reboot, open VS Code, and the OS keyring is in its default locked state (no passphrase entered yet, or gnome-keyring is not running). They open the Catalog Overview, type a phrase, and press Enter. Instead of the generic "NL search is not configured — open settings to add a key" banner (which would lead them to re-save a key they have already saved), they see a distinct banner that explains the keyring is unavailable and offers concrete recovery actions (unlock the keyring, or restart the keyring service).

**Why this priority**: This is the whole feature. Without the distinct diagnosis, the Linux failure is indistinguishable from the "never-configured" failure, and users either give up or waste time re-entering keys that are already saved. P1 is the only priority this spec needs.

**Independent Test**: Simulate `context.secrets.get()` throwing (by forcing a throw, or by running on a Linux VM with no keyring daemon). Open Catalog Overview, submit a phrase, confirm a banner with `data-transport-reason="keyring-unavailable"` appears with copy that references the OS keyring — not the API key — and with recovery actions that do NOT suggest re-entering the key.

**Acceptance Scenarios**:

1. **Given** live NL mode is enabled and `context.secrets.get()` throws on first access, **When** the analyst submits a phrase, **Then** a `keyring-unavailable` banner is shown whose copy names the OS keyring as the problem and does not instruct the analyst to re-enter their key.
2. **Given** live NL mode is enabled and no key has ever been saved (`context.secrets.get()` resolves to `undefined`), **When** the analyst submits a phrase, **Then** the existing `not-configured` banner appears unchanged — the new path does not regress the original behaviour.
3. **Given** the `keyring-unavailable` banner is showing, **When** the analyst follows the recovery action and the keyring becomes available, **Then** a subsequent submission succeeds (or fails for an unrelated reason such as auth-failure) without any code change or extension reload required.
4. **Given** an analyst sees the `keyring-unavailable` banner, **When** they inspect the displayed text, **Then** it includes a platform-appropriate hint (unlock gnome-keyring / start KWallet / check the credential manager service) and a link or button to open the troubleshooting help text.

### Edge Cases

- **Transient keyring failure mid-session**: The first call in the session throws, subsequent calls succeed (user unlocked the keyring). The banner must clear on the next successful submission; no lingering banner state.
- **Keyring throws, then key is cleared**: Analyst hits `keyring-unavailable`, runs `Debrief: Clear Anthropic API Key`, then submits. The outcome must collapse back to `not-configured` (nothing to read; keyring irrelevant), not remain `keyring-unavailable`.
- **Keyring throws during `onDidChange` invalidation**: The cache invalidation path also calls `context.secrets.get()`. If that throws, the cached value (if any) must remain usable until an explicit user action invalidates it; a keyring failure during refresh must not silently drop a working key.
- **Non-Error thrown value**: `context.secrets.get()` may reject with a value that is not an `Error` instance (string, undefined, DOMException). The classification must still produce `keyring-unavailable` — the trigger is "promise rejected" not "Error thrown".
- **Windows/macOS keyring edge**: On Windows Credential Manager or macOS Keychain, throws are rare but possible (corrupt keychain, policy lockout). The same `keyring-unavailable` outcome applies — the banner copy must be OS-aware enough to not hard-code Linux guidance.
- **Second submission while banner is up**: Analyst sees `keyring-unavailable`, immediately submits another phrase. The retry must re-attempt `context.secrets.get()` (not cache the failure), so that a just-unlocked keyring recovers on the very next submission.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST distinguish two distinct failure classes for missing-credential situations: (a) `not-configured` — `context.secrets.get()` resolved successfully with no stored value, and (b) `keyring-unavailable` — `context.secrets.get()` rejected or threw.
- **FR-002**: When `context.secrets.get()` rejects or throws on the attempt to retrieve the API key, the system MUST classify the failure as `keyring-unavailable` and MUST NOT classify it as `not-configured`, `auth-failure`, `provider-error`, or any other existing outcome.
- **FR-003**: When `context.secrets.get()` resolves with `undefined` or an empty string, the system MUST continue to classify the outcome as `not-configured` exactly as today — behaviour for the no-key-ever-saved case MUST NOT regress.
- **FR-004**: The `keyring-unavailable` outcome MUST surface a banner whose visible copy (a) names the OS credential keyring as the failure source, (b) does NOT instruct the analyst to re-enter their API key as the primary remedy, and (c) offers at least one recovery action appropriate to unlocking / restarting the keyring.
- **FR-005**: The `keyring-unavailable` banner MUST be visually and semantically distinct from the `not-configured` banner — at minimum, a distinct `data-transport-reason` attribute and distinct body copy.
- **FR-006**: Prior filter chips, prior filtered list state, and any other NL-mode UI state MUST be preserved when a `keyring-unavailable` outcome replaces them, consistent with FR-006 of the parent #191 spec (lozenges survive failure).
- **FR-007**: A subsequent submission after a `keyring-unavailable` banner MUST re-attempt `context.secrets.get()`. The classification MUST NOT be cached or sticky — a user who unlocks their keyring mid-session must be able to recover without reloading the extension or restarting VS Code.
- **FR-008**: The cached API key (held in extension-host memory per #191 Decision 14) MUST NOT be evicted solely because a subsequent `context.secrets.get()` throws. A throw during cache refresh MUST leave the previously-working cache intact; eviction MUST only occur on an explicit user action (`Clear Anthropic API Key` command, or a delivered `onDidChange` event that resolves to undefined).
- **FR-009**: Structured telemetry (per #191 FR-007) MUST record the `keyring-unavailable` outcome distinctly from `not-configured`, so audit/log review can distinguish "never configured" from "configuration unreachable" without reading banner strings.
- **FR-010**: The banner copy MUST NOT embed Linux-only terminology in the headline; platform-specific guidance (gnome-keyring / KWallet / Credential Manager / Keychain) MAY appear in a secondary hint but MUST NOT imply the feature only fails on one OS.

### Key Entities *(include if feature involves data)*

- **`keyring-unavailable` outcome**: A new variant of the existing `LiveOutcome` union introduced by #191. Discriminated by `kind: "keyring-unavailable"`. Carries no secret content; optionally carries a non-sensitive `reason` or `platformHint` string for banner-copy selection.
- **Secret-retrieval classification step**: The logical step that wraps `context.secrets.get()` in a try/catch (or `.catch()` on the returned promise) and maps the three observable outcomes (resolved-with-value / resolved-with-undefined / rejected) to (proceed-with-call / `not-configured` / `keyring-unavailable`). This step lives wholly inside the extension host and is the only new branch of logic this feature introduces.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Give the analyst a clear, correct diagnosis when their API key exists but cannot be read, so they pursue the right remedy (unlock/start keyring) rather than the wrong one (re-enter key).
- **Key Decision(s)**:
  1. Does the message the analyst sees point at the right failure cause?
  2. Does the recovery action the analyst takes actually resolve their real problem?
- **Decision Inputs**:
  - Banner headline (distinguishes "no key saved" vs "key unreachable").
  - Banner body text (explains that the OS keyring — not Debrief — is the gate).
  - Recovery actions offered (unlock keyring, open troubleshooting help, open settings as a secondary option).
  - Absence of the usual "Open Settings → Set API Key" primary action, which would mislead.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Catalog Overview open, live NL mode enabled, key previously saved | Types a phrase and presses Enter | Submission enters pending state |
| 2 | Extension host attempts to read the key, OS keyring throws | (none — system acts) | Pending state clears, `keyring-unavailable` banner appears above the plot list |
| 3 | Banner visible, prior chips/filtered list preserved | Reads banner, unlocks OS keyring via desktop tool | No UI change in Debrief; keyring is now unlocked |
| 4 | Banner still visible | Re-submits the same or a new phrase | Extension host re-reads the key successfully; banner clears; chips apply normally |

### UI States

- **Empty State**: Not applicable — this outcome only appears in response to a submission, not as an idle state.
- **Loading State**: Standard pending state inherited from #191; no change.
- **Error State (new)**: Banner with `data-transport-reason="keyring-unavailable"`. Headline names the OS keyring. Body explains that the saved API key could not be read. Recovery actions include at least one non-"re-enter key" affordance (e.g., "Help: unlock your keyring"); a secondary "Open Settings" action MAY appear but MUST NOT be the primary call to action.
- **Success State**: On the next successful submission after recovery, the banner clears and the NL-mode success state renders exactly as in the happy path of #191.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of sampled cases where `context.secrets.get()` rejects, the banner shown carries the `keyring-unavailable` reason code and does not carry the `not-configured` reason code.
- **SC-002**: In 100% of sampled cases where `context.secrets.get()` resolves with `undefined`, the banner shown carries the `not-configured` reason code exactly as it does prior to this feature — zero regressions in the existing path.
- **SC-003**: A Linux user whose OS keyring is locked can, without any code change or extension reload, recover by unlocking the keyring and submitting again — the next submission succeeds (or fails for an unrelated reason) on the first attempt after unlock.
- **SC-004**: A reviewer looking at only the banner copy (no code, no settings) can correctly identify the remedy for each class in under 10 seconds: `not-configured` → "set an API key"; `keyring-unavailable` → "unlock the OS keyring".
- **SC-005**: Telemetry records captured over a representative session distinguish `keyring-unavailable` from `not-configured` as separate outcome values; a log reviewer can count each independently without string-matching banner text.

## Assumptions

- The #191 NL-search feature has shipped or is shipping in the same release train; this spec builds on its `LiveOutcome` union, its banner-rendering code path in `FilterBar.tsx`, and its `llmProxy` extension-host service. Nothing in #198 re-implements those; #198 only adds one variant to the union and one branch in the classification step.
- `context.secrets` is the VS Code `SecretStorage` API exposed via `vscode.ExtensionContext.secrets` — per #191's Decision 2 and the existing command contribution. No abstraction over this API is introduced here.
- The detection rule is purely "promise rejected / synchronous throw" vs "resolved with undefined/empty" vs "resolved with a value". The feature does NOT attempt to classify specific thrown error shapes (e.g., inspecting error messages for "locked" vs "corrupt") — any throw is treated as `keyring-unavailable`. Finer-grained classification is explicitly out of scope and would be a follow-up.
- The recovery help text (how to unlock gnome-keyring, KWallet, etc.) is a static documentation link or a short static string — this feature does NOT attempt to programmatically unlock or restart the keyring service.
- Existing #191 telemetry plumbing accepts new outcome values without schema migration (the outcome `kind` is a discriminated string; adding a new literal is additive).
- This enhancement does NOT introduce a general secret-store abstraction, does NOT expand NL mode to additional panels (that is #195), does NOT add providers (that is #196), and does NOT design audit-log surfaces (that is #197). Cross-references only.
