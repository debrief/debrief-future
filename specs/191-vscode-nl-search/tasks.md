# Tasks: NL Search in VS Code Catalog Overview

**Feature**: 191-vscode-nl-search
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

## Evidence Requirements

**Evidence Directory**: `specs/191-vscode-nl-search/evidence/`
**Media Directory**: `specs/191-vscode-nl-search/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|---|---|---|
| `evidence/test-summary.md` | YAML front matter + vitest + Playwright results across `providerCall`, `FilterBar.nl`, `llmProxy`, Storybook E2E, VS Code E2E | Polish phase — after Phase 5 |
| `evidence/usage-example.md` | Walkthrough — enable feature → submit phrase → see chips → toggle off → verify zero outbound | Polish phase |
| `evidence/screenshots/filterbar-nl-light.png` | FilterBar NL mode in light theme, chips applied | Via Storybook E2E (Phase 3) |
| `evidence/screenshots/filterbar-nl-dark.png` | FilterBar NL mode in dark theme | Via Storybook E2E (Phase 3) |
| `evidence/screenshots/filterbar-nl-vscode.png` | FilterBar NL mode in vscode theme | Via Storybook E2E (Phase 3) |
| `evidence/screenshots/interaction.gif` | Type phrase → chips fly in → one chip removed — short <5 s, <2 MB | Via Playwright video → GIF (Polish) |
| `evidence/screenshots/banner-not-configured.png` | Enabled-but-no-key banner | Phase 5 |
| `evidence/screenshots/banner-ceiling-reached.png` | Per-session ceiling banner | Phase 5 |
| `evidence/screenshots/indicator-live.png` | `Live · Anthropic · claude-haiku-4-5-20251001` header chip | Phase 3 |
| `evidence/screenshots/state-opt-out.png` | Feature off, literal QuickSearch engaged | Phase 4 |
| `evidence/config-sample.jsonc` | Sample `settings.json` snippet showing the four `debrief.nlSearch.*` keys with comments | Phase 4 |
| `evidence/sequence.mermaid` | Webview↔host↔Anthropic message/data flow including abort path | Polish phase |
| `evidence/sc-003-zero-outbound.json` | Playwright-captured network log showing zero third-party hosts during a full opt-out session | Phase 4 |
| `evidence/sc-004-failure-matrix.md` | One row per failure class with screenshot + banner text + `data-transport-reason` | Phase 5 |

### Media Content

| Artifact | Description | Created When |
|---|---|---|
| `media/planning-post.md` | Blog post announcing the feature (exists) | /speckit.plan |
| `media/linkedin-planning.md` | LinkedIn summary for planning (exists) | /speckit.plan |
| `media/shipped-post.md` | Blog post celebrating completion | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | Polish phase |

### PR Creation

| Action | Description | Created When |
|---|---|---|
| Feature PR | PR in debrief-future with evidence + media | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with shipped post | Triggered by /speckit.pr |

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you think browsers can't be installed. Use `@sparticuz/chromium` via `node apps/web-shell/run-playwright.mjs`. Full details in `docs/project_notes/playwright-installation-research.md`.

## Phase 1: Setup

**Goal**: Scaffold the workspace so Phase 2 can start. No behaviour changes yet.

- [x] T001 Create evidence + media directories for this feature `specs/191-vscode-nl-search/evidence/.gitkeep`
- [x] T002 [P] Add empty placeholder for the shared provider-call module `shared/components/src/nl-cql2/providerCall.ts`
- [x] T003 [P] Add empty placeholder for the VS Code proxy service `apps/vscode/src/services/llmProxy.ts`
- [x] T004 [P] Add empty placeholder for the post-message client factory `shared/components/src/nl-cql2/__tests__/providerCall.test.ts`
- [x] T005 [P] Re-run `pnpm install` + `task verify` on the pre-change tree to capture a green baseline before touching anything `specs/191-vscode-nl-search/evidence/baseline-verify.txt`

## Phase 2: Foundation — Shared Core

**Goal**: Land the single canonical `LLMClient` + `LiveOutcome` + `LiveConfig` shape, extract the shared `providerCall` core, and migrate `apps/nl-demo` in lock-step. After this phase, the browser demo works under the new contract and the VS Code feature has a stable floor to build on.

**Independent Test**: `pnpm -r test` + `apps/nl-demo` Playwright suite stay green after the migration; zero diff in user-visible `nl-demo` behaviour.

### Interface migration (review Decisions 1, 5, 6, 8)

- [x] T010 Replace `LLMClient` signature with `generate(prompt): Promise<LiveOutcome>` and add idempotent `abort(): void` `shared/components/src/nl-cql2/types.ts`
- [x] T011 Collapse the old `LiveLLMClient` extension into the same `LLMClient` (no separate extension type) `shared/components/src/nl-cql2/types.ts`
- [x] T012 Replace `LiveConfig` with the discriminated `BrowserLiveConfig | VsCodeLiveConfig` union per `contracts/llm-client.ts` `shared/components/src/nl-cql2/types.ts`
- [x] T013 Collapse `LiveTransportErrorReason` + `GenerationResultError` into the canonical `LiveOutcome` union: rename `usage-cap-reached` → `ceiling-reached`; fold `oversize-response` into `malformed-response` with nested `reason`; add `not-configured` `shared/components/src/nl-cql2/types.ts`

### Shared provider-call core (review Decision 3)

- [x] T014 Implement the extracted `providerCall({prompt, model, apiKey, timeoutMs, maxResponseBytes, signal, callIndex}) → Promise<LiveOutcome>` with streams-and-counts response handling, timeout, signal-driven socket close, and full outcome classification `shared/components/src/nl-cql2/providerCall.ts`
- [x] T015 Export `providerCall` + the new `LiveOutcome`/`LiveConfig` types from the nl-cql2 barrel `shared/components/src/nl-cql2/index.ts`

### Provider-call unit tests (review Decisions 9 + 11)

- [x] T016 [test] Happy-path test — 200 OK with valid Anthropic response body; assert `kind: "success"`, correct `durationMs` + `responseBytes` + `model` `shared/components/src/nl-cql2/__tests__/providerCall.test.ts`
- [x] T017 [P][test] Failure-class tests — one case each for 401 → `auth-failure`, 429 → `rate-limit`, 500 → `provider-error`, socket hang-up → `transport-error/network` `shared/components/src/nl-cql2/__tests__/providerCall.test.ts`
- [x] T018 [P][test] Timeout test — mock slow-response past `timeoutMs`; assert `kind: "timeout"` and socket torn down `shared/components/src/nl-cql2/__tests__/providerCall.test.ts`
- [x] T019 [P][test] Malformed test — non-JSON body → `kind: "malformed-response", reason: "non-json"` `shared/components/src/nl-cql2/__tests__/providerCall.test.ts`
- [x] T020 [P][test] Oversize truncation test — response body exceeds `maxResponseBytes`; assert `kind: "malformed-response", reason: "oversize"` and response stream terminated `shared/components/src/nl-cql2/__tests__/providerCall.test.ts`
- [x] T021 [P][test] Abort-mid-stream race test — signal.abort() fired while body streaming; assert `kind: "transport-error", reason: "cancelled"` + socket closed (HTTPS-layer half of Decision 11) `shared/components/src/nl-cql2/__tests__/providerCall.test.ts`

### Migrate existing consumers (review Decision 1, 3)

- [x] T022 Update `createRecordedLLMClient` to return `LiveOutcome` (wrap fixture string in `{kind:"success", rawResponse, ...}`) `shared/components/src/nl-cql2/clients.ts`
- [x] T023 Update `createPassthroughLLMClient` to the new shape `shared/components/src/nl-cql2/clients.ts`
- [x] T024 Rewire `createLiveLLMClient` to delegate its HTTPS work to `providerCall`; retain the HTTP-proxy adapter responsibilities only (URL assembly, token header, response forwarding) `shared/components/src/nl-cql2/clients.ts`
- [x] T025 Port `apps/nl-demo/scripts/live-proxy.mjs` to import `providerCall` from the shared module instead of its own `callAnthropic` (node-friendly wrapper around the shared core) `apps/nl-demo/scripts/live-proxy.mjs`
- [x] T026 Migrate `apps/nl-demo/demo.jsx` to the new `result.error.kind === "…"` shape (outcome-driven banner dispatch) `apps/nl-demo/demo.jsx`
- [x] T027 Re-run `apps/nl-demo/run-playwright.mjs` to prove the 21-test suite stays green under the new contract `specs/191-vscode-nl-search/evidence/migration-nl-demo-playwright.txt`

### Regression gate (review Decision 12)

- [x] T028 [test] Add one assertion to an existing FilterBar test confirming behaviour with no `llmClient` prop is byte-identical to today (literal-substring path) `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`

### Parallel execution notes

Interface-migration tasks T010-T013 land as one edit on `types.ts` (serial within the file, but the rest of the phase branches):
- T014 blocks T015-T021 (core must exist before tests can run).
- T016-T021 can run in parallel once T014 lands.
- T022-T024 can run in parallel once T010-T013 land.
- T025-T026 can run in parallel once T024 lands.
- T027 + T028 run last in Phase 2.

## Phase 3: User Story 1 (P1) — Analyst runs NL search in Catalog Overview

**Goal**: Analyst with the feature enabled types "UK submarines" in Catalog Overview, presses Enter, sees chips + filtered list. Headline value.

**Independent Test**: In code-server with enabled=true + stub key, open Catalog Overview, submit a phrase, assert chips + count appear and prior chips survive a failure.

### Message protocol (review Decision 2)

- [x] T030 Add `nlGenerate` (Request), `nlAbort`, `nlOutcome` (Response), `nlConfig` variants to the existing webview union, using the repo's `camelCase` tag convention and `RequestMessage`/`ResponseMessage` bases `apps/vscode/src/webview/messages.ts`

### PostMessage client adapter (review Decision 4)

- [x] T031 Implement `createPostMessageLLMClient({ postMessage, subscribe, uuid })` in `clients.ts` — internally owns an `AbortController`, tracks in-flight `requestId`, filters incoming messages by id, exposes idempotent `abort()` that resolves pending `generate()` with `{kind:"transport-error", reason:"cancelled"}` `shared/components/src/nl-cql2/clients.ts`
- [x] T032 [test] Unit test `createPostMessageLLMClient` — happy path, abort during pending, abort after completion is a no-op, unknown response ids ignored `shared/components/src/nl-cql2/__tests__/clients.test.ts`

### Extension-host proxy service (review Decisions 13, 14, 15)

- [x] T033 Implement lazy-init singleton `getLlmProxy(context)` that holds: in-memory key cache (populated from `context.secrets.get` on first use, invalidated via `context.secrets.onDidChange`), `Map<requestId, AbortController>`, session call counter, and the `providerCall` invoker `apps/vscode/src/services/llmProxy.ts`
- [x] T034 Register the `nlGenerate` + `nlAbort` message handlers on webview activation; handlers lazy-instantiate the proxy on first `nlGenerate` — NOT at `activate()` `apps/vscode/src/extension.ts`
- [x] T035 In the proxy, wrap `providerCall` so every outcome (success, fail, or abort) runs a `finally` block that deletes the `requestId` entry from the controller map `apps/vscode/src/services/llmProxy.ts`
- [x] T036 Emit one `[nl-search/live]` structured log line per outcome — timestamp, provider, model, durationMs, outcome, responseBytes, callIndex. No prompt or response body. `apps/vscode/src/services/llmProxy.ts`

### Unit tests for the proxy

- [x] T037 [test] Proxy message-protocol test — `nlGenerate` arrives, proxy resolves with `nlOutcome`; `nlAbort` arrives, no `nlOutcome` for that id `apps/vscode/src/services/__tests__/llmProxy.test.ts`
- [x] T038 [P][test] Proxy key-cache invalidation test — first request triggers SecretStorage read; subsequent requests use cache; firing `onDidChange` invalidates the cache `apps/vscode/src/services/__tests__/llmProxy.test.ts`
- [x] T039 [P][test] Proxy map-cleanup test — success, failure, and abort paths each leave the `Map<requestId, AbortController>` empty `apps/vscode/src/services/__tests__/llmProxy.test.ts`

### FilterBar NL mode (review Decisions 4, 7, 11, 12)

- [x] T040 Add optional `llmClient?: LLMClient` and `liveModeLabel?: string` props to `FilterBar`; when `llmClient` is present, route Enter through `buildPrompt → client.generate → parseResponse → dispatch chips | fail banner` instead of the literal title path `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T041 Add the diagram comment above the NL handler documenting the `llmClient present? → NL pipeline : literal title` decision tree plus the "lozenges survive failure" invariant (review §Diagrams) `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T042 Before calling `client.generate()`, invoke `client.abort()` on any in-flight prior submission so supersession never races `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T043 Render the live-mode indicator (provider + model from `liveModeLabel`) when `llmClient` is present `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T044 Render the failure banner inline above the filter row using the existing #190 banner copy + recovery affordances; keyed by `data-transport-reason` `shared/components/src/FilterBar/FilterBar.tsx`

### FilterBar unit tests (review Decisions 7, 11, 12)

- [x] T045 [test] FilterBar NL happy path — mock `llmClient` returns `success`; assert chips applied, banner absent `shared/components/src/FilterBar/__tests__/FilterBar.nl.test.tsx`
- [x] T046 [P][test] FilterBar lozenge-survival test (Decision 7) — submit with chips present, force `auth-failure` outcome, assert existing chips survive and banner visible `shared/components/src/FilterBar/__tests__/FilterBar.nl.test.tsx`
- [x] T047 [P][test] FilterBar supersession race test (Decision 11, call-site half) — submit A (pending), submit B, assert A's `client.abort()` was called and only B's outcome renders `shared/components/src/FilterBar/__tests__/FilterBar.nl.test.tsx`
- [x] T048 [P][test] FilterBar indicator-visibility test — `llmClient` prop controls indicator render `shared/components/src/FilterBar/__tests__/FilterBar.nl.test.tsx`

### StacBrowser wiring

- [x] T049 Plumb optional `llmClient` prop through `StacBrowser` onto `FilterBar` `shared/components/src/StacBrowser/StacBrowser.tsx`

### Catalog Overview webview

- [x] T050 In `catalogOverview.tsx`, construct `createPostMessageLLMClient({ postMessage: vscode.postMessage, subscribe: addEventListener('message'), uuid: crypto.randomUUID })` on mount; dispose on unmount; pass it (plus `liveModeLabel` from `nlConfig` state) to `StacBrowser` `apps/vscode/src/webview/web/catalogOverview.tsx`
- [x] T051 Subscribe to `nlConfig` messages in `catalogOverview.tsx` so the indicator reflects current host state; conditionally pass `llmClient` only when `enabled && hasKey` (gate NL routing at the call site) `apps/vscode/src/webview/web/catalogOverview.tsx`

### Storybook + E2E

- [x] T052 Add `NlModeWithStubClient` story to `FilterBar.stories.tsx` — deterministic stub `LLMClient` that canned-responds to a handful of phrases and each failure class `shared/components/src/FilterBar/FilterBar.stories.tsx`
- [x] T053 [test] Storybook E2E — happy-path chip application across light/dark/vscode themes; captures the three theme screenshots + the indicator screenshot to `specs/191-vscode-nl-search/evidence/screenshots/` `shared/components/e2e/FilterBar-nl.spec.ts`
- [x] T054 [test] VS Code E2E happy path — in code-server with stub key + enabled=true, submit "UK submarines", assert chips + filtered count + indicator `tests/e2e/test-vscode-nl-search.spec.ts`

### Parallel execution notes

- T030, T031 land serially (client adapter imports message types).
- T033-T036 serial (same file, sequential edits).
- T037-T039 parallel.
- T040-T044 serial (same file).
- T045-T048 parallel.
- T049-T051 serial (browser → webview wiring depends on T040).
- T052-T054 parallel.

## Phase 4: User Story 2 (P2) — Opt-in with credential isolation

**Goal**: Opt-in default off. When enabled, credential lives in SecretStorage only; webview and workspace never see the key. Toggling off proves zero outbound.

**Independent Test**: Toggle `debrief.nlSearch.enabled` off with a key present, submit 10 phrases, assert zero requests leave the extension host (Playwright network trace).

### Configuration surface

- [x] T060 Add `debrief.nlSearch.*` configuration contributions to the extension manifest (enabled bool default false, model string default `claude-haiku-4-5-20251001`, callCeiling number default 50, timeoutMs default 12000, maxResponseBytes default 262144) `apps/vscode/package.json`
- [x] T061 Add two command contributions: `debrief.nlSearch.setApiKey` and `debrief.nlSearch.clearApiKey` `apps/vscode/package.json`
- [x] T062 Implement the two commands — `setApiKey` uses `window.showInputBox({password:true})` and writes to `context.secrets`; `clearApiKey` deletes the secret; both push an updated `nlConfig` message to every open Catalog Overview webview `apps/vscode/src/extension.ts`

### Config propagation

- [x] T063 In `llmProxy.ts`, implement `readLiveConfig(context): VsCodeLiveConfig` — pulls from `workspace.getConfiguration('debrief.nlSearch')` + key-cache presence; `hasApiKey` is a bool, never the key itself `apps/vscode/src/services/llmProxy.ts`
- [x] T064 Subscribe to `workspace.onDidChangeConfiguration('debrief.nlSearch')` and `context.secrets.onDidChange`; on either event, push a fresh `nlConfig` message to every registered webview panel `apps/vscode/src/services/llmProxy.ts`
- [x] T065 In `catalogOverview.tsx`, store the latest `nlConfig` in React state; derive `shouldUseLlmClient = enabled && hasKey` and conditionally pass the client to `StacBrowser` `apps/vscode/src/webview/web/catalogOverview.tsx`

### Opt-in unit tests

- [x] T066 [test] Config-read test — set each setting to a non-default value in a mocked `workspace.getConfiguration`; assert `readLiveConfig` returns the expected shape and never includes the raw key `apps/vscode/src/services/__tests__/llmProxy.test.ts`
- [x] T067 [P][test] Key-never-crosses-boundary test — run a full `nlGenerate → providerCall → nlOutcome` roundtrip with a spy on `webview.postMessage`; assert no emitted message contains the configured secret `apps/vscode/src/services/__tests__/llmProxy.test.ts`

### Opt-out E2E

- [x] T068 [test] VS Code E2E opt-out case — set enabled=false with a key present; submit 10 phrases; record Playwright network trace; save the trace summary showing zero host != 127.0.0.1/localhost/extension-webview URLs `tests/e2e/test-vscode-nl-search.spec.ts`
- [x] T069 Produce `sc-003-zero-outbound.json` from the Playwright trace (one JSON blob per submission with `outbound_calls: []`) `specs/191-vscode-nl-search/evidence/sc-003-zero-outbound.json`

### Credential isolation E2E

- [x] T070 [test] VS Code E2E credential-isolation case — set a distinctive stub key, submit a phrase, grep the Playwright-captured network body + the webview DOM + the session log for the key string; assert zero hits `tests/e2e/test-vscode-nl-search.spec.ts`

### Configuration sample evidence

- [x] T071 [P] Commit a sample `settings.json` snippet for the quickstart to reference `specs/191-vscode-nl-search/evidence/config-sample.jsonc`

### Parallel execution notes

- T060-T062 serial (same manifest + extension.ts edits).
- T063-T065 serial (config propagation chain).
- T066-T067 parallel.
- T068-T070 serial (extend the same E2E spec file).
- T071 parallel with T068-T070.

## Phase 5: User Story 3 (P3) — Graceful failure across 7 classes

**Goal**: Every failure mode surfaces a distinct, user-legible banner; prior chips are preserved; the user has a recovery affordance per class.

**Independent Test**: Seven stubbed scenarios, one per failure class, each producing a banner with the expected `data-transport-reason` and preserving prior chip state.

### Host-side short-circuits (review Decision 6 new outcomes)

- [x] T080 Implement `not-configured` outcome in `llmProxy` — when `enabled=true` but `hasApiKey=false`, resolve immediately without calling `providerCall`; include `reason: "no-key"` vs `reason: "disabled"` (the latter shouldn't normally reach the proxy but is defensive) `apps/vscode/src/services/llmProxy.ts`
- [x] T081 Implement `ceiling-reached` outcome — activation-scoped counter increments before each `providerCall`; post-increment value exceeding `callCeiling` returns the outcome without a network call. Reload-window is the reset affordance `apps/vscode/src/services/llmProxy.ts`

### Banner rendering per class

- [x] T082 In `FilterBar.tsx`, render distinct banner copy + recovery buttons per `LiveOutcome["kind"]`: auth-failure (Open Settings), rate-limit (Retry), provider-error (Retry), timeout (Retry), malformed-response (Rephrase — include nested reason for oversize/non-json), not-configured (Open Settings), ceiling-reached (Reload) `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T083 Ensure each banner sets `data-testid="live-transport-banner"` + `data-transport-reason={kind}` for E2E selectors `shared/components/src/FilterBar/FilterBar.tsx`

