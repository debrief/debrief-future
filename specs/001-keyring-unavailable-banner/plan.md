# Implementation Plan: NL Search — Keyring-Unavailable Distinct Banner

**Branch**: `001-keyring-unavailable-banner` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-keyring-unavailable-banner/spec.md`

## Summary

Extend the NL-search `LiveOutcome` union (introduced by parent spec #191) with a ninth variant, `keyring-unavailable`, so that a thrown exception from `context.secrets.get()` is classified distinctly from the "no key stored" / "feature disabled" cases covered by `not-configured`. Wire the new outcome through the extension host's `llmProxy` (single point of secrets access), through the webview-side `LLMClient`, and into FilterBar's banner dispatch so a distinct banner — with a Retry affordance and copy that names the OS keyring — is surfaced to the analyst. No new runtime dependencies, no settings, no schema changes outside the `LiveOutcome` discriminated union.

Primary technical approach: a try/catch around the single `context.secrets.get()` call in the extension host, mapping any throw to a new `LiveKeyringUnavailable` outcome with `durationMs: 0` and no captured exception payload. All other outcome paths are unchanged. FilterBar gets one new `case` in its outcome-to-banner switch; `useFilterBar`'s retry handler is unchanged because it already re-submits the last phrase.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-any` enforced by CI per Article XV)
**Primary Dependencies**: Extends #191 surface — `apps/vscode/src/services/llmProxy.ts` (NEW via #191, extended here), `shared/components/src/nl-cql2/providerCall.ts` (NEW via #191, unchanged here), `shared/components/src/nl-cql2/clients.ts` (`createPostMessageLLMClient` — one `kind` added to the outcome union), `shared/components/src/FilterBar/FilterBar.tsx` + `useFilterBar.ts` (one banner branch added), `@debrief/vscrui` (existing VS Code banner icon set)
**Storage**: N/A — the only data surface touched is `context.secrets` (read-only here; the feature does not write or change the stored key)
**Testing**: vitest unit tests for outcome classification in `llmProxy` and banner dispatch in `FilterBar`; Playwright VS Code E2E extending #191's failure matrix with a single new row (`keyring-unavailable`)
**Target Platform**: VS Code Extension API ^1.85.0 (host) + webview React 18.x runtime. Banner is platform-copy aware (Linux / macOS / Windows variants) but the outcome kind is platform-agnostic.
**Project Type**: Single-project monorepo (pnpm workspaces + uv). Changes localised to three existing packages: `apps/vscode`, `shared/components/FilterBar`, `shared/components/nl-cql2`.
**Performance Goals**: Outcome classification adds < 1 ms on the failure path (pure try/catch boundary, zero additional I/O). No performance regression on the success path.
**Constraints**: `durationMs: 0` on keyring-unavailable (no network issued). No raw exception message written to the structured log (Article III). Banner copy MUST externalise for translation (Article XI).
**Scale/Scope**: One new discriminated-union variant, one new banner `case`, ~30 lines of production code plus ~80 lines of tests. No cross-package changes outside the three packages listed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Assessment |
|---|---|
| I. Defence-Grade Reliability | **PASS** — the entire feature is about replacing a silently-misleading error ("add your API key") with a loud, correct one ("unlock your keyring"). No silent failures; analysts always know the state. |
| II. Schema Integrity | **N/A** — no LinkML or derived-schema changes. The `LiveOutcome` union is a TypeScript-only interaction contract, not a data-model schema. |
| III. Data Sovereignty | **PASS** — structured log adds one new `kind` value; no prompt content, no key content, no raw OS exception message crosses any boundary. Retry affordance issues no provider call until the keyring succeeds. |
| IV. Architectural Boundaries | **PASS** — the extension host remains the sole owner of `context.secrets`. Webview observes outcome kind only. FilterBar remains a presentational component; classification happens host-side. |
| V. Extensibility | **PASS** — adding a variant to a discriminated union with exhaustive switch enforcement makes future failure classes cheaper to add, not harder. |
| VI. Testing | **PASS** — unit tests (classification + dispatch) and VS Code E2E (banner matrix row) land with the feature. |
| VII. Test-Driven AI Collaboration | **PASS** — acceptance scenarios and success criteria in the spec are directly translatable into tests; the test matrix is the definition of done. |
| VIII. Documentation | **PASS** — spec.md + this plan + a settings/troubleshooting note in `docs/` will ship with implementation tasks. |
| IX. Dependencies | **PASS** — zero new runtime dependencies. |
| X. Security | **PASS** — no secrets in code; raw exception messages (which can include OS user/path details) are deliberately not logged. |
| XI. Internationalisation | **PASS** — banner strings externalisable. Platform-specific copy key (`banner.keyringUnavailable.{linux,macos,windows}`) routes through existing i18n surface. |
| XII. Community Engagement | **PASS** — ships with a planning post and LinkedIn summary targeting DSTL + defence maritime analysts on Linux workstations. |
| XIII. Contribution Standards | **PASS** — atomic change scope, PR-reviewed, CI-green gate. |
| XIV. Pre-Release Freedom | **PASS** — narrowing `not-configured` semantics is a breaking change to a pre-release union; permitted. |
| XV. Strict Type Safety | **PASS** — new variant uses explicit `kind` literal; exhaustive-switch `never` check in FilterBar enforces handling; no `any`. |

**Result**: All gates pass. No violations; Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-keyring-unavailable-banner/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output — LiveOutcome union extension
├── quickstart.md        # Phase 1 output — reproduce + verify
├── contracts/
│   └── llm-client.diff.md  # Phase 1 output — delta against #191 llm-client.ts
├── checklists/
│   └── requirements.md  # (from /speckit.specify)
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/vscode/
└── src/
    └── services/
        ├── llmProxy.ts                # #191 source — ADD try/catch around context.secrets.get
        └── __tests__/
            └── llmProxy.test.ts       # #191 tests — ADD keyring-unavailable classification case

