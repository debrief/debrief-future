# Implementation Plan: Live LLM Transport

**Branch**: `190-live-llm-transport` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/190-live-llm-transport/spec.md`

## Summary

Deliver a second implementation of #188's `LLMClient` contract that routes prompts to a real language model (Anthropic Claude) and returns the provider's raw response for #188's existing validator to parse. The transport is opt-in, configured at runtime, and drops into #189's demo via a config toggle — fixture-only mode remains the default and the CI baseline. Credentials never touch the static bundle: a lightweight Node sidecar proxy (`apps/nl-demo/scripts/live-proxy.mjs`) holds the API key in its environment and forwards requests. The browser-side `createLiveLLMClient` talks to the proxy via `fetch`, enforcing per-request timeout, per-session call cap, response-size cap, and in-flight-call supersession. Deterministic stubs exercise all failure classes in CI without network or credentials.

## Technical Context

**Language/Version**: TypeScript 5.x (shared package + proxy), JSX via Babel standalone (demo app)
**Primary Dependencies**: No new runtime dependencies. Proxy uses Node stdlib (`node:http`, `node:https`). `createLiveLLMClient` uses browser-native `fetch` + `AbortController`. Tests use existing `vitest` setup.
**Storage**: None. Config is a runtime JSON file loaded by the demo (`apps/nl-demo/live-config.json` at the app root, gitignored) and env vars for the proxy (`ANTHROPIC_API_KEY` in `apps/nl-demo/.env`, gitignored). The file lives at the app root — not in `data/` — so `sync-data.mjs`'s regeneration cycle cannot inadvertently wipe it.
**Testing**: vitest for the live-client stub harness (colocated under `shared/components/src/nl-cql2/__tests__/`), Playwright for end-to-end smoke tests under `apps/nl-demo/e2e/` (existing `testDir`) exercising transport-selection, zero-outbound-in-fixture-mode, in-flight supersession, and failure-path branches. The stub proxy (`live-proxy.mjs --stub`) boots alongside the static web server via a second entry in Playwright's `webServer` array.
**Target Platform**: Desktop browsers (Chrome/Edge/Firefox current versions) for the demo; Node 18+ for the proxy.
**Project Type**: Infrastructure add-on to an existing web app (the #189 stakeholder demo). No new package; one new module inside `@debrief/components` and one new script inside `apps/nl-demo/`.
**Performance Goals**: End-to-end live phrase latency < 10 s at p95 under normal conditions (SC-007). Proxy adds < 50 ms overhead at warm p50 (depends on TLS connection reuse — see below); first-call cold-start may add up to ~300 ms for the TLS handshake. Proxy MUST construct its upstream `https.Agent` with `keepAlive: true` and `maxSockets: 4` to meet the warm-overhead target.
**Constraints**: (a) Offline-by-default — zero network activity unless operator explicitly enables live mode (SC-003). (b) No credential value in any deployed artefact (SC-006). (c) CI MUST run without network or credentials — stub harness exercises all failure classes (FR-015). (d) Static-hostable fixture path MUST remain unchanged when the proxy is absent.
**Scale/Scope**: Demo scenarios target tens of live calls per session (default cap 50, FR-010). Response size cap 256 KB (< 1% of plausible JSON responses; protects UI from runaway models).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Evaluation |
|---------|-----------|------------|
| I. Defence-Grade Reliability | **Core** | ✅ Fixture mode is default; live mode is strictly opt-in. No silent failures — every failure class has a distinct, user-readable diagnostic. Reproducibility is preserved in CI via the deterministic stub. |
| II. Schema Integrity | Low | ✅ No schema changes. The `LLMClient` contract is inherited from #188 verbatim. |
| III. Data Sovereignty | **Core** | ✅ Provenance preserved — each live call emits a structured call record (provider, model, outcome, duration) to the console. Live mode requires explicit opt-in (data stays local by default). No telemetry added. |
| IV. Architectural Boundaries | High | ✅ The live client is a pure data transport returning raw strings; UI rendering lives in #189. The proxy is a thin request forwarder; it holds no domain logic. |
| V. Extensibility | Medium | ✅ Lives behind the existing `LLMClient` interface — future transports (MCP, local model) can plug in without touching the demo or the generator. |
| VI. Testing | **Core** | ✅ Stub harness covers all 6 failure classes; Playwright smoke test exercises transport selection end-to-end. CI gate unchanged (runs without network/credentials). |
| VII. Test-Driven AI Collaboration | Medium | ✅ Acceptance scenarios and failure classes in spec are encoded as stub test cases before implementation. |
| VIII. Documentation | Medium | ✅ README update in `apps/nl-demo/` covers operator workflow, config shape, provider choice rationale, and revocation. |
| IX. Dependencies | **Core** | ✅ Zero new runtime dependencies. Node stdlib for the proxy; native `fetch` in the browser. No provider SDK — raw HTTPS POST keeps us portable across providers. |
| X. Security | **Core** | ✅ `ANTHROPIC_API_KEY` lives only in the proxy's environment; `.env` gitignored; `live-config.json` gitignored and lives at the app root (not `data/`) to avoid sync-data collisions. `gitleaks` CI step (configured via `gitleaks.toml`) scans `dist/`, `apps/nl-demo/dist/`, and the committed worktree for provider-key patterns on every PR, fails closed. Proxy binds to `127.0.0.1` by default; non-loopback bind requires two deliberate opt-ins (`PROXY_ALLOW_REMOTE=true` AND an `X-Proxy-Token` header matching a startup-generated token), so an accidental `0.0.0.0` bind cannot become an open relay. |
| XI. Internationalisation | Low | ⚠️ New user-facing diagnostic messages follow the existing #189 convention (English strings embedded in JSX). Article XI's "strings MUST be externalisable" requirement applies repo-wide; the demo shell inherits its non-externalised state from #189 and this item does not make it worse. Externalising the existing and new strings is tracked outside #190 — adding an i18n framework here is out of scope and would bloat the transport-focused PR. No new violation introduced. |
| XII. Community Engagement | Low | ✅ Feature announced in planning post; demo remains public. |
| XIII. Contribution Standards | Low | ✅ Atomic commits; CI gate unchanged; PR review. |
| XIV. Pre-Release Freedom | N/A | Breaking changes permitted; no backwards-compat obligations. |
| XV. Strict Type Safety | **Core** | ✅ All new TypeScript code (client, types, proxy) strict-typed; `any` prohibited. Proxy-response JSON narrowed at the client boundary via a typed validator before being returned to `generateCql2`. |

**Initial Gate**: PASS — no violations, no Complexity Tracking entries required.

**Post-Design Gate** (re-checked after Phase 1 artefacts complete): **PASS**.

- The local-proxy decision (R1) strengthens Article X (credential isolation) compared to the direct-browser alternative.
- The two-file config split (R3) operationalises Article I (offline by default) — a freshly-served demo with no operator action makes zero live calls.
- Zero new runtime dependencies (Article IX) — proxy uses Node stdlib; browser uses native `fetch` + `AbortController`.
- All types in `data-model.md` and `contracts/live-client.ts` are strict-typed; `any` does not appear (Article XV).
- CI impact is a new vitest module and one Playwright spec, both running against the stub-mode proxy with no network or credential dependency (Article VI).
- Provenance (Article III): each live call emits a `TransportCallRecord` with no prompt/response/credential payload — operational metadata only.
- No new complexity items.

## Project Structure

### Documentation (this feature)

```text
specs/190-live-llm-transport/
├── plan.md              # This file
├── research.md          # Phase 0 output — provider + transport-style decisions
├── data-model.md        # Phase 1 output — live-config schema, call-record shape
├── quickstart.md        # Phase 1 output — operator "enable live mode in 5 minutes"
├── contracts/           # Phase 1 output — proxy HTTP contract, client TypeScript contract
│   ├── proxy-http.md    # POST /generate request/response + error envelope
│   └── live-client.ts   # TypeScript signatures for createLiveLLMClient + config
├── checklists/
│   └── requirements.md  # Created by /speckit.specify
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/components/src/nl-cql2/
├── clients.ts                    # EXTEND — add createLiveLLMClient + validateLiveConfig + isLiveTransportError
├── types.ts                      # EXTEND — add LiveConfig, LiveTransportError, TransportCallRecord, LiveConfigValidationError
├── index.ts                      # EXTEND — re-export new symbols
└── __tests__/
    ├── liveClient.test.ts        # NEW — unit tests for client + config validation;
    │                             #       includes FR-012 supersession case (slow call 1,
    │                             #       fast call 2 → only call 2 reaches consumer) and
    │                             #       FR-009 no-prompt-hash regression guard
    ├── liveStub.ts               # NEW — scripted-response stub for use in tests
    └── liveStub.test.ts          # NEW — stub-harness coverage of all 7 LiveTransportError
                                  #       classes (auth-failure, rate-limit, provider-error,
                                  #       transport-error, timeout, oversize-response,
                                  #       usage-cap-reached) plus #188 malformed-response path