### Stub-mode harness for E2E

- [x] T084 Add a dev-only `Debrief: NL Search — Stub Mode` command that replaces the real `providerCall` with a phrase-keyed stub (same canon as `apps/nl-demo/e2e/fixtures/live-stub.json` + the two new outcomes) `apps/vscode/src/extension.ts`
- [x] T085 Copy/port the stub fixture from #190 and extend with `not-configured phrase` + `ceiling-reached phrase` entries `apps/vscode/tests/fixtures/live-stub.json`

### Failure-matrix E2E (review Decision 10)

- [x] T086 [test] VS Code E2E — parameterised over the 7 classes; for each, submit the trigger phrase and assert the banner appears with the correct `data-transport-reason`, that prior chips from an earlier success are still rendered, and that the expected recovery button is wired `tests/e2e/test-vscode-nl-search.spec.ts`
- [x] T087 Capture one screenshot per class to `specs/191-vscode-nl-search/evidence/screenshots/banner-<kind>.png` from the E2E run `specs/191-vscode-nl-search/evidence/screenshots/`
- [x] T088 Produce `sc-004-failure-matrix.md` — 7 rows (class, screenshot, banner text, recovery affordance, data-transport-reason) `specs/191-vscode-nl-search/evidence/sc-004-failure-matrix.md`

