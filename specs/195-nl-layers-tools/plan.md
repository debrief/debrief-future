# Implementation Plan: NL Search in Layers & Tools Panels

**Branch**: `195-nl-layers-tools` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/195-nl-layers-tools/spec.md`

## Summary

Extend the NL-mode delivered by #191 to two further VS Code webview surfaces — the Layers and Tools panels — without altering the pipeline, transport, or failure taxonomy. #191 established that the `FilterBar` accepts an optional `llmClient` prop and that `createPostMessageLLMClient` brokers calls between webview and extension host. Both panels already render `FilterBar` instances with `llmClient={undefined}`. This feature constructs a single shared `LLMClient` in each panel's webview entry point (reusing the same extension-host `llmProxy` service #191 registered) and supplies it to the `FilterBar`. A new `panelOrigin` field is threaded through the `nlGenerate` message variant for per-panel telemetry. Everything else — banners, indicator, chip behaviour, opt-in setting, credential isolation, ceiling, cancellation — is reused verbatim from #191.

**Technical approach**: In each of the Layers and Tools webview entry points (`apps/vscode/src/webview/web/layersPanel.tsx`, `apps/vscode/src/webview/web/toolsPanel.tsx`), call the same `createPostMessageLLMClient(vscode, "layers" | "tools")` factory signature already used by the Catalog Overview, and pass the result through to the panel's `FilterBar` via the existing prop-threading. Extend the `nlGenerate` variant in `apps/vscode/src/webview/messages.ts` to carry `panelOrigin: "catalog-overview" | "layers" | "tools"`. Extend `llmProxy.ts` to record `panelOrigin` in its structured telemetry output and to forward it unchanged in the outcome message. Add per-panel E2E scenarios and a multi-panel-concurrency scenario. No new files in `shared/components/` — the NL-mode logic in `FilterBar.tsx` is already generic and does not need to know which panel it lives in.

## Technical Context

**Language/Version**: TypeScript 5.x (extension host + webview + shared components — existing monorepo toolchain; no language or version change)
**Primary Dependencies**: VS Code Extension API ^1.85.0, React 18.x, `@debrief/components` (FilterBar, nl-cql2 from #191), `apps/vscode/src/services/llmProxy.ts` (from #191). No new runtime dependencies.
**Storage**: No change. Credentials + settings remain as #191 defined them.
**Testing**: vitest (unit — per-panel client creation, cross-panel supersession isolation); Playwright via `@sparticuz/chromium` + code-server (webview E2E — per-panel happy path, per-panel failure matrix, multi-panel concurrency, ceiling-reached affects all panels).
**Target Platform**: VS Code 1.85+ on any OS. Same as #191.
**Project Type**: single — edits under `apps/vscode/src/webview/web/`, `apps/vscode/src/webview/messages.ts`, `apps/vscode/src/services/llmProxy.ts`. No edits in `shared/components/`.
**Performance Goals**: Each panel's first submission matches #191's 10 s wall-clock ceiling. Cross-panel concurrent submissions (up to 3 simultaneous) must resolve within 12 s aggregate on a typical broadband connection.
**Constraints**: (1) Zero regression in Catalog Overview NL-mode. (2) Per-panel AbortController isolation — new submission in panel A MUST NOT cancel in-flight in panel B. (3) Session-wide ceiling applies across panels. (4) Existing literal-substring filter in Layers + Tools stays byte-identical when NL mode is off. (5) Strict-type rules — `panelOrigin` is an enumerated literal union, not a free string.
**Scale/Scope**: Two new webview surfaces wired into an existing mechanism. Zero new npm packages. ~80 lines of wiring, ~150 lines of tests.

## Constitution Check

*GATE: pre- and post-design both pass. Nothing requires justification.*

| Article | Assessment |
|---|---|
| I. Defence-Grade Reliability | **PASS** — reuses #191's seven-banner taxonomy; adds per-panel AbortController isolation and regression-tested ceiling behaviour. No silent failures. |
| III. Data Sovereignty | **PASS** — no new telemetry content. Adds `panelOrigin` literal to existing records. No prompt or response capture. |
| IV. Architectural Boundaries | **PASS** — no service/UI crossover. Extension host still owns credential + network; webviews only call into the shared `LLMClient`. |
| VI. Testing | **PASS** — per-panel unit tests, per-panel E2E tests, multi-panel concurrency E2E. |
| IX. Dependencies | **PASS** — zero new runtime dependencies. |
| X. Security | **PASS** — no new credential handling. Same `context.secrets` path as #191. |
| XIV. Pre-Release Freedom | **N/A** — additive change only (`panelOrigin` literal added to a message variant; existing consumers unaffected). |
| XV. Strict Type Safety | **PASS** — new `panelOrigin` field is a discriminated literal union; all three `FilterBar` call sites exhaustively covered at compile time. |

No violations. **Complexity Tracking section intentionally omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/195-nl-layers-tools/
├── plan.md              # This file
├── spec.md              # Produced by /speckit.specify
├── checklists/
│   └── requirements.md  # Optional — deferred unless review demands it
└── tasks.md             # /speckit.tasks output — not created here
```

