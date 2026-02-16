# Implementation Plan: Results Bottom Panel with Tabbed Layout

**Branch**: `095-results-bottom-panel` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/095-results-bottom-panel/spec.md`

## Summary

Add a VS Code bottom panel that displays tool result artifacts in a tabbed layout. Each result (chart, image, or file summary) opens in its own tab. Three entry points trigger tab creation: auto-open on tool completion, STAC browser selection, and attachments context menu. Tabs watch their underlying files and re-render on change to support iterative tuning workflows. The panel hosts the existing `ChartRenderer` component (#085) for dataset-type results, renders images inline, and shows fallback summaries for other file types.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension + webview + shared components)
**Primary Dependencies**: VS Code Extension API ^1.85.0, React 18.x, `@debrief/components` (ChartRenderer), Zustand ^5.0.0 (`@debrief/session-state`), esbuild (webview bundling)
**Storage**: Local filesystem STAC catalogs (read-only for this feature); result artifacts read from `assets/` sub-folders of STAC items
**Testing**: Vitest (unit tests for shared components), Playwright (E2E for Storybook stories), manual integration testing in VS Code
**Target Platform**: VS Code ^1.85.0 on Windows, macOS, Linux
**Project Type**: Multi-workspace (VS Code extension + shared component library)
**Performance Goals**: Panel open + tab creation < 1 second; tab switching instant (no re-render); file watcher update < 2 seconds; 20+ simultaneous tabs without degradation
**Constraints**: Offline-only (no network requests), responsive to panel resize, chart sizing above 300px width
**Scale/Scope**: Single VS Code extension feature; touches ~10 files across `apps/vscode/` and `shared/components/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I.1 Offline by default | No network requests | PASS | All rendering is local; Vega-Lite bundles with the extension |
| I.3 No silent failures | Errors shown explicitly | PASS | Error state in tab shows renderer error message; file watcher failures surface in tab |
| II.1 Schema integrity | Consumes DatasetEnvelope types | PASS | Uses existing `@debrief/components` types; no new schema definitions |
| III.1 Provenance | Read-only display | PASS | Panel only reads result artifacts; does not modify or create data |
| IV.1 Services never touch UI | Display in frontend only | PASS | Panel is entirely a frontend concern; reads files directly, no service layer |
| IV.2 Frontends never persist | No writes | PASS | Panel is read-only; tab state is session-scoped in memory |
| VI.2 Services require unit tests | Component unit tests | PASS | ResultsPanel React component + ResultTabView tested with Vitest |
| VIII.1 Specs before code | Specification exists | PASS | spec.md completed and clarified |
| IX.1 Minimal dependencies | No new runtime dependencies | PASS | Reuses existing ChartRenderer (#085), Vega-Lite, React; only new code is panel plumbing |
| XI.1 I18N from the start | User-facing strings externalisable | PASS | Empty state message and panel title are string constants; extractable for i18n |
| XIV Pre-release freedom | Breaking changes permitted | PASS | Pre-v4.0.0; API surface is internal to extension |

**Gate Result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/095-results-bottom-panel/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: entity model
├── quickstart.md        # Phase 1: developer onboarding
├── contracts/           # Phase 1: message protocol
│   └── messages.md      # Extension ↔ webview message types
└── tasks.md             # Phase 2: implementation checklist (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/vscode/
├── package.json                                   # [MODIFY] Add view container, view, command
├── esbuild.config.js                              # [MODIFY] Add resultsPanel webview entry point
├── src/
│   ├── extension.ts                               # [MODIFY] Register ResultsPanelViewProvider
│   ├── views/
│   │   └── resultsPanelView.ts                    # [NEW] WebviewViewProvider for results panel
│   ├── webview/
│   │   ├── messages.ts                            # [MODIFY] Add results panel message types
│   │   └── web/
│   │       └── resultsPanel.tsx                   # [NEW] React webview entry point
│   └── commands/
│       └── index.ts                               # [MODIFY] Redirect openResultArtifact to panel
│
shared/components/
├── src/
│   ├── ResultsPanel/                              # [NEW] Shared React component
│   │   ├── index.ts                               # Public exports
│   │   ├── ResultsPanel.tsx                       # Container: tab bar + content area
│   │   ├── ResultsPanel.test.tsx                  # Unit tests
│   │   ├── ResultsPanel.stories.tsx               # Storybook stories
│   │   ├── ResultTabBar.tsx                       # Tab strip with close buttons
│   │   ├── ResultTabContent.tsx                   # Content router (chart/image/fallback)
│   │   ├── ImageViewer.tsx                        # Inline image display
│   │   ├── FallbackViewer.tsx                     # File summary for unsupported types
│   │   └── types.ts                              # ResultTab, TabIdentity, ResultArtifactType
│   └── index.ts                                   # [MODIFY] Export ResultsPanel
│
└── e2e/
    └── ResultsPanel.spec.ts                       # [NEW] Playwright E2E tests
```

**Structure Decision**: Multi-workspace pattern consistent with existing features. The shared component (`ResultsPanel`) lives in `@debrief/components` for reuse by web-shell. The VS Code extension hosts it via `WebviewViewProvider` in a bottom panel view container. No new packages or workspaces — additions are within existing boundaries.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ResultsPanel | `shared/components/src/ResultsPanel/ResultsPanel.stories.tsx` | `results-panel.js` | Demonstrates tabbed result viewing with chart, image, and fallback tabs |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of implementation)
- [x] Components render standalone (no app context required — tab data passed as props)
- [x] Reasonable bundle size expected (< 500KB — chart renderer already bundled separately)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/results-resultspanel`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ResultsPanel.stories.tsx` — MultipleTabs | Tab rendering, switching, close | light, dark, vscode | click tab, click close, hover tooltip |
| `ResultsPanel.stories.tsx` — EmptyState | Empty message display | light, dark, vscode | none |
| `ResultsPanel.stories.tsx` — ImageTab | Image display, scaling | light, dark, vscode | none |
| `ResultsPanel.stories.tsx` — ErrorTab | Error state in chart tab | light, dark, vscode | none |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ResultsPanel.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=results-resultspanel--multiple-tabs&globals=theme:light
/iframe.html?id=results-resultspanel--multiple-tabs&globals=theme:dark
/iframe.html?id=results-resultspanel--multiple-tabs&globals=theme:vscode
```

## Complexity Tracking

No constitution violations to justify.
