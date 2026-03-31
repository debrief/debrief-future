# Implementation Plan: Result View Auto-Refresh on Logical ID Change

**Branch**: `001-result-auto-refresh` | **Date**: 2026-02-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-result-auto-refresh/spec.md`

## Summary

Implement automatic refresh of result views (charts, images) when their bound logical result ID's underlying data changes. The auto-refresh controller subscribes to the existing Result ID Registry (#087) change events, debounces rapid updates, defers refresh for non-visible views, and preserves Vega-Lite viewport state (zoom/pan) across re-renders. A pause/resume toggle gives analysts control over when updates occur.

The controller lives in `services/session-state/src/refresh/` following the thick-services pattern, consumed by `shared/components/` via a `useAutoRefresh` React hook. The existing ChartRenderer (#085) is extended with viewport capture/restore via Vega's signal API.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `@debrief/session-state` (ResultIdRegistry, LogService), `@debrief/components` (ChartRenderer, ChartPanelWrapper), `vega-embed` 6.x (viewport signal access), React 18.x
**Storage**: Local filesystem (STAC assets) — no database
**Testing**: Vitest (unit), Playwright (E2E via Storybook)
**Target Platform**: VS Code Extension (1.85+) webview, browser (web-shell)
**Project Type**: Multi-package workspace (services + shared components + VS Code extension)
**Performance Goals**: Refresh within 2 seconds of change detection; single render for burst updates
**Constraints**: Fully offline (no network calls), debounce 300ms trailing edge, zero re-renders for unaffected views
**Scale/Scope**: Typically 1-5 simultaneous result views per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All core functionality works without network | PASS | Auto-refresh operates on local files only (FR-011) |
| I.3 No silent failures | Operations succeed fully or fail explicitly | PASS | Error states with warning banners (FR-009, FR-010) |
| I.4 Reproducibility | Same inputs → same results | PASS | Refresh displays the deterministic output of tool execution |
| III.1 Provenance always | Every transformation records lineage | PASS | FR-012: refresh events logged via LogService |
| III.4 Data stays local | No telemetry or external calls | PASS | Zero network dependency (SC-004) |
| IV.1 Services never touch UI | Python services return data only | PASS | Controller is TypeScript service layer; UI in React hooks |
| IV.2 Frontends never persist | All data writes through services | PASS | No data writes — read-only refresh of existing results |
| VI.2 Services require unit tests | No service code without tests | PASS | Unit tests for controller, hook, and viewport APIs |
| VII.1 Tests before implementation | Define expected behaviour first | PASS | Contract types define API; tests written against contracts |
| VIII.1 Specs before code | Written specification exists | PASS | spec.md complete |
| IX.1 Minimal dependencies | Prefer standard library | PASS | No new dependencies — uses existing vega-embed signal API |
| XI.1 I18N from the start | User-facing strings externalisable | PASS | Status messages (loading, error, paused) are externalisable strings |

**Post-design re-check**: All gates still pass. No new dependencies introduced. Controller is a pure TypeScript module with no UI coupling.

## Project Structure

### Documentation (this feature)

```text
specs/001-result-auto-refresh/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: technical research decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: developer onboarding
├── contracts/           # Phase 1: TypeScript API contracts
│   ├── auto-refresh-controller.ts
│   ├── chart-renderer-viewport.ts
│   └── use-auto-refresh.ts
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
services/session-state/
├── src/
│   ├── refresh/                      # NEW — Auto-refresh coordination
│   │   ├── controller.ts             # AutoRefreshController implementation
│   │   ├── types.ts                  # AutoRefreshState, ViewportState, etc.
│   │   └── index.ts                  # Public API exports
│   ├── registry/                     # EXISTING — Result ID Registry (#087)
│   │   ├── resultIdRegistry.ts
│   │   └── types.ts
│   └── log/                          # EXISTING — LogService (provenance)
└── tests/
    └── refresh/                      # NEW — Controller unit tests
        └── controller.test.ts

shared/components/
├── src/
│   ├── ChartRenderer/
│   │   ├── ChartRenderer.tsx         # MODIFIED — add useImperativeHandle for viewport
│   │   └── ChartRenderer.stories.tsx # MODIFIED — add auto-refresh stories
│   ├── panels/
│   │   └── ChartPanelWrapper.tsx     # MODIFIED — integrate useAutoRefresh hook
│   └── hooks/
│       └── useAutoRefresh.ts         # NEW — React hook wrapping controller
└── tests/
    ├── hooks/
    │   └── useAutoRefresh.test.ts    # NEW — Hook unit tests
    └── ChartRenderer/
        └── viewport.test.ts          # NEW — Viewport capture/restore tests

apps/vscode/
└── src/
    └── extension.ts                  # MODIFIED — wire controller to registry
```

**Structure Decision**: Follows the existing multi-package workspace pattern. The auto-refresh controller is a new module in `services/session-state/` (service layer), consumed by `shared/components/` (UI layer) via a React hook. The VS Code extension wires the pieces together at activation. No new packages introduced.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ChartRenderer (auto-refresh) | `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx` | `chart-auto-refresh.js` | Demonstrates live auto-refresh with viewport preservation |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [ ] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/chartrenderer--auto-refresh`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ChartRenderer.stories.tsx` (auto-refresh story) | Rendering, refresh animation, viewport preservation | light, dark, vscode | Data update trigger, pause/resume toggle, zoom then refresh |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ChartAutoRefresh.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=chartrenderer--auto-refresh&globals=theme:light
/iframe.html?id=chartrenderer--auto-refresh&globals=theme:dark
/iframe.html?id=chartrenderer--auto-refresh&globals=theme:vscode
```

## Complexity Tracking

No constitution violations to justify — all gates pass.
