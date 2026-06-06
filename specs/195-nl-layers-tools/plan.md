# Implementation Plan: NL Search in Layers & Tools Panels

**Branch**: `195-nl-layers-tools` | **Date**: 2026-04-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/195-nl-layers-tools/spec.md`

> **⚠️ Spec amendments required before tasks.** This plan was rewritten on
> 2026-04-27 after discovering the original plan rested on a false premise:
> "Both the Layers and Tools panels already render a `FilterBar` with
> `llmClient` set to `undefined` by default." They do not. See
> *Spec Amendments Required* below — please run `/speckit.clarify` against
> spec.md before `/speckit.tasks`.

## Summary

Extend the NL-mode pipeline delivered by #191 to two further surfaces — the
**Layers** and **Tools** sub-sections of the Activity Panel webview — so an
analyst can filter visible layers or available tools with a natural-language
phrase. #191 proved the pipeline (`FilterBar` ↔ `createPostMessageLLMClient`
↔ `llmProxy.ts` ↔ Anthropic) in the Catalog Overview; this feature carries
the *pipeline* across, but the destination panels need new UI before any
wiring is possible.

**Reality check that drives this plan.** The original plan claimed "wiring is
presentational" because the panels already rendered `FilterBar` instances.
They do not. Verified state of the repo:

- The Layers and Tools surfaces are sub-sections of one webview
  (`apps/vscode/src/webview/web/activityPanel.tsx`), not separate webviews
  as the original plan and spec wording imply.
- Neither `ToolsPanel`, `FeatureList`, nor `ActivityPanel` imports
  `FilterBar`. The repo-wide consumer of `FilterBar` is `StacBrowser`.
- `FilterBar`'s public API is structurally bound to `StacBrowserItem[]`
  and `VesselTaxonomyNode[]`; it cannot be dropped into a panel that
  filters `DebriefFeature` (Layers) or `ToolsPanelItem` (Tools) without
  significant refactoring or projection. The CQL2 chip vocabulary and OR
  containers are also Catalog-overview specific.

**Approach.** Extract the panel-agnostic NL surface from `FilterBar` into a
new shared component (`NlSearchBar`) that hosts the live-mode indicator,
failure banner, search input, and chip strip — parameterised by an
`llmClient`, `nlEnums`, `panelOrigin`, and a panel-supplied chip-to-predicate
adapter. Build per-panel taxonomy/enum bundles for Layers and Tools (Catalog
keeps using the existing one). Wire `nlConfig` and a single shared
`createPostMessageLLMClient` into the Activity Panel webview entry point and
thread `llmClient` two component layers down to ToolsPanel and the Layers
section. Add `panelOrigin` plumbing through the message protocol and the
proxy's abort/telemetry maps as previously planned.

**Scope estimate.** ~600–900 LOC of production + tests across the shared
component library and the VS Code extension, plus E2E coverage.
**Complexity: High.** (Original BACKLOG row had Medium; revising upward.)

## Spec Amendments Required

The current spec.md was written against a model of the codebase that doesn't
match reality. Run `/speckit.clarify` against spec.md and resolve these
points **before** `/speckit.tasks`. They are listed in priority order; items
1–3 are correctness-blocking, 4–10 are scope-clarifying.

1. **Drop the false assumption.** spec.md → Assumptions, line 138 — "Both
   the Layers and Tools panels already render a `FilterBar` with `llmClient`
   set to `undefined` by default." This is false. Replace with: "The Layers
   and Tools panels do not currently render a search input. This feature
   introduces the search UI as part of NL-mode integration."
2. **One webview, three contexts.** Spec wording ("the Layers panel" / "the
   Tools panel" / "all three panels") implies three independent webviews.
   Reality: Catalog Overview is its own webview; Layers and Tools are
   collapsible sub-sections inside one Activity Panel webview. Spec needs to
   either accept this collapsing (and rephrase "panel" → "panel-context"
   where relevant) or scope-out the Activity Panel split.
3. **Per-panel taxonomy / enum bundle.** FR-001/FR-002 implicitly assume the
   Catalog's `nlEnums` (vessel taxonomy) is reused for Layers and Tools.
   It can't be — the prompt would have nothing relevant to ground on.
   Decide how each panel's taxonomy is sourced:
   - Layers: probably feature-type / feature-tag / platform-attr enums
     derived from the currently-loaded plot.
   - Tools: probably tool name / category / applicable-feature-type enums
     derived from the tool inventory.
   - Catalog: unchanged.
4. **Filterable fields per panel.** Spec gives example phrases ("submarine
   tracks", "tools that operate on tracks") but never enumerates what's
   *filterable* in each panel. Without that list, the prompt is undefined
   and the chip vocabulary is undefined. Each panel needs an explicit list
   of fields with worked examples for each.
5. **Chip semantics in Layers and Tools.** The Catalog uses CQL2-backed
   chips with platform-attribute compound chips and OR containers. Layers
   and Tools likely don't need that vocabulary. Spec should specify what
   chip kinds each panel supports — and whether OR containers, negation,
   and saved filters carry over.
6. **AbortController scope.** FR-007 says new submission in panel A must
   not cancel in-flight in panel B. Layers and Tools share one webview and
   would naturally share a single `LLMClient` instance — under #191's
   contract `client.abort()` cancels *every* pending request on that
   client. Two options: (a) instantiate two clients (one per panel-context
   inside the webview) — wastes nothing, isolates abort scope; (b) extend
   the client API to accept a per-call abort scope. Spec must pick.
7. **Empty/inactive Tools list behaviour.** Today `ToolsPanel` is empty
   when `hasSelection === false`, shows "Loading…" while the inventory
   loads, and "Analysis tools unavailable…" when calc isn't connected.
   Spec must say what NL-mode does in each of those states (likely:
   indicator and search input hidden; banner state preserved across
   transitions).
8. **Collapse-state interaction.** Each Activity Panel section can be
   collapsed independently. Spec must specify whether NL search input
   collapses with its section, whether the live-mode indicator renders
   in the section header (visible when collapsed), and where the failure
   banner anchors when the section is collapsed.
9. **`panelOrigin` enumeration is final.** Spec says
   `"catalog-overview" | "layers" | "tools"`. Confirm — adding a new
   panel later (e.g. Properties, Chart Renderer) is a new feature, not a
   patch.
10. **Reuse of FilterBar.** Decision 5 in the original plan said
    "no changes in `shared/components/` other than adding two Storybook
    variants". This is incompatible with the actual codebase. Spec must
    accept that this feature introduces a new shared component
    (`NlSearchBar`, see Architectural Decisions below) — or pick a
    refactor-FilterBar path explicitly.

This plan assumes the most likely resolution of each item (best-guesses
flagged inline below in the Architectural Decisions) so design and tasks
can proceed once clarification confirms or amends them.

## Technical Context

**Language/Version**: TypeScript 5.x (strict). Existing monorepo toolchain
— no language change.

**Primary Dependencies**:
- VS Code Extension API ^1.85.0
- React 18.x
- `@debrief/components` — `FilterBar`, `nl-cql2` module, `ActivityPanel`,
  `ToolsPanel`, `FeatureList`, `LayersToolbar` (existing)
- `apps/vscode/src/services/llmProxy.ts` (existing, from #191)
- `apps/vscode/src/webview/messages.ts` (existing — `nlGenerate` /
  `nlOutcome` / `nlAbort` / `nlConfig` already defined)
- No new runtime dependencies.

**Storage**: No change. Credentials remain in `context.secrets`; settings
remain under `debrief.nlSearch.*`.

**Testing**:
- vitest unit tests (Activity Panel webview wiring, llmProxy composite
  abort + telemetry, NlSearchBar shared component, per-panel taxonomy
  builders).
- Storybook E2E via `@sparticuz/chromium` (NlSearchBar stories — Layers
  and Tools variants × theme matrix).
- Web-shell Playwright (Activity Panel cross-section concurrency,
  ceiling-reached crosses panel-contexts, failure-class banner parity).

**Target Platform**: VS Code 1.85+ on any OS. Same as #191.

**Project Type**: single — edits in
- `shared/components/src/` (new component, panel-agnostic NL primitives,
  per-panel taxonomy builders)
- `apps/vscode/src/webview/web/activityPanel.tsx` (host-side wiring)
- `apps/vscode/src/webview/messages.ts` (`panelOrigin` field)
- `apps/vscode/src/services/llmProxy.ts` (composite abort key, telemetry
  threading)
- `apps/vscode/src/views/activityPanelView.ts` (host message routing —
  forward `nlGenerate`/`nlAbort` to `llmProxy`, push `nlConfig` snapshots)

**Performance Goals**:
- Per panel-context first submission ≤ 10s wall-clock (matches #191).
- Up to two concurrent submissions inside the Activity Panel webview
  (Layers + Tools) plus one in Catalog Overview = 3 simultaneous, all
  resolve within 12s aggregate on broadband.

**Constraints**:
- Zero regression in Catalog Overview NL-mode (#191 E2E suite stays
  green).
- Each panel-context's submission lifecycle is isolated (FR-007).
  See Spec Amendment #6 — best-guess resolution: instantiate one
  `LLMClient` per panel-context inside the Activity Panel webview.
- Session-wide ceiling shared across all panel-contexts (FR-006).
- Existing literal title-substring filtering does not exist in
  ToolsPanel/FeatureList today; this feature does NOT introduce it as
  a fallback. When NL-mode is off, the panels behave exactly as today
  (no search input rendered). See Spec Amendment #4.
- `panelOrigin` is a closed literal union; exhaustive switch statements
  enforce coverage.
- Strict-type rules: no `any` introduced in new files.

**Scale/Scope**:
- One new shared component (~250–350 LOC) plus stories and tests.
- Two new taxonomy/enum-bundle builders (~100 LOC each).
- ~150 LOC of Activity Panel webview wiring + host message routing.
- ~50 LOC of foundation edits (panelOrigin, composite abort key).
- ~250 LOC of E2E across Storybook and web-shell.
Total estimate: 600–900 LOC.

## Constitution Check

*GATE: pre- and post-design both pass. Two articles need attention; both
resolve cleanly under the proposed approach.*

| Article | Assessment |
|---|---|
| I. Defence-Grade Reliability | **PASS** — reuses #191's seven-banner taxonomy; adds per-panel-context abort isolation; ceiling logic unchanged. No silent failures. |
| II. Schema Integrity | **PASS** — no master-schema changes. Per-panel enum bundles are derived data (Layers from the open plot's features; Tools from the calc inventory). |
| III. Data Sovereignty | **PASS** — no new telemetry content. Adds `panelOrigin` literal to existing records. No prompt or response capture. |
| IV. Architectural Boundaries | **PASS** — extension host owns credential + network + abort scope; webview only constructs `LLMClient` instances and forwards user input. |
| V. Extensibility | **PASS** — new `panelOrigin` is closed-set; future panels add via spec + literal extension. The `NlSearchBar` is panel-agnostic. |
| VI. Testing | **PASS** — per-component-context unit tests, Storybook E2E for the shared component, web-shell E2E for cross-context concurrency and ceiling-reached parity. |
| VII. Test-Driven AI Collaboration | **PASS** — acceptance scenarios from spec.md map to E2E parametrics; per-panel taxonomy builder behaviour fixed in unit tests before generation. |
| VIII. Documentation | **NOTE** — opening-context.md captured by this command; feature-post written at `/speckit.pr`. ADR not required (no architecture-shifting decision). |
| IX. Dependencies | **PASS** — zero new runtime dependencies. |
| X. Security | **PASS** — no new credential handling. Same `context.secrets` path as #191. |
| XIV. Pre-Release Freedom | **N/A** — additive change to message protocol (`panelOrigin` is optional with `"catalog-overview"` default in #191's existing senders). |
| XV. Strict Type Safety | **PASS** — `panelOrigin` is a discriminated literal union; exhaustive switches in proxy + telemetry serialiser enforce compile-time coverage; `NlSearchBar` carries explicit generic type for chip seeds. |

**Article XIII (Contribution Standards)** — atomic commits per phase below;
PR review required (no direct merge); CI must pass before merge.

No violations. **Complexity Tracking section retained** because the
implementation is non-trivial despite no constitutional violation —
revising the BACKLOG complexity from Medium to High (see Complexity
Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/195-nl-layers-tools/
├── plan.md                    # This file
├── spec.md                    # /speckit.specify output (needs amendments — see top)
├── tasks.md                   # /speckit.tasks output (regenerate after amendments)
└── evidence/
    └── opening-context.md     # Captured at end of this /speckit.plan run
```