### Source Code (repository root)

```text
apps/vscode/
└── src/
    ├── webview/
    │   ├── messages.ts                        # EDIT: add `panelOrigin: "catalog-overview" | "layers" | "tools"`
    │   │                                       #       to the existing `nlGenerate` / `nlOutcome` / `nlAbort` variants.
    │   └── web/
    │       ├── catalogOverview.tsx            # EDIT: pass `panelOrigin: "catalog-overview"` to createPostMessageLLMClient;
    │       │                                   #       one-line change.
    │       ├── layersPanel.tsx                # EDIT: construct createPostMessageLLMClient("layers"); pass through to FilterBar.
    │       └── toolsPanel.tsx                 # EDIT: construct createPostMessageLLMClient("tools"); pass through to FilterBar.
    └── services/
        ├── llmProxy.ts                        # EDIT: thread `panelOrigin` from incoming nlGenerate to structured telemetry
        │                                       #       and to outgoing nlOutcome message. Per-panel Map<requestId, AbortController>
        │                                       #       becomes Map<{panel, requestId}, AbortController> keyed by a composite.
        └── llmProxy.test.ts                   # EDIT: add tests —
                                                 #   - new-submission-in-panel-A-does-not-cancel-inflight-in-panel-B
                                                 #   - ceiling-reached-affects-all-panels
                                                 #   - telemetry record contains correct panel_origin per submission

shared/components/
└── src/
    └── FilterBar/
        └── FilterBar.stories.tsx              # EDIT: add two story variants NlModeLayersPanel, NlModeToolsPanel
                                                 #       (same stub client, different placeholder copy).

tests/e2e/
└── test-vscode-nl-search.spec.ts              # EDIT (file introduced by #191): add scenarios —
                                                 #   - layers-happy-path
                                                 #   - tools-happy-path
                                                 #   - cross-panel-concurrency (3 submissions in 100 ms, all resolve)
                                                 #   - failure class coverage: pick 2 of 7 classes, verify they render
                                                 #     identically in all 3 panels (parametric)
```

**Structure Decision**: The NL-mode logic that #191 placed in `FilterBar.tsx` and `createPostMessageLLMClient` is panel-agnostic by design. This feature only touches the three webview entry points that instantiate `FilterBar` and the shared `messages.ts` and `llmProxy.ts` that route messages. No new modules, no new directories.

## Applied Design Decisions (5)

| # | Decision | Applied in |
|---|---|---|
| 1 | `createPostMessageLLMClient` gains an optional `panelOrigin` parameter threaded into every `nlGenerate` message it emits. Default `"catalog-overview"` preserves #191 behaviour if a caller omits it. | `shared/components/src/nl-cql2/clients.ts` — one-parameter addition |
| 2 | `panelOrigin` is a literal union (`"catalog-overview" \| "layers" \| "tools"`), not a free string. Exhaustive switch in `llmProxy.ts` telemetry serialisation enforces compile-time coverage. | `apps/vscode/src/webview/messages.ts` and `apps/vscode/src/services/llmProxy.ts` |
| 3 | Abort key becomes a composite `{ panel, requestId }` rather than just `requestId`. This guarantees per-panel isolation even if two panels happen to pick colliding `requestId` values (unlikely but cheap to defend). | `apps/vscode/src/services/llmProxy.ts` |
| 4 | Ceiling-reached state is tracked per session (not per panel). When the ceiling is hit, every subsequent submission in every panel resolves to `ceiling-reached` without touching the provider — the decrement is global, honouring the session-wide budget principle from #191 FR-008. | `apps/vscode/src/services/llmProxy.ts` — ceiling counter is a single session-scoped integer |
| 5 | No changes in `shared/components/` other than adding two Storybook variants. All real wiring happens in the extension host / webview layer. This keeps `FilterBar.tsx` untouched and preserves its existing unit-test green state. | `shared/components/src/FilterBar/FilterBar.stories.tsx` only |

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| FilterBar (NL mode — Layers variant) | `shared/components/src/FilterBar/FilterBar.stories.tsx` — new `NlModeLayersPanel` variant | `filter-bar-nl-layers.js` | Shows the same FilterBar NL-mode UI with placeholder copy tuned for a Layers context ("Try: submarine tracks"). Demonstrates that the component is panel-agnostic. |
| FilterBar (NL mode — Tools variant) | Same file — `NlModeToolsPanel` variant | `filter-bar-nl-tools.js` | As above, with Tools placeholder ("Try: tools that operate on tracks"). |

