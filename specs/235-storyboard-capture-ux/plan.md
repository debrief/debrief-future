# Implementation Plan: Storyboard Capture & Maintenance UX (Cross-Host)

**Branch**: `235-storyboard-capture-ux` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/235-storyboard-capture-ux/spec.md`

## Summary

Bring storyboard capture and maintenance to the web-shell host with a unified
cross-host UX that keeps the map and time controller continuously visible
during every capture and every Scene-level edit. The feature is **mostly
front-end integration**: #215's headless CRUD module and #217/#218/#230's
shared `StoryboardPanel` already exist; this slice (a) extends the panel
with two new inline affordances (first-capture naming row + duplicate-
timestamp collision banner) so the host-level VS Code quick-pick / modal
disappear, (b) wires those affordances into both hosts via the existing
`useStoryboardEditReducer` channel, (c) re-homes the web-shell from its
fixture-driven `StoryboardEditHarness` onto live session-state, and (d) adds
a browser-side adaptor for the #174 thumbnail pipeline so web-shell capture
produces real Scene assets. No schema changes, no new entities, no new
services. Visibility invariants (FR-VIS-022/023) are enforced by automated
Playwright assertions on both hosts.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Python 3.11 (existing services — no changes)
**Primary Dependencies**:
- `@debrief/components` — extends `StoryboardPanel` with two new inline rows; reuses `useStoryboardEditReducer`, `storyboard/crud.ts`, `formatDtg`
- `@debrief/session-state` — `SessionStoreApi` already provides featureCollection mutation + dirty tracking; web-shell already consumes it
- `@debrief/schemas` — generated TS types for `StoryboardFeature` / `SceneFeature` (no regen needed)
- React 18.x — panel host (existing in both hosts)
- `modern-screenshot` — browser DOM → PNG capture (already used by #174 web adaptor)
- VS Code Extension API ^1.85.0 — host channel for the existing webview panel (no new APIs needed)
- `ulid` — ID generation (existing)

**Storage**: Plot's `FeatureCollection` (existing) — Storyboard / Scene Features round-trip via the existing plot save/load path; STAC asset write for thumbnails reuses the existing `sceneThumbnailService` (VS Code) and gains a new browser sibling for web-shell.

**Testing**: Vitest (component + reducer tests), Playwright (cross-host visibility-invariant E2E + capture/maintenance E2E). The `@sparticuz/chromium` path applies to both web-shell and the spec-navigator harnesses already in CI.

**Target Platform**: Browser (web-shell @ `apps/web-shell`), VS Code Webview (@ `apps/vscode`). Identical React tree; identical message channel; identical visual contracts.

**Project Type**: Web monorepo (pnpm workspaces + uv workspace).

**Performance Goals**:
- Capture press → Scene visible in rail: median **< 1.5 s** on both hosts (SC-004; matches #216 SC-001).
- Visibility-invariant Playwright run completes in **< 30 s** per host, per browser, on the standard CI runner.
- Reducer state transitions for the new inline rows complete in **< 5 ms** at p95 (matches #230 reducer perf gate).

**Constraints**:
- **Article I** — offline-by-default. Every flow (capture, every maintenance op, storyboard-level ops) must succeed with no network access. Browser thumbnail capture uses `modern-screenshot` against the live DOM — no remote rendering.
- **FR-VIS-022/023** — no UI element may overlap the map or time controller bounding boxes; no `aria-hidden` / focus trap / pointer-blocker may attach to either control or its ancestors during any of the spec's flows. Programmatic enforcement via Playwright DOM assertions (FR-VIS-024).
- **No schema changes** — Storyboard/Scene/Viewport/LogEntry are unchanged from #215; this slice does not bump `schema_version`.
- **Article XV (Strict Type Safety)** — every new component, reducer action, and message payload is typed end-to-end; no `any`.

**Scale/Scope**: Typical plot has < 100 Scenes per Storyboard and 1–3 Storyboards. Reuses #215's existing perf bench (`p95 < 10 ms at 100k positions`) for any CRUD-side work; this spec adds no new mutation paths — only new UI affordances over existing ops.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Verdict | Notes |
|---------|---------|-------|
| I — Reliability | ✅ Pass | Offline-by-default preserved; every flow ends in either a complete persisted Scene or a clean rejection with inline error and unchanged dirty state. No silent failures. |
| II — Schema Integrity | ✅ Pass | No schema changes. Reuses #215's LinkML-derived `StoryboardFeature` / `SceneFeature` / `LogEntry` types. Round-trip guarantee delegated to #215. |
| III — Data Sovereignty | ✅ Pass | Provenance entries appended via #215's append-only `LogEntry[]` slot on every mutation (existing path). No new telemetry; thumbnail capture is local-only via `modern-screenshot`. |
| IV — Architectural Boundaries | ✅ Pass *(extends existing exception)* | This spec **extends the footprint** of #215's documented Article IV exception — the shared TypeScript module under `shared/components/` is mounted in two hosts now (already true since #230). No new exception introduced. No service-layer code changes. |
| V — Extensibility | ✅ Pass (N/A) | No extension points changed. |
| VI — Testing | ✅ Pass | Visibility invariants gated by Playwright (FR-VIS-024). Reducer + component changes covered by Vitest. Capture / maintenance flow E2E on both hosts. |
| VII — Test-Driven AI Collaboration | ✅ Pass | Acceptance scenarios in spec are programmatic; SC-001/002 are DOM-assertable; SC-009 is a source-search assertion that the legacy quick-pick / modal are gone. |
| VIII — Documentation | ✅ Pass | Spec exists; opening-context.md will be cached at end of plan; data-model + contracts emitted in Phase 1. |
| IX — Dependencies | ✅ Pass | No new runtime dependencies (`modern-screenshot` already in tree per #174). No new dev dependencies — all testing infra (`vitest`, `@playwright/test`, `@sparticuz/chromium`) already pinned. |
| X — Security | ✅ Pass | No secrets; no network calls. |
| XI — Internationalisation | ✅ Pass | New user-facing strings ("Capture Scene", "A scene already exists at this timestamp", "Replace / Offset (+1 s) / Cancel", undo-toast labels) externalised through the existing `@debrief/components` string surface — same pattern as the panel today. |
| XIII — Contribution Standards | ✅ Pass | Atomic commits planned per phase; PR-gated; CI must pass (lint + typecheck + Vitest + Playwright per `task verify`). |
| XV — Strict Type Safety | ✅ Pass | All new TS code uses strict mode and explicit annotations; no `any`. Message-channel payloads typed via existing `storyboardPanelMessages.ts` extended with the two new message kinds. |

**Gate result: PASS.** No violations require entries in *Complexity Tracking*.

## Project Structure

### Documentation (this feature)

```text
specs/235-storyboard-capture-ux/
├── plan.md              # This file
├── research.md          # Phase 0 — resolves Technical Context unknowns
├── data-model.md        # Phase 1 — references #215 entities (no new entities)
├── quickstart.md        # Phase 1 — analyst-facing walkthrough on both hosts
├── contracts/
│   └── panel-messages.md      # New panel↔host message kinds (capture flow + collision banner)
├── checklists/
│   └── requirements.md  # Quality checklist (already complete after /speckit.clarify)
├── evidence/
│   ├── opening-context.md     # Cached opener for the eventual feature blog post
│   └── screenshots/           # Populated during /speckit.implement
└── tasks.md             # Generated by /speckit.tasks
```

### Source Code (real paths)

```text
shared/
└── components/
    └── src/
        ├── panels/
        │   └── StoryboardPanel/
        │       ├── StoryboardPanel.tsx              # extended: empty-state Capture button, first-capture naming row, collision banner
        │       ├── StoryboardHeader.tsx             # extended: in-header dropdown + overflow ops, inline cascade-delete confirm
        │       ├── useStoryboardEditReducer.ts      # extended: namingRow + collisionBanner state slices, new actions
        │       ├── types.ts                         # extended: new view-model types for the two inline rows
        │       ├── CONTRACTS.md                     # updated: documents the two new message kinds
        │       ├── StoryboardPanel.stories.tsx      # extended: stories for empty-state, naming row, collision banner
        │       └── __tests__/
        │           ├── StoryboardPanel.test.tsx     # extended: occlusion-free assertions; naming-row + banner coverage
        │           └── useStoryboardEditReducer.test.ts  # extended: new actions + transitions
        └── storyboard/
            ├── crud.ts                              # unchanged (existing #215 module)
            ├── dtg.ts                               # unchanged
            └── …                                    # unchanged

