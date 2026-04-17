# Implementation Plan: NL Search in VS Code Catalog Overview

**Branch**: `191-vscode-nl-search` | **Date**: 2026-04-17 (updated post-review) | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/191-vscode-nl-search/spec.md`

## Summary

Surface the NL → CQL2 live-LLM pipeline (shipped inside `apps/nl-demo` via #188/#189/#190) in the VS Code Catalog Overview. Analysts type a plain-English phrase into the FilterBar, and — only when the user has explicitly opted in and supplied an Anthropic credential — the extension host brokers a Claude call, the response is parsed into lozenges + a filter expression, and the existing FilterBar state machine takes over. Default remains today's literal-substring QuickSearch (no silent network calls).

**Technical approach**: Extract the provider-call core from #190's `live-proxy.mjs` into a shared module `shared/nl-cql2/providerCall.ts`. Migrate `apps/nl-demo` (#190) and add the VS Code extension as the second consumer. Introduce a `createPostMessageLLMClient` in `shared/nl-cql2/clients.ts` that forwards from webview to extension host via four new message variants added to the existing `apps/vscode/src/webview/messages.ts` union. API key lives in VS Code SecretStorage, cached in-host with change-event invalidation. FilterBar gains an optional `llmClient` prop that routes Enter-commits through the NL pipeline when present; default behaviour unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x (extension host + webview + shared components — existing monorepo toolchain)
**Primary Dependencies**: VS Code Extension API ^1.85.0, React 18.x, `@debrief/components` (FilterBar, nl-cql2, filter-engine), `@debrief/schemas`, Node stdlib `https` for the Anthropic call (via the shared provider-call core)
**Storage**: VS Code SecretStorage (API key), VS Code configuration (settings), ephemeral in-host cache for the key. No files, no workspace state.
**Testing**: vitest (unit — providerCall, NL-mode FilterBar, cancellation race, protocol adapter); Playwright via `@sparticuz/chromium` + code-server (webview E2E — indicator, happy path, 7-class failure matrix, opt-out, ceiling, cancellation)
**Target Platform**: VS Code 1.85+ on any OS. Also runs in code-server (same extension surface).
**Project Type**: single — changes under `apps/vscode/`, `shared/components/FilterBar/`, and `shared/components/nl-cql2/`
**Performance Goals**: Enter → chips applied in ≤10 s wall-clock on typical broadband against Claude Haiku 4.5. Extension-host overhead ≤ 50 ms on top of provider latency. Extension activation cost ≤ 10 ms (lazy-init — review Decision 13).
**Constraints**: (1) API key NEVER visible in webview DevTools, webview network, or workspace-visible files. (2) In-flight calls cancel cleanly on new submission / webview reload / panel dispose. (3) Per-session call ceiling hard-stops in the host before burning further credit. (4) No silent failures: every negative outcome surfaces a user-legible banner — except cancellations, which are silent by design. (5) Opt-in default off — first-time users see identical behaviour to today. (6) Existing FilterBar tests remain green post-change (review Decision 12).
**Scale/Scope**: One webview surface (Catalog Overview) in v1. Single org user per extension activation. Claude-family model. 15-issue review-outcome set applied.

## Constitution Check

*GATE: pre- and post-design both pass. Nothing requires justification.*

| Article | Assessment |
|---|---|
| I. Defence-Grade Reliability | **PASS** — opt-in default off; fallback identical to today; 7 failure classes (auth, rate-limit, provider-error, timeout, malformed, not-configured, ceiling-reached) each surface a distinct banner. |
| III. Data Sovereignty | **PASS** — explicit opt-in; no telemetry; structured log captures outcome/timing/bytes, never prompt or response content. |
| IV. Architectural Boundaries | **PASS** — extension host (not webview) owns credential + network. FilterBar remains a display/state component; NL routing is a prop. |
| VI. Testing | **PASS** — providerCall unit tests, FilterBar NL-mode unit tests, cancellation-race unit tests, VS Code E2E 7-class failure matrix. |
| IX. Dependencies | **PASS** — no new runtime deps. `providerCall.ts` uses Node stdlib `https` (same shape as #190). |
| X. Security | **PASS** — key in `context.secrets`, cached in host, never crosses the webview boundary. Documented in quickstart + research Decision 2. |
| XIV. Pre-Release Freedom | **INVOKED** — the `LLMClient` interface migration (old `Promise<string>` → new `Promise<LiveOutcome>`) is permitted without deprecation because v4.0.0 has not shipped (review Decision 1). |
| XV. Strict Type Safety | **PASS** — no `any`; one canonical `LiveOutcome` union (review Decision 6); webview↔host messages live in the existing typed union (review Decision 2). |

No violations. **Complexity Tracking section intentionally omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/191-vscode-nl-search/
├── plan.md              # This file
├── research.md          # Phase 0 — 8 original decisions + review-outcomes addendum
├── data-model.md        # Phase 1 — updated for review decisions
├── quickstart.md        # Phase 1
├── contracts/
│   └── llm-client.ts    # ONE canonical contract (messages.ts dropped — review Decision 2)
├── checklists/
│   └── requirements.md  # From /speckit.specify
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # /speckit.tasks output — not created here
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── services/
│   │   ├── llmProxy.ts              # NEW: lazy-init wrapper around providerCall; holds key cache + requestId map
│   │   └── llmProxy.test.ts         # NEW: message protocol, key cache invalidation, map cleanup on happy path + abort
│   ├── webview/
│   │   ├── messages.ts              # EDIT: add nlGenerate / nlAbort / nlOutcome / nlConfig variants to existing union
│   │   └── web/
│   │       └── catalogOverview.tsx  # EDIT: construct createPostMessageLLMClient + pass to StacBrowser → FilterBar
│   └── extension.ts                 # EDIT: register NL message handler (lazy-init llmProxy on first nlGenerate)
├── package.json                     # EDIT: add debrief.nlSearch.* configuration contributions + two commands
│                                      #       (Debrief: Set Anthropic API Key, Debrief: Clear Anthropic API Key)

shared/components/
├── src/
│   ├── FilterBar/
│   │   ├── FilterBar.tsx            # EDIT: accept optional llmClient prop; route Enter through NL pipeline when present
│   │   │                            #       (diagram comment above the NL handler — review §Diagrams)
│   │   ├── FilterBar.stories.tsx    # EDIT: add NlModeWithStubClient story variant
│   │   └── __tests__/
│   │       ├── FilterBar.nl.test.tsx      # NEW: NL mode unit tests — including:
│   │       │                              #   - lozenges preserved on failure (Decision 7)
│   │       │                              #   - supersession cancels prior submission (Decision 11)
│   │       │                              #   - no llmClient prop → existing behaviour unchanged (Decision 12)
│   │       └── useFilterBar.test.ts        # EDIT (minimal): one assertion that existing
│   │                                        #                behaviour is preserved when llmClient omitted
│   ├── nl-cql2/
│   │   ├── types.ts                 # EDIT (review Decision 1): single canonical LLMClient returning LiveOutcome;
│   │   │                            #       merge LiveTransportErrorReason/TransportCallRecord into unified shape;
│   │   │                            #       single discriminated LiveConfig (Decision 5)
│   │   ├── clients.ts               # EDIT: migrate createRecordedLLMClient + createLiveLLMClient to new shape;
│   │   │                            #       add createPostMessageLLMClient (Decision 4 — owns abort())
│   │   ├── providerCall.ts          # NEW (review Decision 3): extracted core — HTTPS + stream/bound + timeout
│   │   │                            #       + classification. Pure; no transport assumptions.
│   │   └── __tests__/
│   │       └── providerCall.test.ts # NEW (review Decision 9): mocked https.request covering every outcome class,
│   │                                   #       plus oversize truncation + abort-mid-stream race
│   └── StacBrowser/
│       └── StacBrowser.tsx          # EDIT: plumb llmClient prop through to FilterBar
└── e2e/
    └── FilterBar-nl.spec.ts          # NEW: Playwright against NlModeWithStubClient Storybook story

apps/nl-demo/
├── demo.jsx                         # EDIT (review Decision 1): migrate to new LiveOutcome shape
└── scripts/live-proxy.mjs           # EDIT (review Decision 3): delegate Anthropic call to shared providerCall

tests/e2e/
└── test-vscode-nl-search.spec.ts    # NEW: code-server workflow — enable, phrase, chips, disable,
                                       #      plus 7-class failure matrix (review Decision 10 adds
                                       #      not-configured + ceiling-reached to #190's 5 classes)
```