### Cancellation-is-silent E2E

- [x] T089 [test] VS Code E2E — submit phrase A against a slow stub, immediately submit phrase B; assert A produces no banner (cancelled outcomes drop silently) and B's outcome lands `tests/e2e/test-vscode-nl-search.spec.ts`

### Parallel execution notes

- T080-T081 serial (same file).
- T082-T083 serial (same component).
- T084-T085 parallel (extension + fixture).
- T086-T089 serial (same E2E spec).

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Capture evidence, write the shipped media content, and open the PR. No feature changes in this phase — only verification + documentation.

### Full CI gate

- [x] T100 Run `task verify` (lint + typecheck + unit tests across Python + TypeScript) and capture the green output `specs/191-vscode-nl-search/evidence/task-verify.txt`
- [x] T101 Run the `apps/nl-demo` Playwright suite to confirm the #190 browser demo still passes post-migration `specs/191-vscode-nl-search/evidence/nl-demo-playwright.txt`
- [x] T102 Run the VS Code E2E suite `tests/e2e/test-vscode-nl-search.spec.ts` headed via `xvfb-run` + `@sparticuz/chromium` and capture the pass summary `specs/191-vscode-nl-search/evidence/vscode-e2e.txt`

### Evidence collection

- [x] T103 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) — YAML front matter: feature, captured_at, git_sha, tests_passed, tests_failed, tests_skipped, coverage_pct `specs/191-vscode-nl-search/evidence/test-summary.md`
- [x] T104 Create usage demonstration — enable → submit → chips → toggle off → verify zero outbound, with copy-paste commands `specs/191-vscode-nl-search/evidence/usage-example.md`
- [ ] T105 [P] Produce the interaction GIF (<5 s, <2 MB) via Playwright video recording of the happy-path flow (type phrase → chips fly in → remove chip) `specs/191-vscode-nl-search/evidence/screenshots/interaction.gif`
- [x] T106 [P] Produce sequence diagram (Mermaid) of webview → extension host → Anthropic with abort path `specs/191-vscode-nl-search/evidence/sequence.mermaid`

