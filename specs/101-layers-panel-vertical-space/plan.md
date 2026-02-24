# Implementation Plan: Layers Panel Vertical Space Fix

**Branch**: `101-layers-panel-vertical-space` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/101-layers-panel-vertical-space/spec.md`

## Summary

The Layers section in the Activity Panel does not expand to fill available vertical space when sibling sections (Time Controller, Tools) are collapsed. The root cause is that the `.section-content` wrapper is not a flex container, so the `FeatureList` component (which defaults to a fixed 300px height via inline style) cannot participate in flex layout to claim remaining space. The fix requires two CSS rule changes in `ActivityPanel.css`: making section-content a flex column and allowing FeatureList to grow within it.

## Technical Context

**Language/Version**: CSS3 (within TypeScript 5.x React component library)
**Primary Dependencies**: React 18.x, @tanstack/react-virtual (FeatureList virtualisation)
**Storage**: N/A
**Testing**: Vitest (unit), Storybook (visual), Playwright E2E
**Target Platform**: VS Code webview (Chromium), browser
**Project Type**: Component library (`shared/components`)
**Performance Goals**: No layout reflow on collapse/expand transitions; 60fps scroll in expanded FeatureList
**Constraints**: CSS-only fix — no changes to component logic, state management, or layout calculation code (FR-005)
**Scale/Scope**: 1 CSS file, 2 rule changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Defence-Grade Reliability | PASS | Offline-only CSS fix, no network dependencies |
| II. Schema Integrity | N/A | No schema changes |
| III. Data Sovereignty | N/A | No data changes |
| IV. Architectural Boundaries | PASS | Fix is in shared component CSS; services untouched |
| V. Extensibility | PASS | No vendor lock-in; standard CSS flexbox |
| VI. Testing | PASS | Existing Storybook stories cover all collapse states; E2E evidence exists |
| VII. Test-Driven AI | PASS | Acceptance criteria defined in spec (SC-001 through SC-004) |
| VIII. Documentation | PASS | Spec and plan created before implementation |
| IX. Dependencies | PASS | No new dependencies |
| X. Security | N/A | No security implications |
| XI. Internationalisation | N/A | No user-facing strings |
| XII. Community Engagement | N/A | Bug fix, not new feature |
| XIII. Contribution Standards | PASS | PR review required; CI must pass |
| XIV. Pre-Release Freedom | PASS | Pre-release, no backwards compat concern |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/101-layers-panel-vertical-space/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Root cause analysis and CSS fix strategy
├── data-model.md        # N/A (CSS-only fix)
├── quickstart.md        # Verification instructions
├── contracts/           # N/A (no API changes)
│   └── README.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
shared/components/src/ActivityPanel/
├── ActivityPanel.tsx            # Component (NO changes)
├── ActivityPanel.css            # Styles (2 rule changes)
├── ActivityPanel.stories.tsx    # Storybook stories (NO changes - existing stories verify fix)
└── types.ts                     # Types (NO changes)

shared/components/src/FeatureList/
├── FeatureList.tsx              # Component (NO changes)
└── FeatureList.css              # Styles (NO changes)
```

**Structure Decision**: Existing component library structure. Only `ActivityPanel.css` is modified.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ActivityPanel | `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx` | `activity-panel.js` | Shows correct flex layout in all collapse states |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-activitypanel`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ActivityPanel.stories.tsx` — ToolsCollapsed | Layers fills vertical space | dark, vscode | collapse Tools, verify no gap |
| `ActivityPanel.stories.tsx` — AllCollapsed | Headers only, no orphan space | dark | collapse all, verify layout |
| `ActivityPanel.stories.tsx` — Default | 50/50 split intact | dark | verify resize handle works |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ActivityPanel.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-activitypanel--tools-collapsed&globals=theme:dark
/iframe.html?id=components-activitypanel--tools-collapsed&globals=theme:vscode
/iframe.html?id=components-activitypanel--all-collapsed&globals=theme:dark
/iframe.html?id=components-activitypanel--default&globals=theme:dark
```

## VS Code Webview E2E Testing

None — no extension workflow changes. The CSS fix applies automatically via the shared component library. Existing webview E2E tests (`tests/e2e/`) will exercise the fix when they render the Activity Panel.

## Complexity Tracking

No constitution violations to justify.
