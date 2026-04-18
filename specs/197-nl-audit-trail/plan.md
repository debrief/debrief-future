# Implementation Plan: NL Search — Per-Prompt Audit Trail (Opt-In)

**Branch**: `197-nl-audit-trail` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/197-nl-audit-trail/spec.md`

## Summary

Add an opt-in verbose audit trail to the NL-search pipeline shipped in #191. When a site administrator or end-user sets `debrief.nlSearch.audit.enabled = true`, every NL-search call — success, failure, cancellation, or `not-configured` short-circuit — produces exactly one line-delimited JSON record capturing the full prompt and the full (bounded) response body, correlated to the #191 telemetry record by the call index. The log file lives under VS Code's `globalStorageUri` by default (admin-overridable), is rotated using the same active/archive pattern that #193 established for provenance logs, and can be tailed by an enterprise SIEM (Splunk, Elastic, Sentinel) without transformation. The NL-search surface shows a persistent, non-dismissable "audit capture active" indicator whenever the setting is on. Default is `false`; the #191 lean telemetry behaviour is byte-identical when audit is off.

**Technical approach**: Introduce one new extension-host service, `auditSink.ts`, that owns file I/O for the audit log; it is lazy-instantiated on first write, subscribes to nothing, and is called from exactly two sites inside `llmProxy.ts` (#191): (a) the short-circuit branch when the key is missing (`not-configured`), and (b) the `finally` block after every `providerCall` resolution. Audit writes happen on a fire-and-forget queue so they never sit on the NL-search call's critical path. The webview learns of the audit setting through one new field on the existing `VsCodeLiveConfig` (`auditEnabled: boolean`), carried on the existing `nlConfig` message — no new webview↔host message variants. FilterBar renders a persistent indicator driven by that flag. Log path, rotation thresholds, and outcome-inclusion behaviour are exposed as four new `debrief.nlSearch.audit.*` settings. Rotation reuses the atomic temp+rename helper from #193's `stacService` for the active file and append-only semantics for the archive. The audit record schema is defined in `contracts/audit-record.schema.json` (JSON Schema) so SIEM field mappings are stable across versions.

## Technical Context

**Language/Version**: TypeScript 5.x (extension host + webview + shared components — existing monorepo toolchain; no new languages).
**Primary Dependencies**: VS Code Extension API ^1.85.0 (configuration, output channels, `ExtensionContext.globalStorageUri`), Node stdlib `node:fs/promises` + `node:path` + `node:os` for the audit log writer, `@debrief/components` (FilterBar — adds indicator render), existing `@debrief/session-state` LogService (re-used to surface the single per-session "audit-write failed" warning into the existing `[nl-search/live]` channel). No new runtime dependencies.
**Storage**: Two files on local disk — `nl-audit.jsonl` (active, bounded entry count) and `nl-audit-archive.jsonl` (append-only overflow). Default directory: `ExtensionContext.globalStorageUri` (per-install, survives restarts, not synced across machines). Administrator-overridable via `debrief.nlSearch.audit.path` for sites that route to a SIEM-agent-watched directory. UTF-8, LF line endings, one self-contained JSON object per line. No database, no workspace state, no external network.
**Testing**: vitest (unit — auditSink record emission, JSONL shape, rotation threshold, write-failure surfacing, secret-never-logged negative test); Playwright via `@sparticuz/chromium` + code-server (webview E2E — indicator present when setting on, absent when off; audit record appears after a submitted phrase in each outcome class; admin-override path is honoured).
**Target Platform**: VS Code 1.85+ on any OS where #191 runs (Windows, macOS, Linux). Also runs in code-server (same extension surface; `globalStorageUri` resolves to the code-server user dir).
**Project Type**: single — monorepo; changes concentrated in `apps/vscode/` with one FilterBar prop addition in `shared/components/FilterBar/`.
**Performance Goals**: Audit write adds ≤ 5% to the p95 NL-search call duration on the existing test fixture (SC-006). Audit write itself completes in ≤ 20 ms for a typical ~4 KB record on warm disk; the NL-search call does not `await` the write.
**Constraints**: (1) Audit disabled ⇒ zero prompt/response bytes retained beyond the call's lifetime (SC-001). (2) Audit records MUST NEVER contain the API key, authorisation header, or any other credential (FR-008, SC-004) — enforced by a negative unit test over a sentinel key. (3) Audit-write failure MUST NOT fail or slow the NL-search call (FR-010, SC-007). (4) Rotation preserves every record (FR-013, SC-009). (5) Managed-settings override wins over user-scope (FR-014, SC-008) — standard VS Code precedence; no custom logic. (6) Setting toggle during an in-flight call does not half-audit that call (FR-015).
**Scale/Scope**: Per-workstation, per-install single file pair. Default cap 500 active entries (aligned to #193). Analyst-typical daily volume ≈ tens of NL-search submissions → one rotation per tens of days; administrator-raised cap is permitted.

## Constitution Check

*GATE: pre- and post-design both pass. Nothing requires justification.*

| Article | Assessment |
|---|---|
| I. Defence-Grade Reliability | **PASS** — opt-in default off; NL-search behaviour byte-identical when audit is off (SC-001, verified by regression); audit-write failure is non-fatal and surfaces one warning per session (FR-010/FR-011, SC-007); no silent failures — every audit record lands or a warning is emitted. |
| III. Data Sovereignty | **PASS** — the audit log IS provenance for an AI-assisted action, directly fulfilling Article III.1 ("provenance always — every transformation MUST record lineage"). Data stays local (Article III.4) — no external transmission from this feature; SIEM pickup is a site-deployed agent, not an outbound call. Audit trail is append-only (Article III.3) — overflow rotates to an append-only archive; existing entries never mutate. Capture is opt-in (Article III.4 "explicit user consent") and signalled by a persistent in-surface indicator (FR-009, SC-003 user notice). |
| IV. Architectural Boundaries | **PASS** — audit sink lives in extension host (`apps/vscode/src/services/auditSink.ts`); webview never sees prompt/response bytes beyond what it already has in-memory for the call. FilterBar's sole responsibility is rendering the indicator from an existing config field — no new data flow (Article IV.1). |
| VI. Testing | **PASS** — unit tests gate: record-emission matrix across every `LiveOutcome` kind, JSONL integrity (one object per line, atomic rotation, archive append-only), write-failure surfacing, secret-redaction negative test, setting-toggle-during-in-flight. Integration test: `llmProxy` → auditSink end-to-end with stub providerCall. E2E: indicator render + admin-override path in code-server. All before merge. |
| IX. Dependencies | **PASS** — zero new runtime dependencies. Node stdlib (`fs/promises`, `path`, `os`) only. |
| X. Security | **PASS** — API key never enters the audit sink's input surface (the sink is handed the `ProviderCallInput` minus `apiKey` + the `LiveOutcome`; `apiKey` is never a parameter). A sentinel-value negative test fails CI if the key ever appears in a written record. The audit log file inherits `globalStorageUri`'s default filesystem permissions (user-only on POSIX); the admin-override path is the administrator's responsibility. No secrets in code. |
| XIV. Pre-Release Freedom | **INVOKED** — extends #191's `VsCodeLiveConfig` with one new field (`auditEnabled`) and `ProviderCallInput`'s call-side context with the `phrase` reference. Permitted without deprecation because #191 itself has not yet shipped. |
| XV. Strict Type Safety | **PASS** — the audit record is declared as an exported TypeScript interface in `contracts/audit-record.ts` with a matching `audit-record.schema.json` for SIEM field mapping. No `any`. All fields on the record are concrete types; the `outcome` field is the existing `LiveOutcome` union from #191. The `phrase` field is a narrowed `string` (pre-validated by FilterBar's 500-char cap). Strict mode mandatory. |

No violations. **Complexity Tracking section intentionally omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/197-nl-audit-trail/
├── plan.md              # This file
├── research.md          # Phase 0 — 6 decisions (log path, rotation policy, hook point, record shape, indicator wiring, failure surfacing)
├── data-model.md        # Phase 1 — AuditRecord, audit settings, state machine for a single write
├── quickstart.md        # Phase 1 — how a site admin enables, where to point SIEM, how to verify
├── contracts/
│   ├── audit-record.ts          # TypeScript interface — canonical record shape
│   └── audit-record.schema.json # JSON Schema — for SIEM field-mapping + E2E shape asserts
├── checklists/
│   └── requirements.md  # From /speckit.specify (already created)
├── media/
│   ├── planning-post.md     # Phase 2
│   └── linkedin-planning.md # Phase 2
└── tasks.md             # /speckit.tasks output — not created here
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── services/
│   │   ├── auditSink.ts                  # NEW: opt-in JSONL writer + active/archive rotation; lazy-instantiated
│   │   ├── auditSink.test.ts             # NEW: record-emission matrix, JSONL shape, rotation boundary,
│   │   │                                 #      write-failure surfacing, secret-redaction negative test,
│   │   │                                 #      setting-toggle-during-in-flight
│   │   └── llmProxy.ts                   # EDIT (from #191): invoke auditSink at (a) not-configured short-circuit
│   │                                      #                  (b) `finally` after providerCall — on every outcome kind
│   ├── webview/
│   │   └── messages.ts                   # EDIT (from #191): extend nlConfig payload with auditEnabled: boolean
│   ├── extension.ts                      # EDIT: listen for debrief.nlSearch.audit.enabled change; re-push nlConfig
│   └── package.json                      # EDIT: add debrief.nlSearch.audit.{enabled,path,activeCap,captureNotConfigured}
│                                          #       configuration contributions; none are scoped "application"
shared/components/
├── src/
│   └── FilterBar/
│       ├── FilterBar.tsx                 # EDIT: render persistent audit-capture indicator when
│       │                                 #       config.auditEnabled === true (new indicator subcomponent)
│       ├── AuditCaptureIndicator.tsx     # NEW: standalone visual (single chip, locked, with tooltip copy)
│       ├── AuditCaptureIndicator.stories.tsx  # NEW: Storybook story — off / on / on-with-admin-override
│       └── __tests__/
│           ├── FilterBar.audit.test.tsx  # NEW: indicator render ↔ auditEnabled; no regression when false
│           └── AuditCaptureIndicator.test.tsx # NEW: a11y attrs (aria-label, data-testid), no-close affordance

tests/e2e/
└── test-vscode-nl-search-audit.spec.ts   # NEW: 1) enable setting → indicator appears → submit phrase → audit
                                           #        file contains one well-formed record correlating to #191 telemetry
                                           #      2) disable setting → indicator gone → submit phrase → no new
                                           #        audit record written
                                           #      3) admin-override path → file lands at overridden location
                                           #      4) rotation boundary → 501st entry rotates oldest into archive
```

