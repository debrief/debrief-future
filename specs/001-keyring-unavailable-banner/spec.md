# Feature Specification: NL Search — Keyring-Unavailable Distinct Banner

**Feature Branch**: `001-keyring-unavailable-banner`
**Created**: 2026-04-18
**Status**: Draft
**Input**: Backlog item #198 — "[E10] NL search — keyring-unavailable distinct banner — when `context.secrets.get()` throws (locked/missing OS keyring on Linux), surface a specific `keyring-unavailable` outcome + banner rather than folding it into the generic `not-configured` path; different diagnosis (unlock keyring vs re-enter key) (requires #191)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Analyst on Linux with a locked OS keyring sees the right banner (Priority: P1)

An analyst on a Linux workstation has previously saved an Anthropic API key for the NL search feature. They log in the next morning and the OS keyring (gnome-keyring / KWallet) did not auto-unlock. They open the Catalog Overview, type a natural-language phrase, and the live path fails because VS Code cannot read the stored secret. Today they see the same "NL search is not configured — add your API key in settings" banner that someone without any key would see. That guidance is wrong: their key is present, it just cannot be decrypted right now.

With this feature, they instead see a banner that names the real cause ("OS keyring unavailable — unlock your keyring and try again") and offers the right next step (retry, or open OS keyring instructions). They do not waste time re-entering a key that is already stored.

**Why this priority**: This is the headline behaviour of the feature and the only reason it exists. Without it, the error message actively misleads the user and the support cost on Linux is permanent. It is P1; every other story below only exists to make this one robust.

**Independent Test**: Force `context.secrets.get()` to throw a keyring/OS-level error in a VS Code integration test, submit an NL phrase from the Catalog Overview, and assert the banner text, the banner's recovery affordance, and the structured outcome emitted to the log all identify the failure as `keyring-unavailable` — not `not-configured`.

**Acceptance Scenarios**:

1. **Given** NL search is enabled and a key was saved in a prior session, **When** `context.secrets.get()` throws because the OS keyring is locked, **Then** the Catalog Overview displays a banner whose headline names the keyring (not the missing key) and whose recovery affordance is "Retry" (not "Open Settings").
2. **Given** the keyring was unavailable and the user has now unlocked it, **When** they press Retry in the banner, **Then** the next submission reads the key successfully and behaves exactly like any other live submission.
3. **Given** a keyring-unavailable outcome, **When** the structured outcome record is inspected, **Then** its `kind` is `keyring-unavailable` and it is distinguishable at a glance from a `not-configured` record.

---

### User Story 2 — Analyst who has never saved a key still gets the original "not configured" banner (Priority: P1)

An analyst enables NL search but has not yet saved an API key. They submit a phrase. They must continue to see today's "not configured — add your API key" banner, routed to settings. Nothing about their experience regresses because the new keyring-unavailable path was added.

**Why this priority**: This is a guard-rail story. The entire purpose of the feature is to narrow the `not-configured` path to its real meaning — "no key has ever been stored". If the two outcomes leak into each other, both banners become unreliable and we end up worse than before. P1 because it is the regression contract for existing users.

**Independent Test**: In a VS Code integration test, clear the stored secret, enable the feature, submit a phrase, and assert the banner text and structured outcome remain exactly `not-configured` with reason `no-key` — unchanged from parent spec #191 behaviour.

**Acceptance Scenarios**:

1. **Given** NL search is enabled and no key has ever been stored, **When** the user submits a phrase, **Then** the banner is the existing `not-configured` banner and the recovery affordance is "Open Settings".
2. **Given** NL search is disabled entirely, **When** the user submits a phrase, **Then** the banner is the existing `not-configured` banner with reason `disabled` — unchanged.

---

### User Story 3 — Operator investigating a user's report can distinguish the two causes from the log (Priority: P2)

When a Linux analyst reports "NL search keeps telling me to add a key I already added", an operator triaging the report should be able to look at the structured log record and immediately tell whether the problem was a keyring failure or a genuinely missing key. Today both cases look identical in the log; with this feature they are two different outcome kinds with different recovery guidance.

**Why this priority**: The banner alone closes the loop for the analyst in the moment. This story closes the loop for the operator afterwards. It is P2 because the in-product banner fix is the immediate win; richer log diagnostics ship alongside but are a follow-on benefit.

**Independent Test**: Emit both a `keyring-unavailable` outcome and a `not-configured` outcome in the same session and confirm the structured log shows two distinct `kind` values and that neither record contains the prompt text or the (unreadable) key itself.

**Acceptance Scenarios**:

1. **Given** the structured log already records the outcome kind, duration, and response size for every live submission, **When** a keyring-unavailable event occurs, **Then** the log entry's `kind` is `keyring-unavailable`.
2. **Given** the log records are aggregated or exported, **When** an operator filters by `kind`, **Then** keyring failures and configuration failures appear as two separate populations.

