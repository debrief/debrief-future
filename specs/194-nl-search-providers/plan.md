# Implementation Plan: NL Search — Non-Anthropic Providers

**Branch**: `194-nl-search-providers` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/194-nl-search-providers/spec.md`

## Summary

Add OpenAI and Ollama as selectable NL-search backends alongside the existing Anthropic (Claude) provider. The existing `LLMClient` contract and `LiveOutcome` error taxonomy (from #188/#190/#191) are already provider-neutral; the work is to (1) extend `providerCall.ts` with per-provider request/response adapters, (2) teach the loopback proxy (`apps/nl-demo/scripts/live-proxy.mjs`) to route to OpenAI or Ollama based on a `provider` field in its config, (3) extend the VS Code extension's `llmProxy` service and settings to carry per-provider credentials and model identifiers, and (4) supply per-provider fixtures for the provider-neutral validation corpus so prompt drift is caught in CI. Zero changes to the prompt template semantics, the CQL2 output shape, or the downstream `parseResponse`/`FilterBar` consumers.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Constitution XV) across `shared/components/src/nl-cql2/`, `apps/vscode/src/`, and `apps/nl-demo/`; Node.js ≥ 20 for the loopback proxy script (uses `node:http`, `node:https`). No Python changes.
**Primary Dependencies**: Existing `shared/components` (nl-cql2 module — `LLMClient`, `providerCall`, `buildPrompt`, `parseResponse`); VS Code Extension API ^1.85.0 (`SecretStorage`, settings, postMessage); Node stdlib `node:http`/`node:https` for the proxy; browser-native `fetch` + `AbortController`; Anthropic Messages API (existing), OpenAI Chat Completions API (new — `/v1/chat/completions`), Ollama Chat API (new — `/api/chat`).
**Storage**: Credentials — cloud provider API keys in VS Code `SecretStorage` (host-only; never crosses to webview); Ollama base URL in plain settings; browser demo keys live only in the proxy's `.env` (gitignored). No new persistence layer.
**Testing**: vitest (unit tests for `providerCall` adapters and factories in `shared/components/src/nl-cql2/__tests__/`); Playwright E2E on both `apps/nl-demo` (browser via proxy) and the VS Code webview suite (via `@sparticuz/chromium` + code-server); the existing provider-neutral validation harness (`shared/components/src/nl-cql2/__tests__/harness.ts`) is reused with recorded fixtures per provider.
**Target Platform**: VS Code extension (desktop + code-server) running on macOS / Linux / Windows; nl-demo static SPA served locally and from Heroku review apps; Ollama target is `localhost` (loopback) with operator-supplied host.
**Project Type**: Monorepo (pnpm + uv workspaces) — existing structure, no new packages.
**Performance Goals**: Per-provider warm-call overhead ≤ 50 ms p50 beyond provider round-trip (same budget as #190); provider switch at runtime ≤ 200 ms (SC-005); corpus harness runs under 30 s on recorded fixtures per provider.
**Constraints**: Offline-by-default constitution — Ollama provider MUST issue zero outbound requests beyond the operator-configured base URL (SC-004); API keys MUST NOT appear in logs, telemetry, or webview messages; every provider response MUST parse into the same canonical `LiveOutcome` union with no "unclassified" errors (SC-003); no changes to the CQL2/lozenge output shape so downstream consumers (#187, #188, #191) remain unchanged (FR-004, SC-006).
**Scale/Scope**: Three providers at launch (Anthropic, OpenAI, Ollama); ~40–60 canonical corpus phrases validated per provider; one new factory per provider (~150 LOC each) plus a new `ProviderAdapter` sub-module (~200 LOC); three new VS Code settings, one new VS Code command (set OpenAI key), zero new top-level packages.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---------|--------|-------|
| I. Defence-Grade Reliability | ✅ PASS | Ollama provider preserves offline-by-default. Claude + OpenAI are additive / explicit opt-in. No silent failures: every provider failure maps to a named `LiveOutcome` class, and the UI surfaces provider identity. Reproducibility preserved: prompt template and parser are provider-neutral; per-provider adapter is a pure function. |
| II. Schema Integrity | ✅ PASS | No LinkML schema changes. The CQL2 output shape consumed by this feature is the same one produced today by #188. |
| III. Data Sovereignty | ✅ PASS | No data crosses organisational boundaries that it does not cross today for Anthropic. Ollama adds a path where no data leaves the local host. Provenance is unchanged — NL search does not write to STAC. |
| IV. Architectural Boundaries | ✅ PASS | All provider logic lives in `shared/components/src/nl-cql2/` (service-layer library). Proxy is a pure forwarder. VS Code extension host remains the only process that sees credentials. No service-to-UI regression. |
| V. Extensibility | ✅ PASS | The explicit design goal (SC-007) is that adding a fourth provider requires only a new adapter + error-mapping table. The adapter interface (see `contracts/provider-adapter.ts`) is the extension seam. |
| VI. Testing | ✅ PASS | Unit tests per adapter (happy path + every error class); corpus parity tests in CI via existing harness; Playwright E2E covers browser-proxy and VS Code-host transport paths end-to-end with stub providers. |
| VII. Test-Driven AI Collaboration | ✅ PASS | Every FR is backed by a testable acceptance scenario in spec.md. The validation corpus is the "executable definition of done" for cross-provider parity. |
| VIII. Documentation | ✅ PASS | Spec, plan, research, data-model, contracts, quickstart all authored under `specs/194-nl-search-providers/`. VS Code settings documentation via `package.json` `description` fields. |
| IX. Dependencies | ✅ PASS | **No new runtime dependencies.** OpenAI and Ollama are called via `fetch`/`node:https` directly — neither vendor's SDK is taken on. This is the same pattern #190 used for Anthropic. |
| X. Security | ✅ PASS | OpenAI key follows the Anthropic pattern: stored in `SecretStorage`, referenced by presence-bool (`hasApiKey`) in webview messages, never logged. Proxy continues to strip auth headers from browser-visible error surfaces. Ollama base URL is a plain setting (no secret). |
| XI. Internationalisation | ✅ PASS | No new user-facing strings beyond the settings labels and error banners; all routed through the existing i18n surface. |
| XII. Community Engagement | ✅ PASS | Planning post + LinkedIn summary generated in Phase 2 below. Preview apps via Heroku Review Apps cover browser-proxy flow. |
| XIII. Contribution Standards | ✅ PASS | Atomic commits per adapter; PR gated by CI (lint + typecheck + vitest + Playwright). |
| XIV. Pre-Release Freedom | ✅ PASS | Pre-v4.0 — breaking changes to internal factory signatures permitted. No public API breakage (the `LLMClient` contract is unchanged externally). |
| XV. Strict Type Safety | ✅ PASS | Every new type is fully specified in `contracts/provider-adapter.ts`; `any` is not used. Provider responses are narrowed at the adapter boundary before the normalised `LiveOutcome` leaves the transport layer. |

**Result: All gates PASS. No Complexity Tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/194-nl-search-providers/
├── plan.md              # This file
├── research.md          # Phase 0 — provider adapter design + HTTP contracts
├── data-model.md        # Phase 1 — entity model for Provider, ProviderConfig, ProviderAdapter
├── contracts/
│   ├── provider-adapter.ts        # The adapter contract (new)
│   └── live-config-multi.ts       # The extended LiveConfig union (new)
├── checklists/
│   └── requirements.md  # From /speckit.specify
├── quickstart.md        # Phase 1 — operator walkthrough for each provider
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
shared/components/src/nl-cql2/
├── clients.ts                     # EXTEND: createLiveLLMClient config takes provider discriminator
├── providerCall.ts                # EXTEND: delegates to per-provider adapter
├── providerAdapters/              # NEW directory
│   ├── anthropic.ts               # Extracted from current providerCall.ts
│   ├── openai.ts                  # NEW
│   ├── ollama.ts                  # NEW
│   └── index.ts                   # Registry of known adapters (keyed by provider id)
├── types.ts                       # EXTEND: LiveConfig variants gain provider discriminator
├── buildPrompt.ts                 # NO CHANGE — prompt stays provider-neutral
├── parseResponse.ts               # NO CHANGE — response parsing stays provider-neutral
└── __tests__/
    ├── providerAdapters/
    │   ├── anthropic.test.ts      # Moved from current coverage
    │   ├── openai.test.ts         # NEW
    │   └── ollama.test.ts         # NEW
    ├── corpus.openai.test.ts      # NEW — corpus harness against recorded OpenAI fixtures
    ├── corpus.ollama.test.ts      # NEW
    └── fixtures/
        ├── corpus-openai.json     # NEW
        └── corpus-ollama.json     # NEW

apps/nl-demo/
├── scripts/live-proxy.mjs         # EXTEND: switch on config.provider, call chosen adapter
├── live-config.json               # (gitignored) + sample with provider field
├── live-config.sample.json        # EXTEND: document three providers
└── e2e/
    ├── fixtures/live-stub-openai.json   # NEW
    └── fixtures/live-stub-ollama.json   # NEW

apps/vscode/
├── package.json                   # EXTEND: new contributes.configuration entries + command
├── src/services/llmProxy.ts       # EXTEND: provider-aware; reads setting, loads key from SecretStorage by provider id
├── src/commands/setApiKey.ts      # EXTEND: parameterised by provider
└── src/webview/messages.ts        # EXTEND: nlConfig payload gains provider identity

docs/project_notes/
└── decisions.md                   # ADR: provider adapter pattern + discriminator choice
```

