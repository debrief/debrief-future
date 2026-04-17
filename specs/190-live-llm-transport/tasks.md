---
description: "Task list for 190 — Live LLM Transport"
---

# Tasks: Live LLM Transport

**Input**: Design documents from `specs/190-live-llm-transport/`
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/live-client.ts, contracts/proxy-http.md, quickstart.md

**Organization**: Tasks are grouped by user story (US1 / US2 / US3) so each priority can be implemented and independently tested.

---

## Evidence Requirements

**Evidence Directory**: `specs/190-live-llm-transport/evidence/`
**Media Directory**: `specs/190-live-llm-transport/media/`

Every artefact in the plan's Evidence table (plan.md → "Evidence Artefacts") has a corresponding capture task in Phase 6. Each file MUST carry the test-summary YAML front matter (`feature`, `captured_at`, `git_sha`) so automated aggregation works.

### Planned Artefacts

| Artefact | SC | Format | Captured When |
|---|---|---|---|
| `evidence/test-summary.md` | SC-009 | Markdown + YAML front matter (template) | After all tests pass |
| `evidence/usage-example.md` | — | Markdown — code + expected output | After `createLiveLLMClient` works end-to-end |
| `evidence/sc-001-off-corpus-results.md` | SC-001 | Markdown table: 5 off-corpus phrases × (phrase, generated CQL2, chip set, matching card count, screenshot path) | Manual walkthrough against live Claude Haiku 4.5 |
| `evidence/sc-002-corpus-parity.json` | SC-002 | JSON before/after table: 9 corpus phrases × (fixture count, live count, delta) | vitest integration test saves JSON |
| `evidence/sc-003-zero-outbound.json` | SC-003 | JSON URL log from Playwright `page.on('request')` | Playwright spec run |
| `evidence/sc-004-quickstart-transcript.md` + `sc-004-quickstart.webm` | SC-004 | Terminal transcript + screencast of cold-start walkthrough | Manual capture |
| `evidence/sc-005-failure-classes.md` + `screenshots/banner-*.png` | SC-005 | Markdown table: 7 transport + 1 generation × (injected stub scenario, banner text, screenshot) | Playwright + vitest |
| `evidence/sc-006-gitleaks.log` | SC-006 | CI step log (clean run) | CI pipeline |
| `evidence/sc-007-latency.json` | SC-007 | 30 live-trial latencies; p50/p95/p99 computed | Manual script against operator's key |
| `evidence/sc-008-usage-cap.log` | SC-008 | vitest test output showing call 51 short-circuit | vitest |
| `evidence/sc-009-task-verify.log` | SC-009 | `task verify` output | CI |
| `evidence/screenshots/indicator-live.png` / `indicator-fixture.png` | FR-018 | Screenshots of transport-mode indicator states | Playwright or manual |

### Media Content

| Artefact | Description | Created When |
|---|---|---|
| `media/shipped-post.md` | Blog post celebrating completion | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary | Polish phase |

### PR Creation

| Action | Description | Created When |
|---|---|---|
| Feature PR | PR in debrief-future with evidence | Final task (Phase 6) |
| Blog PR | PR in debrief.github.io with shipped post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Goal**: Add the gitignored config slots, credential-scan CI step, and example file so the feature's security posture is in place before any code lands.

- [ ] T001 [P] Extend gitignore to exclude `/live-config.json` and `/.env` (app-root entries per research R3) `apps/nl-demo/.gitignore`
- [ ] T002 [P] Create `.env.example` documenting `ANTHROPIC_API_KEY`, `ANTHROPIC_ENDPOINT`, `PROXY_PORT`, `PROXY_BIND`, `PROXY_ALLOW_REMOTE`, `MAX_PROVIDER_BYTES`, `PROVIDER_TIMEOUT_MS` without committing a real value `apps/nl-demo/.env.example`
- [ ] T003 [P] Create gitleaks configuration with `sk-ant-*` + `ANTHROPIC_API_KEY=.+` rules and an allowlist for the `.env.example` placeholder (SC-006) `gitleaks.toml`
- [ ] T004 Extend CI workflow with a `gitleaks` step scanning `dist/`, `apps/nl-demo/dist/`, and the committed worktree; fails PR on any hit `.github/workflows/ci.yml`

**Parallel opportunities**: T001, T002, T003 touch different files and run concurrently. T004 depends on T003 (needs the config file).

---

