# Implementation Plan: Unified Debrief Activity Panel

**Branch**: `047-unified-activity-panel` | **Date**: 2026-02-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/047-unified-activity-panel/spec.md`

## Summary

Consolidate the three separate activity sidebar panels (Time Controller webview, Tools tree view, Layers tree view) into a single unified webview panel. Each sub-component will be a shared React component in `@debrief/components`, composed into one `ActivityPanel` container with collapsible sections. The Tools and Layers panels must be converted from native VS Code TreeDataProviders to React components — the Tools panel will be built as a new shared component, while Layers will leverage the existing `FeatureList` + `LayersToolbar` components. All components use `vscrui` for native VS Code styling.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension + shared components), React 18+
**Primary Dependencies**: vscrui ^0.1.0, @debrief/components (shared), @debrief/session-state (Zustand), VS Code extension API (host only)
**Storage**: N/A (in-memory session state only)
**Testing**: Vitest (shared components), Storybook (visual), VS Code extension integration tests
**Target Platform**: VS Code extension webview (sidebar), with standalone renderability for Electron/Jupyter
**Project Type**: Web (shared component library + VS Code extension integration)
**Performance Goals**: 60 fps scrolling, <100ms section collapse/expand transitions, 20% less vertical space than current 3-panel layout
**Constraints**: Offline-capable (Constitution Art. I), no VS Code API dependencies in shared components (Constitution Art. IV), vscrui for all UI elements (spec #031)
**Scale/Scope**: 3 sub-components (TimeController, ToolsList, LayersPanel) + 1 container (ActivityPanel), ~5 new/modified files in shared/components, ~3 new/modified files in apps/vscode

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | ✅ PASS | All components render locally, no network calls |
| I.3 | No silent failures | ✅ PASS | FR-006 requires error isolation per section |
| II. Schema Integrity | Schema-driven data | ✅ PASS | No new data schemas — consumes existing session state |
| III. Data Sovereignty | Provenance always | N/A | UI-only feature, no data transformation |
| IV. Architectural Boundaries | Services never touch UI | ✅ PASS | Sub-components are pure React, VS Code integration is a thin wrapper |
| IV.2 | Frontends never persist | ✅ PASS | Collapse state is session-scoped only (FR-007) |
| V. Extensibility | Fail-safe loading | ✅ PASS | FR-006: error in one sub-component doesn't crash others |
| VI. Testing | Services require unit tests | ✅ PASS | Component tests via Vitest + Storybook stories |
| VII. Test-Driven AI | Tests before implementation | ✅ PASS | Acceptance scenarios defined in spec |
| VIII. Documentation | Specs before code | ✅ PASS | This plan + spec.md |
| IX. Dependencies | Minimal dependencies | ✅ PASS | Uses existing vscrui + React, no new deps |
| XI. Internationalisation | I18N from the start | ⚠️ NOTE | Section header strings must be externalisable |
| XII. Community Engagement | Public by default | ✅ PASS | Planning post included in media phase |

**Gate Result**: PASS — no violations. I18N note tracked as implementation detail.

## Project Structure

### Documentation (this feature)

```text
specs/047-unified-activity-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/components/src/
├── ActivityPanel/
│   ├── ActivityPanel.tsx        # Unified container with collapsible sections
│   ├── ActivityPanel.test.tsx   # Component tests
│   ├── CollapsibleSection.tsx   # Reusable collapsible section wrapper
│   └── index.ts
├── ToolsList/
│   ├── ToolsList.tsx            # New: React version of tools tree
│   ├── ToolsList.test.tsx
│   └── index.ts
├── TimeController/              # Existing — no changes expected
├── FeatureList/                 # Existing — used as Layers sub-component
├── LayersToolbar/               # Existing — used with FeatureList
└── index.ts                     # Updated exports

apps/vscode/src/
├── views/
│   ├── activityPanelView.ts     # New: WebviewViewProvider for unified panel
│   └── timeRangeView.ts         # Deprecated (replaced by unified panel)
├── providers/
│   ├── toolsTreeProvider.ts     # Deprecated (replaced by ToolsList component)
│   └── layersTreeProvider.ts    # Deprecated (replaced by FeatureList)
├── webview/web/
│   └── activityPanel.tsx        # New: React entry point for unified webview
└── package.json                 # Updated: single view replaces three
```

**Structure Decision**: Shared components in `shared/components/src/` with VS Code integration in `apps/vscode/src/views/`. The ActivityPanel container lives in shared/components so it can be reused across frontends.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ActivityPanel | `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx` | `activity-panel.js` | Demonstrates unified 3-section panel with collapse |
| ToolsList | `shared/components/src/ToolsList/ToolsList.stories.tsx` | `tools-list.js` | Shows context-sensitive tool display |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (will be created)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/activitypanel--default`

## Complexity Tracking

No constitution violations to justify.