**Structure Decision**: Single-project layout. Changes concentrate in three existing workspaces: `apps/vscode`, `shared/components/FilterBar`, and `shared/components/nl-cql2`. The shared `nl-cql2` module gets a second consumer and a new `providerCall.ts` sibling that becomes the single provider-call code-path across #190 (browser) and #191 (VS Code). `apps/nl-demo` (#190) is migrated in lock-step with the interface change — pre-release freedom (Article XIV) permits this.

## Applied Review Decisions (15)

| # | Applied |
|---|---|
| 1 | `shared/nl-cql2/types.ts` LLMClient signature replaced with `Promise<LiveOutcome>`; #190 `apps/nl-demo` migrates in same PR |
| 2 | `contracts/messages.ts` deleted; 4 variants added to `apps/vscode/src/webview/messages.ts` |
| 3 | `shared/nl-cql2/providerCall.ts` extracted; `live-proxy.mjs` and `llmProxy.ts` both delegate |
| 4 | `LLMClient.abort()` (not `close()`); FilterBar calls it on supersession |
| 5 | Single `LiveConfig` with `transport: "browser-proxy" \| "vscode-host"` discriminator |
| 6 | Canonical `LiveOutcome` union; `ceiling-reached` replaces `usage-cap-reached`; `malformed-response` absorbs `oversize-response` via nested `reason`; `not-configured` added |
| 7 | Explicit `FilterBar.nl.test.tsx` test: force failure with lozenges present, assert they survive; inline comment above the NL handler documents the invariant |
| 8 | No `close()` — `abort()` is idempotent |
| 9 | `shared/nl-cql2/__tests__/providerCall.test.ts` covers every outcome class with mocked `https.request` |
| 10 | VS Code E2E adds `not-configured` (enabled + no key) + `ceiling-reached` (ceiling=1, submit twice) scenarios |
| 11 | Cancellation-race test at both layers: `FilterBar.nl.test.tsx` (supersession at call site) and `providerCall.test.ts` (abort mid-stream at HTTPS level) |
| 12 | Plan mandates existing FilterBar suite stays green; one assertion in `useFilterBar.test.ts` proves no-llmClient-prop behaviour unchanged |
| 13 | `llmProxy` lazy-instantiated on first `nlGenerate` message; `activate()` just registers the handler |
| 14 | API key cached in extension-host memory; `context.secrets.onDidChange` invalidates the cache |
| 15 | `Map<requestId, AbortController>` entries deleted in a `finally` block after every `providerCall` resolution (success, fail, or abort) |

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| FilterBar (NL mode) | `shared/components/src/FilterBar/FilterBar.stories.tsx` — new `NlModeWithStubClient` variant | `filter-bar-nl.js` | Demonstrates indicator, loading state, success chips, and a canned failure banner against a deterministic stub `LLMClient` |

