# Implementation Plan: NL Search — Per-Prompt Audit Trail (Opt-In)

**Branch**: `197-nl-audit-trail` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/197-nl-audit-trail/spec.md`

## Summary

Add an opt-in, off-by-default audit log of NL-search submissions that writes full prompt + response content (with an optional redaction-to-hash mode) to a dedicated VS Code `OutputChannel` named "Debrief NL Audit" and optionally to an append-only JSON Lines file on disk. The feature is additive to #191's existing structured telemetry (which remains unchanged and content-free). No outbound network, no shared log channel, no per-submission degradation when disabled.

**Technical approach**: Introduce `apps/vscode/src/services/auditWriter.ts` — an extension-host singleton with `write(record: AuditRecord): void` and `configure(config: AuditConfig): void` methods. `llmProxy.ts` (from #191), after classifying a submission's outcome, calls `auditWriter.write({ ... })` as a post-classification hook. The writer fans out to (a) the `OutputChannel`, and (b) an optional append-only `fs.createWriteStream(path, { flags: "a" })` if `debrief.nlSearch.audit.filePath` is set. SHA-256 hashes are computed with Node stdlib `crypto.createHash("sha256")`. `submission_id` uses `ulid` (or a minimal inline ULID implementation — 20-line function is zero-dep). Three new VS Code settings: `debrief.nlSearch.audit.enabled`, `debrief.nlSearch.audit.redactContent`, `debrief.nlSearch.audit.filePath`. When `audit.enabled = false`, `auditWriter.write` is a no-op that returns early — zero I/O cost, no channel creation.

## Technical Context

**Language/Version**: TypeScript 5.x (extension host only; no webview changes; no shared component changes). Existing toolchain.
**Primary Dependencies**: VS Code Extension API ^1.85.0 (`window.createOutputChannel`), Node stdlib `crypto` (SHA-256), Node stdlib `fs` (append-only file writes). Optional: inline 20-line ULID generator or accept adding `ulid` as a dev-only dep (prefer inline — zero new deps policy).
**Storage**: No new secret storage. Audit file written to an operator-supplied absolute path if configured; no default path. Output channel is VS Code-managed in-memory buffer.
**Testing**: vitest (unit — AuditWriter: no-op when disabled, channel creation on enable, file append, redaction mode, credential scrubbing, hash determinism); pytest-equivalent via vitest for the soak test (100 submissions); a single CI job that pipes a generated fixture file through fluent-bit and asserts exit code 0 + record count.
**Target Platform**: VS Code 1.85+ on any OS. File path must be an absolute, writeable path on the analyst's machine.
**Project Type**: single — all changes under `apps/vscode/src/services/` + `apps/vscode/package.json`. No shared-component changes. No webview changes.
**Performance Goals**: Disabled-state: zero measurable overhead per submission (early-return in `auditWriter.write`). Enabled-state: audit record construction + emit ≤ 5 ms per submission on a typical machine. Soak: 100 submissions over 10 minutes emit 100 records with zero loss, zero corruption, zero visible latency impact on analyst submissions.
**Constraints**: (1) Zero outbound network — audit is on-machine only. (2) Zero cross-contamination with existing #191 telemetry — separate code path, separate sink. (3) Credential scrubbing verified by automated test — audit records contain no API key fragment. (4) File I/O failure does not block submissions — one diagnostic record then suppress file writes for the rest of the session. (5) Redaction mode omits content but always emits hashes.
**Scale/Scope**: One new service file (~150 lines), one test file (~300 lines), three settings additions, one call-site edit in `llmProxy.ts`. Smallest code footprint of the three sibling features, largest documentation / rationale footprint due to compliance context.

## Constitution Check

*GATE: pre- and post-design both pass. Nothing requires justification.*

| Article | Assessment |
|---|---|
| I. Defence-Grade Reliability | **PASS** — audit is opt-in; default off matches analyst privacy expectation; enabled mode is resilient (no lost records under normal failure paths). |
| III. Data Sovereignty | **PASS** — audit is local-only. No outbound network. Operator controls where records go (if anywhere beyond the Output channel). |
| IV. Architectural Boundaries | **PASS** — AuditWriter lives in the extension host; no webview awareness; #191 telemetry and #197 audit are independent. |
| VI. Testing | **PASS** — unit tests per behaviour, soak test for reliability, fluent-bit ingest test for SIEM compatibility. |
| IX. Dependencies | **PASS** — zero new runtime dependencies (inline ULID). |
| X. Security | **PASS** — credential scrubbing verified by automated test. Hashes are SHA-256 (non-cryptographic-use but sufficient for correlation). |
| XIV. Pre-Release Freedom | **N/A** — purely additive. |
| XV. Strict Type Safety | **PASS** — `AuditRecord` is a typed union discriminated by `redactContent` (with vs without raw content); `AuditOutcome` is a literal union covering all #191 outcomes + `unhandled-exception` + `audit-file-unwriteable`. |

No violations. **Complexity Tracking section intentionally omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/197-nl-audit-trail/
├── plan.md              # This file
├── spec.md              # Produced by /speckit.specify
├── data-model.md        # Phase 1 — AuditRecord schema (for SIEM ingest documentation)
├── quickstart.md        # Phase 1 — operator guide: enable, configure, ingest into fluent-bit / Splunk / Elastic
├── contracts/
│   └── audit-record.schema.json  # JSON Schema for AuditRecord — publishable alongside the feature for SIEM consumers
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── tasks.md             # /speckit.tasks output — not created here
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── services/
│   │   ├── auditWriter.ts                # NEW: extension-host singleton
│   │   │                                  #   exports: configureAuditWriter(config), writeAuditRecord(record)
│   │   │                                  #   owns: OutputChannel | null, append file stream | null,
│   │   │                                  #         session_id (UUID), credential-scrubber function
│   │   │                                  #   early-returns when config.enabled === false
│   │   └── auditWriter.test.ts           # NEW: unit tests
│   │                                      #   - disabled = zero side effects (no channel, no file)
│   │                                      #   - enable mid-session creates channel on next write
│   │                                      #   - redactContent omits prompt/response, keeps hashes
│   │                                      #   - credential scrubbing: inject fake key, assert absent from record
│   │                                      #   - file-unwriteable produces single diagnostic record, subsequent
│   │                                      #     file writes suppressed for session
│   │                                      #   - outcome: unhandled-exception captures error class name not stack
│   │                                      #   - hash determinism: same prompt bytes → same hash across runs
│   │                                      #   - 100-submission soak completes with 100 valid JSON Lines records
│   ├── services/
│   │   ├── llmProxy.ts                   # EDIT: after outcome classification, call writeAuditRecord(...)
│   │   │                                  #       pass submission_id, panel_origin (from #195 if merged),
│   │   │                                  #       provider + model (from #196 if merged, else "anthropic" + model),
│   │   │                                  #       outcome kind, duration_ms, prompt, response, chips
│   │   └── llmProxy.test.ts              # EDIT: add test — audit enabled captures per-outcome records;
│   │                                      #       audit disabled produces zero records
│   └── extension.ts                      # EDIT: activate() calls configureAuditWriter(currentConfig),
│                                          #       registers workspace.onDidChangeConfiguration to
│                                          #       re-configure the writer when audit.* settings change
└── package.json                          # EDIT: add three settings —
                                           #       debrief.nlSearch.audit.enabled (boolean, default false)
                                           #       debrief.nlSearch.audit.redactContent (boolean, default false)
                                           #       debrief.nlSearch.audit.filePath (string, no default)
```

