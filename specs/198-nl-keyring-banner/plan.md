# Implementation Plan: NL Search — Keyring-Unavailable Distinct Banner

**Branch**: `198-nl-keyring-banner` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/198-nl-keyring-banner/spec.md`

## Summary

Split one new failure class (`keyring-unavailable`) out of the existing `not-configured` outcome defined by #191. Today, `llmProxy.ts` (extension host) calls `context.secrets.get()` and, because the call is awaited without an explicit try/catch, any rejection either propagates as an unhandled error or is swallowed into the generic "no key" path. This feature adds one try/catch around the secret lookup, adds one discriminant value to the `LiveOutcome` union, and adds one banner branch in `FilterBar.tsx`. No transport, no pipeline, no storage changes. Zero net new runtime dependencies.

**Technical approach**: In `apps/vscode/src/services/llmProxy.ts`, wrap every `context.secrets.get('debrief.nlSearch.anthropicApiKey')` call (first-read + cache-refresh) in a try/catch. A rejection/throw resolves the in-flight `nlGenerate` with `{ kind: "keyring-unavailable" }`; a resolution with `undefined | ""` keeps resolving to `{ kind: "not-configured" }` exactly as today. A cache-refresh throw leaves the existing cached key intact (FR-008). In `shared/components/src/nl-cql2/types.ts`, add `| { kind: "keyring-unavailable"; platformHint?: "linux" | "macos" | "windows" | "unknown" }` to the `LiveOutcome` union. In `shared/components/src/FilterBar/FilterBar.tsx`, add one switch branch rendering a distinct banner: headline names the OS keyring, primary action opens troubleshooting help (static docs link), secondary action opens settings. Add a Storybook story variant and extend the VS Code E2E failure matrix from 7 classes to 8.

## Technical Context

**Language/Version**: TypeScript 5.x (extension host + webview + shared components — existing monorepo toolchain; no language or version change)
**Primary Dependencies**: VS Code Extension API ^1.85.0 (`SecretStorage.get`), React 18.x (banner), `@debrief/components` (existing FilterBar + nl-cql2 module from #191), no new runtime dependencies
**Storage**: No change. VS Code SecretStorage is still the only secret sink; this feature only adds classification of its failure modes.
**Testing**: vitest (unit — secret-read classification, cache-refresh-throw-preserves-cache, banner renders per reason); Playwright via `@sparticuz/chromium` + code-server (webview E2E — keyring-unavailable scenario added to the 7-class matrix inherited from #191)
**Target Platform**: VS Code 1.85+ on any OS. The motivating failure mode (keyring locked/missing) is most common on Linux, but the classification applies uniformly on macOS and Windows.
**Project Type**: single — edits under `apps/vscode/src/services/`, `shared/components/src/FilterBar/`, `shared/components/src/nl-cql2/`; no new top-level directories
**Performance Goals**: No hot-path change. The try/catch adds ~0 ms on success, sub-ms on throw. Banner render remains well under 16 ms (one React node).
**Constraints**: (1) Preserve #191 FR-006/SC-005 — prior chips + list survive the new failure class. (2) Cache-refresh throws must NOT evict a working cached key (FR-008 of this spec). (3) Classification must be re-evaluated on every submission; no sticky failure state (FR-007). (4) Banner copy must NOT be Linux-only in the headline (FR-010). (5) Strict-type rules hold — no `any`, no error-shape inspection; the discriminator is "was the promise rejected?".
**Scale/Scope**: One new discriminant, one new classification branch, one new banner branch, one new E2E scenario, one new Storybook variant. This is a ~30-line behavioural change plus tests.

## Constitution Check

*GATE: pre- and post-design both pass. Nothing requires justification.*

| Article | Assessment |
|---|---|
| I. Defence-Grade Reliability | **PASS** — resolves a silent-diagnosis failure mode (no silent failures principle). Enhances offline-by-default behaviour by not misdirecting users to re-enter keys when the keyring is the real problem. |
| III. Data Sovereignty | **PASS** — no new telemetry, no new data flow. Only change to telemetry is an additional outcome literal, no secret content captured. |
| IV. Architectural Boundaries | **PASS** — classification stays in the extension host (service layer); FilterBar remains a display component. No service-touches-UI crossover. |
| VI. Testing | **PASS** — new unit tests for `llmProxy.ts` (three-way secret-read classification + cache-refresh safety); new Storybook test variant; new VS Code E2E scenario. |
| IX. Dependencies | **PASS** — zero new runtime dependencies. Implementation is stdlib TypeScript + existing VS Code API. |
| X. Security | **PASS** — no new secret handling. The new code path strictly observes "was the read call rejected?" and never inspects secret values or error message contents. |
| XIV. Pre-Release Freedom | **N/A** — no breaking API changes. Adding a new discriminant to a union is additive for consumers that use exhaustive `switch` (TypeScript will surface missing cases at compile time, which is the desired behaviour). |
| XV. Strict Type Safety | **PASS** — `LiveOutcome` gains one fully-typed variant; the cache value is explicitly typed; no `any` introduced. Exhaustive `switch` in `FilterBar.tsx` enforces banner coverage at compile time. |

No violations. **Complexity Tracking section intentionally omitted.**

## Project Structure

### Documentation (this feature)

```text
specs/198-nl-keyring-banner/
├── plan.md              # This file
├── research.md          # Phase 0 — 4 decisions (detection rule, cache policy, banner copy, help link strategy)
├── data-model.md        # Phase 1 — one union-variant addition
├── quickstart.md        # Phase 1 — manual repro of keyring-locked Linux scenario + fix
├── contracts/
│   └── live-outcome-addition.ts  # Diff-style contract showing the single union extension
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── tasks.md             # /speckit.tasks output — not created here
```

### Source Code (repository root)

```text
apps/vscode/
└── src/
    └── services/
        ├── llmProxy.ts              # EDIT: wrap context.secrets.get in try/catch in two places
        │                            #       (first-read on cache miss + cache-refresh in onDidChange handler).
        │                            #       Return LiveOutcome { kind: "keyring-unavailable" } on rejection.
        │                            #       Preserve existing cache value on refresh-throw (FR-008).
        └── llmProxy.test.ts         # EDIT: add 3 tests — reject-classified-as-keyring-unavailable,
                                     #       undefined-still-not-configured, refresh-throw-preserves-cache

