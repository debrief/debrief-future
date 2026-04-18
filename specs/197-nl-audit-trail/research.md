# Research: NL Search — Per-Prompt Audit Trail (Opt-In)

**Feature**: 197-nl-audit-trail
**Phase**: 0 (outline & research)
**Date**: 2026-04-18

This document captures the six design decisions that close the open technical questions from spec.md and resolve every "NEEDS CLARIFICATION" — of which there were none, because the parent feature (#191) fixed the surrounding architecture. Each decision lists alternatives considered and the test that proves the chosen option.

---

## Decision 1 — Default log path: `ExtensionContext.globalStorageUri`, administrator-overridable

**Decision**: Audit log files default to `<ExtensionContext.globalStorageUri>/nl-audit.jsonl` and `<ExtensionContext.globalStorageUri>/nl-audit-archive.jsonl`. A site administrator can redirect both files to a SIEM-agent-watched directory by setting `debrief.nlSearch.audit.path` in a workspace or managed settings layer. If the override path is set but unwritable at startup, the first write triggers the standard write-failure handling (Decision 6).

**Rationale**:
- `globalStorageUri` is the canonical VS Code location for per-install extension artefacts. It survives VS Code restarts, is not synced across machines (settings sync excludes it by default), and is permissioned to the current OS user on every supported platform (Windows `%APPDATA%`, macOS `~/Library/Application Support`, Linux `$XDG_DATA_HOME`).
- SIEM agents (Splunk UF, Elastic Filebeat, Azure Monitor Agent) are tail-based: they want a stable, predictable path a site administrator controls. The override setting delivers that without changing the default for analysts who are not running a SIEM.
- The existing `resultsPanelService.ts` and `stacService.ts` patterns already use `globalStorageUri` for extension-local files — one less path helper to invent.

**Alternatives considered**:
- *Workspace-scoped path (`.vscode/nl-audit.jsonl` under the open folder)* — rejected: plots are workspace-scoped, but analysts may submit NL searches across multiple plots within one session, and a workspace-scoped log would fragment the audit trail per open workspace. Administrators deploying audit across sites want a single location to tail.
- *System-wide path (`/var/log/debrief/nl-audit.jsonl`)* — rejected: would require elevated install permissions on Windows/macOS and is outside the extension's write jurisdiction. Administrators who want this can still get it via the override setting; defaulting there would fail out-of-box.
- *Unconditional override path (no default — setting required)* — rejected: raises the bar for the P1 "single-workstation forensic investigation" user story (spec §User Story 1); the investigator would need to configure a path before enabling the feature.

**Test**: E2E — default-path test writes to `globalStorageUri`; override-path test writes to a workspace-settings directory. Both assert the file lands at the expected location and contains one well-formed record after a submitted phrase.

---

## Decision 2 — Rotation policy: active JSONL capped at N, overflow appended to archive (reuses #193 pattern)

**Decision**: The active file `nl-audit.jsonl` is capped at `audit.activeCap` entries (default **500**, settable 50–10000). On the (cap+1)-th write, the oldest entry is removed from the active file and appended to `nl-audit-archive.jsonl`. The active file is rewritten via the atomic temp+rename helper already in `apps/vscode/src/services/stacService.ts`; the archive is append-only. Both files live in the same directory (default or override).

**Rationale**:
- Structural parity with #193's `provenance_log_archive.jsonl` pattern (same helper, same append-only discipline, same directory semantics) means operators learn one log-shape mental model. #194 (unified rotation policy, proposed) will collapse both under one policy in a single PR — our code will follow the same move.
- 500 entries is the same default cap #193 chose for per-item provenance. Analyst typical daily volume for NL search is on the order of tens of submissions, so 500 covers ~2–3 weeks of a heavy user before any rotation at all.
- Append-only archive preserves Article III.3 ("audit trail immutable") — existing entries are never rewritten once rotated out. The active file is rewritten on rotation, but only to remove the rotated entry's line; all surviving lines are byte-identical before and after.

**Alternatives considered**:
- *Unbounded single file* — rejected: a long-running workstation could grow an unbounded file; violates the spec's FR-012 "audit log disk footprint MUST be bounded".
- *Size-based rotation (rotate at X MB)* — rejected: makes the cap analyst-visible as "it just rotated at some boundary I can't predict". Entry-count caps are deterministic and unit-testable.
- *Daily rotation (rotate at midnight UTC)* — rejected: simple log volume doesn't justify adding a wall-clock timer; midnight boundaries don't map to analyst workflows.
- *Per-call separate file* — rejected: explodes directory entries for SIEM agents that index directory listings.

**Test**: Unit — set `activeCap = 2`, emit 3 records, assert active file has 2 lines and archive has the oldest record. Plus a property test that total records preserved across rotations equals records emitted.

---

## Decision 3 — Hook point: `llmProxy.ts` owns audit emission; no new call-site in FilterBar or providerCall

**Decision**: The audit sink is invoked from exactly two sites inside `apps/vscode/src/services/llmProxy.ts` (introduced by #191):

1. **`not-configured` short-circuit** (key missing): before returning the synthetic `LiveNotConfigured` outcome, call `auditSink.record({ phrase, outcome, callIndex, durationMs: 0 })`.
2. **`providerCall` `finally`** (every other outcome class): after `providerCall` resolves, call `auditSink.record({ phrase, outcome, callIndex, durationMs, responseBody })`. The `finally` block also handles the `Map<requestId, AbortController>` cleanup from #191 Decision 15 — audit emission is co-located with it.

**Rationale**:
- `llmProxy.ts` is the single choke point on the VS Code transport: every outcome class — including `not-configured` and `ceiling-reached`, which never reach `providerCall.ts` — passes through it. This guarantees spec FR-003 ("one audit record per call, regardless of outcome") with a single code-path invariant.
- FilterBar never touches prompt/response bytes directly (it calls `client.generate()` and receives a `LiveOutcome`); hooking audit there would require promoting the phrase into the outcome, changing the #191 data-model for no new reason.
- `providerCall.ts` is provider-neutral and transport-agnostic — hooking audit there would tie the audit mechanism to one transport and break the browser-proxy path (which doesn't write local audit logs).
- Co-locating with the `finally`-delete from #191 Decision 15 means one developer discipline ("every exit from this `finally` does both cleanup and audit") rather than two.

**Alternatives considered**:
- *Hook in `providerCall.ts`* — rejected (see above — transport-coupling issue).
- *Hook via a message-bus event on the extension host* — rejected: one more indirection without benefit; the `llmProxy` is already the right layer.
- *Hook in FilterBar (webview)* — rejected: webview has no filesystem access, would require a new message variant just to forward the audit payload back to the host (defeating the "no new messages" goal in Decision 5).

**Test**: Unit over `llmProxy.ts` — for each `LiveOutcome` kind, assert exactly one `auditSink.record(...)` call with the expected shape. Integration — stub `providerCall` returning each outcome, assert the on-disk file contains the matching line.

---

## Decision 4 — Record shape: flat JSON, schemaVersion-tagged, response body at top level

**Decision**: Each audit record is a flat JSON object with the following top-level fields (full type in `contracts/audit-record.ts`, full runtime schema in `contracts/audit-record.schema.json`):

```text
{
  "schemaVersion": "1",
  "callIndex": <int>,                 // joins to #191 [nl-search/live] telemetry line
  "timestampUtc": "<ISO-8601 with Z>",
  "provider": "anthropic" | ...,
  "model": "<model-id>",
  "outcome": { kind, ...fields-per-kind },  // #191 LiveOutcome union, minus rawResponse
  "phrase": "<full prompt submitted>",
  "responseBody": "<string>" | null,  // bounded at maxResponseBytes; null for pre-provider outcomes
  "responseBodyTruncated": <bool>,
  "durationMs": <int>
}
```

**Rationale**:
- **Flat, top-level fields**: SIEM field mappings are far easier over a flat record than nested trees. A Splunk `props.conf` or Elastic ingest pipeline can point one source-field-name → one destination field.
- **`schemaVersion` first**: single-character version tag lets SIEM parsers branch on future record shapes without schema-version fields hiding inside nested `outcome` objects.
- **Response body at top level, not nested in `outcome.rawResponse`**: decouples "what the model said" from "how we classified it". A malformed response still has a (non-JSON) body worth keeping. An oversize response has a truncated body worth keeping. Placing `responseBody` at the top level with its own `truncated` flag means one SIEM field per concern.
- **`outcome` stays a union**: the #191 `LiveOutcome` union is already well-typed and covers every outcome class. We re-use it verbatim (minus its `rawResponse` field, which we promote to the top level) so the audit record and the #191 banner wiring share one outcome vocabulary.
- **`callIndex` as the correlation key**: #191's lean telemetry line already carries `callIndex`. Using the same field (and value) in the audit record gives the operator a trivially queryable join (`callIndex == 4711`) in their SIEM.

**Alternatives considered**:
- *Nest the prompt + response under a single `payload` subtree* — rejected: every SIEM field mapping would have to traverse one more level for no new semantic value.
- *Capture request headers* — rejected: the only interesting header is `x-api-key`, which we explicitly exclude (FR-008). Nothing else carries forensic value.
- *Capture a hash of the response instead of the body* — rejected: defeats the forensic-review purpose entirely. The whole point of the feature is the body.

**Test**: Unit — round-trip every `LiveOutcome` kind through `auditSink.record(...)` and assert the emitted JSON conforms to `audit-record.schema.json`. Negative test — a sentinel API-key string is never present in any emitted record (bytes-level grep over a synthetic session).

---

## Decision 5 — Indicator wiring: one new boolean on `VsCodeLiveConfig`, pushed via existing `nlConfig` message

**Decision**: Extend `VsCodeLiveConfig` from `#191`'s `contracts/llm-client.ts` with one field:

```text
readonly auditEnabled: boolean
```

The extension host reads `debrief.nlSearch.audit.enabled` at startup and on `workspace.onDidChangeConfiguration`, then pushes a fresh `nlConfig` message to the webview (same path #191 already uses to push config updates). FilterBar renders `<AuditCaptureIndicator />` conditionally on `config.transport === "vscode-host" && config.auditEnabled`.

**Rationale**:
- The `nlConfig` message pathway already exists in #191 (the webview needs to know `hasApiKey`, `callCeiling`, etc.); adding one boolean is free.
- A new webview↔host message variant for the indicator alone would violate the "minimise new messages" design posture #191 adopted (review Decision 2 — four variants was the deliberate cap).
- The indicator is a pure function of config; making it data-driven (rather than event-driven) means no edge cases around missing/duplicated events.

**Alternatives considered**:
- *New `auditStatusChanged` message variant* — rejected: extra type surface for no semantic win.
- *Derive the indicator state in the webview from a localStorage-cached setting value* — rejected: the webview shouldn't know where settings come from; the host already owns that.
- *Always show the indicator and dim it when off* — rejected: the whole point is that the default posture (audit off) looks identical to #191 today (SC-001).

**Test**: Unit — `FilterBar.audit.test.tsx` toggles `config.auditEnabled`, asserts indicator presence exactly follows the flag. E2E — setting toggle in VS Code updates the indicator within one event loop.

---

## Decision 6 — Failure surfacing: one-shot per-session warning via `LogService.warn` into the existing `[nl-search/live]` output channel

**Decision**: If a write to the audit log fails (disk full, permission denied, path missing), `auditSink` catches the error locally and:

1. On the **first** failure in the current extension-host session, calls `LogService.warn` with a single-line message naming the failing path and the error class. This surfaces into the existing `[nl-search/live]` output channel from #191.
2. On **subsequent** failures in the same session, the error is silently dropped (a session-scoped `hasWarned` flag gates the warning).

The NL-search call itself proceeds as if the audit write succeeded — the `finally` branch never awaits the audit write's outcome.

**Rationale**:
- **FR-010**: the call MUST NOT fail or slow due to audit sink issues. Fire-and-forget with local error capture delivers this without leaking errors into the call's promise chain.
- **FR-011**: operators MUST be told when audit capture has failed. One warning per session is the minimum that surfaces the problem; repeated failures in the same session almost always have the same cause (wrong path, wrong permissions) — one warning per session per failure class is enough to investigate. This is the same rate-limiting posture that #194 (proposed unified policy) is expected to standardise.
- **Reusing the existing `[nl-search/live]` channel**: operators who look at the #191 channel for NL-search health will find audit-failure notices in the same place. No hunting across channels.

**Alternatives considered**:
- *Separate `[nl-search/audit]` output channel just for the warning* — rejected: one warning per session doesn't justify a new channel, and splits the operator's mental model.
- *Modal / toast notification* — rejected: opt-in audit is a site-admin concern, not an analyst concern; a toast on the analyst's screen is an error signal to the wrong audience.
- *Throw the error up to FilterBar* — rejected: violates FR-010 (call degrades or fails).

**Test**: Unit — mock `fs.writeFile` to reject once; assert one `LogService.warn` call with the expected message, and (via a second reject) assert no second warning is emitted in the same session. E2E — set `audit.path` to a read-only directory, submit phrase, assert NL-search happy-path succeeds and the warning appears in the output channel.