## Phase 2: Foundation (shared types + validation — blocks all user stories)

**Goal**: Extend the existing `@debrief/components/nl-cql2` package with live-transport types, config validator, and type guard — the foundation every user story builds on. Folds into existing `types.ts` + `clients.ts` per plan's Structure Decision (no new files).

- [ ] T005 [P] Extend shared types with `LiveConfig`, `LiveConfigValidationError`, `LiveTransportError` (plain interface — NOT Error subclass), `LiveTransportErrorReason` union, `TransportCallRecord`, `GenerationResultError` discriminated union (`{kind:"generation", error: GenerationError} | {kind:"transport", error: LiveTransportError}`) `shared/components/src/nl-cql2/types.ts`
- [ ] T006 [P] Re-export new symbols (`createLiveLLMClient`, `validateLiveConfig`, `isLiveTransportError`, all new types) `shared/components/src/nl-cql2/index.ts`
- [ ] T007 [test] Write vitest cases for `validateLiveConfig` covering every field validation rule in data-model §1 (valid config; each invalid-field diagnostic; optional `proxyToken`; rejects extra fields if schema is strict) `shared/components/src/nl-cql2/__tests__/liveClient.test.ts`
- [ ] T008 Implement `validateLiveConfig(raw: unknown)` returning `{ok: true, value} | {ok: false, errors}` per contracts/live-client.ts `shared/components/src/nl-cql2/clients.ts`
- [ ] T009 Implement `isLiveTransportError(value: unknown): value is LiveTransportError` type guard (shape check, not `instanceof`) `shared/components/src/nl-cql2/clients.ts`

**Parallel opportunities**: T005 and T006 both edit small sections of different files and run concurrently. T007 depends on T005 (types must exist). T008 depends on T005 + T007 (TDD — test first). T009 depends on T005.

**Blocking gate**: Phases 3, 4, 5 all import from `@debrief/components/nl-cql2`, so T005–T009 must complete before any user-story phase begins.

---

## Phase 3: User Story 1 — Off-corpus phrase produces live-generated filtered result (P1)

**Goal**: A stakeholder running the demo with live mode enabled submits an off-corpus phrase ("South Korean destroyers"), the demo forwards it through `createLiveLLMClient` → the proxy → Anthropic, receives a raw response, passes it to #188's `parseResponse`, and renders chips + filtered cards. Corresponds to spec US1 (P1), FR-001, FR-002, FR-006, FR-009, FR-014, FR-018; SC-001, SC-002, SC-007.

**Independent test**: With a valid `live-config.json` at app root, a running proxy, and any off-corpus phrase, the demo issues exactly one POST to `<proxyUrl>`, emits one `[nl-demo/live]` call record, and renders chips matching the response. No fixture fallback.

### Tests (write before implementation)

- [ ] T010 [P][test] Vitest happy-path case: `createLiveLLMClient` issues POST to `config.proxyUrl` with the exact prompt string, adds `X-Proxy-Token` header when `config.proxyToken` is set, returns `rawResponse` verbatim to the consumer `shared/components/src/nl-cql2/__tests__/liveClient.test.ts`
- [ ] T011 [P][test] Vitest FR-012 supersession case: stub-proxy response 1 has 2 s delay; call 1 issued; call 2 issued after 100 ms via `cancelPending()`; assert call 1 rejects with `GenerationResult.error.kind === "transport"` + `reason === "transport-error"` + `message === "superseded"` AND only call 2's result reaches the consumer `shared/components/src/nl-cql2/__tests__/liveClient.test.ts`
- [ ] T012 [P][test] Vitest FR-009 regression guard: `createLiveLLMClient` accepts any prompt (no `RESPONSES` map lookup), distinct from `createRecordedLLMClient` `shared/components/src/nl-cql2/__tests__/liveClient.test.ts`
- [ ] T013 [P][test] Vitest `TransportCallRecord` emission: each `generate()` call emits exactly one `console.info("[nl-demo/live]", record)`; record has no `prompt`, no `rawResponse`, no credential, and `responseBytes` is UTF-8 byte count on success `shared/components/src/nl-cql2/__tests__/liveClient.test.ts`
- [ ] T061 [P][test] Vitest FR-002 interchangeability regression guard: the same `generateCql2` call site accepts either `createRecordedLLMClient(RESPONSES)` or `createLiveLLMClient(config)` without type errors; for a matched input phrase each returns a `GenerationResult` with identical top-level shape (success path). Prevents future drift between the two `LLMClient` implementations `shared/components/src/nl-cql2/__tests__/liveClient.test.ts`