apps/nl-demo/
├── demo.jsx                      # EXTEND — transport-selection hook, boot-time proxy health
│                                  #          check, transport-mode indicator (FR-018),
│                                  #          error-banner variants for LiveTransportError
├── scripts/
│   ├── live-proxy.mjs            # NEW — Node HTTP proxy (stdlib only) forwarding to Anthropic
│   │                             #       via an https.Agent({ keepAlive: true, maxSockets: 4 });
│   │                             #       exposes POST /generate and GET /health; supports
│   │                             #       `--stub <scenarios.json>` for CI; binds 127.0.0.1 by
│   │                             #       default; non-loopback bind requires PROXY_ALLOW_REMOTE=true
│   │                             #       AND an X-Proxy-Token header matching a startup-generated
│   │                             #       token (printed to stderr and set into live-config.json)
│   ├── lib-entry.mjs             # EXTEND — export createLiveLLMClient from bundle
│   └── sync-data.mjs             # UNCHANGED — app-root live-config.json is outside its scope
├── live-config.json              # NEW (gitignored) — operator-supplied runtime config;
│                                  #                    at app root, NOT in data/, to stay
│                                  #                    clear of sync-data regeneration cycle
├── .env                          # NEW (gitignored) — ANTHROPIC_API_KEY + proxy env
├── .env.example                  # NEW — documents .env keys without committing a value
├── .gitignore                    # EXTEND — add /live-config.json, /.env
├── e2e/
│   ├── live-transport.spec.ts    # NEW — Playwright E2E: transport-selection, FR-012 supersession
│   │                             #       (end-to-end), SC-003 zero-outbound (network-spy),
│   │                             #       SC-005 failure-class banners, health-check fallback
│   └── fixtures/
│       └── live-stub.json        # NEW — scripted scenarios consumed by live-proxy.mjs --stub
├── playwright/playwright.config.ts  # EXTEND — convert `webServer` to an array with a second
│                                  #            entry launching `node ../scripts/live-proxy.mjs
│                                  #            --stub ../e2e/fixtures/live-stub.json` on a
│                                  #            fixed loopback port
└── README.md                     # EXTEND — "Enabling live mode" section

