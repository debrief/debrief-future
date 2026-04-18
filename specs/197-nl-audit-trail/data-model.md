# Data Model: NL Search — Per-Prompt Audit Trail (Opt-In)

**Feature**: 197-nl-audit-trail
**Phase**: 1 (design)
**Date**: 2026-04-18

Three in-memory / on-disk entities plus a write-side state machine. Full type definitions in `contracts/audit-record.ts`; runtime schema (for SIEM field mapping and E2E assertions) in `contracts/audit-record.schema.json`. No LinkML involvement — the audit record is internal observability data, not user-facing schema data (Constitution Article II applies to the master data model; audit records are the operator's log, not the analyst's data).

---

## 1. `AuditRecord` — the on-disk line format

**Purpose**: One complete, self-describing JSON object written as a single line to `nl-audit.jsonl` per NL-search call. Represents the forensic ground-truth record of one NL-search interaction.

**Shape** (verbatim in `contracts/audit-record.ts`):

```text
interface AuditRecord {
  schemaVersion: "1"                  // string, explicit version tag
  callIndex: number                   // joins to #191 [nl-search/live] telemetry line
  timestampUtc: string                // ISO-8601 with explicit Z suffix
  provider: "anthropic"               // future-expandable — see #196
  model: string                       // e.g. "claude-haiku-4-5-20251001"
  outcome: AuditOutcome               // #191 LiveOutcome, minus rawResponse
  phrase: string                      // full prompt submitted (trimmed; length ≤ 500)
  responseBody: string | null         // bounded at maxResponseBytes; null when no body ever arrived
  responseBodyTruncated: boolean      // true iff the body was truncated by #191's maxResponseBytes
  durationMs: number                  // same measurement #191 records
}
```

**`AuditOutcome`** — the #191 `LiveOutcome` union with `rawResponse` stripped out (it is promoted to `AuditRecord.responseBody`). Every existing outcome kind is preserved: `success`, `auth-failure`, `rate-limit`, `provider-error`, `transport-error`, `timeout`, `malformed-response`, `not-configured`, `ceiling-reached`.