shared/components/
└── src/
    ├── nl-cql2/
    │   ├── types.ts                   # #191 source — EXTEND LiveOutcome union with LiveKeyringUnavailable
    │   ├── clients.ts                 # #191 source — webview LLMClient propagates new kind unchanged
    │   └── __tests__/
    │       └── liveClient.test.ts     # #191 tests — ADD outcome-passthrough case for new kind
    └── FilterBar/
        ├── FilterBar.tsx              # ADD one banner branch for keyring-unavailable
        ├── FilterBar.css              # (optional) shared banner styles; no new variant styling required
        ├── useFilterBar.ts            # UNCHANGED — retry handler is outcome-agnostic
        └── __tests__/
            └── FilterBar.nl.test.tsx  # ADD keyring-unavailable banner-text + retry affordance test

tests/e2e/
└── test-vscode-nl-search.spec.ts      # #191 suite — ADD keyring-unavailable row to failure matrix
                                       # (force secrets.get throw via patched extension harness)

docs/
└── nl-search-troubleshooting.md       # (optional) NEW user-facing doc — how to unlock OS keyring per platform
```

**Structure Decision**: Layer on top of #191's planned source layout. This feature does not introduce any new source files in shared code — all production changes are edits to files #191 creates. The one genuinely new file is an optional user-facing troubleshooting doc; test additions are either in existing test files or follow the same directory pattern. This scope discipline is the core value of the plan: a minimal surface-area change to a clearly-defined seam.

## Dependency Ordering

This feature explicitly depends on #191. The implementation task list will:

1. Assume #191 is merged (its `llmProxy.ts`, `providerCall.ts`, `clients.ts` `LiveOutcome` union, and VS Code E2E harness are all available).
2. Land as a single PR after #191 merges, not before. Out-of-order merging is permitted only if #191's in-flight branch rebases this one on top — handled at PR time.
3. Contain a single commit per artefact (types change, host classification, webview passthrough, banner dispatch, tests, docs) per Article XIII's atomic-commit rule.

## Media Components

None — this feature has no new visual primitive. The banner reuses the existing `[data-testid="live-transport-banner"]` component from #191 with a new `data-transport-reason="keyring-unavailable"` data attribute. The #191 Storybook story for the banner will be extended with one new variant but no new story file is introduced.

**Inclusion Criteria Applied**:
- [ ] New visual component *(no — reuses existing banner)*
- [ ] Significant visual change *(no — one new variant, same style)*
- [ ] Interactive demo adds narrative value *(marginal — covered by #191's banner story)*

## Storybook E2E Testing

Piggy-backs on #191's banner story. One new variant added to the existing story file under a `keyring-unavailable` story name; no new `.spec.ts` file required because coverage happens inside the VS Code E2E matrix (below) where the outcome can actually be generated end-to-end via a forced `secrets.get` throw.

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `LiveTransportBanner.stories.tsx` (extended) | Renders keyring-unavailable variant; Retry button focusable | light, dark, vscode | render-only (interaction covered by VS Code E2E) |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants (extends existing #191 banner story)
- [x] Interactive elements respond to user input *(covered end-to-end by VS Code E2E, not Storybook E2E)*
- [x] Accessibility attributes present (`data-testid="live-transport-banner"`, `data-transport-reason="keyring-unavailable"`, `aria-label` on Retry button)
- [x] Screenshots captured for evidence (banner-keyring-unavailable, light + dark + vscode themes)

**Test File Location**: `shared/components/src/FilterBar/LiveTransportBanner.stories.tsx` (story extension, not a new file). VS Code host interaction tested via `tests/e2e/test-vscode-nl-search.spec.ts`.

## VS Code Webview E2E Testing

Extends the existing #191 end-to-end failure matrix by exactly one row. No new test file; one new scenario inside the existing `test-vscode-nl-search.spec.ts`.

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Keyring-unavailable banner + retry | Catalog Overview webview | `.stac-browser`, `.filter-bar input`, `[data-testid="live-transport-banner"][data-transport-reason="keyring-unavailable"]`, `[data-testid="banner-retry"]` | (a) open settings → enable NL + set a stub key, (b) force extension-host `secrets.get` to throw via test-harness hook, (c) submit phrase, (d) assert banner appears with distinct reason + Retry (not Open Settings), (e) clear the forced-throw hook, (f) click Retry, (g) assert successful submission path |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining (matches #191 pattern)
- [x] Page objects updated for new selectors (`[data-transport-reason="keyring-unavailable"]` added to the banner selector table)
- [x] Screenshots captured for evidence: `banner-keyring-unavailable.png`, `state-chips-preserved-after-keyring-unavailable.png`, `state-success-after-retry.png`

**Test File Location**: `tests/e2e/test-vscode-nl-search.spec.ts` (one new `test.describe` block appended to #191's matrix).

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh` (#191 infra — unchanged)
- Content injection via `tests/e2e/helpers/webview-injector.ts` (extended with a secrets-throw toggle)
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

**Forcing the throw in E2E**: The extension host will expose a test-only command (`debrief.nlSearch._forceSecretsThrow`) behind a `DEBRIEF_E2E=true` env guard, toggling a one-shot `throw` in the `secrets.get` wrapper. This keeps the production code path free of test seams. The wrapper itself lives in `apps/vscode/src/services/secretsAccess.ts` (small new file isolating the try/catch) — test toggle lives next to the wrapper, not in `llmProxy`.

## Complexity Tracking

N/A — Constitution Check passes without violations. No justifications required.
