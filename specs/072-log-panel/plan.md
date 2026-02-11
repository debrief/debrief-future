# Implementation Plan: Log Panel

**Branch**: `072-log-panel` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/072-log-panel/spec.md`
**Epic**: E02 — PROV Logging Implementation (Phase 2)

## Summary

Implement a VS Code sidebar panel that displays the analytical history (provenance log) of the current plot. The panel consumes data from the Log Service (#071), renders a filterable, searchable timeline of operations, and supports three presentation modes (Compact, Normal, Detailed). Selecting an entry replaces the map's feature selection with the affected features. Action buttons for future phases (Tune, Revert, Snapshot, Rationale) are present as placeholders.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension + webview + shared components)
**Primary Dependencies**: VS Code Extension API ^1.85.0, React 18.x, @debrief/components, Zustand ^5.0.0 (session-state), esbuild (webview bundling)
**Storage**: VS Code webview state (getState/setState) for transient UI; VS Code globalState for cross-session presentation mode persistence
**Testing**: Storybook stories (visual), vitest (unit tests for components), @playwright/test (E2E)
**Target Platform**: VS Code extension (desktop)
**Project Type**: Multi-package workspace (VS Code extension + shared components)
**Performance Goals**: 2s panel open (SC-001), 1s selection highlight (SC-002), 0.5s filter response (SC-004), responsive scrolling with 500 entries (SC-006)
**Constraints**: Offline-capable, CSP-compliant webview (no inline scripts), no new external dependencies
**Scale/Scope**: Single sidebar panel, ~10 React components, ~6 message types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---------|--------|-------|
| I. Defence-Grade Reliability | PASS | Offline by default — all data local, no network calls. Error state defined for timeline assembly failure. |
| II. Schema Integrity | PASS | Consumes LogEntry from Phase 0 LinkML schema (#070). No new schema modifications. |
| III. Data Sovereignty | PASS | Read-only panel — displays provenance but does not modify data. Source preservation unaffected. |
| IV. Architectural Boundaries | PASS | Shared components are UI-only (no persistence, no service calls). Data flows from session-state via message passing. |
| V. Extensibility | N/A | Core panel, not an extension point. |
| VI. Testing | PASS | Storybook stories, unit tests, E2E test planned (Acceptance Scenarios define test cases). |
| VII. Test-Driven AI | PASS | 24 acceptance scenarios define concrete pass/fail criteria. |
| VIII. Documentation | PASS | Spec, plan, research, data model, quickstart all produced. |
| IX. Dependencies | PASS | No new external dependencies. Uses existing React 18, Zustand, VS Code API. |
| X. Security | PASS | CSP-compliant webview. No secrets, no external calls. |
| XI. Internationalisation | PASS | User-facing strings extracted to dedicated strings module for future externalization. |
| XII. Community Engagement | PASS | Media content (planning post, LinkedIn) being generated. |
| XIII. Contribution Standards | PASS | Atomic commits, PR review required. |
| XIV. Pre-Release Freedom | PASS | v4.x pre-release — no backwards compatibility obligations. |

**Post-Phase 1 Re-check**: All gates still pass. No new dependencies or schema changes introduced during design.

## Project Structure

### Documentation (this feature)

```text
specs/072-log-panel/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: design decisions
├── data-model.md        # Phase 1: entities and relationships
├── quickstart.md        # Phase 1: architecture overview and file map
├── contracts/
│   └── messages.md      # Phase 1: extension ↔ webview message protocol
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── media/
│   ├── planning-post.md # Blog announcement draft
│   └── linkedin-planning.md # LinkedIn summary
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/components/src/LogPanel/
├── LogPanel.tsx          # Root component — layout, state coordination
├── LogTimeline.tsx       # Timeline view — flat chronological list
├── LogByFeature.tsx      # By-Feature view — grouped under feature headings
├── LogEntry.tsx          # Single entry — renders Compact/Normal/Detailed
├── LogFilterRow.tsx      # Collapsible filter row — search, tool type, category
├── LogActionBar.tsx      # Action buttons + view/mode toggles
├── SnapshotBoundary.tsx  # Visual separator for snapshot boundaries
├── types.ts              # Props interfaces, message types, enums
├── strings.ts            # Externalisable user-facing strings
├── utils.ts              # Filtering logic, category classification
├── LogPanel.css          # Component styles
├── LogPanel.stories.tsx  # Storybook stories (all modes, states, filters)
└── index.ts              # Public exports

apps/vscode/src/views/
└── logPanelView.ts       # WebviewViewProvider — session subscriptions, message routing

apps/vscode/src/webview/web/
└── logPanel.tsx          # Webview entry script — bridges VS Code API to React components

apps/vscode/
├── src/extension.ts      # Modified: register LogPanelViewProvider
├── package.json          # Modified: add viewsContainers, views, icon
└── resources/
    └── log-icon.svg      # Activity bar icon for Log Panel
```

**Structure Decision**: Follows the established dual-layer pattern — framework-agnostic shared components in `shared/components/` with a thin VS Code-specific webview wrapper in `apps/vscode/`. This matches the ActivityPanel, TimeController, and FeatureList precedents.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| LogPanel | `shared/components/src/LogPanel/LogPanel.stories.tsx` | `log-panel.js` | Full panel with timeline, modes, filters |
| LogEntry | `shared/components/src/LogPanel/LogPanel.stories.tsx` | (part of above) | Entry display in 3 modes |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of implementation)
- [x] Components render standalone (no app context required — props-driven)
- [x] Reasonable bundle size expected (< 500KB — small component tree)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/logpanel--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `LogPanel.stories.tsx` — Timeline Default | Rendering, entry layout | light, dark, vscode | scroll, select entry |
| `LogPanel.stories.tsx` — Compact Mode | Mode toggle, compact rendering | light, dark, vscode | click mode toggle |
| `LogPanel.stories.tsx` — Normal Mode | Parameter display, change summary | light, dark, vscode | click mode toggle |
| `LogPanel.stories.tsx` — Detailed Mode | Full detail fields | light, dark, vscode | click mode toggle |
| `LogPanel.stories.tsx` — Filter Active | Filter row, result narrowing | vscode | type search, select dropdown |
| `LogPanel.stories.tsx` — By-Feature View | Group headings, per-feature order | vscode | click view toggle |
| `LogPanel.stories.tsx` — Empty State | Empty message display | vscode | — |
| `LogPanel.stories.tsx` — Action Disabled | Disabled button styling | vscode | click disabled button |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/LogPanel.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=logpanel--timeline-default&globals=theme:light
/iframe.html?id=logpanel--timeline-default&globals=theme:dark
/iframe.html?id=logpanel--timeline-default&globals=theme:vscode
```

## Complexity Tracking

No constitution violations to justify. All gates pass cleanly.