.github/workflows/ci.yml          # EXTEND — add `gitleaks` step scanning `dist/`,
                                  #          `apps/nl-demo/dist/`, and committed worktree
                                  #          against provider-key patterns (SC-006)
gitleaks.toml                     # NEW — regex config + allowlist for .env.example placeholders
```

**Structure Decision**: The live transport slots into two existing surfaces without introducing a new package:

1. **`shared/components/src/nl-cql2/`** — home of #188's `LLMClient` contract. New types fold into the existing `types.ts`; new client factories and guards fold into the existing `clients.ts`. This matches the package's established convention (one file per concern, not per feature) and avoids creating `liveClient.ts`/`liveTypes.ts` as parallel siblings.
2. **`apps/nl-demo/`** — home of the #189 demo. The proxy script lives under `scripts/` (alongside `serve.mjs`) because that is already the convention for demo sidecars. `live-config.json` and `.env` live at the app root (not in `data/`) so they are physically separated from `sync-data.mjs`'s regeneration cycle. Playwright specs live under `e2e/` to match the existing `testDir` convention.

No new workspace package and no new build pipeline — esbuild-bundling via `sync-data.mjs` automatically picks up the new exports because `lib-entry.mjs` re-exports them.

## Evidence Artefacts

Each SC requires a committed artefact under `specs/190-live-llm-transport/evidence/` so a reviewer can replay the verification:

| SC | Artefact | Format | Captured by |
|---|---|---|---|
| SC-001 | `sc-001-off-corpus-results.md` | 5 off-corpus phrases × (submitted phrase, generated CQL2, chip set, matching card count, screenshot path) | Manual walkthrough against live Claude Haiku 4.5; reviewer confirms correctness. |
| SC-002 | `sc-002-corpus-parity.json` | Before/after table: 9 corpus phrases × (fixture-mode match count, live-mode match count, delta) | vitest integration test saves JSON; CI asserts deltas = 0. |
| SC-003 | `sc-003-zero-outbound.json` | Playwright `page.on('request')` URL log across a driven session with no `live-config.json`; assertion: zero URLs match `/generate` or `anthropic.com`. | Playwright spec `apps/nl-demo/e2e/live-transport.spec.ts`. |
| SC-004 | `sc-004-quickstart-transcript.md` + `sc-004-quickstart.webm` | Terminal transcript + screencast of cold-start operator following `quickstart.md` to live-mode activation. | Manual capture; timestamped. |
| SC-005 | `sc-005-failure-classes.md` | 7 transport failure classes + 1 malformed-response class × (injected stub scenario, UI banner screenshot). | Playwright + vitest; screenshots archived. |
| SC-006 | `sc-006-gitleaks.log` | `gitleaks` CI run output (clean or failure). | CI pipeline; artefact uploaded per run. |
| SC-007 | `sc-007-latency.json` | 30 live-trial latencies; p50/p95/p99 computed. | Manual script against operator's key; summary JSON committed. |
| SC-008 | `sc-008-usage-cap.log` | Stub-harness log showing call 51 short-circuits with `usage-cap-reached`. | vitest test output. |
| SC-009 | `sc-009-task-verify.log` | `task verify` output from the PR branch. | CI. |

Evidence files follow the test-summary template at `.specify/templates/evidence/test-summary-template.md` (YAML front matter with `git_sha` and `captured_at`).

## Media Components

None — this is a transport/infrastructure feature. UI touches are limited to (a) diagnostic-banner variants routing each `LiveTransportError.reason` to a human-readable message, (b) a non-intrusive transport-mode indicator near the page header satisfying FR-018 — visible only when live mode is active and health-checked. Neither surface is a new Storybook-worthy visual component, and the existing `@debrief/components` Storybook does not cover the demo shell.

*None - transport/infrastructure feature*

## Storybook E2E Testing

None — no new Storybook-hosted components. The new diagnostic-banner strings are tested via the Playwright smoke test under `apps/nl-demo/playwright/` against the real demo page.

*None - no interactive UI components introduced in Storybook*

## VS Code Webview E2E Testing

None — this feature does not touch the VS Code extension. The demo is a standalone web app.

*None - no extension workflow changes*

## Complexity Tracking

> **Constitution Check passed with no violations.** No complexity entries required.
