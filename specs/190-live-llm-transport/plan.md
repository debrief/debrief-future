# Implementation Plan: Live LLM Transport

**Branch**: `190-live-llm-transport` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/190-live-llm-transport/spec.md`

## Summary

Deliver a second implementation of #188's `LLMClient` contract that routes prompts to a real language model (Anthropic Claude) and returns the provider's raw response for #188's existing validator to parse. The transport is opt-in, configured at runtime, and drops into #189's demo via a config toggle — fixture-only mode remains the default and the CI baseline. Credentials never touch the static bundle: a lightweight Node sidecar proxy (`apps/nl-demo/scripts/live-proxy.mjs`) holds the API key in its environment and forwards requests. The browser-side `createLiveLLMClient` talks to the proxy via `fetch`, enforcing per-request timeout, per-session call cap, response-size cap, and in-flight-call supersession. Deterministic stubs exercise all failure classes in CI without network or credentials.

## Technical Context

**Language/Version**: TypeScript 5.x (shared package + proxy), JSX via Babel standalone (demo app)
**Primary Dependencies**: No new runtime dependencies. Proxy uses Node stdlib (`node:http`, `node:https`). `createLiveLLMClient` uses browser-native `fetch` + `AbortController`. Tests use existing `vitest` setup.
**Storage**: None. Config is a runtime JSON file loaded by the demo (`apps/nl-demo/data/live-config.json`, gitignored) and env vars for the proxy (`ANTHROPIC_API_KEY` in `apps/nl-demo/.env`, gitignored).
**Testing**: vitest for the live-client stub harness (colocated under `shared/components/src/nl-cql2/__tests__/`), Playwright for an end-to-end smoke test under `apps/nl-demo/playwright/` exercising transport-selection and failure-path branches with a stub proxy.
**Target Platform**: Desktop browsers (Chrome/Edge/Firefox current versions) for the demo; Node 18+ for the proxy.
**Project Type**: Infrastructure add-on to an existing web app (the #189 stakeholder demo). No new package; one new module inside `@debrief/components` and one new script inside `apps/nl-demo/`.
**Performance Goals**: End-to-end live phrase latency < 10 s at p95 under normal conditions (SC-007). Proxy adds < 50 ms overhead beyond the provider round-trip.
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
| X. Security | **Core** | ✅ `ANTHROPIC_API_KEY` lives only in the proxy's environment; `.env` gitignored; `live-config.json` gitignored. Repository scan in CI verifies no credential pattern escapes into the bundle. Proxy binds to `127.0.0.1` by default (no external exposure). |
| XI. Internationalisation | Low | ⚠️ New user-facing diagnostic messages follow the existing #189 convention (English strings embedded in JSX). No new i18n framework; matches the project's current state. |
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
├── clients.ts                    # EXTEND — add createLiveLLMClient export
├── liveClient.ts                 # NEW — createLiveLLMClient + config validation
├── liveTypes.ts                  # NEW — LiveConfig, LiveError, TransportCallRecord types
├── index.ts                      # EXTEND — re-export new symbols
└── __tests__/
    ├── liveClient.test.ts        # NEW — unit tests for client + config validation
    ├── liveStub.ts               # NEW — scripted-response stub for use in tests
    └── liveStub.test.ts          # NEW — stub-harness coverage of all 6 failure classes

apps/nl-demo/
├── demo.jsx                      # EXTEND — transport-selection hook + error-banner variants
├── scripts/
│   ├── live-proxy.mjs            # NEW — Node HTTP proxy (stdlib only) forwarding to Anthropic
│   ├── lib-entry.mjs             # EXTEND — export createLiveLLMClient from bundle
│   └── sync-data.mjs             # UNCHANGED — but verify it does NOT copy live-config.json
├── data/
│   └── live-config.json          # NEW (gitignored) — operator-supplied runtime config
├── .env.example                  # NEW — documents ANTHROPIC_API_KEY without committing a value
├── .gitignore                    # EXTEND — add live-config.json, .env
├── playwright/
│   └── live-transport.spec.ts    # NEW — E2E smoke test with stub proxy
└── README.md                     # EXTEND — "Enabling live mode" section

# NEW directory for the gitignored artefacts documentation
apps/nl-demo/.env.example         # (same file as above — listed twice for emphasis)
```

**Structure Decision**: The live transport slots into two existing surfaces without introducing a new package:

1. **`shared/components/src/nl-cql2/`** — home of #188's `LLMClient` contract. Adding the live client here keeps the generator + transport code colocated and ensures the two clients pass through the same test runner.
2. **`apps/nl-demo/`** — home of the #189 demo. The proxy script lives under `scripts/` (alongside `serve.mjs`) because that is already the convention for demo sidecars; the config file and env file live at the demo root and are gitignored.

No new workspace package and no new build pipeline — esbuild-bundling via `sync-data.mjs` automatically picks up the new exports because `lib-entry.mjs` re-exports them.

## Media Components

None — this is a transport/infrastructure feature. UI touches are limited to a new diagnostic-banner variant inside the existing #189 demo (error-class routing from `LiveError.kind` to a human-readable message) and the addition of a transport-mode indicator next to the subtitle. Neither surface is a new Storybook-worthy visual component, and the existing `@debrief/components` Storybook does not cover the demo shell.

*None - transport/infrastructure feature*

## Storybook E2E Testing

None — no new Storybook-hosted components. The new diagnostic-banner strings are tested via the Playwright smoke test under `apps/nl-demo/playwright/` against the real demo page.

*None - no interactive UI components introduced in Storybook*

## VS Code Webview E2E Testing

None — this feature does not touch the VS Code extension. The demo is a standalone web app.

*None - no extension workflow changes*

## Complexity Tracking

> **Constitution Check passed with no violations.** No complexity entries required.