**Inclusion Criteria Applied**:
- [x] New visual component context (two new panel framings of the existing NL-mode UI)
- [ ] Significant visual change (no — same component, different placeholder copy)
- [x] Interactive demo adds narrative value (readers see the same UI work in two different panel contexts)

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone
- [x] Reasonable bundle size expected (< 100 KB each — reuses FilterBar + stub client)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar--nlmodelayerspanel`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `FilterBar.stories.tsx` — `NlModeLayersPanel` | Placeholder copy correct, submission round-trip with stub client, chips render | light, dark, vscode | fill, keyboard Enter |
| `FilterBar.stories.tsx` — `NlModeToolsPanel` | As above with Tools placeholder | light, dark, vscode | fill, keyboard Enter |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (inherited from #191)
- [x] Screenshots captured for evidence (layers-placeholder, tools-placeholder, layers-chips-applied, tools-chips-applied)

**Test File Location**: `shared/components/e2e/FilterBar-nl.spec.ts` (extends the #191 file with two parametric iterations)

**Theme Variant URLs**:
```
/iframe.html?id=filterbar--nlmodelayerspanel&globals=theme:light
/iframe.html?id=filterbar--nlmodetoolspanel&globals=theme:light
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Layers panel NL happy path | Layers webview | `.layers-panel`, `[data-testid="nl-search-indicator"]`, `.filter-bar input`, `.chip-lozenge` | open Layers, type "submarine tracks", Enter, assert chips + filtered list |
| Tools panel NL happy path | Tools webview | `.tools-panel`, same selectors | open Tools, type phrase, Enter, assert chips |
| Cross-panel concurrency | All three webviews | Panel-scoped selectors | open all three; issue submissions to each within 100 ms; assert all three complete with independent outcomes |
| Per-panel failure banner | Each panel | `[data-testid="live-transport-banner"][data-transport-reason=...]` | Stub provider returns class X; submit from panel Y; assert banner renders with same reason and copy as Catalog Overview for class X |
| Ceiling-reached crosses panels | All three | Same | Set ceiling=2, submit twice in Catalog Overview (exhausting budget), then submit from Layers; assert `ceiling-reached` banner in Layers without any network call |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server across all three panels
- [x] Webview content accessible via `frameLocator` chaining (one frame per panel)
- [x] Page objects extended with Layers + Tools selectors
- [x] Screenshots captured for evidence (layers-chips, tools-chips, cross-panel-concurrency-all-three-chipped, layers-banner-auth, tools-banner-rate-limit, ceiling-reached-layers)

**Test File Location**: `tests/e2e/test-vscode-nl-search.spec.ts` (extends the #191 file)

**Infrastructure**: reuses the `xvfb-run` + `@sparticuz/chromium` harness, the existing `patch-webview.sh`, and the stub-LLM injection from #191. No new infrastructure.

## Deferred / Out of Scope

- **NL-mode in other webview surfaces** (e.g. Properties panel, Chart Renderer panel) — if the same `FilterBar` pattern shows up elsewhere in future, the same wiring applies; a fresh backlog item per surface.
- **Per-panel separate provider / model** — out of scope; a single `debrief.nlSearch.provider` (pending #196) governs all panels.
- **Per-panel separate ceiling** — explicitly rejected; the ceiling is a session-wide budget per #191 FR-008 intent.
- **Non-Anthropic providers** — #196.
- **Audit trail** — #197.
- **Keyring-unavailable banner split** — #198.