**Structure Decision**: Existing monorepo structure is preserved. All changes land inside three existing packages (`shared/components`, `apps/nl-demo`, `apps/vscode`). A new `providerAdapters/` sub-module inside `shared/components/src/nl-cql2/` is introduced as the extension seam — this keeps the adapter surface close to the `providerCall.ts` that consumes it, and mirrors the existing `clients.ts` / `buildPrompt.ts` / `parseResponse.ts` co-location convention. No new top-level packages, no new workspaces, no new test runners.

## Media Components

None — backend/infrastructure feature.

The change is entirely transport-layer (provider adapters + proxy routing + settings). The only user-facing UI surface is VS Code's built-in settings UI, which renders the `debrief.nlSearch.provider` dropdown automatically from the extension's `contributes.configuration` manifest — no custom component is added. The FilterBar, chip lozenges, and error banners that appear on-screen are unchanged from #191. There are no new Storybook stories to bundle.

## Storybook E2E Testing

None — no interactive UI components.

No new component is added to the `shared/components` library, and no existing component's visual output changes under this feature. The FilterBar's existing Storybook story continues to cover its rendering invariants; no new story is needed for provider selection because provider choice is a VS Code settings concern, not a component concern.

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Switch provider and submit NL phrase (OpenAI) | Settings, Catalog Overview (FilterBar) | `[data-testid="catalog-filter-bar-input"]`, VS Code command palette | Open settings → set `debrief.nlSearch.provider` to `openai` → run `debrief.setOpenAIApiKey` command → type phrase → verify chips appear |
| Switch provider to Ollama with mock local server | Settings, Catalog Overview | same | Set `debrief.nlSearch.provider` to `ollama` + `debrief.nlSearch.baseUrl` to stub server → type phrase → verify chips appear and no outbound traffic |
| Missing credentials error surface (OpenAI) | Catalog Overview | `[data-testid="filter-bar-error-banner"]` | Set provider to `openai` without setting key → submit phrase → verify `not-configured` error banner |
| Runtime provider switch | Settings, Catalog Overview | same | Submit phrase under Claude → switch setting mid-session → submit again → verify second call goes to new provider |