### Source Code (repository root)

```text
shared/components/
└── src/
    ├── NlSearchBar/                     # NEW — panel-agnostic NL search UI
    │   ├── NlSearchBar.tsx              # Hosts QuickSearch + indicator + banner + chip strip
    │   ├── NlSearchBar.css              # Reuses FilterBar tokens (light/dark/vscode themes)
    │   ├── NlSearchBar.stories.tsx      # Layers + Tools variants
    │   ├── NlSearchBar.test.tsx         # Unit tests (chip lifecycle, banner classes,
    │   │                                 # supersession, abort)
    │   ├── chipsToPredicate.ts          # Generic chip-seed → (T) => boolean adapter
    │   ├── types.ts                     # ChipSeed, NlSearchBarProps<T>
    │   └── index.ts
    │
    ├── nl-cql2/
    │   ├── clients.ts                   # EDIT — createPostMessageLLMClient gains optional
    │   │                                 # `panelOrigin?: PanelOrigin` parameter; default
    │   │                                 # "catalog-overview". Threaded into every nlGenerate.
    │   └── types.ts                     # EDIT — export PanelOrigin literal union
    │
    ├── ActivityPanel/
    │   ├── ActivityPanel.tsx            # EDIT — accept optional `nlSearch?: ActivityPanelNlProps`
    │   │                                 # forward to ToolsPanel + LayersToolbar slot
    │   └── types.ts                     # EDIT — add ActivityPanelNlProps
    │
    ├── ToolsPanel/
    │   ├── ToolsPanel.tsx               # EDIT — render <NlSearchBar> above the list when
    │   │                                 # nlSearch prop present; apply chip predicate to
    │   │                                 # `tools` before activeTools/inactiveTools split
    │   └── toolsTaxonomy.ts             # NEW — derive enum bundle from current tool inventory
    │
    ├── FeatureList/
    │   └── FeatureList.tsx              # EDIT — accept optional NL-search-derived predicate;
    │                                       # NL bar lives in the Layers section header (above
    │                                       # the existing LayersToolbar) — see ActivityPanel.
    │
    ├── LayersToolbar/
    │   └── layersTaxonomy.ts            # NEW — derive enum bundle from currently-loaded
    │                                       # DebriefFeature[] (feature types, tags, platform attrs)
    │
    └── e2e/
        └── NlSearchBar.spec.ts          # NEW — Storybook E2E: theme matrix × Layers/Tools

apps/vscode/
└── src/
    ├── webview/
    │   ├── messages.ts                  # EDIT — add `panelOrigin: PanelOrigin` to
    │   │                                 # NlGenerateRequest + NlOutcomeResponse + NlAbortMessage.
    │   │                                 # Default value enforced by senders (see #191 sites).
    │   └── web/
    │       ├── catalogOverview.tsx      # EDIT — pass `panelOrigin: "catalog-overview"` (1 line)
    │       └── activityPanel.tsx        # EDIT — subscribe to nlConfig; construct two
    │                                     # createPostMessageLLMClient instances (panelOrigin:
    │                                     # "layers" and "tools"); pass through to ActivityPanel
    │                                     # via new `nlSearch` prop. Per-instance subscription
    │                                     # filters on `panelOrigin` so outcomes route to the
    │                                     # right panel-context.
    │
    ├── services/
    │   └── llmProxy.ts                  # EDIT — controllers map keyed by
    │                                     # `${panelOrigin}:${requestId}` (composite abort key);
    │                                     # `panelOrigin` flows through outcome messages and
    │                                     # structured telemetry record. Inline comment notes
    │                                     # ceiling counter remains session-scoped.
    │
    └── views/
        └── activityPanelView.ts         # EDIT — register nlGenerate / nlAbort message handlers
                                            # (mirroring catalogOverviewPanel.ts:312–322); push
                                            # nlConfig snapshots on activation + onConfigChange.

apps/web-shell/
└── playwright/
    └── tests/
        └── nl-activity-panel.spec.ts    # NEW — cross-section concurrency, ceiling-reached
                                            # parity, per-section banner classes
```