apps/
├── vscode/
│   └── src/
│       ├── commands/
│       │   ├── captureScene.ts                      # tightened: removes showInputBox quick-pick + Replace/Offset modal; both routed through panel postMessage
│       │   └── storyboardEdit.ts                    # tightened: removes any remaining modal prompts (delete confirm, etc.)
│       ├── messages/
│       │   └── storyboardEdit.ts                    # extended: encode the two new message kinds (panel→host, host→panel)
│       ├── types/
│       │   └── storyboardPanelMessages.ts           # extended: message-kind union + payload types
│       ├── views/
│       │   └── storyboardPanelView.ts               # tightened: routes naming + collision messages through reducer; auto-opens panel on capture trigger (already true)
│       └── webview/web/
│           └── storyboardPanel.tsx                  # extended: bootstrap reads new state slices from reducer
└── web-shell/
    └── src/
        ├── App.tsx                                  # extended: replaces fixture-only StoryboardEditHarness mount with live StoryboardPanelMount when a plot is open
        ├── StoryboardPanelMount.tsx                 # NEW — wires panel to session-state, time controller, MapView, and capture command; renders the session-only badge per FR-WEB-029a
        ├── services/
        │   └── webSceneThumbnailAdapter.ts          # NEW — browser-side thumbnail capture via modern-screenshot, returns the same WriteSceneThumbnailResult shape VS Code uses
        ├── commands/
        │   └── captureSceneWeb.ts                   # NEW — browser sibling of apps/vscode/src/commands/captureScene.ts; same orchestration, browser deps; pagehide/unmount listener resets captureInFlight per Edge Cases
        ├── StoryboardEditHarness.tsx                # demoted: still loadable behind ?storyboardEditHarness query string for component dev only
        └── playwright/
            ├── helpers/
            │   └── viewport-invariants.ts           # NEW — assertViewportControlsRemainAccessible(page); imported by both web-shell tests below AND shared/components/e2e/StoryboardPanel.spec.ts via relative path (single source of truth, no duplication)
            └── tests/
                ├── storyboard-capture.spec.ts       # NEW — first-capture, subsequent capture, collision banner, error paths, FR-CAP-017a offset-past-time-range
                ├── storyboard-maintenance.spec.ts   # NEW — every FR-MAINT-018 op + storyboard-level ops
                └── storyboard-visibility-invariants.spec.ts  # NEW — FR-VIS-022/023 assertions across every flow