shared/components/
└── src/
    ├── nl-cql2/
    │   ├── types.ts                 # EDIT: add { kind: "keyring-unavailable"; platformHint?: Platform }
    │   │                            #       to the LiveOutcome discriminated union.
    │   └── __tests__/
    │       └── types.test.ts        # EDIT or NEW: tiny assertion that a keyring-unavailable outcome
    │                                 #             is structurally distinguishable from not-configured.
    └── FilterBar/
        ├── FilterBar.tsx            # EDIT: add switch branch rendering the keyring-unavailable banner
        │                            #       with distinct copy, help link, and secondary Open Settings.
        ├── FilterBar.stories.tsx    # EDIT: add NlModeKeyringUnavailable story variant (stub client that
        │                            #       resolves with { kind: "keyring-unavailable", platformHint: "linux" })
        └── __tests__/
            └── FilterBar.nl.test.tsx  # EDIT: add test for new banner — correct data-transport-reason,
                                       #       correct copy, lozenges preserved (FR-006 inherited from #191)

tests/e2e/
└── test-vscode-nl-search.spec.ts    # EDIT (file introduced by #191): add keyring-unavailable scenario —
                                     #   stub context.secrets.get to throw, submit phrase, assert banner
                                     #   with data-transport-reason="keyring-unavailable".