### Implementation — client

- [ ] T014 Implement `createLiveLLMClient(config): LiveLLMClient` in clients.ts: `fetch` to `proxyUrl` with `AbortController` per-call, per-call timeout enforcement, UTF-8 streaming byte accumulator via `ReadableStream.getReader()` enforcing `maxResponseBytes`, usage counter short-circuiting at `maxCalls`, `X-Proxy-Token` header when configured, `TransportCallRecord` emission, `cancelPending()` method, `usage` read-only view `shared/components/src/nl-cql2/clients.ts`
- [ ] T015 Map proxy error envelopes to `LiveTransportError`: 401 → `auth-failure`, 429 → `rate-limit`, 502 `provider-error` → `provider-error`, 502 `oversize-response` → `oversize-response`, 504 → `timeout`, `bad-request` → `transport-error` with client-version-mismatch message; network/DNS failure → `transport-error`; return all via `GenerationResult.error` with `kind: "transport"` (NEVER throw) `shared/components/src/nl-cql2/clients.ts`

### Implementation — proxy sidecar

- [ ] T016 Create Node HTTP proxy script — live mode: `POST /generate` reads JSON body, validates (`prompt` ≤ 100 000 chars, `model` optional non-empty), issues upstream HTTPS POST to `ANTHROPIC_ENDPOINT` via a single `https.Agent({keepAlive: true, keepAliveMsecs: 30_000, maxSockets: 4})` instance (R9), streams-and-counts upstream response against `MAX_PROVIDER_BYTES` (default 524 288), extracts content → `{ok: true, rawResponse, bytes: Buffer.byteLength(rawResponse, 'utf8'), providerLatencyMs}`, normalises provider errors to `{ok: false, kind, providerStatus, message}` `apps/nl-demo/scripts/live-proxy.mjs`
- [ ] T017 Add `GET /health` returning `{ok: true, provider: "anthropic", model, mode: "live"|"stub", bindRemote}` (no credentials leaked) `apps/nl-demo/scripts/live-proxy.mjs`
- [ ] T018 Add non-loopback bind guard — refuse to start if `PROXY_BIND` is non-loopback unless `PROXY_ALLOW_REMOTE=true` is also set; generate 32-byte base64url `proxyToken` at startup, print to stderr with ops instructions, reject `/generate` + `/health` missing or mismatched `X-Proxy-Token` with 401 (R3) `apps/nl-demo/scripts/live-proxy.mjs`
- [ ] T019 Add `--stub <scenarios.json>` mode: read scenarios file at startup, dispatch per-phrase outcome (`success`/`auth`/`rate-limit`/`provider-error`/`timeout`/`malformed`/`oversize`), bypass upstream fetch, skip `ANTHROPIC_API_KEY` requirement (FR-015, R6) `apps/nl-demo/scripts/live-proxy.mjs`
- [ ] T020 Add structured stdout logging — one line per request: `[proxy] ts=... method=... path=... status=... durationMs=... providerStatus=... outcome=... bytes=...`; log startup banner showing `PROXY_BIND`, `PROXY_ALLOW_REMOTE`, `ANTHROPIC_MODEL`; NEVER log prompt body, response body, or credentials (R7) `apps/nl-demo/scripts/live-proxy.mjs`
- [ ] T021 [P] Create default stub scenarios fixture (success path for happy-path Playwright test; placeholder phrases for failure-class tests in Phase 5) `apps/nl-demo/e2e/fixtures/live-stub.json`
- [ ] T022 [test] Vitest coverage of stub-mode dispatch: each scenario kind returns the correct HTTP status + envelope; override lookup by canonicalised phrase works `shared/components/src/nl-cql2/__tests__/liveStub.test.ts`

### Implementation — demo integration