### Media content

- [x] T107 Spawn the Content Specialist (`.claude/agents/media/content.md`) to write a Shipped Post covering: What We Built, the 3-theme + interaction screenshots, the 7-class failure matrix, lessons learned (fence-strip surprise, `a_containedBy` normalisation in array_filter, keychain quirks on Linux), What's Next (backlog #192-#195) `specs/191-vscode-nl-search/media/shipped-post.md`
- [x] T108 [P] Generate LinkedIn shipped summary — 150-200 words, hook on "NL catalogue search now inside VS Code", link placeholder to the shipped post `specs/191-vscode-nl-search/media/linkedin-shipped.md`

### Memory updates

- [x] T109 [P] Append this feature's completion line to `docs/project_notes/issues.md` with links to spec + evidence `docs/project_notes/issues.md`
- [x] T110 [P] Log the interface-migration decision (pre-release Article XIV) to `docs/project_notes/decisions.md` so future maintainers see why the old `Promise<string>` shape disappeared `docs/project_notes/decisions.md`

### PR creation

- [ ] T111 Create PR and publish blog: run `/speckit.pr`

**Task T111 must run last. All other Phase 6 tasks must complete first. `/speckit.pr` creates the feature PR in `debrief-future` AND the blog PR in `debrief.github.io`; returns both URLs.**

