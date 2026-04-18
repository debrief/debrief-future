# Feature Specification: NL Search — Per-Prompt Audit Trail (Opt-In)

**Feature Branch**: `197-nl-audit-trail`
**Created**: 2026-04-18
**Status**: Draft
**Input**: BACKLOG.md #197 — "[E10] NL search — per-prompt audit trail (opt-in): optional verbose log capturing prompts + responses for forensic review; separate setting + separate log channel; off by default; structured for SIEM ingest (requires #191 structured telemetry)."

## Overview

The NL-search feature shipped in #191 emits a lean structured telemetry record on every model call — timestamp, provider, model, outcome, duration, response byte count, call index — but deliberately omits the analyst's phrase and the model's response body. That lean shape satisfies day-to-day operability but does not answer the forensic question *"exactly what phrase did the analyst type at 14:32, and what did the model return?"*

This feature adds an **opt-in verbose audit trail** that, when enabled, captures the full prompt and full response for every NL-search interaction. The audit log is a distinct, separately-gated channel from the standard telemetry log (#191); it is off by default; and its on-disk shape is structured for direct ingestion by an enterprise SIEM (Splunk, Elastic, Sentinel, etc.).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Security officer investigates a suspected data-leak via NL search (Priority: P1)

A security officer at an analyst site is investigating a report that analysts may have typed operationally sensitive phrase content (exercise names, platform identifiers, TOIs) into the NL-search box. They need to know, for a specific workstation and time window, exactly which phrases were submitted and what the model returned. The standard telemetry from #191 tells them calls happened but deliberately withholds the content. The officer enables the audit trail on the investigation workstation, reproduces or waits out the window, then collects the audit log file for offline review and SIEM correlation.

**Why this priority**: This is the entire reason the feature exists. Without a forensic-grade record, sites with data-sensitivity obligations cannot approve rollout of NL search at all; the feature gates wider adoption of #191 in regulated environments.

**Independent Test**: Enable the audit setting on a test workstation, submit three distinct NL phrases (one success, one model-error, one cancelled), close VS Code, and verify the audit log file contains exactly three well-formed records with the full prompt text, full response body (or the documented reason for absence), and a stable correlation ID that can be joined against the #191 telemetry record for the same call.

**Acceptance Scenarios**:

1. **Given** the audit setting is off (default) and the analyst submits an NL phrase, **When** the call completes, **Then** the standard telemetry record is emitted exactly as today and no audit record is written anywhere.
2. **Given** the audit setting is on and the analyst submits a phrase that returns a valid result, **When** the call completes, **Then** one audit record is appended containing the full phrase, the full raw response body, provider, model, outcome `ok`, timing, and a correlation ID that matches the standard telemetry record's call index.
3. **Given** the audit setting is on and the call fails (transport error, malformed response, ceiling reached, cancelled, not-configured), **When** the outcome is classified, **Then** one audit record is still appended, carrying the full prompt, the documented outcome class, and whatever response fragment (if any) was received before failure.
4. **Given** an operator later ingests the audit log into their SIEM, **When** they search for a specific correlation ID, **Then** they retrieve a single, complete, self-describing record without needing to join against any other file.

---

### User Story 2 — Site administrator enables audit trail site-wide before rollout (Priority: P2)

A site administrator preparing an NL-search pilot needs to turn the audit trail on for all analysts on site, pin it on, and prevent individual analysts from disabling it. They deploy a managed workspace/machine settings configuration that forces the audit setting to `true` and documents the on-disk log path for their SIEM agent to tail.

**Why this priority**: Without administrator-level control, a single analyst disabling the audit defeats its purpose; but the P1 forensic workflow still delivers value for a single-workstation investigation even without this. Administrative lockdown is enabling, not blocking.

**Independent Test**: Place the audit setting in a managed/workspace settings layer, open VS Code as a user with a conflicting user-settings value, confirm the managed value wins, confirm the user-scope control shows the setting as locked (or at least overridden), and confirm audit records are written despite the user-level "off".

**Acceptance Scenarios**:

1. **Given** the audit setting is set to `true` in a managed settings layer, **When** the analyst opens user settings and attempts to disable it, **Then** the managed value continues to win and audit records continue to be written.
2. **Given** an administrator has configured the audit log output path in managed settings, **When** audit records are written, **Then** they land at the configured path in a format the site's SIEM agent can tail without transformation.

---

### User Story 3 — Analyst sees clear indication that audit capture is active (Priority: P3)

An analyst using a workstation on which the audit trail has been enabled must be able to tell, without reading settings, that their NL-search phrases are being recorded. The indication must be unambiguous enough that no analyst can credibly later claim surprise that their phrases were captured.

**Why this priority**: Necessary for organisational/legal "notice" obligations in most jurisdictions, but not required for the core forensic capability itself — an administrator deploying this feature will generally combine it with a workplace policy notification.

**Independent Test**: Enable the audit setting, open the NL-search UI, and verify a persistent, non-dismissable visual indicator is present in the NL-search surface announcing that prompt/response capture is active. Disable it, and verify the indicator disappears.

**Acceptance Scenarios**:

1. **Given** the audit setting is on, **When** the analyst opens any panel where NL search is available, **Then** a persistent "audit capture active" indicator is visible on that surface for as long as the setting remains on.
2. **Given** the audit setting is off, **When** the analyst opens the same panel, **Then** no such indicator is present and NL-search appears exactly as it does in #191 today.

---

### Edge Cases

- **Audit on but NL search disabled**: NL search gate is off (`debrief.nlSearch.enabled = false`). No calls happen, so no audit records are written. The setting being on without NL search enabled is inert, not an error.
- **Audit on but API key missing**: Calls short-circuit to the `not-configured` outcome at the host. One audit record MUST still be written, carrying the phrase the analyst typed and the `not-configured` outcome (the phrase was submitted — forensic review needs to know that).
- **Very large response body**: The model returns a response larger than the #191 bounded-read ceiling. The audit record MUST capture the truncated body that #191 already bounded, along with a flag indicating truncation and the original advertised size if known. The audit trail MUST NOT re-read the body or raise the ceiling — it reuses the same bounded buffer #191 already holds.
- **Cancelled mid-stream**: Analyst supersedes the call before it completes. One audit record is written with outcome `cancelled` and whatever response bytes (if any) had already arrived; the phrase field is always populated.
- **Log file write failure**: The audit sink cannot write (disk full, permissions, path missing). The NL-search interaction MUST NOT fail — the analyst's call completes normally — but a single warning MUST surface (via the standard telemetry channel, not silently swallowed), and subsequent failed writes in the same session are rate-limited to avoid log-channel spam.
- **Setting toggled mid-session**: The setting changes from off→on or on→off while VS Code is running. The new value takes effect on the next call; in-flight calls at the moment of the toggle follow the setting value that was live when the call was initiated (so a call cannot end up half-audited).
- **Log rotation boundary**: The audit log hits its rotation threshold mid-call. The call completes; the record lands on the correct side of the rotation boundary according to the rotation policy (see Assumptions).
- **Clock skew / local time zone**: Every audit record carries an ISO-8601 UTC timestamp with explicit `Z` suffix so a SIEM can correlate across workstations without timezone inference.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a single boolean setting (separate from `debrief.nlSearch.enabled`) that controls whether the per-prompt audit trail is active. The setting MUST default to `false`.
- **FR-002**: When the audit setting is `false`, the system MUST NOT capture, retain, or transmit any prompt text or response body beyond what the standard #191 telemetry already emits.
- **FR-003**: When the audit setting is `true` and an NL-search call is submitted, the system MUST produce exactly one audit record per call, regardless of the call's final outcome class (including `ok`, transport errors, malformed-response, ceiling-reached, not-configured, and cancelled).
- **FR-004**: Each audit record MUST contain, at minimum: a correlation ID that matches the call's index on the standard telemetry channel; a UTC ISO-8601 timestamp; the provider identifier; the model identifier; the outcome class; the full prompt text as submitted; the response body (or the response fragment received before failure); a truncation flag; and the duration in milliseconds.
- **FR-005**: Audit records MUST be written to a channel that is distinct from the standard #191 telemetry channel, such that an operator can ingest one without the other and such that the two channels can be independently gated, rotated, and permissioned.
- **FR-006**: The on-disk shape of the audit log MUST be line-delimited JSON (one self-contained JSON object per line) so that a SIEM agent can tail the file and forward records without transformation.
- **FR-007**: The system MUST record, in each audit record, every field needed to reconstruct the call independently of any other log or state — the audit log MUST be self-sufficient for forensic review.
- **FR-008**: The audit log MUST NOT contain the API key, authorisation headers, or any other credential material, even when capturing request content.
- **FR-009**: When the audit setting is `true`, every NL-search UI surface MUST display a persistent, unambiguous indicator that prompt/response capture is active; the indicator MUST disappear when the setting is `false`.
- **FR-010**: A failure to write an audit record MUST NOT fail, slow, or otherwise degrade the NL-search call itself. The call MUST complete on its normal timing budget.
- **FR-011**: A failure to write an audit record MUST be surfaced to operators via the standard telemetry channel at least once per session, with repeat failures in the same session rate-limited to avoid log spam.
- **FR-012**: The audit log's disk footprint MUST be bounded, either via a size-based or entry-count-based rotation policy, so a long-running session cannot grow it without limit.
- **FR-013**: When rotation occurs, overflow entries MUST be preserved (append-only to an archive file or equivalent) — the audit trail MUST remain immutable in aggregate, consistent with Article III.3 ("audit trail immutable").
- **FR-014**: The setting MUST be configurable via VS Code's standard settings mechanisms such that a site administrator can set it from a managed/workspace settings layer and have that value override the user-scope value, allowing an administrator to pin it on for all analysts on site.
- **FR-015**: The audit setting's effect on each call MUST be determined at call initiation; a setting toggle during an in-flight call MUST NOT partially audit that call.
- **FR-016**: When the audit setting is `true` and no API key is configured, the system MUST still produce one audit record per submitted phrase, carrying the `not-configured` outcome, so that "attempted phrase submissions" remain visible to forensic review even when calls never reach the provider.

### Key Entities *(include if feature involves data)*

- **Audit Record**: A single, self-describing, structured record of one NL-search interaction. Contains correlation ID (joins to #191 telemetry), UTC timestamp, provider, model, outcome class, prompt text, response body (possibly truncated), truncation flag, duration. One per call, written once, never mutated.
- **Audit Log (Active)**: The current, append-only line-delimited JSON file holding recent audit records. Bounded in size; subject to rotation.
- **Audit Log (Archive)**: The append-only overflow file holding rotated-out records. Preserves the full audit trail beyond the active log's bounds.
- **Audit Setting**: A single boolean configuration key, separate from the NL-search enable gate, default `false`, governable from managed-settings layers so administrators can pin it on.
- **Audit Capture Indicator**: A persistent, non-dismissable visual element shown on every NL-search surface while the setting is `true`; hidden otherwise.

## User Interface Flow *(UI surface: settings toggle + capture indicator)*

### Decision Analysis

- **Primary Goal**: Give a site administrator or security officer a forensic-grade record of NL-search prompts and responses that they can ingest into their enterprise SIEM, without silently subjecting every NL-search user to content capture by default.
- **Key Decisions**:
  1. Administrator: turn the audit trail on or off for this install.
  2. Administrator: pin the setting (managed/workspace) or leave it user-configurable.
  3. Analyst: understand, at the moment of typing, whether their phrase will be captured.
- **Decision Inputs**: The VS Code settings UI shows the audit setting with its default (`off`) and a short description stating clearly that it captures full prompts and full responses for forensic review. The NL-search surface shows the capture indicator whenever the setting is on, so the decision-to-type is always informed.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | VS Code Settings UI (admin, initial) | Searches for "Debrief NL search audit" | Sees the setting, default off, with a description explaining capture scope and storage location |
| 2 | VS Code Settings UI (admin) | Toggles audit setting to on (user-scope or managed-scope) | Setting takes effect immediately; no restart required |
| 3 | NL-search panel (analyst) | Opens the NL-search surface | Sees the "audit capture active" indicator prominently and persistently |
| 4 | NL-search panel (analyst) | Types and submits a phrase | Call proceeds normally; one audit record is written to the audit log |
| 5 | SIEM console (operator, out-of-band) | Tails the audit log path | Sees each record arrive as one JSON line, self-describing, ready to index |

### UI States

- **Empty State** (audit off, no records written): No indicator on NL-search surface; audit log file does not exist (or is empty). Settings page shows the toggle in the off position with a description.
- **Active State** (audit on, records being written): "Audit capture active" indicator visible on every NL-search surface; audit log file exists at the documented path and is appended on each call.
- **Degraded State** (audit on but log-write failing): NL-search continues to work; indicator remains visible (the intent to capture has not changed); one warning per session in the standard telemetry channel informs operators the audit sink is failing.
- **Locked State** (managed-settings override): Settings UI shows the audit toggle in its managed value with VS Code's standard "managed by policy/workspace" styling; individual user cannot flip it back.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the audit setting off, the on-disk and in-memory footprint of NL-search content capture is identical to #191's today (zero prompt or response bytes retained beyond the call's lifetime) — verified by inspection of the log channels and process memory on a call that submits a known-unique phrase.
- **SC-002**: With the audit setting on, 100% of submitted NL-search phrases produce exactly one audit record, across all outcome classes including failures and cancellations — verified by a test matrix that exercises every outcome class and counts records.
- **SC-003**: Every audit record carries a correlation ID that, when searched in the standard #191 telemetry log, returns the matching telemetry line for the same call — verified by ingesting both logs into the same SIEM and running a join query.
- **SC-004**: No audit record at any time contains the API key, authorisation header, or any other credential string — verified by a grep-based negative test over a synthetic audit log produced by a test session using a sentinel key value.
- **SC-005**: A representative SIEM can ingest the audit log file unmodified and render each record as a structured event with all documented fields parsed — verified on at least one mainstream SIEM (Splunk UF / Elastic Filebeat / equivalent) in an evidence capture.
- **SC-006**: Enabling or disabling the audit setting adds no perceptible latency to an NL-search call (audit-write stays off the call's critical path); the p95 duration of NL-search calls with audit on is within 5% of the p95 with audit off on the same test fixture.
- **SC-007**: A forced log-write failure (read-only log directory) does not cause any NL-search call to fail, hang, or return late — verified by a test that locks the log path and runs the full outcome matrix.
- **SC-008**: A site administrator can successfully pin the audit setting on via a managed/workspace settings layer, such that a user-scope override does not unset it — verified in an E2E test using a workspace settings file.
- **SC-009**: After rotation, the aggregate of the active audit log and its archive contains every record that was ever written in the session — verified by submitting more calls than the rotation threshold allows and counting records across both files.

## Assumptions

- **Reuses #191's correlation**: The "call index" already present on #191 telemetry records is suitable as the audit record's correlation ID; no new ID scheme is introduced.
- **Reuses #191's bounded read**: The response body captured by the audit record is the same bounded buffer #191 already reads; the audit trail does not raise the ceiling or re-read the body.
- **On-disk line-delimited JSON**: The structured-for-SIEM-ingest requirement is satisfied by one JSON object per line, UTF-8, LF line endings — the same shape the project already uses for `provenance_log_archive.jsonl` (#193).
- **Rotation policy**: In the absence of a unified rotation policy (tracked as BACKLOG #194), the audit log adopts the same per-item cap-and-rotate pattern #193 established for provenance logs (active file capped; overflow appended to a sibling archive file). #194, when it lands, will replace the local policy with the unified one.
- **Log location**: The default audit log path lives under VS Code's extension storage / user data directory so that it is per-install and survives across VS Code restarts. A managed-settings override can redirect it to a site-standard path for SIEM agents to tail.
- **Two independent gates**: The NL-search enable gate (`debrief.nlSearch.enabled`, #191) and the audit setting are orthogonal. Turning audit on without enabling NL search is inert; turning NL search on without audit is the default posture.
- **Analyst notice is in-UI, not modal**: The capture indicator is a persistent in-surface affordance, not a first-run modal; workplace-policy notice is assumed to be delivered out-of-band by the deploying organisation.
- **No disk persistence of the response body beyond the audit log**: The response body continues to live only in the bounded buffer until the audit writer consumes it; no intermediate disk staging.
- **Administrative layering follows VS Code's standard precedence**: Managed settings beat workspace settings beat user settings, as VS Code itself enforces. No custom precedence logic is introduced.

## Dependencies

- **BACKLOG #191** — NL-search feature itself and its structured telemetry channel. The audit trail extends and correlates to #191's records; it does not replace them.
- **BACKLOG #194** (proposed) — Cross-cutting PROV log rotation. When #194 ships, the audit log's rotation policy conforms to the unified policy. Until then, the audit log uses the #193-style pattern.

## Out of Scope

- **Provider-agnostic audit**: Non-Anthropic providers (tracked as BACKLOG #196) are out of scope here; the audit trail must work for whatever provider #191 currently supports, and will automatically cover additional providers as they're added without schema changes.
- **Audit trail for NL search in Layers/Tools panels**: Extending NL search to those surfaces is BACKLOG #195; when that lands, the existing audit capture applies automatically because it hooks the shared call path, not the surface.
- **Keyring-unavailable distinct banner**: BACKLOG #198 covers that separately; its outcome class, when added, will be captured by the audit trail with no spec changes.
- **Viewer UI for the audit log**: This feature ships the log file; reading, searching, and visualising audit records is done via the deploying site's SIEM, not via a bespoke Debrief UI.
- **Retroactive capture**: If audit is enabled after calls have already been made in the session, prior calls are not recoverable. Audit applies forward from the moment the setting is observed as `true`.