**Testing Strategy**:

- [x] Extension workflow works end-to-end in code-server (openvscode-server + `@sparticuz/chromium` per `docs/project_notes/playwright-installation-research.md`)
- [x] Webview content accessible via `frameLocator` chaining (reuses the FilterBar harness from #191)
- [x] Page objects updated for new selectors — in practice the only new test surface is the settings entries, which are reached via `workbench.action.openSettings` command
- [x] Screenshots captured for evidence (per-provider success and error states)

**Test File Location**: `tests/e2e/test-nl-search-providers.spec.ts`

**Infrastructure**: Reuses the existing webview E2E harness (patches via `tests/e2e/scripts/patch-webview.sh`, content injection via `tests/e2e/helpers/webview-injector.ts`, headed Chromium under `xvfb-run`). A stub OpenAI/Ollama HTTP server (Node `http.createServer`, local-only) is stood up inside the test to validate the `ollama` and `openai` transport paths without hitting real providers.

## Complexity Tracking

*No constitutional violations. Section intentionally empty.*

## Phase 0 — Research

See `research.md`. Key decisions resolved:

1. **Single adapter seam vs. per-provider factories at the `LLMClient` level** — resolved in favour of a single adapter seam (`ProviderAdapter` interface) consumed by the existing `providerCall.ts`. This preserves one canonical `LLMClient` factory and confines per-provider differences to request composition and response parsing.
2. **Proxy routes to providers, or dedicated proxy per provider** — resolved in favour of a single proxy that switches on `config.provider`. One process, one loopback endpoint, one stub harness.
3. **OpenAI API surface choice (Chat Completions vs Responses)** — Chat Completions at launch (stable, widely compatible with `gpt-4o-mini` and Azure OpenAI deployments); Responses API is a deferred follow-up.
4. **Ollama endpoint choice (`/api/generate` vs `/api/chat`)** — `/api/chat` for consistency with the messages shape used by the other two providers.
5. **Prompt adaptation strategy** — keep the canonical prompt body verbatim; per-provider adaptation limited to "where does the system message live" (role `system` for OpenAI/Ollama vs embedded-user-message for Anthropic). No semantic rewrites.
6. **Error-class mapping table per provider** — explicit mapping tables documented in research.md; 401/403 → `auth-failure`, 429 → `rate-limit`, 5xx → `provider-error`, socket errors → `transport-error`, non-JSON → `malformed-response { reason: "non-json" }`, oversize → `malformed-response { reason: "oversize" }`, timeout → `timeout`. Ollama's "model not pulled" (generally 404 on `/api/chat`) maps to `provider-error` with underlying message preserved.
7. **Discriminator placement in `LiveConfig`** — extend both `BrowserLiveConfig` and `VsCodeLiveConfig` with `provider: "anthropic" | "openai" | "ollama"`. Per-provider fields live alongside existing ones (e.g., `baseUrl` only meaningful when `provider === "ollama"`).

## Phase 1 — Design Artefacts

- **`data-model.md`** — `Provider`, `ProviderAdapter`, `ProviderRequest`, `ProviderResponseEnvelope`, extended `LiveConfig` union, extended `VS Code settings surface`. Relationships and state transitions captured there.
- **`contracts/provider-adapter.ts`** — the new adapter contract (`composeRequest`, `parseResponse`, `mapError`). Pure functions; no transport.
- **`contracts/live-config-multi.ts`** — the extended `BrowserLiveConfig` / `VsCodeLiveConfig` discriminated union with the `provider` tag and per-provider optional fields.
- **`quickstart.md`** — operator walkthrough for each of the three providers covering (a) VS Code settings, (b) browser demo via proxy, (c) stub mode for tests.

## Phase 1 — Agent Context Update

Ran `.specify/scripts/bash/update-agent-context.sh claude` to record the new module layout under `shared/components/src/nl-cql2/providerAdapters/`. No new top-level technologies are introduced by this feature (the Anthropic SDK is still not used; OpenAI and Ollama are called via `fetch`/`node:https` directly), so the "Active Technologies" list is unchanged in substance — the agent context file records the feature branch and structural deltas only.

## Phase 2 — Media Content

See `media/planning-post.md` and `media/linkedin-planning.md`.

## Re-Evaluation of Constitution Check (Post-Design)

After producing the Phase 1 artefacts, every gate still passes. No new dependencies, no service/UI boundary violations, no type-safety escapes — the adapter contract in `contracts/provider-adapter.ts` is fully typed and narrows provider-specific JSON at the boundary before it leaves the adapter. The design confirms the SC-007 target: a future fourth provider slots in as a new file under `providerAdapters/` plus one line in the registry; no other change is required.