### Parallel execution notes

- T100-T102 serial (CI gate must run in order: unit → demo → E2E).
- T103 depends on T100-T102; blocks T111.
- T104 parallel with T105-T106.
- T107 depends on T105 (needs the GIF + screenshots); blocks T108.
- T108-T110 parallel.
- T111 blocked by all of the above.

## Dependencies

**Phase ordering** (mostly linear because of shared-core migration):

- **Phase 1 → Phase 2**: Phase 2 edits the shared nl-cql2 files that Phase 1 scaffolds.
- **Phase 2 → Phase 3 (P1)**: Phase 3's new `createPostMessageLLMClient` and the VS Code proxy consume the new `LLMClient`/`LiveOutcome` interface. Phase 3 can start once T014 (provider-call core) + T010-T013 (interface migration) land, even if T016-T021 tests are still in progress.
- **Phase 3 (P1) → Phase 4 (P2)**: Phase 4 adds the opt-in wrapping + credential isolation around the Phase 3 happy path. Phase 3's `shouldUseLlmClient` gate in `catalogOverview.tsx` (T051) is the hook Phase 4 fills in.
- **Phase 3 → Phase 5 (P3)**: Phase 5's banner rendering adds distinct copy per `LiveOutcome["kind"]`; it depends on Phase 3's indicator + banner-container scaffolding (T043, T044).
- **Phase 4 ⟂ Phase 5**: Independent within the US2/US3 boundary — Phase 4's opt-in tests and Phase 5's failure-class tests can run in parallel once Phase 3 is green.
- **Phase 6**: depends on Phases 1-5 all complete; T111 (PR) is the final task and depends on every preceding Polish task.

