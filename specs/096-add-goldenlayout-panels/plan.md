# Implementation Plan: GoldenLayout Panel Management

**Branch**: `096-add-goldenlayout-panels` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/096-add-goldenlayout-panels/spec.md`

## Summary

Replace the web-shell's fixed flexbox layout in the analysis view with GoldenLayout v2 to provide resizable, draggable, dockable, tabbable, and pop-out panels. The CatalogOverview welcome view remains standalone. Five panels (Navigation, Activity, Log, Map, Chart) are arranged in a default layout mirroring the current design. Layout is persisted to localStorage and restored on reload. A Panel Registry enables new panel types to be added without modifying infrastructure. Cross-window state sync for pop-out panels uses `shared-zustand` with BroadcastChannel.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x)
**Primary Dependencies**: `golden-layout` v2.x (panel management), `shared-zustand` (cross-window state sync via BroadcastChannel), existing `@debrief/components`, `@debrief/session-state` (Zustand ^5.0.0)
**Storage**: Browser localStorage for layout persistence (~2-5 KB per saved layout)
**Testing**: Playwright (E2E), Vitest (unit tests)
**Target Platform**: Modern browsers (Chrome 54+, Firefox 38+, Safari 15.4+, Edge 79+)
**Project Type**: Web application (monorepo — `apps/web-shell` + `shared/components`)
**Performance Goals**: Panel resize reflow <100ms (SC-001); drag-and-dock completes <3s (SC-002); map resize triggers `invalidateSize()` within 50ms
**Constraints**: Offline-capable (no network dependencies); all panel content renders without external services; pop-out degrades gracefully when BroadcastChannel unavailable
**Scale/Scope**: 5 default panel types; single-user browser application; ~500 lines of new infrastructure code + ~200 lines per panel wrapper

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevant Principle | Status | Notes |
|---------|-------------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | No network dependencies. GoldenLayout operates entirely client-side. localStorage is local. |
| I. Defence-Grade Reliability | No silent failures | PASS | Layout restore fails explicitly → fallback to default with console warning. Pop-out sync checks `isSupported()`. |
| II. Schema Integrity | Single source of truth | N/A | No schema changes — this is a UI layout feature. |
| IV. Architectural Boundaries | Services never touch UI | PASS | GoldenLayout is purely frontend. Python services are unchanged. |
| IV. Architectural Boundaries | Frontends never persist | PASS (justified) | Layout persistence is UI-only state (window arrangement), not data. This is analogous to VS Code's saved layout — not domain data. |
| V. Extensibility | Fail-safe loading | PASS | Panel Registry pattern: unknown panel types in saved layout → graceful fallback. Panel component errors → Error Boundary inside panel frame. |
| V. Extensibility | No vendor lock-in | PASS | GoldenLayout is MIT-licensed, open-source, well-established. Panel content components are framework-agnostic React — can be wrapped in any layout manager. |
| VI. Testing | Services require unit tests | PASS | Panel Registry gets unit tests. Layout persistence gets unit tests. E2E tests cover the integrated UI. |
| IX. Dependencies | Minimal, vetted dependencies | PASS | Two new deps: `golden-layout` (6.6k stars, MIT, TypeScript-native) and `shared-zustand` (1.5kB, MIT). Both justified by spec requirements. |
| XI. Internationalisation | I18N from the start | PASS | Panel titles come from the registry (externalisable). No hardcoded user-facing strings in infrastructure. |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Pre-v4.0.0 — layout structure may change freely. |

**Pre-design gate**: PASS — no violations.
**Post-design gate**: PASS — no violations introduced by design decisions in research.md.

## Project Structure

### Documentation (this feature)

```text
specs/096-add-goldenlayout-panels/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technical decisions and rationale
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Developer getting-started guide
├── contracts/           # Phase 1: TypeScript interface contracts
│   ├── panel-registry.ts
│   └── panel-workspace.ts
├── checklists/
│   └── requirements.md  # Quality checklist
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/src/
├── PanelWorkspace/
│   ├── PanelWorkspace.tsx       # GoldenLayout container component
│   ├── PanelWorkspace.css       # GoldenLayout theme overrides
│   ├── goldenLayoutBridge.ts    # React ↔ GoldenLayout binding layer
│   ├── panelRegistry.ts         # Panel type registration
│   ├── defaultLayout.ts         # Default 5-panel layout configuration
│   ├── layoutPersistence.ts     # localStorage save/load/validate
│   └── index.ts                 # Barrel exports
├── panels/
│   ├── MapPanel.tsx             # Wrapper: MapView + resize handling
│   ├── ActivityPanelWrapper.tsx # Wrapper: ActivityPanel
│   ├── LogPanelWrapper.tsx      # Wrapper: LogPanel
│   ├── NavigationPanel.tsx      # Wrapper: StacFileTree
│   └── ChartPanelWrapper.tsx    # Wrapper: ChartRenderer
└── index.ts                     # Updated barrel exports

apps/web-shell/src/
├── App.tsx                      # Updated: analysis view uses PanelWorkspace
├── App.css                      # Updated: remove fixed layout CSS
├── main.tsx                     # Updated: import GoldenLayout CSS
└── hooks/
    └── useSessionStore.ts       # Updated: shared-zustand sync

shared/components/e2e/
└── PanelWorkspace.spec.ts       # Playwright E2E tests

shared/components/src/__tests__/
├── panelRegistry.test.ts        # Unit tests for registry
└── layoutPersistence.test.ts    # Unit tests for persistence
```

**Structure Decision**: This feature modifies the existing monorepo structure. New code lives in `shared/components/src/PanelWorkspace/` (reusable layout infrastructure) and `shared/components/src/panels/` (panel wrappers). The web-shell app (`apps/web-shell/`) is updated to consume the new components. No new packages or projects are created.

## Media Components

*GoldenLayout panels are a significant visual change to the web-shell analysis workspace.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| PanelWorkspace | `shared/components/src/PanelWorkspace/PanelWorkspace.stories.tsx` | `panel-workspace.js` | Shows the 5-panel default layout with resize and drag capabilities |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (to be created during implementation)
- [ ] Components render standalone (no app context required) — needs verification; panel content may need mock providers
- [ ] Reasonable bundle size expected (< 500KB) — GoldenLayout + 5 panel wrappers should be well under limit

**Storybook Link**: `https://debrief.github.io/debrief-future/components-storybook/?path=/story/layout-panelworkspace--default`

*Note: Storybook story will be created during implementation. Bundleability to be confirmed at that time. If panel content components require too much application context to render standalone, this entry should be revised to "None — requires full app context".*

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `PanelWorkspace.stories.tsx` | Default layout rendering, panel visibility | dark, vscode | Panel border drag, tab click, reset layout |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (resize borders, tab headers)
- [x] Accessibility attributes present (data-testid on panels, aria-labels on tabs)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/PanelWorkspace.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=layout-panelworkspace--default&globals=theme:dark
/iframe.html?id=layout-panelworkspace--default&globals=theme:vscode
```

## Complexity Tracking

No constitution violations — this section is intentionally empty.
