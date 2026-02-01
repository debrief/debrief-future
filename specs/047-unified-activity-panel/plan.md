# Implementation Plan: Unified Debrief Activity Panel

**Branch**: `047-unified-activity-panel` | **Date**: 2026-02-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/047-unified-activity-panel/spec.md`

## Summary

Consolidate the three separate activity sidebar views (Time Controller webview, Tools TreeView, Layers TreeView) into a single React webview panel using vscrui `Pane` components for collapsible sections. Tools and Layers are converted from native VS Code TreeViews to shared React components. All sub-components are independently importable from `@debrief/components` and verified in Storybook across light, dark, and VS Code theme variants.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension + shared components)
**Primary Dependencies**: React 18+, vscrui ^0.1.0, @debrief/components (shared), VS Code extension API
**Storage**: Session state via `vscode.setState()` / `vscode.getState()` (collapse state only)
**Testing**: Vitest (components), VS Code extension test runner, Storybook visual verification
**Target Platform**: VS Code extension webview (desktop)
**Project Type**: Monorepo — shared/components + apps/vscode
**Performance Goals**: Panel renders within 200ms of sidebar open; collapse/expand transitions under 50ms
**Constraints**: Offline-only, no network requests; must use `--debrief-*` tokens exclusively; Codicon icons via vscrui
**Scale/Scope**: 3 sub-components, 1 composed panel, 1 webview provider, ~8 new files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status |
|---------|------|--------|
| I. Defence-Grade Reliability | Offline by default, no silent failures | PASS — no network deps, error boundaries per section |
| II. Schema Integrity | Schema-derived data structures | PASS — LayerItem/ToolMatch from existing schemas |
| III. Data Sovereignty | Provenance, source preservation | N/A — UI-only feature, no data transformation |
| IV. Architectural Boundaries | Services never touch UI; frontends never persist | PASS — components in shared/components, state via services |
| V. Extensibility | Fail-safe loading, no vendor lock-in | PASS — error boundary per sub-component; vscrui is OSS |
| VI. Testing | Unit tests, schema tests, CI | PASS — Storybook stories + unit tests planned |
| VII. Test-Driven AI | Tests before implementation | PASS — stories and test specs defined in quickstart |
| VIII. Documentation | Specs before code | PASS — spec.md complete with clarifications |
| IX. Dependencies | Minimal, pinned, no lock-in | PASS — vscrui already in project; no new deps |
| X. Security | No secrets in code | PASS — no credentials involved |
| XI. Internationalisation | Externalisable strings | NOTE — section labels should use i18n keys (deferred to implementation) |
| XII. Community Engagement | Public by default | PASS — planning post created |
| XIII. Contribution Standards | Atomic commits, PR review | PASS — standard workflow |

## Project Structure

### Documentation (this feature)

```text
specs/047-unified-activity-panel/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── webview-messages.ts
├── checklists/
│   └── requirements.md
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/components/src/
├── ActivityPanel/
│   ├── ActivityPanel.tsx          # Composed panel (3 Pane sections)
│   ├── ActivityPanel.stories.tsx  # Storybook stories
│   └── ActivityPanel.css          # Layout styles using --debrief-* tokens
├── ToolsPanel/
│   ├── ToolsPanel.tsx             # React replacement for ToolsTreeProvider
│   ├── ToolsPanel.stories.tsx
│   └── ToolsPanel.css
├── LayersPanel/
│   ├── LayersPanel.tsx            # React replacement for LayersTreeProvider
│   ├── LayersPanel.stories.tsx
│   └── LayersPanel.css
└── index.ts                       # Updated exports

apps/vscode/src/
├── views/
│   └── activityPanelView.ts       # New unified WebviewViewProvider
├── webview/web/
│   └── activityPanel.tsx           # React bootstrap entry point
└── extension.ts                    # Updated registrations
```

**Structure Decision**: Extends existing monorepo layout. New shared components in `shared/components/src/`, new view provider in `apps/vscode/src/views/`. No new packages or workspaces needed.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ActivityPanel | `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx` | `activity-panel.js` | Demonstrates unified 3-section panel with collapse |
| ToolsPanel | `shared/components/src/ToolsPanel/ToolsPanel.stories.tsx` | `tools-panel.js` | Shows context-sensitive tool list |
| LayersPanel | `shared/components/src/LayersPanel/LayersPanel.stories.tsx` | `layers-panel.js` | Shows layer visibility toggles |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of implementation)
- [x] Components render standalone (no app context required — ThemeProvider only)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/activitypanel--default`

## Complexity Tracking

No constitution violations to justify.