**Invariants**:
- Every field is present on every record (no `undefined`). Fields that don't apply to an outcome kind are explicit `null` (e.g. `responseBody = null` on `not-configured` and `ceiling-reached`).
- `phrase` is never `null` or empty; if it were, no record would have been emitted in the first place.
- `callIndex` is unique within a session (monotonically increasing from #191's existing counter).
- `timestampUtc` matches the exact wall-clock instant `llmProxy.ts` saw the submission; not the instant of file write (writes can be delayed by Decision 6's fire-and-forget queue).
- No field anywhere in the record ever contains the API key, the `x-api-key` header, or any substring of credential material — enforced by a sentinel-key negative test at unit level.

---

## 2. `AuditSettings` — the configuration snapshot

**Purpose**: The four settings that control audit behaviour. Read at startup and on `workspace.onDidChangeConfiguration`; pushed to the webview via the `nlConfig` message from #191 (the `enabled` field only — the other three are host-internal).

| Field | Setting Key | Default | Validation | Consumer |
|---|---|---|---|---|
| `enabled` | `debrief.nlSearch.audit.enabled` | `false` | boolean | `auditSink` (on/off), webview (indicator) |
| `path` | `debrief.nlSearch.audit.path` | `<globalStorageUri>` | absolute path; writable at startup OR first write triggers Decision 6 failure handling | `auditSink` (where to write) |
| `activeCap` | `debrief.nlSearch.audit.activeCap` | `500` | integer 50 ≤ N ≤ 10000 | `auditSink` (rotation threshold) |
| `captureNotConfigured` | `debrief.nlSearch.audit.captureNotConfigured` | `true` | boolean | `llmProxy` (whether to emit on the key-missing short-circuit) |

**Invariants**:
- `enabled === false` ⇒ `auditSink` writes nothing, regardless of other settings.
- Changing `activeCap` downward does NOT trigger retroactive rotation of existing records beyond the new cap; the next written record applies the new cap going forward. (Rationale: mid-flight setting changes MUST NOT mutate existing records — Article III.3 audit-trail-immutable.)
- `path` changes take effect on the next write; an in-flight write flushes to the path that was live when the write was initiated (consistent with FR-015's "no half-auditing" posture).
- The `enabled` flag that reaches the webview reflects the host's current read, not a cached snapshot — one configuration-change event ⇒ one `nlConfig` push.

---

## 3. `AuditSink` — the write-side component

**Purpose**: The extension-host service that owns file I/O. Lazy-instantiated on first call to `record(...)`. Holds the rolling active-file cache in memory to avoid re-reading it on every write.

**Surface** (informal — full TypeScript in the implementation PR):

```text
class AuditSink {
  record(input: AuditRecordInput): void   // fire-and-forget; never throws
  flush(): Promise<void>                  // test-only; awaits pending writes
  dispose(): void                         // extension deactivate()
}

type AuditRecordInput = {
  callIndex: number
  provider: "anthropic"
  model: string
  outcome: AuditOutcome
  phrase: string
  responseBody: string | null
  responseBodyTruncated: boolean
  durationMs: number
  // NOTE: apiKey is deliberately NOT a field
}
```

**Write-side state machine** (per `record()` call):

```text
  record(input)
       │
       ▼
  [enabled?] ─ false ─▶ (return; no-op)
       │ true
       ▼
  [compose AuditRecord]  ─ schemaVersion, timestampUtc, ...
       │
       ▼
  [enqueue on micro-queue]  ─ pending writes resolved in submission order
       │
       ▼ (async, off the call's critical path)
  [read active-file cache size]
       │
       ├── size < activeCap ─▶ [append line] ─▶ done
       │
       └── size ≥ activeCap ─▶ [rotate: oldest line → archive, rewrite active file]
                                      │
                                      └── [append new line to fresh active file] ─▶ done

  On ANY filesystem error during append / rotate:
       │
       ├── hasWarnedThisSession === false ─▶ [LogService.warn once; set flag] ─▶ done
       └── hasWarnedThisSession === true  ─▶ [silently drop] ─▶ done
```

**Invariants**:
- `record()` NEVER throws and NEVER returns a rejected promise. The signature is `void` by design so callers cannot accidentally `await` it and block the NL-search call.
- Queue ordering is FIFO within a session; records appear in `nl-audit.jsonl` in the order of their corresponding NL-search submissions (not the order of file-write completion).
- The active-file cache is a size counter plus a line-buffer pointer; the full file is never held in memory. Reads on rotation use a streaming read to produce the rotated-out line.
- On `dispose()`, the sink `await`s any outstanding writes (up to a 5-second timeout) so the last submission before VS Code shutdown is captured.

---

## 4. Relationships to #191 entities

The audit trail does NOT redefine anything from #191. It attaches to these existing #191 entities:

| #191 Entity | Relationship |
|---|---|
| `LiveConfig` (`VsCodeLiveConfig`) | Adds `auditEnabled: boolean` — a single new field. All other fields untouched. |
| `LiveOutcome` | Stripped of `rawResponse` by a type helper (`AuditOutcome`) before inclusion in `AuditRecord`. The original union is unchanged for every other consumer. |
| `ProviderCallInput.callIndex` | Used verbatim as `AuditRecord.callIndex`. No new counter, no new correlation key. |
| `[nl-search/live]` Output Channel / `LogService` | Re-used for the one-per-session audit-write-failure warning (Decision 6). No new channel. |
| `llmProxy.ts` `Map<requestId, AbortController>` `finally` | Adds one line: `auditSink.record(...)`. Cleanup order: audit emission then map delete. |

---

## 5. Data-flow summary

```text
analyst keypress                  (in webview)
  │
  ▼
FilterBar.submit(phrase)          (checks config.auditEnabled only for indicator — not for audit write)
  │
  ▼ generate(prompt) via createPostMessageLLMClient
  │
  ▼ postMessage: nlGenerate
  │
  ▼ extension host: llmProxy.onNlGenerate
  │
  ├── no API key? ──▶ llmProxy builds LiveNotConfigured outcome
  │                         │
  │                         └──▶ auditSink.record({phrase, outcome, callIndex, durationMs:0, responseBody:null})
  │                         │     (off the critical path)
  │                         │
  │                         └──▶ nlOutcome message back to webview
  │
  └── has API key? ──▶ providerCall(ProviderCallInput)
                              │
                              ▼ resolves to a LiveOutcome
                              │
                              ▼ finally {
                              │   auditSink.record({phrase, outcome, callIndex, durationMs, responseBody})
                              │   requestIdMap.delete(requestId)       // #191 Decision 15
                              │ }
                              │
                              └──▶ nlOutcome message back to webview

auditSink write-side (async, off the critical path):
  ┌─────────────────────────────┐
  │  compose AuditRecord        │
  │  ▶ enqueue on micro-queue   │
  │  ▶ maybe rotate             │
  │  ▶ append line to JSONL     │
  │  ▶ on error: maybe warn once│
  └─────────────────────────────┘
```

No data flows back from `auditSink` to the NL-search call; the call returns to FilterBar as soon as `llmProxy` has its `LiveOutcome`. The webview never sees `AuditRecord`; only the extension host does.