```

**Structure Decision**: Minimal edits along the three existing surfaces touched by #191 — no new directories, no new modules. This is a surgical split of one existing classification branch into two. Consumers of the `LiveOutcome` union outside the FilterBar are unaffected (they either handle both variants the same way or surface the new one via TypeScript's exhaustiveness check, which is the desired behaviour).

## Applied Design Decisions (4)

| # | Decision | Applied in |
|---|---|---|
| 1 | Detection rule is "was the `Promise` rejected?", NOT inspecting error shapes | `llmProxy.ts` — single `try/catch` around each `context.secrets.get` await; no `instanceof Error` or message matching |
| 2 | Cache-refresh throws preserve the previously-working cached key; eviction only on explicit user action or delivered `onDidChange` resolving to undefined | `llmProxy.ts` — the `onDidChange` handler's re-read is wrapped in its own `try/catch` that leaves `cachedKey` untouched on throw |
| 3 | Banner headline is OS-neutral; `platformHint` drives an optional secondary hint sentence mapping Linux → "unlock gnome-keyring/KWallet", macOS → "unlock Keychain Access", Windows → "check Credential Manager", unknown → omit | `FilterBar.tsx` — headline is platform-neutral; hint paragraph conditionally rendered on `platformHint` |
| 4 | "Help: unlock your keyring" action opens a static docs URL via `vscode.env.openExternal`; no programmatic keyring manipulation | `FilterBar.tsx` (dispatches a `nlHelp` message) → `extension.ts` (handles `nlHelp` by calling `vscode.env.openExternal`) |

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| FilterBar (NL mode, keyring-unavailable) | `shared/components/src/FilterBar/FilterBar.stories.tsx` — new `NlModeKeyringUnavailable` variant | `filter-bar-nl-keyring.js` | Demonstrates the new banner's distinct copy + help-link affordance versus the existing `NlModeWithStubClient` story (which covers not-configured and other classes) |

**Inclusion Criteria Applied**:
- [x] New visual component (new banner branch)
- [ ] Significant visual change (no — single new banner variant)
- [x] Interactive demo adds narrative value (readers see the distinct banner copy side-by-side in Storybook with the existing `not-configured` variant)

**Bundleability Verified**:
- [x] Stories exist in Storybook (extends the #191 story file)
- [x] Components render standalone (stub LLMClient resolves with the new outcome)
- [x] Reasonable bundle size expected (< 100 KB — reuses existing FilterBar + stub client)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar--nlmodekeyringunavailable`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `FilterBar.stories.tsx` — `NlModeKeyringUnavailable` | Banner renders with `data-transport-reason="keyring-unavailable"`, correct copy, help action visible, lozenges preserved across the failure | light, dark, vscode | fill (phrase), keyboard (Enter), click (help action — asserts a `nlHelp` message emitted from the stub) |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid="live-transport-banner"`, `data-transport-reason="keyring-unavailable"`)
- [x] Screenshots captured for evidence (`banner-keyring-unavailable-linux.png`, `banner-keyring-unavailable-macos.png`, `banner-keyring-unavailable-windows.png`)

**Test File Location**: `shared/components/e2e/FilterBar-nl.spec.ts` (extends the #191 file)

**Theme Variant URLs**:
```
/iframe.html?id=filterbar--nlmodekeyringunavailable&globals=theme:light
/iframe.html?id=filterbar--nlmodekeyringunavailable&globals=theme:dark
/iframe.html?id=filterbar--nlmodekeyringunavailable&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Keyring-unavailable scenario | Catalog Overview webview | `[data-testid="live-transport-banner"][data-transport-reason="keyring-unavailable"]` | Stub `context.secrets.get` to reject; submit phrase; assert banner with distinct reason attribute and distinct body copy |
| Regression: not-configured unchanged | Same | `[data-testid="live-transport-banner"][data-transport-reason="not-configured"]` | With no stored key (resolve undefined), submit phrase; assert the existing banner appears unchanged |
| Recovery after keyring unlock | Same | Same | Stub throws once, then resolves with valid key on second read; submit twice; assert second submission succeeds |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects extended with `banner-keyring-unavailable` selector
- [x] Screenshots captured for evidence (`banner-keyring-unavailable.png`, `recovery-after-unlock.png`)

**Test File Location**: `tests/e2e/test-vscode-nl-search.spec.ts` (extends the #191 file)

**Infrastructure**: reuses the `xvfb-run` + `@sparticuz/chromium` harness, the existing `patch-webview.sh`, and the stub-LLM injection from #191. The one new stubbing primitive needed is a way to make `context.secrets.get` reject — achieved by monkey-patching the proxy's getter in the test harness (not the real SecretStorage).

## Deferred / Out of Scope

- **Fine-grained throw classification** (locked vs corrupt vs daemon-missing) — any rejection is `keyring-unavailable`. Finer taxonomy can be added later if logs show it is useful.
- **Programmatic keyring unlock** — help link only; never shells out to `gnome-keyring-daemon` or similar. That would be a new security surface.
- **A general secret-store abstraction** — explicitly out of scope per the backlog item. VS Code's `SecretStorage` remains the single, directly-called API.
- **Non-Anthropic providers** — #196.
- **NL in Layers/Tools panels** — #195.
- **Audit trail / forensic logging** — #197.