**Inclusion Criteria Applied**:
- [x] New visual component (new FilterBar mode with indicator + banners)
- [x] Significant visual change (live indicator in filter bar; inline failure banner)
- [x] Interactive demo adds narrative value (readers type a phrase in the embedded story; see chips apply)

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone
- [x] Reasonable bundle size expected (< 500 KB — FilterBar + stub client, no provider SDK)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar-nlmodewithstubclient`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `FilterBar.stories.tsx` — `NlModeWithStubClient` | Rendering, indicator visible, happy-path chip application, failure-banner render per class, opt-out fallback, lozenges survive failure (Decision 7), supersession race (Decision 11) | light, dark, vscode | fill (phrase), keyboard (Enter), click (remove chip), click (retry banner) |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid="nl-search-indicator"`, `data-testid="nl-failure-banner"`, `data-transport-reason`)
- [x] Screenshots captured for evidence (indicator-live, banner-auth, banner-malformed, state-filtered, state-lozenges-preserved-after-failure)

**Test File Location**: `shared/components/e2e/FilterBar-nl.spec.ts`

**Theme Variant URLs**:
```
/iframe.html?id=filterbar--nlmodewithstubclient&globals=theme:light
/iframe.html?id=filterbar--nlmodewithstubclient&globals=theme:dark
/iframe.html?id=filterbar--nlmodewithstubclient&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Enable NL search, submit a phrase, see chips | Catalog Overview webview | `.stac-browser`, `[data-testid="nl-search-indicator"]`, `.filter-bar input`, `.chip-lozenge`, `[data-testid="live-transport-banner"]` | open settings → set enabled=true + stub key, open Catalog Overview, type phrase, press Enter, assert chips + filtered count |
| Opt out, confirm zero outbound | Same | Same | toggle setting off, submit phrase, assert no `nlGenerate` message observed, literal-substring path engaged |
| Failure matrix — 7 classes | Same | `[data-testid="live-transport-banner"][data-transport-reason=...]` | Stub provider returns each of: auth-failure, rate-limit, provider-error, timeout, malformed (non-json), **not-configured**, **ceiling-reached** (review Decision 10 adds the last two) |
| Cancellation race | Same | Same | Submit phrase A (slow stub), immediately submit phrase B; assert A outcome is dropped (no banner), B outcome lands |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors (indicator, banner, model label)
- [x] Screenshots captured for evidence (indicator-live, banner-auth-failure, banner-not-configured, banner-ceiling-reached, state-filtered-after-nl, state-opt-out)

**Test File Location**: `tests/e2e/test-vscode-nl-search.spec.ts`

**Infrastructure**: reuses existing `tests/e2e/scripts/patch-webview.sh`, `tests/e2e/helpers/webview-injector.ts`, and the `xvfb-run` + `@sparticuz/chromium` harness. No new infrastructure.

## Diagrams to Embed in Implementation (review §Diagrams)

| File | Diagram |
|---|---|
| `apps/vscode/src/services/llmProxy.ts` | State machine of a single request: pending → aborted/timeout/provider-resp → classified → resolved. Includes `Map<requestId, AbortController>` lifecycle with `finally`-delete. |
| `shared/components/src/nl-cql2/providerCall.ts` | Stream-and-count flow for bounded-response-under-timeout; abort cascading to socket close. |
| `shared/components/src/FilterBar/FilterBar.tsx` (above the NL handler) | Decision tree: `llmClient present? → NL pipeline (abort-prior, generate, parseResponse, dispatch) : literal title graduation`. Plus the "lozenges survive failure" invariant. |

## Deferred (tracked in BACKLOG.md as #192–#195)

- **#192** NL search in Layers & Tools panels
- **#193** Non-Anthropic providers (OpenAI / ollama)
- **#194** Per-prompt audit trail (opt-in)
- **#195** Keyring-unavailable distinct banner (latent failure on Linux)