shared/
└── components/
    └── src/
        └── MapView/
            └── __tests__/
                └── captureMap.bench.ts              # NEW — Vitest perf bench at 100/1k/10k position reports; soft p95 < 2.5s warning at 10k (not a CI fail) — early-warning gate for SC-004 on the web-shell path
```

**Structure Decision**: Web monorepo, three project areas:
- `shared/components/src/panels/StoryboardPanel/` — the only place new component code is written. Both hosts mount it.
- `apps/web-shell/src/` — gains a real mount + browser thumbnail adaptor + capture command sibling.
- `apps/vscode/src/` — gains a tightened command path (legacy quick-pick / modal removed) and updated message-channel union.

This is a **Web application** layout (frontend + frontend, no new backend) — the storage/persistence path unchanged. There is no new Python.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `StoryboardPanel` (Empty + Capture) | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` (extend with `EmptyWithCaptureButton`) | `storyboard-panel-empty.js` | Shows the no-Storyboards empty state with the primary Capture Scene affordance. |
| `StoryboardPanel` (First-capture naming row) | `…StoryboardPanel.stories.tsx` (new `FirstCaptureNamingRow` story) | `storyboard-panel-naming.js` | Demonstrates the inline naming row replacing the legacy quick-pick. |
| `StoryboardPanel` (Collision banner) | `…StoryboardPanel.stories.tsx` (new `DuplicateTimestampBanner` story) | `storyboard-panel-collision.js` | Demonstrates the inline Replace / Offset / Cancel banner replacing the legacy modal. |
| `StoryboardPanel` (Maintenance row open) | existing `StoryboardPanel.stories.tsx` (already has edit-row coverage from #218; add `RowWithUpdateToCurrent` if missing) | `storyboard-panel-maintenance.js` | Demonstrates per-Scene edit affordances landing inside the rail without modals. |

**Inclusion Criteria Applied**:
- [x] New visual component (two new inline rows: naming row, collision banner)
- [x] Significant visual change (legacy host-level prompts replaced by in-rail affordances; cross-host parity)
- [x] Interactive demo adds narrative value (the blog story is "watch the live map and time controller stay put while we work" — a video / interactive Storybook tells that better than prose)

**Bundleability Verified**:
- [x] Stories exist in Storybook (`StoryboardPanel.stories.tsx` is already shipped; new stories extend it)
- [x] Components render standalone (StoryboardPanel already does — `__testing__/storyOnlyMockHandlers.ts` proves it)
- [x] Reasonable bundle size expected (< 500KB — the panel is small; no new dependencies)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx → EmptyWithCaptureButton` | Renders the primary Capture Scene affordance; no Scene rows; accessibility (data-testid, aria-label on the button) | light, dark, vscode | focus + Enter triggers handler |
| `StoryboardPanel.stories.tsx → FirstCaptureNamingRow` | Inline naming row appears, name field auto-focused, default value shown, collision-warning slot present and empty | light, dark, vscode | type a name; type a colliding name; press Enter; press Escape |
| `StoryboardPanel.stories.tsx → DuplicateTimestampBanner` | Banner anchored above the conflicting Scene row; three buttons (Replace / Offset / Cancel); banner is keyboard-focusable | light, dark, vscode | click each button; verify focus order |
| `StoryboardPanel.stories.tsx → RowWithUpdateToCurrent` | Row exposes Update-to-current affordance; in-row layout doesn't grow beyond expected height | light, dark, vscode | click; verify reducer action dispatched |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants (light, dark, vscode)
- [x] Interactive elements respond to user input (button clicks, keyboard, Escape)
- [x] Accessibility attributes present (`data-testid`, `aria-label`, `aria-live` for the collision banner)
- [x] Screenshots captured for evidence (each new state, all three themes — feed the blog post's "what changed visually")

**Test File Location**: `shared/components/e2e/StoryboardPanel.spec.ts` (extend existing — do not duplicate)

**Theme Variant URLs** (Storybook):
```
/iframe.html?id=panels-storyboardpanel--empty-with-capture-button&globals=theme:light
/iframe.html?id=panels-storyboardpanel--empty-with-capture-button&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--empty-with-capture-button&globals=theme:vscode
/iframe.html?id=panels-storyboardpanel--first-capture-naming-row&globals=theme:light
/iframe.html?id=panels-storyboardpanel--first-capture-naming-row&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--first-capture-naming-row&globals=theme:vscode
/iframe.html?id=panels-storyboardpanel--duplicate-timestamp-banner&globals=theme:light
/iframe.html?id=panels-storyboardpanel--duplicate-timestamp-banner&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--duplicate-timestamp-banner&globals=theme:vscode
```

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| First-capture flow with continuous map+time visibility | `StoryboardPanel`, `MapView`, time controller | `[data-testid="storyboard-panel"]`, `[data-testid="capture-scene-button"]`, `[data-testid="storyboard-naming-row"]`, `.leaflet-container`, `[data-testid="time-controller"]` | open plot, click capture, verify map + time controller selectors stay visible & pointer-reachable for the entire flow, type Storyboard name, confirm, assert Scene row appears |
| Subsequent capture (append) | `StoryboardPanel`, `MapView`, time controller | same as above, plus `[data-testid="scene-row"]` | move time playhead, click capture, confirm Scene row count increments by 1 |
| Duplicate-timestamp collision via inline banner | `StoryboardPanel` | `[data-testid="storyboard-collision-banner"]`, `[data-testid="collision-replace"]`, `[data-testid="collision-offset"]`, `[data-testid="collision-cancel"]` | trigger collision, assert banner appears, exercise each of the three buttons, verify reducer state |
| Maintenance ops (rename / describe / delete+undo / update-to-current / duplicate / copy-to-other / refresh-stale) | `StoryboardPanel`, `MapView`, time controller | `[data-testid="scene-row-edit"]`, `[data-testid="scene-row-update-current"]`, `[data-testid="scene-row-delete"]`, `[data-testid="undo-toast"]`, `[data-testid="scene-row-duplicate"]`, `[data-testid="scene-row-copy-to"]`, `[data-testid="scene-row-refresh-thumbnail"]` | exercise each op against a fixture Storyboard with 3 Scenes; verify provenance entry appended; verify map+time selectors uncovered throughout |
| Storyboard-level ops (create / rename / delete-with-cascade / switch active) | `StoryboardPanel`, `MapView` | `[data-testid="storyboard-header-dropdown"]`, `[data-testid="storyboard-create"]`, `[data-testid="storyboard-rename"]`, `[data-testid="storyboard-delete-confirm"]`, `[data-testid="storyboard-cascade-undo"]` | exercise each op with a 2-Storyboard fixture; verify cascade preview shows correct Scene count |
| Visibility invariants (cross-flow) | every Scene/Storyboard interaction | `.leaflet-container`, `[data-testid="time-controller"]`, plus the 50+ frame-by-frame assertions | run alongside every other test; assert no overlap, no `aria-hidden`, no `pointer-events: none` on either control's bounding box |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended for new selectors (extend existing `AnalysisPage`; do not duplicate)
- [x] Screenshots and/or interaction GIF written **directly** into `specs/235-storyboard-capture-ux/evidence/screenshots/` from the spec file (follow the `properties-screenshots.spec.ts` path-resolution pattern)

**Test File Location**:
- `apps/web-shell/playwright/tests/storyboard-capture.spec.ts`
- `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- `apps/web-shell/playwright/tests/storyboard-visibility-invariants.spec.ts`
- `apps/web-shell/playwright/helpers/viewport-invariants.ts` (helper; imported from both web-shell tests above AND `shared/components/e2e/StoryboardPanel.spec.ts` — single source of truth)
- `shared/components/src/MapView/__tests__/captureMap.bench.ts` (Vitest perf bench, soft warning at p95 > 2.5s @ 10k positions)

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs storyboard-capture` (auto-provisions `@sparticuz/chromium`)
- Local: `pnpm --filter @debrief/web-shell test storyboard-capture`

**Optional — chrome-level VS Code Webview tests**:
For VS Code, parity is verified by re-running the same `StoryboardPanel.stories.tsx` Storybook E2E (above) against the panel webview render — no separate openvscode-server runs are required. SC-009's "legacy quick-pick / modal removed" assertion is a `grep` check during build, not a Playwright run.

## Complexity Tracking

> *No Constitution violations require justification. This section intentionally empty.*