- [ ] T023 Extend lib bundle entry to export `createLiveLLMClient`, `validateLiveConfig`, `isLiveTransportError` for browser consumption `apps/nl-demo/scripts/lib-entry.mjs`
- [ ] T024 Extend demo boot code — load `apps/nl-demo/live-config.json` via `fetch('./live-config.json')`, run `validateLiveConfig`, on success issue `GET /health` with 2 s timeout, on 200 activate live mode; on any failure (validation, health) fall back to fixture mode and render a single-line banner naming the failing step `apps/nl-demo/demo.jsx`
- [ ] T025 Render transport-mode indicator near the page header (FR-018) showing `Live · Anthropic · <model>` only when live mode is active AND health check passed; hidden in fixture mode `apps/nl-demo/demo.jsx`
- [ ] T026 Wire submission flow — when live mode active, every non-empty phrase routes through the live client (FR-006); the existing submission-token pattern calls `client.cancelPending()` on each submit; `GenerationResult.error` is dispatched via `switch (err.kind)` (`"generation"` → existing banner, `"transport"` → new per-reason banner) `apps/nl-demo/demo.jsx`

### End-to-end

- [ ] T027 Extend Playwright config — convert `webServer` field to an array; keep `serve.mjs` on `$SERVER_PORT`; add second entry launching `node ../scripts/live-proxy.mjs --stub ../e2e/fixtures/live-stub.json` on a fixed loopback port (8082) with its own `url` for readiness check `apps/nl-demo/playwright/playwright.config.ts`
- [ ] T062 Create Playwright live-config fixture + test-setup helper — (a) commit `e2e/fixtures/live-config.valid.json` pointing at `http://127.0.0.1:8082/generate` (the stub port from T027, NOT the operator default 8081) and `e2e/fixtures/live-config.malformed.json` missing `proxyUrl`; (b) export `withLiveConfig(fixture: "valid"|"malformed"|"absent")` from an `e2e/live-config-helper.ts` that copies the chosen fixture into the served directory in `beforeEach` and removes it in `afterEach`, so each scenario controls whether `live-config.json` is visible at the demo origin `apps/nl-demo/e2e/live-config-helper.ts`
- [ ] T028 [test] Create Playwright E2E happy-path scenario — use `withLiveConfig("valid")` (T062); stub returns canned CQL2 for an off-corpus phrase; assert chips render, card grid filters, no off-corpus banner, no console errors `apps/nl-demo/e2e/live-transport.spec.ts`

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

**Parallel opportunities**: T010–T013, T061 are all test cases in the same file and typically serialised (single-test-file rule). T016, T021, T023, T062 touch different files and can proceed in parallel once Phase 2 is green. T022 depends on T019. T028 depends on T062 (fixture helper). T061 depends on T014 (live client must exist).

---

## Phase 4: User Story 2 — Operator configures credentials without rebuild (P2)

**Goal**: An operator switches a freshly-served demo from fixture-only into live mode in under 5 minutes by following quickstart.md, without touching source or rebuilding. Removing the config reverts the demo. Malformed config refuses to activate live mode and names the bad field. Corresponds to spec US2 (P2), FR-003, FR-004, FR-005, FR-017; SC-003, SC-004, SC-006.

**Independent test**: Starting from a clean checkout with no `live-config.json`, follow quickstart.md §1–§5. Verify (a) fresh demo runs fixture-only (SC-003), (b) after supplying `.env` + `live-config.json` + starting the proxy, reload activates live mode and indicator shows, (c) deleting `live-config.json` and reloading reverts to fixture mode, (d) corrupt `live-config.json` displays a specific-field diagnostic banner and falls back to fixture mode.

### Tests (write before implementation)

- [ ] T029 [P][test] Vitest: `validateLiveConfig` rejects absent `live-config.json` content (empty string, `null`, `undefined`, non-object) with `{ok: false, errors: [...]}`; rejects each required field missing with matching `field` in error `shared/components/src/nl-cql2/__tests__/liveClient.test.ts`
- [ ] T030 [P][test] Playwright SC-003 network-spy scenario: use `withLiveConfig("absent")` (T062) so no `live-config.json` is served; drive all 9 corpus phrases + 2 off-corpus phrases; collect outbound URLs via `page.on('request')`; assert zero URLs match `/generate` or `anthropic.com`; save URL log to the run's artefacts for evidence capture `apps/nl-demo/e2e/live-transport.spec.ts`
- [ ] T031 [P][test] Playwright malformed-config scenario: use `withLiveConfig("malformed")` (T062) to serve a `live-config.json` missing `proxyUrl`; load demo; assert banner text names `proxyUrl` specifically, transport-mode indicator is NOT shown, submitting a corpus phrase filters normally (fixture mode) `apps/nl-demo/e2e/live-transport.spec.ts`

### Implementation

