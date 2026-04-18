# Feature Specification: NL Search — Per-Prompt Audit Trail (Opt-In)

**Feature Branch**: `197-nl-audit-trail`
**Created**: 2026-04-18
**Status**: Draft
**Input**: Backlog #197 — "[E10] NL search — per-prompt audit trail (opt-in). Optional verbose log capturing prompts + responses for forensic review; separate setting + separate log channel; off by default; structured for SIEM ingest (requires #191 structured telemetry)."

## Overview

The parent NL-search feature (#191, FR-007) already emits a structured telemetry record per submission with outcome, duration, size, and model identifier — but explicitly excludes prompt and response content. That default is correct for most deployments (privacy, confidentiality) but insufficient for two operational needs: (a) **forensic review** of a misbehaving NL flow ("why did this phrase produce these chips?"), and (b) **SIEM ingest** in organisations with a regulatory obligation to log LLM interactions. This feature adds an **opt-in, off-by-default** per-prompt audit trail that captures full prompt and response content alongside the existing telemetry fields, written to a **separate log channel** (distinct from the existing debug channel) in a **JSON Lines** format designed for SIEM ingestion. The existing #191 telemetry surface is unchanged; this feature is additive.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compliance reviewer audits analyst NL usage (Priority: P1)

A compliance officer in a regulated organisation enables `debrief.nlSearch.audit.enabled` in VS Code settings. Analysts continue to use NL search as normal; the VS Code extension writes one JSON Lines record per submission to a dedicated "Debrief NL Audit" output channel and (optionally) to a configured on-disk log file. The reviewer ingests the log file into their SIEM, where each record's fields map cleanly to the SIEM's schema (timestamp, actor, action, outcome, payload). The reviewer can answer "what did analyst X submit between time Y and time Z" by SIEM query.

**Why this priority**: The whole feature exists to serve compliance and forensic review. Without P1, the feature provides no value.

**Independent Test**: Enable the setting, trigger representative NL submissions across success and failure classes, capture the "Debrief NL Audit" output channel contents, and confirm (a) each submission produces exactly one JSON Lines record, (b) every expected field is present and non-empty, (c) the records parse as valid JSON Lines (one object per line, no trailing commas), (d) the records can be piped to a SIEM ingest tool (e.g. `cat audit.log | jq -c .`) without errors.

**Acceptance Scenarios**:

1. **Given** `debrief.nlSearch.audit.enabled = true` and an analyst submits a phrase that succeeds, **When** the submission resolves, **Then** one JSON Lines record appears in the "Debrief NL Audit" channel containing `{ timestamp, session_id, submission_id, panel_origin, provider, model, outcome: "success", prompt, response, chips, duration_ms }`.
2. **Given** `debrief.nlSearch.audit.enabled = true` and an analyst submits a phrase that produces `malformed-response`, **When** the submission resolves, **Then** the audit record captures `outcome: "malformed-response"` and includes the raw (possibly invalid) response body so the reviewer can diagnose the shape mismatch.
3. **Given** `debrief.nlSearch.audit.enabled = false` (default), **When** any number of submissions occur, **Then** nothing is written to the "Debrief NL Audit" channel and the channel MAY not even be created (no empty channel in the Output dropdown).
4. **Given** the setting is toggled from false to true mid-session, **When** the next submission occurs, **Then** the audit channel is created, opened, and receives the record — no extension reload required.

---

### User Story 2 - Reviewer can redact prompt/response content while retaining structural audit (Priority: P2)

An organisation needs audit records for SIEM ingest but cannot allow prompt/response content to appear in logs (e.g. the prompts may contain classified terms, the responses may contain sensitive plot names). The compliance officer enables `debrief.nlSearch.audit.enabled = true` AND `debrief.nlSearch.audit.redactContent = true`. The audit records then contain `prompt_hash` and `response_hash` (SHA-256) instead of `prompt` and `response` raw strings, while retaining all other structural fields. Log review can still correlate submissions (by hash identity), count per-outcome, and identify the analyst's pattern of use — without exposing content.

**Why this priority**: Without a redaction mode, deployments that need audit but not content are forced to choose between full content logging or no audit at all. P2 because the basic full-content mode covers the majority use case; the redaction mode is a necessary but narrower option.

**Independent Test**: Enable audit + redaction. Submit a distinctive phrase. Confirm the audit record contains `prompt_hash` (a 64-char hex SHA-256) and no `prompt` field; confirm `response_hash` present and `response` absent. Hash identity: re-submit the same phrase, confirm the second record's `prompt_hash` equals the first.

**Acceptance Scenarios**:

1. **Given** audit is on and redaction is on, **When** a submission succeeds, **Then** the record contains `prompt_hash` + `response_hash` and omits `prompt` + `response`.
2. **Given** audit is on and redaction is on, **When** two submissions of the identical phrase occur, **Then** both records' `prompt_hash` values are equal (same SHA-256 over the same canonical prompt bytes).
3. **Given** audit is on and redaction is off, **When** a submission produces a prompt/response, **Then** `prompt` + `response` fields appear as raw UTF-8 strings AND `prompt_hash` + `response_hash` still appear — hashes are always present for cross-mode correlation.

---

### User Story 3 - Audit channel is reliable under failure, reload, and volume (Priority: P3)

The audit channel MUST be robust: it must not drop records silently, must survive webview reload (the audit writer lives in the extension host), must survive the provider call failing, and must not consume unbounded memory during a long session. Under sustained submission load (e.g. 100 submissions over 10 minutes) the channel continues to emit one line per submission without corruption or truncation.

**Why this priority**: Reliability is non-negotiable for an audit surface, but the failure modes are sufficiently well-understood (append-only write to a VS Code OutputChannel is very simple) that a dedicated user story mostly codifies the resilience bar rather than describing new design. P3.

**Independent Test**: Issue 100 submissions (mix of success + failure classes), capture the channel output, confirm exactly 100 JSON Lines, each parseable, each with the expected fields. Reload the webview mid-sequence; confirm audit continues uninterrupted. Force the provider call to throw an exception; confirm the audit record is still written (with `outcome` reflecting the failure).

**Acceptance Scenarios**:

1. **Given** 100 submissions across success + all seven failure classes, **When** the session completes, **Then** exactly 100 valid JSON Lines appear in the audit channel, one per submission, with `submission_id` uniquely identifying each.
2. **Given** the webview reloads mid-session, **When** submissions continue afterwards, **Then** the audit stream continues uninterrupted from the extension host; no records lost on the host side.
3. **Given** the provider call throws an unexpected exception (not one of the seven classified failure modes), **When** the exception is caught, **Then** an audit record is still emitted with `outcome: "unhandled-exception"` and the exception name (but not stack trace content, which might include sensitive paths).

---

### Edge Cases

- **Setting toggled off mid-submission**: A submission starts with audit on, then the analyst toggles it off before the response arrives. The in-flight submission's audit record MUST still be written — the toggle affects the next submission, not the pending one.
- **Very large response**: A response that exceeds the `debrief.nlSearch.maxResponseBytes` ceiling (from #191) is truncated before audit; the audit record captures `response_truncated: true` and the bytes actually received. No unbounded logging.
- **Multi-workspace VS Code**: Each workspace / window that has the extension loaded writes to its own "Debrief NL Audit" channel; records do not cross workspaces. `session_id` in each record distinguishes windows.
- **Output channel size in VS Code**: VS Code `OutputChannel` is in-memory with an internal cap. For durable SIEM ingest, an optional `debrief.nlSearch.audit.filePath` setting writes to an on-disk file in addition to the channel. The file is append-only, JSON Lines, no rotation (ops team rotates via their own log pipeline).
- **Prompt or response contains non-UTF-8 bytes**: Audit captures best-effort UTF-8 with replacement characters; `prompt_encoding` / `response_encoding` fields record if replacement occurred, so the reviewer knows the record may not round-trip.
- **Redaction + schema validation failure**: The `malformed-response` case with redaction on captures `response_hash` but omits the raw body. This may limit forensic utility; the spec notes this tradeoff explicitly — reviewers who need content for malformed cases should run with redaction off.
- **Clock skew**: Timestamps use the local machine clock (ISO-8601 UTC with `Z` suffix). Not synchronised with the provider's clock. The audit record notes `clock_source: "local-system"` to make this explicit for the reviewer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept `debrief.nlSearch.audit.enabled` as a new boolean VS Code setting. Default MUST be `false`. No audit records MUST be emitted when the setting is `false` — zero observable effect on the extension, no Output channel created.
- **FR-002**: When the setting is `true`, the system MUST emit exactly one audit record per submission to a dedicated VS Code `OutputChannel` named `Debrief NL Audit` (distinct from any existing Debrief debug / log channel).
- **FR-003**: Each audit record MUST be a single line of valid JSON (JSON Lines format) and MUST contain at minimum the following fields: `timestamp` (ISO-8601 UTC), `session_id` (extension activation UUID), `submission_id` (unique per submission), `panel_origin` (from #195 if merged, else "catalog-overview"), `provider`, `model`, `outcome` (one of the seven unified classes + `unhandled-exception`), `duration_ms`, `prompt`, `response`, `prompt_hash` (SHA-256 hex), `response_hash` (SHA-256 hex).
- **FR-004**: When `debrief.nlSearch.audit.redactContent = true`, audit records MUST omit the `prompt` and `response` fields while retaining `prompt_hash` and `response_hash`. When `redactContent = false` (default when audit is enabled), BOTH the raw fields AND the hashes MUST appear — hashes are always emitted for cross-mode correlation.
- **FR-005**: The audit writer MUST live in the extension host, not the webview. It MUST survive webview reloads; a webview reload MUST NOT drop in-flight audit records.
- **FR-006**: Failed submissions (any of the seven `LiveOutcome` classes from #191, or an unhandled exception) MUST produce audit records with `outcome` set to the failure class name. No submission outcome is silently unlogged when audit is enabled.
- **FR-007**: Audit records MUST NOT contain the provider API key, the raw Authorization header, or any other credential material. The audit writer MUST be verified not to reflect credentials even in the `unhandled-exception` path.
- **FR-008**: The audit channel MUST NOT introduce a new network call or send any data off-machine. Audit is a local-only concern; forwarding to a remote SIEM is the operator's responsibility (via VS Code log forwarder, Fluent Bit, etc.).
- **FR-009**: Toggling `debrief.nlSearch.audit.enabled` from false to true (or back) MUST take effect on the next submission without requiring an extension reload. Toggling off MUST NOT drop in-flight submissions' audit records.
- **FR-010**: An optional `debrief.nlSearch.audit.filePath` setting MAY be configured to an absolute path. When set and audit is enabled, each record MUST additionally be appended to that file in JSON Lines format. The file MUST be opened in append-only mode; the extension MUST NOT rotate, truncate, or delete the file. If the file is unwriteable on submission, the failure MUST be reported once in the audit channel with `{ outcome: "audit-file-unwriteable", path, error }` and subsequent failures MUST NOT spam the channel (one-shot failure notice per session).
- **FR-011**: The canonical prompt bytes used for `prompt_hash` MUST be deterministic: the exact JSON body sent to the provider, after prompt adapter serialisation (from #196 if merged), before provider credential injection. This gives cross-record correlation within a provider; prompt hashes across providers will differ by design (different adapter output).
- **FR-012**: The feature MUST NOT alter the existing #191 structured telemetry (FR-007). The two records (telemetry + audit) MAY correlate via `submission_id` but are emitted via independent code paths to independent sinks.

### Key Entities

- **AuditRecord**: The JSON Lines payload emitted per submission. Fields enumerated in FR-003. `submission_id` is a monotonically-ordered ULID or UUIDv4. `session_id` is set once per extension activation.
- **AuditWriter**: An extension-host singleton with a single public method `write(record: AuditRecord): void`. Handles channel emission, optional file append, and credential-scrubbing verification. Ownership lives in `apps/vscode/src/services/auditWriter.ts`.
- **AuditSinks**: A small set of sinks the AuditWriter fans out to — always the `OutputChannel`, optionally an on-disk JSON Lines file if `audit.filePath` is set.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Enable compliance / forensic review of NL-search interactions without imposing audit cost on users who do not need it.
- **Key Decision(s)**:
  1. Whether to enable audit at all (default off — privacy-first).
  2. If enabled, whether to redact content (for organisations that need audit but cannot log content).
  3. If enabled, whether to additionally write to a file (for durable / SIEM ingest) or rely on the in-memory Output channel.
- **Decision Inputs**:
  - Setting descriptions in VS Code Settings UI clearly naming privacy implications.
  - Output channel visibility (users can open it and read what's being logged, under their account).
  - Absence of outbound network — any audit data stays on-machine.

### Screen Progression

This feature is configuration-driven; the primary UI flow is in Settings + the Output panel.

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | VS Code Settings open, audit disabled (default) | Enables `debrief.nlSearch.audit.enabled` | Setting saved; no immediate effect |
| 2 | Analyst submits a phrase in any NL-enabled panel | (none — system acts) | Submission resolves; a JSON Lines record appears in the "Debrief NL Audit" Output channel |
| 3 | Compliance officer opens the Output dropdown, selects "Debrief NL Audit" | (observes records) | Record is visible; fields match FR-003 |
| 4 | Compliance officer configures `audit.filePath` to `/var/log/debrief/audit.jsonl` | (next submission) | Record appears in both the Output channel AND the file |
| 5 | Officer needs redaction; enables `audit.redactContent` | (next submission) | Records now contain hashes but no raw prompt/response |

### UI States

- **Empty State (audit off)**: Nothing. No Output channel visible; no log file. Zero observable footprint.
- **Empty State (audit on, no submissions yet)**: Output channel visible in the dropdown, empty contents; file created with size 0 if `audit.filePath` configured.
- **Active State**: Output channel fills line-by-line as submissions occur; file grows monotonically.
- **File-Unwriteable State**: One diagnostic record in the Output channel: `{ outcome: "audit-file-unwriteable", path, error }`. Subsequent submissions still emit to the Output channel; the file is not retried in-session.
- **Redaction State**: `prompt` + `response` fields absent; `prompt_hash` + `response_hash` present.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With audit disabled (default), an extension activation over a representative session (100 submissions) produces zero bytes of audit output — verified by capturing `ls -la` of any log file location before and after, and by checking the Output dropdown for absence of the "Debrief NL Audit" channel.
- **SC-002**: With audit enabled (full content), over 100 representative submissions, every record parses as valid JSON Lines (`jq -c . audit.jsonl > /dev/null` exits 0), and every required field (FR-003 enumeration) is present and non-null in every record.
- **SC-003**: With audit enabled + redaction on, zero audit records contain a `prompt` or `response` field, across 100 submissions — verified by `jq 'select(.prompt != null or .response != null)' audit.jsonl` returning empty.
- **SC-004**: Credential-scrubbing: an automated test injects a fake API key into the configured provider slot, runs audit over a representative submission, and asserts the audit record contains zero occurrences of that key string (tested per provider when #196 is merged).
- **SC-005**: Reliability: 100 submissions under varying failure classes produce 100 audit records; zero records lost on webview reload or provider exception; verified by a soak test.
- **SC-006**: Hash correlation: submitting the identical phrase twice (same prompt-adapter input) produces two records with equal `prompt_hash` — verified for every provider adapter.
- **SC-007**: SIEM ingest compatibility: the audit file can be consumed by a representative SIEM ingest tool (`fluent-bit` with a JSON Lines parser) without error — verified in a CI job that pipes a generated fixture audit file through fluent-bit and asserts exit code 0 + expected record count.

## Assumptions

- #191's `llmProxy.ts` (extension host) already owns the provider-call site and the outcome classification. The audit writer plugs in at this call site as a post-classification hook, after the outcome is known but before the webview message is dispatched. Minimal coupling.
- #191's structured telemetry (FR-007) uses the `LogService` from `@debrief/session-state`. The audit trail DOES NOT use `LogService` — it uses a distinct `OutputChannel` directly, to keep the two concerns in non-overlapping surfaces and to avoid accidentally mixing audit content into existing log streams reviewed by other personas.
- `OutputChannel` semantics are used as-is — one append per record, VS Code handles buffering and rendering. No custom output rendering, no structured viewer.
- JSON Lines (https://jsonlines.org/) is the correct wire format for SIEM ingest — confirmed by fluent-bit, Splunk, and Elastic all supporting it as a first-class input.
- Hashes use SHA-256 over UTF-8-encoded canonical bytes. SHA-256 is sufficient for correlation purposes; no cryptographic collision-resistance claim is required for this non-security use case.
- `submission_id` uses ULID (time-ordered) rather than UUIDv4, for natural sort-by-time properties in SIEM review. The choice is recorded in the plan.
- The feature adds two VS Code settings (`audit.enabled`, `audit.redactContent`) and one optional setting (`audit.filePath`). All live under the existing `debrief.nlSearch.*` namespace from #191.
- This feature does NOT introduce non-Anthropic providers (#196 — audit works with whichever provider is active), does NOT extend NL-mode to new panels (#195 — audit captures `panel_origin` from whatever #195 contributes, defaulting to `catalog-overview` if #195 is not yet merged), and does NOT change the banner / failure classification (#198's `keyring-unavailable` class, if merged, simply appears as a valid `outcome` value).