**Structure Decision**: Three change zones — (a) shared component library
(new `NlSearchBar` + per-panel taxonomy builders), (b) Activity Panel
webview entry + extension-host view (new wiring), (c) shared message
protocol + proxy (additive `panelOrigin` field + composite abort key).
The Catalog Overview path keeps its existing wiring with one `panelOrigin`
parameter added.

## Architectural Decisions

| # | Decision | Notes / Where applied |
|---|---|---|
| 1 | **Extract a new shared `NlSearchBar` component**, distinct from `FilterBar`. It hosts QuickSearch + live-mode indicator + transport banner + a chip strip. Generic over chip-seed type. | `shared/components/src/NlSearchBar/`. FilterBar stays Catalog-specific; the live indicator and banner JSX in FilterBar.tsx (lines ~402–460) are factored into shared subcomponents and consumed by both. |
| 2 | **Per-panel `ChipSeed` shape**, not full CQL2 lozenges. A `ChipSeed` is `{ field: string; value: string; negated?: boolean }`. The panel-supplied adapter resolves a chip into a predicate `(item: T) => boolean`. No CQL2, no platform compound chips, no OR containers in Layers/Tools. | `NlSearchBar/types.ts`. Catalog Overview keeps using `FilterBar`'s richer chip vocabulary unchanged. |
| 3 | **Per-panel taxonomy builders, derived data.** Layers builds enums from the open plot (feature types, tags, platform attrs). Tools builds enums from the calc inventory (tool names, categories). Catalog continues to use the static `vessel-taxonomy.json` + `enum-bundle.json`. | `LayersToolbar/layersTaxonomy.ts`, `ToolsPanel/toolsTaxonomy.ts`. Recomputed memoised with the upstream input. |
| 4 | **`panelOrigin` is a closed literal union** `"catalog-overview" \| "layers" \| "tools"`. Threaded through `nlGenerate` / `nlOutcome` / `nlAbort` messages, the proxy's controller map key, and the structured telemetry record. Adding a panel later requires a spec amendment. | `shared/components/src/nl-cql2/types.ts` (`export type PanelOrigin`), `apps/vscode/src/webview/messages.ts`, `llmProxy.ts`. |
| 5 | **Composite abort key in proxy**: `${panelOrigin}:${requestId}`. Guarantees per-panel-context isolation even if requestIds collide. | `apps/vscode/src/services/llmProxy.ts` — `controllers: Map<string, AbortController>`. |
| 6 | **One `LLMClient` instance per panel-context**, not per panel. The Activity Panel webview constructs two clients (`panelOrigin: "layers"` and `panelOrigin: "tools"`) so that `client.abort()` from Layers does not cancel Tools. Catalog Overview keeps its single client. | `apps/vscode/src/webview/web/activityPanel.tsx`. *(Confirms Spec Amendment #6, option (a).)* |
| 7 | **Subscribe-by-panelOrigin in the post-message client.** `createPostMessageLLMClient`'s window-message subscriber filters incoming `nlOutcome` by `panelOrigin` so two clients in one webview don't both consume each other's outcomes. | `shared/components/src/nl-cql2/clients.ts`. |
| 8 | **Ceiling stays session-scoped.** The proxy's `callsUsed` counter is decremented before the provider call (already true post-#191), and the `ceiling-reached` outcome short-circuits regardless of `panelOrigin`. | `llmProxy.ts:253–261`, inline comment added. |
| 9 | **Panel layout**: NL search input renders **inside** each section's content area (immediately above the existing list/toolbar), not in the section header. Live-mode indicator inline next to the input; failure banner above the list, below the input. The input is hidden when the section is collapsed; banner state is preserved across collapse/expand. | `ToolsPanel.tsx`, `ActivityPanel.tsx`. *(Best-guess resolution of Spec Amendment #8.)* |
| 10 | **No literal-substring fallback.** When NL-mode is off (config disabled or no API key), neither panel renders the search input. This matches today's behaviour exactly — there is no regression because the panels currently have no search UI at all. | *(Best-guess resolution of Spec Amendment #4.)* |
| 11 | **Tools NL when no selection**: indicator + input hidden. NL submission requires a non-empty tool inventory; when the list is empty the search input is not rendered. | `ToolsPanel.tsx` empty-state branches. *(Best-guess resolution of Spec Amendment #7.)* |
| 12 | **No new user-facing settings or commands.** `debrief.nlSearch.enabled` governs all three panel-contexts uniformly. | Same as spec FR-009/FR-010. |

## Phased Implementation

The phases are dependency-ordered. Phase 0 is panel-agnostic and unblocks
everything downstream. Phases 2 and 3 (Tools and Layers wiring) can run in
parallel after Phase 1 lands the shared component.

### Phase 0 — Foundations (panel-agnostic plumbing)

Goal: thread `panelOrigin` through messages, client, proxy, and telemetry
without changing any user-visible behaviour. Catalog Overview gains
`panelOrigin: "catalog-overview"` as a one-line edit.

- Define `export type PanelOrigin = "catalog-overview" | "layers" | "tools"`
  in `shared/components/src/nl-cql2/types.ts`.
- Add optional `panelOrigin?: PanelOrigin` (default `"catalog-overview"`)
  to `createPostMessageLLMClient` options. Every emitted `nlGenerate`
  carries it; the subscriber filters incoming `nlOutcome` by it.
- Extend `apps/vscode/src/webview/messages.ts`: add `panelOrigin: PanelOrigin`
  to `NlGenerateRequest`, `NlOutcomeResponse`, `NlAbortMessage`. Update
  any type-guard helpers.
- Edit `apps/vscode/src/services/llmProxy.ts`: change `controllers` map key
  from `requestId` to `${panelOrigin}:${requestId}`; thread `panelOrigin`
  into the `nlOutcome` reply and the `TransportCallRecord` (`panel_origin`
  field). Add an inline comment confirming the ceiling counter remains
  session-scoped, decremented before the provider call.
- Edit `apps/vscode/src/webview/web/catalogOverview.tsx`: pass
  `panelOrigin: "catalog-overview"` to `createPostMessageLLMClient`.
- Unit tests in `apps/vscode/src/services/llmProxy.test.ts`:
  - composite abort key — new submission in panel A does not cancel
    in-flight in panel B
  - ceiling-reached short-circuits regardless of `panelOrigin`
  - telemetry record carries `panel_origin` for each submission
- **Acceptance:** all #191 tests still pass; the new tests pass; Catalog
  Overview behaviour byte-identical to before.

### Phase 1 — Shared `NlSearchBar` component

Goal: extract the panel-agnostic NL search UI from `FilterBar` into a new
component that any panel can render.

- Create `shared/components/src/NlSearchBar/` (see Source Code tree).
- Move the live-mode indicator and transport banner JSX out of
  `FilterBar.tsx` (lines ~402–460) into shared sub-components
  (`<LiveModeIndicator>`, `<LiveTransportBanner>`) used by **both**
  `FilterBar` and `NlSearchBar`. `data-testid` and
  `data-transport-reason` strings are unchanged so #191 E2E selectors
  keep working.
- `NlSearchBar<T>` props:
  - `items: readonly T[]`
  - `llmClient: LLMClient`
  - `nlEnums: EnumBundle`
  - `panelOrigin: PanelOrigin`
  - `placeholder: string`
  - `liveModeLabel: string`
  - `chipsToPredicate: (chips: readonly ChipSeed[]) => (item: T) => boolean`
  - `onFilteredItems: (items: readonly T[]) => void`
  - `onBannerAction?: (action) => void`
- Internal state: chip strip, supersession token, busy flag, banner.
  Reuses `generateCql2` from `nl-cql2/generate.ts` for the prompt
  round-trip (same path FilterBar uses today). The result's
  `LozengeSeed[]` is mapped to the simpler `ChipSeed[]` shape (drop
  platform compound chips and OR containers — Decision 2).
- Storybook stories: `NlModeLayersPanel`, `NlModeToolsPanel`, plus an
  empty-state and a banner-state per failure class (parameterised).
- Vitest unit tests:
  - chip lifecycle (add via NL, remove via X, clear via Clear all)
  - supersession (rapid resubmit cancels prior)
  - banner classes — each of the seven render with correct
    `data-transport-reason` and copy
  - lozenge survival across failure (FR-005)
- **Acceptance:** `NlSearchBar` standalone story renders with a stub
  client, types a phrase, chips appear, list narrows, banner renders on
  stub failure. FilterBar unit tests still pass after the
  indicator/banner extraction.

### Phase 2 — Tools panel-context wiring (US2)

Goal: render `NlSearchBar` in the Tools section; build a Tools taxonomy
builder; route chips to a Tools predicate.

- Create `shared/components/src/ToolsPanel/toolsTaxonomy.ts`:
  - input: `ToolsPanelItem[]`
  - output: `EnumBundle`-shaped object with `tool_names`,
    `tool_categories`, `applicable_feature_types` (or whatever Spec
    Amendment #3 lands on)
- Create `shared/components/src/ToolsPanel/toolsChipsToPredicate.ts`:
  - input: `ChipSeed[]`
  - output: `(item: ToolsPanelItem) => boolean`
  - matches by tool name (case-insensitive substring), category, and
    applicability — exact field set defined post-amendment-#4.
- Edit `ToolsPanel.tsx`: when `nlSearch` prop is supplied, render
  `<NlSearchBar items={tools} ... />` above the list; apply the
  resulting filtered list before the active/inactive split. Hide the
  bar in the empty/loading/no-selection states (Decision 11).
- Vitest:
  - taxonomy builder produces stable enums for a fixture inventory
  - `chipsToPredicate` correctly narrows a fixture inventory
- **Acceptance:** ToolsPanel story with NL stub renders the search bar
  above the list; typed phrase narrows tools; chip removal restores.

### Phase 3 — Layers panel-context wiring (US1)

Goal: render `NlSearchBar` in the Layers section; build a Layers
taxonomy builder; route chips to a `DebriefFeature` predicate.

- Create `shared/components/src/LayersToolbar/layersTaxonomy.ts`:
  - input: `DebriefFeature[]`
  - output: `EnumBundle`-shaped object covering feature types
    (track/point/shape), feature tags, platform attrs derived from the
    features actually present.
- Create `shared/components/src/FeatureList/featureChipsToPredicate.ts`:
  - input: `ChipSeed[]`
  - output: `(feature: DebriefFeature) => boolean`
  - composes with the existing optional `filter` callback on
    `FeatureList`.
- Edit `ActivityPanel.tsx` Layers section: render `<NlSearchBar>`
  immediately above `<LayersToolbar>` when `nlSearch.layers` prop is
  present. Pipe the filtered `DebriefFeature[]` to `FeatureList` via
  the existing `filter` callback prop.
- Vitest as for Phase 2.
- **Acceptance:** Activity Panel story (Layers section only, with NL
  stub) renders the search bar; typed phrase narrows the feature list;
  chip removal restores.

### Phase 4 — Activity Panel webview host wiring

Goal: make `apps/vscode/src/webview/web/activityPanel.tsx` and
`apps/vscode/src/views/activityPanelView.ts` carry NL-mode end-to-end.

- `activityPanelView.ts` (extension host):
  - register `nlGenerate` / `nlAbort` message handlers (mirror
    `apps/vscode/src/panels/catalogOverviewPanel.ts:312–322`)
  - subscribe to `llmProxy.onConfigChange` and push `nlConfig` snapshots
    to the webview
- `activityPanel.tsx` (webview entry):
  - subscribe to `nlConfig` messages from the host
  - construct **two** `createPostMessageLLMClient` instances on first
    enable: one with `panelOrigin: "layers"`, one with
    `panelOrigin: "tools"` (Decision 6)
  - import a Layers `EnumBundle` builder and a Tools `EnumBundle` builder
    and recompute when the upstream inventory changes (Decision 3)
  - pass an `nlSearch` prop into `<ActivityPanel>` carrying both clients,
    enums, labels (`Live · Anthropic · {model}`), and a banner-action
    handler that posts back `nlBannerAction` messages.
- `ActivityPanel.tsx` (component) + `types.ts`: add
  `nlSearch?: ActivityPanelNlProps` and forward `nlSearch.tools` to
  `ToolsPanel`, `nlSearch.layers` to the Layers section.
- Vitest:
  - Activity Panel webview entry constructs both clients only when
    `enabled && hasApiKey`; tears them down on toggle-off.
  - banner-action messages route to the correct VS Code commands.
- **Acceptance:** an Activity Panel webview running against the stub
  proxy in vitest+jsdom renders the indicator in both sections when
  enabled, hides them when disabled, and resolves chips per section.

### Phase 5 — Failure-consistency (US3)

Goal: prove banner parity, abort isolation, and ceiling propagation.

- Vitest in `llmProxy.test.ts`:
  - all seven failure classes serialise to identical `nlOutcome`
    payloads regardless of `panelOrigin`
  - simultaneous submissions from two `panelOrigin`s, one fails and one
    succeeds, both resolve correctly
- Storybook E2E in `shared/components/e2e/NlSearchBar.spec.ts`:
  - parametric: layers + tools variants × {auth-failure, rate-limit,
    provider-error, timeout, malformed, not-configured,
    ceiling-reached} — all banners byte-identical to the FilterBar
    rendering of the same class.
- **Acceptance:** SC-003 verified by automated parametric coverage; no
  drift between FilterBar and NlSearchBar banner copy.

### Phase 6 — E2E in web-shell

Goal: full-extension scenarios proving the analyst workflow end-to-end.
The web-shell hosts the same shared components as the VS Code
extension; we drive it with Playwright (the supported path for blog
screenshots — see `docs/e2e-testing-guide.md` §3).

- New `apps/web-shell/playwright/tests/nl-activity-panel.spec.ts`:
  - **Layers happy path** — open plot, enable NL, type phrase, Enter,
    assert chips + narrowed list.
  - **Tools happy path** — same with a tool-relevant phrase.
  - **Cross-section concurrency** — Layers and Tools submissions within
    100ms; both resolve independently.
  - **Cross-panel concurrency** — Catalog Overview + Layers + Tools
    within 100ms (the spec's "all three panels" scenario).
  - **Ceiling-reached parity** — set ceiling=2; submit twice in Catalog;
    third submission from Layers shows `ceiling-reached` without a
    network call.
- Page objects: extend `AnalysisPage` (or split into a new
  `ActivityPanelPage`) — do **not** duplicate selectors. Add
  `data-testid="nl-search-input-{panelOrigin}"` to the input and key on
  the existing `data-testid="nl-search-indicator"` and
  `data-testid="live-transport-banner"`.
- Screenshots written **directly** into
  `specs/195-nl-layers-tools/evidence/screenshots/` from the spec file:
  `layers-chips-applied.png`, `tools-chips-applied.png`,
  `cross-panel-concurrency.gif` (~5s), `layers-banner-auth-failure.png`,
  `tools-banner-rate-limit.png`, `ceiling-reached-layers.png`.
- **Acceptance:** all scenarios pass; SC-001/2/3/4/5/6/7 covered;
  evidence artifacts present.

### Phase 7 — Polish + evidence + PR

- Run `task verify` (lint + typecheck + tests + Playwright E2E).
- Confirm no regressions in #191 E2E suite (re-run as part of `task verify`).
- Capture `evidence/test-summary.md` (template at
  `.specify/templates/evidence/test-summary-template.md` — git_sha,
  captured_at, counts, coverage).
- Capture `evidence/usage-example.md` — annotated transcript of an
  analyst working across all three panel-contexts.
- Save the cross-panel-concurrency Playwright trace ZIP at
  `evidence/e2e-trace.zip`.
- Update `docs/project_notes/issues.md` with the implementation entry
  linking the PR.
- Run `/speckit.pr` to produce feature PR + blog post.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| NlSearchBar (Layers variant) | `shared/components/src/NlSearchBar/NlSearchBar.stories.tsx` — `NlModeLayersPanel` | `nl-search-bar-layers.js` | Demonstrates the panel-agnostic NL search UI in a Layers context, with placeholder copy "Try: submarine tracks" and a stub client that resolves to feature-type chips. |
| NlSearchBar (Tools variant) | Same file — `NlModeToolsPanel` | `nl-search-bar-tools.js` | Same UI, Tools placeholder ("Try: tools that operate on tracks"), stub resolves to tool-name chips. Shows that the component is panel-agnostic. |

**Inclusion Criteria Applied**:
- [x] New visual component (`NlSearchBar` is genuinely new)
- [x] Significant visual change (search input + indicator + banner now lives in two new surfaces)
- [x] Interactive demo adds narrative value (readers see the NL pipeline operate on a non-Catalog domain — the value pattern of #191 generalising)

**Bundleability Verified**:
- [x] Stories will exist in Storybook after Phase 1
- [x] Component renders standalone with a stub `LLMClient`
- [x] Reasonable bundle size expected (< 150 KB each — reuses extracted indicator/banner subcomponents)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/nlsearchbar--nlmodelayerspanel`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `NlSearchBar.stories.tsx` — `NlModeLayersPanel` | Placeholder copy, indicator visible, stub-client round-trip, chips render, chip removal | light, dark, vscode | fill, Enter, click chip × |
| `NlSearchBar.stories.tsx` — `NlModeToolsPanel` | As above with Tools placeholder | light, dark, vscode | fill, Enter, click chip × |
| `NlSearchBar.stories.tsx` — failure-class parametric | All seven banner classes render with correct `data-transport-reason` and copy parity vs FilterBar | light | n/a (banner-only) |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid`, `aria-label`, `role="alert"` on banner — inherited from #191)
- [x] Screenshots captured for evidence (layers-placeholder, tools-placeholder, layers-chips-applied, tools-chips-applied, banner-auth-failure)

**Test File Location**: `shared/components/e2e/NlSearchBar.spec.ts`

**Theme Variant URLs**:
```
/iframe.html?id=nlsearchbar--nlmodelayerspanel&globals=theme:light
/iframe.html?id=nlsearchbar--nlmodelayerspanel&globals=theme:dark
/iframe.html?id=nlsearchbar--nlmodelayerspanel&globals=theme:vscode
/iframe.html?id=nlsearchbar--nlmodetoolspanel&globals=theme:light
```

## VS Code Webview E2E Testing

This is the path of record for blog/PR screenshots and full-extension
workflow proofs (`docs/e2e-testing-guide.md` §3).

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Layers section NL happy path | Activity Panel webview → Layers section | `[data-testid="nl-search-input-layers"]`, `[data-testid="nl-search-indicator"]`, `[data-testid="feature-list"]`, `.debrief-chip` | open plot, enable NL, type "submarine tracks", Enter, assert chips + filtered list |
| Tools section NL happy path | Activity Panel webview → Tools section | `[data-testid="nl-search-input-tools"]`, same indicator + chip selectors, `.debrief-tools-panel__list` | type a Tools-relevant phrase, Enter, assert chips + narrowed tools |
| Cross-section concurrency (Activity Panel) | Layers + Tools sections in same webview | both panel-scoped selectors | issue submissions to each within 100 ms; assert both complete with independent outcomes |
| Cross-panel concurrency | All three panel-contexts | per-context selectors | open Catalog Overview + Activity Panel; issue three submissions within 100 ms; assert all three resolve with independent chips |
| Per-section failure banner | Each section | `[data-testid="live-transport-banner"][data-transport-reason=...]` | stub provider returns class X; submit from section Y; assert banner reason + copy parity with Catalog Overview |
| Ceiling-reached crosses panel-contexts | All three | same | set ceiling=2; submit twice in Catalog Overview; submit from Layers; assert `ceiling-reached` banner in Layers without a network call |

**Testing Strategy**:
- [x] Extension workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended (extend `AnalysisPage` or split a new `ActivityPanelPage`); reuse — do not duplicate — selectors
- [x] Screenshots and the cross-panel-concurrency interaction GIF written **directly** into `specs/195-nl-layers-tools/evidence/screenshots/` from the spec file (path-resolution pattern in `apps/web-shell/playwright/tests/properties-screenshots.spec.ts`)

**Test File Location**: `apps/web-shell/playwright/tests/nl-activity-panel.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs nl-activity-panel`
- Local: `pnpm --filter @debrief/web-shell test nl-activity-panel`

**Optional — chrome-level VS Code Webview tests**: Not needed. None of
the scenarios require real VS Code chrome; the web-shell hosts the same
shared components and a stubbed `vscode` API surface.

## Deferred / Out of Scope

- **NL-mode in other webview surfaces** (Properties panel, Chart Renderer,
  Storyboard editor). When a future panel needs NL search, it consumes
  `NlSearchBar` with its own `panelOrigin` literal and a panel-specific
  taxonomy/predicate adapter. New backlog item per surface.
- **Per-panel separate provider / model.** Out of scope; the single
  `debrief.nlSearch.provider` (post-#196) governs every panel-context.
- **Per-panel separate ceiling.** Explicitly rejected — ceiling is a
  session-wide budget per #191 FR-008 intent.
- **Saved filters in Layers/Tools.** The `SavedFiltersStorage` mechanism
  used by FilterBar in Catalog Overview is not extended to `NlSearchBar`
  in this feature; chips disappear when the user clears them or when the
  panel reloads. A separate backlog item if useful later.
- **OR containers and platform compound chips in Layers/Tools.** Out of
  scope — `NlSearchBar`'s `ChipSeed` model is intentionally simpler
  than `FilterBar`'s `LozengeItem`.
- **Refactoring `FilterBar` to be generic over its item type.** Considered
  and rejected — would risk Catalog Overview regressions and force a
  CQL2-flavoured chip vocabulary onto Layers/Tools where it doesn't fit.
- **Non-Anthropic providers** — #196.
- **Audit-trail logging** — #197.
- **Keyring-unavailable banner split** — #198 (already shipped via #191
  Phase 4; this feature inherits it via the extracted banner component).

## Complexity Tracking

The constitution check passes without violations, so this section
documents implementation complexity rather than constitutional debt.

| Cost | Why it exists | Simpler alternative rejected because |
|------|---------------|--------------------------------------|
| New shared `NlSearchBar` component (~250–350 LOC + tests + stories) | `FilterBar` is structurally bound to `StacBrowserItem[]` + vessel taxonomy + CQL2; cannot be reused for `DebriefFeature` or `ToolsPanelItem`. | Generalising `FilterBar` over its item type would require generics across the entire CQL2 chip vocabulary, OR-container drag-and-drop, platform value editor, etc. — risks Catalog regressions and forces a CQL2-flavoured vocabulary onto panels that don't want it. |
| Two new taxonomy/enum-bundle builders (Layers + Tools) | The Catalog's `enum-bundle.json` is vessel-domain content; the prompt would have nothing to ground on for layers or tools. | Reusing the Catalog bundle would silently degrade NL quality in the new panels with no error path. |
| Two `LLMClient` instances inside the Activity Panel webview | Layers and Tools share one webview but FR-007 requires their abort scopes to be isolated; `client.abort()` cancels every pending request on a single client. | Adding a per-call abort scope to the `LLMClient` API is a wider contract change that touches the Catalog Overview path; instantiating two clients is local and well-typed. |
| Composite abort key in `llmProxy.ts` | Defends against `requestId` collisions across panel-contexts (cheap insurance) and matches the literal-union `panelOrigin` semantics through to the proxy. | Trusting `requestId` uniqueness across two webviews is a soft contract — a UUID v4 is enough today but couples behaviour to the implementation choice. |

**BACKLOG complexity revision**: Medium → **High**. Update BACKLOG.md row
195 when transitioning the row's status to `implementing`. The original
Medium rating was based on the (false) "presentational wiring" assumption.