- [ ] T032 Extend demo boot — when `validateLiveConfig` returns `{ok: false, errors}`, render a diagnostic banner listing the first `field` + `message` pair and a link to quickstart.md; fall back to fixture mode; NEVER activate live mode on partial success `apps/nl-demo/demo.jsx`
- [ ] T033 Extend demo boot — when `fetch('./live-config.json')` returns 404 (file absent), treat as "fixture mode by default" with NO banner (SC-003 happy path); only show a banner when the file exists but is invalid `apps/nl-demo/demo.jsx`
- [ ] T034 [P] Add "Enabling live mode" section to README linking to `../../specs/190-live-llm-transport/quickstart.md`; document the three revocation levers (delete file / set `enabled: false` / stop proxy) `apps/nl-demo/README.md`
- [ ] T035 [P] Verify quickstart.md steps execute end-to-end against the shipped artefacts (paths match, commands work, error messages match); update any drift `specs/190-live-llm-transport/quickstart.md`

**Parallel opportunities**: T029, T030, T031 are tests in different files (or different scenarios in the Playwright file) and can be written in parallel. T032/T033 both edit demo.jsx — serialise. T034, T035 are documentation edits and parallel.

---

## Phase 5: User Story 3 — Live call fails gracefully (P3)

**Goal**: Every failure class surfaces a distinct, user-readable banner without uncaught exceptions, infinite spinners, or console errors. The query bar stays usable; a subsequent corpus phrase resolves normally via the fixture transport (live failures don't poison fixture behaviour). Corresponds to spec US3 (P3), FR-005, FR-007, FR-008, FR-010, FR-011, FR-012; SC-005, SC-008.

**Independent test**: For each of the 7 `LiveTransportErrorReason` values + the `malformed-response` path (via #188's `GenerationError`), the Playwright spec injects the failure via stub scenarios and asserts: distinct banner text, query bar remains enabled, no `console.error`, submitting a corpus phrase still resolves via fixture.

### Tests (write before implementation)

- [ ] T036 [P][test] Vitest stub-harness coverage for all 7 `LiveTransportErrorReason` classes: `auth-failure`, `rate-limit`, `provider-error`, `transport-error`, `timeout`, `oversize-response`, `usage-cap-reached`; each scenario asserts `GenerationResult.error.kind === "transport"`, matching `reason`, non-null `durationMs`, increasing `callIndex` `shared/components/src/nl-cql2/__tests__/liveStub.test.ts`
- [ ] T037 [P][test] Vitest SC-008 usage-cap short-circuit: drive 50 successful calls; assert 51st resolves with `reason: "usage-cap-reached"` WITHOUT issuing a fetch (mock `fetch` to assert zero additional calls after cap) `shared/components/src/nl-cql2/__tests__/liveStub.test.ts`
- [ ] T038 [P][test] Vitest malformed-response fallthrough: stub returns 200 with `rawResponse` containing invalid JSON; assert live client returns the raw string; `parseResponse` produces `GenerationResult.error.kind === "generation"` with matching `GenerationError.reason` (e.g. `malformed-json`) `shared/components/src/nl-cql2/__tests__/liveClient.test.ts`
- [ ] T039 [P][test] Playwright failure-class matrix: use `withLiveConfig("valid")` (T062); stub scenarios for each of the 7 transport reasons + 1 malformed-response; assert distinct banner text per class (matching the R4 mapping table), query bar remains enabled after each, no console errors `apps/nl-demo/e2e/live-transport.spec.ts`
- [ ] T040 [P][test] Playwright cross-transport recovery: use `withLiveConfig("valid")` (T062); inject 3 consecutive live failures against the same phrase; then submit a fixture-corpus phrase; assert corpus phrase resolves normally via the fixture transport path (US3 AC4) `apps/nl-demo/e2e/live-transport.spec.ts`
- [ ] T041 [P][test] Playwright proxy-down scenario: use `withLiveConfig("valid")` (T062) BUT have the Playwright `webServer` teardown kill the stub proxy before page load (or point `proxyUrl` at an unused port via a separate `live-config.proxy-down.json` fixture); assert boot-time health-check failure shows the "proxy unreachable" banner, demo falls into fixture mode, transport-mode indicator is NOT shown `apps/nl-demo/e2e/live-transport.spec.ts`

### Implementation

- [ ] T042 Add banner variants to demo JSX — one per `LiveTransportErrorReason`, with the human-readable messages from research R4 table; dispatch via `switch (result.error.error.reason)` inside the `kind === "transport"` branch `apps/nl-demo/demo.jsx`
- [ ] T043 Ensure query bar remains enabled after every `LiveTransportError` — clear any `pending`/`disabled` UI state on error return; verified by T039 assertions `apps/nl-demo/demo.jsx`
- [ ] T044 Ensure no `console.error` path on `LiveTransportError` — log via `console.info("[nl-demo/live]", record)` (already handled by T020's TransportCallRecord emission); do NOT re-log at banner-render time `apps/nl-demo/demo.jsx`

**Parallel opportunities**: T036–T041 are all tests in different files (or different scenarios in the Playwright file) and run concurrently. T042, T043, T044 all edit demo.jsx — serialise per conflict-avoidance, but are small adjacent edits.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Capture every SC's evidence artefact, author shipped media content, and open the PR.

### Evidence Collection

- [ ] T045 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) — include totals, pass/fail/skip, coverage %, key scenarios verified (FR-012 supersession, SC-008 cap, 7 transport classes, SC-003 zero-outbound) `specs/190-live-llm-transport/evidence/test-summary.md`
- [ ] T046 Create usage demonstration — before/after: cold-start operator + `pnpm serve` + off-corpus phrase → chips render; include full command sequence and screenshot references `specs/190-live-llm-transport/evidence/usage-example.md`
- [ ] T047 [P] Capture SC-001 off-corpus results — table of 5 phrases × (generated CQL2, chip set, card count, screenshot path); screenshots stored alongside `specs/190-live-llm-transport/evidence/sc-001-off-corpus-results.md`
- [ ] T048 [P] Capture SC-002 corpus parity — JSON `{phrase, fixtureCount, liveCount, delta}` × 9 rows; assert `delta === 0` in a vitest test that writes this file as a side effect `specs/190-live-llm-transport/evidence/sc-002-corpus-parity.json`
- [ ] T049 [P] Capture SC-003 zero-outbound URL log from Playwright test artefacts (produced by T030) `specs/190-live-llm-transport/evidence/sc-003-zero-outbound.json`
- [ ] T050 [P] Capture SC-004 quickstart transcript — screen + terminal recording (optional `.webm`) of cold-start operator following quickstart.md from clean checkout to live-mode confirmation `specs/190-live-llm-transport/evidence/sc-004-quickstart-transcript.md`
- [ ] T051 [P] Capture SC-005 failure-class banners — table of 8 classes × (injected scenario, banner text, screenshot path) `specs/190-live-llm-transport/evidence/sc-005-failure-classes.md`
- [ ] T052 [P] Capture SC-006 gitleaks log — archived output from the CI step on a clean PR run `specs/190-live-llm-transport/evidence/sc-006-gitleaks.log`
- [ ] T053 [P] Capture SC-007 latency distribution — run 30 trials against real Claude Haiku using `scripts/measure-latency.mjs` (add if absent); compute p50/p95/p99; commit the JSON `specs/190-live-llm-transport/evidence/sc-007-latency.json`
- [ ] T054 [P] Capture SC-008 usage-cap log — vitest output showing call 51 short-circuit (produced by T037) `specs/190-live-llm-transport/evidence/sc-008-usage-cap.log`
- [ ] T055 [P] Capture SC-009 `task verify` log from the feature branch `specs/190-live-llm-transport/evidence/sc-009-task-verify.log`
- [ ] T056 [P] Capture FR-018 transport-mode indicator screenshots (fixture-mode baseline + live-mode active) `specs/190-live-llm-transport/evidence/screenshots/indicator-live.png`
- [ ] T057 [P] Capture each failure-class banner as a separate PNG (7 transport reasons + malformed-response) `specs/190-live-llm-transport/evidence/screenshots/banner-auth-failure.png`

### Media Content

- [ ] T058 Create shipped blog post via content-specialist — "What We Built, Screenshots, Lessons Learned, What's Next" focus on the security-first transport design (loopback default, proxyToken on bind-remote, credential scan in CI) `specs/190-live-llm-transport/media/shipped-post.md`
- [ ] T059 [P] Create LinkedIn shipped summary (150–200 words, hook opening, link to full post) `specs/190-live-llm-transport/media/linkedin-shipped.md`

### PR Creation

- [ ] T060 Create PR and publish blog: run /speckit.pr

**Task T060 must run last. It depends on every evidence artefact (T045–T057) and both media files (T058, T059) being present.**

---

## Dependencies

### Phase order (hard)

1. **Phase 1 (Setup)** — T001–T004. `.gitignore` + `.env.example` + `gitleaks.toml` + CI step. Blocks nothing functionally but is cheap and establishes the security posture up front.
2. **Phase 2 (Foundation)** — T005–T009. Shared types + validator + guard. Blocks Phases 3, 4, 5.
3. **Phase 3 (US1)** — T010–T028. Blocks Phases 4 and 5 at the demo-integration layer (Phases 4 and 5 add behaviours on top of the boot flow + submission flow established in Phase 3).
4. **Phase 4 (US2)** — T029–T035. Depends on Phase 3 (boot flow exists). Independent of Phase 5.
5. **Phase 5 (US3)** — T036–T044. Depends on Phase 3 (banner variants extend the dispatch added in T026). Independent of Phase 4.
6. **Phase 6 (Polish)** — T045–T060. Depends on Phases 1–5 complete. T060 (PR) is last.

### Within-phase dependencies

- **Phase 1**: T004 depends on T003 (workflow needs the config file). T001, T002, T003 parallel.
- **Phase 2**: T007 depends on T005 (types). T008 depends on T005 + T007 (TDD). T009 depends on T005.
- **Phase 3**: T014 depends on T010–T013 (TDD) + T005 (types). T015 depends on T014. T016–T020 (proxy) are sequential edits to the same file. T021 parallel with T016–T020 (different file). T022 depends on T019 (stub mode must exist). T023 depends on T014. T024, T025, T026 sequential in demo.jsx; T024 depends on T008 (validateLiveConfig) and T017 (health endpoint). T027 depends on T019 (stub mode). T061 depends on T014 (both clients must exist). T062 depends on T027 (stub port is known). T028 depends on T026 + T027 + T062 (fixture helper).
- **Phase 4**: T029 depends on T008. T030, T031 depend on T024 + T062 (fixture helper). T032, T033 edit demo.jsx — serialise. T034, T035 parallel (docs).
- **Phase 5**: T036, T037 depend on T019 (stub mode) + T014 (client). T038 depends on T014. T039–T041 depend on T026, T027, T042, T062 (fixture helper). T042–T044 edit demo.jsx — serialise.
- **Phase 6**: evidence tasks depend on all implementation + test tasks; T058 depends on T045–T057 being present; T060 depends on all other Phase 6 tasks.

### Checkpoint after each user story

Each user-story phase should be independently runnable: after Phase 3 completes, the happy-path demo works end-to-end with a real provider. After Phase 4, operator misconfiguration is handled gracefully. After Phase 5, every failure class surfaces a distinct banner. Reviewers can ship a partial implementation at any story boundary.

---

## Implementation Strategy

### Incremental delivery

- **MVP after Phase 3**: a running operator can demo live off-corpus queries end-to-end. Phases 4 and 5 are UX hardening — worth shipping but not blocking to prove the capability.
- **Shippable after Phase 4**: an operator not present at authoring time (no hand-holding) can follow quickstart.md and get live mode working from a clean checkout.
- **Stakeholder-safe after Phase 5**: the demo is safe to run in front of stakeholders because every failure class has a clean banner — no uncaught errors, no infinite spinners.

### TDD posture

Every user-story phase writes failing tests first (all `[test]` tasks before their matching implementation task). Phase 2's validator test (T007) lands before T008. Phase 3's client tests (T010–T013) land before T014–T015. Phase 5's 7-class stub-harness test (T036) lands before T042's banner dispatch.

### Parallel-execution example (Phase 3)

```
# After Phase 2 is green, a reviewer can split Phase 3 across three swimlanes:
# - Swimlane A (tests):       T010, T011, T012, T013 (same test file — serialise)
# - Swimlane B (proxy):       T016 → T017 → T018 → T019 → T020; T021 parallel
# - Swimlane C (client+demo): T014 → T015 → T023 → T024 → T025 → T026
# Playwright integration (T027, T028) joins swimlanes at the end.
```

### Risk gates

- **Security gate (Phase 1 close)**: T004 must produce a clean gitleaks run on an empty branch before any credential-adjacent code lands. Failing this gate blocks Phase 3.
- **Offline-by-default gate (Phase 4 close)**: T030's Playwright network-spy must assert zero outbound calls in fixture mode. Failing this gate blocks Phase 6 (the PR).
- **Graceful-failure gate (Phase 5 close)**: T039 + T040 must pass for all 8 failure classes before evidence capture begins in Phase 6.