**Structure Decision**: Single-project layout, tightly scoped. The vast majority of change lives inside `apps/vscode/src/services/`. The `shared/components/FilterBar/` change is a small visual addition (one subcomponent, one conditional render driven by an existing config field). No new workspaces, no new packages, no schema generation work. The contracts directory carries both a TypeScript interface (compile-time contract) and a JSON Schema (runtime SIEM-side field map) because the audit log is the one artefact this feature exports across process / tool boundaries.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| AuditCaptureIndicator | `shared/components/src/FilterBar/AuditCaptureIndicator.stories.tsx` — variants `off`, `on`, `onAdminOverride` | `audit-capture-indicator.js` | Shows the persistent in-surface notice readers will see on every NL-search surface when audit capture is active — lets blog readers hover the tooltip and see the decision-time notice copy verbatim |

**Inclusion Criteria Applied**:
- [x] New visual component (the capture indicator is new)
- [x] Significant visual change (adds a persistent lozenge to the FilterBar row that affects every NL-search consumer of #191)
- [x] Interactive demo adds narrative value (the indicator's hover tooltip carries the notice copy — an embedded demo lets readers see it without running VS Code)

**Bundleability Verified**:
- [x] Stories exist in Storybook (new, to be added under #197)
- [x] Components render standalone (pure React, takes one prop — no app context, no VS Code API)
- [x] Reasonable bundle size expected (< 50 KB — one component, tooltip from existing vscrui)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar-auditcaptureindicator`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `AuditCaptureIndicator.stories.tsx` — `on` / `off` / `onAdminOverride` | Rendering, aria-label present, `data-testid="nl-audit-indicator"` visibility, no-close affordance, tooltip content assertion | light, dark, vscode | hover (reveal tooltip), keyboard focus (a11y) |
| `FilterBar.stories.tsx` (extend `NlModeWithStubClient` variant) | Indicator appears when `config.auditEnabled === true`, absent otherwise; no layout regression for the existing NL happy path | light, dark, vscode | fill phrase + Enter (regression against #191) |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (hover reveals notice)
- [x] Accessibility attributes present (`data-testid="nl-audit-indicator"`, `aria-label="NL search audit capture is active"`, `role="status"`)
- [x] Screenshots captured for evidence (`audit-indicator-on-light`, `audit-indicator-on-dark`, `audit-indicator-on-vscode`, `audit-indicator-off-light`, `filter-bar-with-audit-on`)

**Test File Location**: `shared/components/e2e/AuditCaptureIndicator.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=filterbar-auditcaptureindicator--on&globals=theme:light
/iframe.html?id=filterbar-auditcaptureindicator--on&globals=theme:dark
/iframe.html?id=filterbar-auditcaptureindicator--on&globals=theme:vscode
/iframe.html?id=filterbar-auditcaptureindicator--off&globals=theme:light
/iframe.html?id=filterbar-auditcaptureindicator--onadminoverride&globals=theme:light
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Audit off (default) → submit phrase → no audit file written | Catalog Overview webview | `[data-testid="nl-search-indicator"]`, `[data-testid="nl-audit-indicator"]` (absent), filesystem assertion on `nl-audit.jsonl` | open Catalog Overview, submit phrase, assert indicator absent, assert audit file does not exist (or was unchanged) |
| Audit on → indicator visible → submit phrase → one record appended | Same | `[data-testid="nl-audit-indicator"]` (visible), `nl-audit.jsonl` | toggle `debrief.nlSearch.audit.enabled = true`, submit phrase, tail the audit file, assert exactly one JSON line with matching `callIndex` against the #191 telemetry line |
| Audit on → 7-class outcome matrix → one record per outcome | Same | Same | Stub providerCall returns each of success / auth-failure / rate-limit / provider-error / transport-error / timeout / malformed-response / not-configured / ceiling-reached; assert each produces exactly one audit record |
| Admin-override log path | Same | `nl-audit.jsonl` under `debrief.nlSearch.audit.path` | set `audit.path` to a temp directory in workspace settings, submit phrase, assert file lands at the overridden path |
| Rotation boundary | Same | `nl-audit.jsonl`, `nl-audit-archive.jsonl` | set `audit.activeCap = 2`, submit three phrases, assert `nl-audit.jsonl` contains 2 lines and `nl-audit-archive.jsonl` contains 1 line (the oldest) |
| Write-failure graceful degradation | Same | #191 `[nl-search/live]` output channel | set `audit.path` to a read-only directory, submit phrase, assert NL-search succeeds normally, assert exactly one warning appears in the telemetry channel |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors (`nl-audit-indicator`)
- [x] Screenshots captured for evidence (`audit-indicator-visible`, `audit-file-after-submission`, `rotation-boundary-archive-populated`, `write-failure-warning-in-channel`)

**Test File Location**: `tests/e2e/test-vscode-nl-search-audit.spec.ts`

**Infrastructure**: reuses existing `tests/e2e/scripts/patch-webview.sh`, `tests/e2e/helpers/webview-injector.ts`, and the `xvfb-run` + `@sparticuz/chromium` harness. One new filesystem-assertion helper lives under `tests/e2e/helpers/audit-log.ts` that parses `nl-audit.jsonl` line-by-line and returns `AuditRecord[]`.

## Applied Design Decisions (6)

| # | Decision | Summary |
|---|---|---|
| 1 | Log file location | Default `ExtensionContext.globalStorageUri`; administrator-overridable via `debrief.nlSearch.audit.path`. Per-install, not workspace-synced, not user-synced. |
| 2 | Rotation policy | Reuse #193's pattern: active JSONL capped at `audit.activeCap` (default 500); overflow appended to sibling `nl-audit-archive.jsonl`. Active-file write uses atomic temp+rename from existing `stacService` helper; archive uses append-only. |
| 3 | Hook point | `llmProxy.ts` (#191) — one call-site at the `not-configured` short-circuit branch, one call-site in the `finally` block after every `providerCall` resolution. No FilterBar changes to produce records. |
| 4 | Record shape | `AuditRecord` is a flat JSON object: `{ schemaVersion, callIndex, timestampUtc, provider, model, outcome, phrase, responseBody, responseBodyTruncated, durationMs }`. `schemaVersion` is a string (`"1"`) so SIEM field mappings can branch on future shapes. `outcome` is the existing #191 `LiveOutcome` union minus the `rawResponse` field (response body lives at the top level with its own truncation flag). |
| 5 | Indicator wiring | Extend `VsCodeLiveConfig` with `auditEnabled: boolean`; re-push `nlConfig` message on the VS Code configuration-change event. FilterBar renders `<AuditCaptureIndicator />` conditionally. No new webview↔host messages. |
| 6 | Failure surfacing | Audit-write failure is swallowed locally to avoid disrupting the NL-search call. A one-shot per-session flag in `auditSink` allows exactly one warning to surface into the existing `[nl-search/live]` output channel via `LogService.warn`. Rate-limited; no log-channel spam. |

## Deferred

- **BACKLOG #194** — Cross-cutting PROV log rotation policy. When #194 lands it supersedes decision 2 above; the audit log adopts the unified policy. Tracked as a one-line change in `auditSink.ts`.
- **Site-wide "first-run" consent modal** — intentionally deferred; workplace-policy notice is assumed to be delivered out-of-band by the deploying organisation (FR-009 / SC-003 delivers in-surface notice via the persistent indicator).
- **Audit viewer UI in Debrief** — out-of-scope per spec; the deploying site's SIEM is the intended reader.