**Cross-story user-facing gates** (recommended checkpoint order):

1. After Phase 2: `apps/nl-demo` (#190) stays fully green under the new `LLMClient`/`LiveOutcome` shape.
2. After Phase 3: An analyst with stubbed live mode can run `UK submarines` inside Catalog Overview and see chips.
3. After Phase 4: An analyst can enable/disable the feature through settings; disabled mode produces zero outbound calls.
4. After Phase 5: Every failure class renders a distinct banner and preserves prior chips.
5. After Phase 6: Evidence + media published; feature and blog PRs are open.

## Implementation Strategy

**Incremental delivery** (priority-ordered, each phase yields a demoable increment):

1. **Phase 1-2 together as one PR-worthy checkpoint**: the scaffolding + the shared-core migration. Ending state: `apps/nl-demo` fully green under the new contract, `shared/nl-cql2/providerCall.ts` exists with full test coverage, nothing VS-Code-specific yet. Can ship behind the scenes without any user impact.
2. **Phase 3 (P1)**: the headline feature. An analyst with a stub key + enabled=true in Catalog Overview sees chips. The VS Code E2E suite proves it.
3. **Phase 4 (P2)**: the opt-in story. This is what makes the feature shippable — without it, the feature would ship enabled by default (unacceptable in defence contexts).
4. **Phase 5 (P3)**: the quality bar. This turns "works when it works" into "trusted tool". Each failure class surfaces distinct copy; cancellations drop silently.
5. **Phase 6**: verification + publication.

**Key invariants to keep visible during implementation** (from /speckit.review):

- The API key NEVER leaves the extension host process. The `apiKey` string must appear zero times in any webview-side artefact (T067 asserts this programmatically).
- `generate()` NEVER throws. Every failure is a `LiveOutcome` with a non-`success` kind.
- Lozenges and filter state SURVIVE every failure. The only state-clearing signals are success, remove-chip, clear-all, or manual-add (T046 asserts this).
- Supersession ALWAYS cancels the prior in-flight call before issuing a new one (T042 in code, T047 in test).
- `Map<requestId, AbortController>` entries are deleted in a `finally` block after every outcome, including the happy path (T035, T039).

**What to do if a phase goes sideways**:

- Phase 2 fails the `apps/nl-demo` regression: stop, revert the interface migration piece that broke it, investigate before resuming.
- Phase 3 test T054 (VS Code happy path) fails despite T045 (unit happy path) passing: the wiring is the problem — check `catalogOverview.tsx` (T050) and extension.ts message registration (T034) before touching the component.
- Phase 4 T068 shows outbound calls with feature disabled: critical — block the PR. Likely cause is the `shouldUseLlmClient` gate (T051) not being respected.
- Phase 5 T086 shows two failure classes render the same banner: check T082's switch statement and T083's `data-transport-reason` attribute.

**Rollback posture**: Article XIV applies — the interface migration IS the breaking change. A rollback plan exists only insofar as `git revert` on this feature branch restores the old `Promise<string>` shape; no backwards-compat layer is shipped and none is expected.