---

### Edge Cases

- **Transient keyring failure followed by recovery**: The keyring is locked on first submission, unlocked before the second. The first submission must emit `keyring-unavailable`; the second must succeed. No stale banner may remain after the successful submission.
- **Repeated keyring failures in a row**: Multiple submissions while the keyring stays locked must each emit a `keyring-unavailable` outcome (not collapse to a single event, and not fall back to `not-configured` after the first failure).
- **Filter state preservation**: Parent spec invariant — existing filter chips and filtered plot list state must be preserved across a keyring-unavailable failure, exactly as they are across every other failure class.
- **Non-Linux platforms**: On Windows Credential Manager or macOS Keychain, a keyring/credential-store failure is theoretically possible (permissions, corrupt vault). The same outcome must be used — this is not a Linux-only code-path, even though Linux is where it is most common.
- **Keyring access succeeds but returns an empty string**: This is `not-configured`, not `keyring-unavailable`. The distinction is whether the secrets API threw or returned successfully.
- **Non-keyring error thrown by the secrets API**: An unexpected exception with no keyring/OS signal still produces `keyring-unavailable` rather than a silent crash or a misleading `not-configured` banner — we fail loud, toward the least misleading message.
- **Cancellation while the secrets read is in flight**: A superseded request must be dropped silently (parent spec invariant) regardless of whether the underlying cause was a slow keyring prompt.
- **Absence of any system keyring backend**: On a container or minimal Linux image with no keyring daemon at all, the secrets API's first read fails the same way. The same `keyring-unavailable` path applies.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The NL search system MUST surface a distinct outcome kind — `keyring-unavailable` — whenever an attempt to read the stored API key from the operating system's secret store fails by throwing an exception.
- **FR-002**: The `keyring-unavailable` outcome MUST NOT be produced when the secret store returns successfully with an empty / absent value. That case MUST continue to produce the existing `not-configured` outcome.
- **FR-003**: The Catalog Overview MUST render a banner for `keyring-unavailable` whose text names the real cause (the operating system's secret store being unavailable) rather than suggesting the user enter a key. The banner MUST be visually and textually distinguishable from the existing `not-configured` banner.
- **FR-004**: The `keyring-unavailable` banner MUST offer "Retry" as its primary recovery affordance. It MUST NOT offer "Open Settings" as its primary affordance, because the settings surface cannot resolve a locked keyring.
- **FR-005**: The banner MUST reference, in plain language, that the user can unlock their OS keyring (or equivalent credential store on macOS / Windows) and retry. The exact copy may adapt to platform but MUST never instruct the user to re-enter a key they have already stored.
- **FR-006**: Pressing Retry MUST re-attempt the full NL path (including a fresh secrets read). If the keyring is now available, the submission MUST proceed exactly like any other successful live submission.
- **FR-007**: Existing filter chips, filtered plot list state, and prior successful-query context MUST be preserved across a `keyring-unavailable` event — matching the parent spec invariant for every other failure class.
- **FR-008**: The structured outcome log record for a `keyring-unavailable` event MUST use `kind: "keyring-unavailable"` and MUST NOT contain the prompt text, any portion of a key, or the underlying exception's raw message (which may include OS-level details not safe to persist).
- **FR-009**: The existing `not-configured` outcome's scope MUST be narrowed to cover only the cases it names today: the feature being disabled, or no key having been stored. It MUST NOT absorb keyring-unavailable cases.
- **FR-010**: The NL search feature MUST continue to distinguish at least the failure classes declared in the parent spec (auth, rate-limit, provider-error, timeout, malformed, not-configured, transport, ceiling-reached) in addition to the new `keyring-unavailable` class.
- **FR-011**: A keyring-unavailable failure MUST NOT produce any outbound request to the language-model provider. The outcome MUST be observable without network activity.
- **FR-012**: The banner MUST clear automatically on the next successful submission and MUST NOT persist after the user navigates away and returns.

### Key Entities *(include if feature involves data)*

- **Live Outcome (`keyring-unavailable`)**: A new member of the existing NL search outcome union. Represents a failed attempt to read the stored API key due to an unavailable or locked OS secret store. Distinguished from `not-configured` by whether the secrets API threw versus returned empty.
- **Keyring-Unavailable Banner**: The UI representation of the new outcome in the Catalog Overview. Names the OS secret store as the cause, recommends unlocking it, and offers a Retry affordance. Sibling to the existing not-configured, auth-failure, rate-limit, and other banners.
- **Structured Log Entry**: Existing per-submission record, extended to include `keyring-unavailable` as a possible `kind`. Operator-visible; prompt- and response-content-free.

## User Interface Flow *(optional — include for UI features)*

### Decision Analysis

- **Primary Goal**: When NL search fails because the OS secret store is unavailable, help the analyst decide what to fix next — and do so without wasting their time on settings that cannot resolve the problem.
- **Key Decision(s)**:
  1. Did the NL call fail because no key is stored (go to settings) or because the stored key cannot be read right now (unlock the OS keyring)?
  2. Is the keyring now unlocked — should I Retry, or is there something else to fix first?
- **Decision Inputs**: The banner text (names the actual cause), the recovery affordance (Retry vs Open Settings), and the persistence of prior filter chips (confirms the analyst has not lost their working context).

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Catalog Overview, NL search enabled, prior chips visible, OS keyring locked | Type phrase and submit | Keyring-unavailable banner appears above the plot list; prior chips remain; no network call made |
| 2 | Banner visible, chips preserved | User unlocks OS keyring outside VS Code, then presses Retry in the banner | Submission re-runs, reads key successfully, proceeds as a normal live submission |
| 3 | Submission succeeds | (none — system acts) | Banner clears; new chips (if any) appear; filtered plot list updates |

### UI States

- **Empty State**: Not applicable — this feature only appears as a response to a failure, never as an idle default.
- **Loading State**: While the system attempts to read the secret on Retry, the submit control enters the same busy state used for any other live submission. No separate loading style is introduced.
- **Error State (keyring-unavailable)**: Banner above the plot list identifies the OS secret store as the cause, recommends unlocking it, and offers Retry as the primary affordance. Prior filter chips remain visible. Distinct from the `not-configured` banner in both text and primary affordance.
- **Error State (not-configured — unchanged)**: Existing banner, unchanged, with "Open Settings" as its primary affordance. Shown only when no key is stored or the feature is disabled.
- **Success State (after Retry)**: Banner clears; chips / filtered plot list reflect the outcome of the live submission; indicator returns to idle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In an end-to-end test where the OS secrets read is forced to throw, the Catalog Overview displays the `keyring-unavailable` banner — not the `not-configured` banner — in 100% of sampled runs.
- **SC-002**: In an end-to-end test where the OS secrets read returns empty, the Catalog Overview displays the `not-configured` banner — not the `keyring-unavailable` banner — in 100% of sampled runs. Parent spec behaviour is preserved.
- **SC-003**: A reviewer comparing the two banners side by side can identify, from the banner text alone, which one means "unlock your keyring" and which one means "enter your key" — confirmed by a two-reviewer sign-off on banner copy.
- **SC-004**: After a keyring-unavailable event, prior filter chips and filtered plot count remain on screen in 100% of sampled runs.
- **SC-005**: A structured-log filter for `kind: "keyring-unavailable"` returns only keyring-unavailable events and excludes every `not-configured` event — verified across a mixed sample of at least 10 events.
- **SC-006**: No keyring-unavailable event produces an outbound network call to any language-model provider — confirmed by network inspection across the full end-to-end suite.
- **SC-007**: A Linux analyst encountering a locked keyring for the first time can, from the banner alone and without consulting documentation, understand that the fix is to unlock their keyring rather than re-enter an API key — validated in a usability walk-through with at least two analysts.

## Assumptions

- The parent spec (#191) has landed and established the `LiveOutcome` union, the `context.secrets` storage of the Anthropic API key, the structured-log shape, and the banner-rendering surface in the Catalog Overview. This feature extends those; it does not redefine them.
- `context.secrets.get()` is the sole path through which the stored key is read. There is no alternate storage location that would need a parallel failure path.
- "OS keyring" in the banner copy is the user-facing label for the platform-appropriate secret store (gnome-keyring / KWallet / libsecret on Linux, Credential Manager on Windows, Keychain on macOS). One banner text adapts per platform; no per-platform outcome kinds are introduced.
- Retrying after a keyring failure is safe and idempotent — a second read simply re-invokes the secrets API. No call-ceiling accounting is required for a failed keyring read because no provider call was made.
- The existing `not-configured` banner copy and affordance do not need to change; only the scope of when it is shown changes.
- Prompt text, key material, and raw OS error messages are not captured in logs for the new outcome — matching the parent spec's sovereignty posture.

## Dependencies

- Requires feature #191 (VS Code NL search) to be merged; this feature extends its outcome union and banner surface.
- No new runtime dependencies, no new schema additions outside the existing `LiveOutcome` union, no new settings.

## Out of Scope

- Automating keyring unlock from within VS Code (e.g., prompting the user's keyring password from the extension).
- Any new setting to disable or mute the `keyring-unavailable` banner.
- Detailed OS-specific troubleshooting documentation — the banner copy may link to existing docs, but this feature does not ship that documentation itself.
- Changes to the `not-configured`, `auth-failure`, or any other existing outcome's text or affordance.