**Structure Decision**: Entire feature is contained in one new service file plus a minimal hook in `llmProxy.ts`. No shared-component changes, no webview changes, no new directories. The JSON Schema published at `specs/197-nl-audit-trail/contracts/audit-record.schema.json` is a documentation artefact — it is not imported by runtime code.

## Applied Design Decisions (8)

| # | Decision | Applied in |
|---|---|---|
| 1 | AuditWriter is an extension-host singleton (module-scoped state, not a class). Simpler than class-per-session; sufficient because activation already produces exactly one instance per VS Code window. | `apps/vscode/src/services/auditWriter.ts` |
| 2 | Disabled = zero observable effect. The `writeAuditRecord` function early-returns when `config.enabled === false`. No OutputChannel is created when disabled, so users with audit off never see an empty channel in the dropdown. | `auditWriter.ts` — single guard at function entry |
| 3 | Redaction is orthogonal to enable: if audit is on, records always include hashes; raw `prompt`/`response` are included only if `redactContent === false` (the default). This makes hash identity a reliable correlation key regardless of redaction mode. | `auditWriter.ts` — `buildRecord` assembles fields based on `redactContent` |
| 4 | `submission_id` uses ULID (Crockford base32, time-ordered). Inline 20-line generator — zero new dependency. Records sort naturally by submission time without a sort step. | `auditWriter.ts` — inline `generateUlid()` function |
| 5 | Credential scrubbing is a defence-in-depth check: before emitting a record, the serialised JSON is scanned for any known credential substring (the cached API keys in memory). If a match is found — which should never happen in practice — the record is downgraded to `{ outcome: "audit-credential-scrub-triggered", submission_id }` with no other fields, and an error is logged to the extension's standard log channel. | `auditWriter.ts` — post-serialise gate |
| 6 | File write uses `fs.createWriteStream(path, { flags: "a" })` opened once at `configureAuditWriter` time. All records append to this stream. On write error: emit a single diagnostic record to the OutputChannel, close the stream, and set a session-scoped suppress-file flag. No retries within the session. | `auditWriter.ts` — file-stream lifecycle |
| 7 | Provider-native error codes (if the outcome is a provider failure) are captured in a `provider_error_code` field alongside the unified `outcome` kind. This is critical for SIEM correlation across providers (#196) but carries no content risk. | `auditWriter.ts` — `AuditRecord` field |
| 8 | JSON Lines format (one JSON object per line, UTF-8 encoded, `\n` terminator). `JSON.stringify(record) + "\n"` per emit. No trailing whitespace. No pretty-printing. | `auditWriter.ts` — emit path |

## Media Components

None — this is a backend / infrastructure feature with no visual component. Operator-facing surface is in the VS Code Settings UI and the Output dropdown.

*None - backend/infrastructure feature*

## Storybook E2E Testing

None - no interactive UI components

## VS Code Webview E2E Testing

None at the webview level. There is an extension-host E2E for the audit surface, covered below under **Extension-host integration test**:

| Workflow | Panels Involved | Key Selectors / Files | Interactions |
|----------|----------------|---------------------|--------------|
| Enable audit mid-session and verify a record appears | None (Output channel) | Output channel named "Debrief NL Audit" | Enable setting; submit a phrase via stub provider; assert exactly one new line appears in the channel parseable as JSON |
| Enable audit + filePath; verify file append | None (file I/O) | Configured path | Enable setting + configure filePath to a temp file; submit; assert file grows by one line; content parses as JSON |
| Redaction omits content | None | Output channel | Enable redaction; submit; assert record contains hash fields but no raw prompt/response |
| Soak test: 100 submissions | Catalog Overview (via stub) | Output channel | Run 100 stubbed submissions through llmProxy; assert 100 valid JSON Lines emitted |

**Testing Strategy**:
- [x] Extension workflow works end-to-end under stub provider
- [ ] (No webview content — skipped)
- [ ] (No page objects — skipped)
- [x] Audit file validated as JSON Lines via `jq -c .` in a CI assertion step
- [x] fluent-bit ingest: a CI step pipes the audit file through fluent-bit with a JSON Lines parser; asserts exit code 0 and expected record count

**Test File Location**: `apps/vscode/src/services/auditWriter.integration.test.ts`

**Infrastructure**: no webview patches needed. Uses the existing vitest harness. fluent-bit is run in the CI step as a binary (pulled from a docker image if needed; the fixture file is small so this step is light).

## Deferred / Out of Scope

- **Remote SIEM forwarding** — the feature writes locally; operators configure their own forwarder (VS Code log forwarder, Fluent Bit sidecar, OS logging daemon) on top of the file. Forwarding is an infrastructure concern.
- **Audit UI inside VS Code** — no dedicated viewer, no filter, no search. The Output channel is the viewer; for heavy review use the SIEM.
- **Encryption at rest for the file** — deferred. If the operator needs it, they deploy on an encrypted volume or use a full-disk-encryption approach.
- **Signed audit records** — deferred. Cryptographic signing would require key management that is out of scope for this feature.
- **File rotation** — deferred. The extension appends; the operator rotates via `logrotate` or similar.
- **Non-Anthropic providers** — #196 (audit records capture whichever provider was used).
- **NL in other panels** — #195 (audit records capture `panel_origin`).
- **Keyring-unavailable banner split** — #198 (audit records treat `keyring-unavailable` as one of the valid outcome kinds).
