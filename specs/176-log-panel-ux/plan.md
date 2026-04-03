# Implementation Plan: Analysis Log Panel — Rich Card UX

**Branch**: `176-log-panel-ux` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/176-log-panel-ux/spec.md`

## Summary

Transform the Log Panel's read-only card face from plain-text parameter rendering to rich, analyst-readable cards with tool category icons, type-aware parameter chips, track badges, and a unified 4-tab view mode. This is a UI-only change within the existing `@debrief/components` LogPanel component — no PROV data model or service changes required.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x components, VS Code extension webview)
**Primary Dependencies**: React 18.x, `@debrief/components` (LogPanel), `@debrief/schemas` (ParameterValue, InputFeatureState), VS Code Extension API ^1.85.0
**Storage**: N/A (read-only UI — no storage changes)
**Testing**: vitest (unit + component), Storybook (visual dev), Playwright (E2E)
**Target Platform**: VS Code extension webview (primary), Electron loader (future)
**Project Type**: Monorepo — shared components + VS Code extension
**Performance Goals**: 100+ log entries render without scroll lag; tab switching < 100ms
**Constraints**: VS Code light theme conformant; no colour-only semantic encoding; all strings externalisable (i18n)
**Scale/Scope**: ~10 files modified, ~5 new files, ~1500 LOC changed/added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---------|--------|-------|
| I.1 Offline by default | PASS | Pure UI rendering — no network dependency |
| I.3 No silent failures | PASS | Empty/error states explicitly specified (SRD §8) |
| II.1 Schema single source | PASS | No schema changes; uses existing generated types |
| III.1 Provenance always | PASS | Panel is read-only; does not modify provenance |
| III.3 Audit trail immutable | PASS | No write path in this component |
| IV.1 Services never touch UI | PASS | Chip type inference and rendering is purely frontend |
| IV.2 Frontends never persist | PASS | All writes routed through existing MCP tools (out of scope) |
| VI.2 Services require unit tests | PASS | No service changes; component tests added |
| VIII.1 Specs before code | PASS | SRD + spec + plan complete |
| IX.1 Minimal dependencies | PASS | No new external dependencies |
| X.1 No secrets in code | PASS | No credentials involved |
| XI.1 I18N from start | PASS | All strings in strings.ts (existing pattern) |
| XV.1 Explicit types | PASS | All new types fully typed, no `any` |

**Post-design re-check**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/176-log-panel-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output — 9 research decisions
├── data-model.md        # Phase 1 output — new UI types
├── quickstart.md        # Phase 1 output — developer guide
├── contracts/           # Phase 1 output — TypeScript type contracts
│   └── log-panel-types.ts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/src/LogPanel/
├── types.ts                  # MODIFY: Add ToolCategory, ParamType; update ViewMode
├── LogEntry.tsx              # MODIFY: Restructure front face to 3-row card anatomy
├── LogPanel.tsx              # MODIFY: Use unified ViewMode (4 tabs)
├── LogActionBar.tsx          # MODIFY: 4-tab bar with ARIA tablist pattern
├── LogTimeline.tsx           # MODIFY: Pass new props
├── LogByFeature.tsx          # MODIFY: Pass new props
├── LogPanel.css              # MODIFY: New styles for icons, chips, badges
├── LogPanel.stories.tsx      # MODIFY: Update stories for rich cards
├── utils.ts                  # MODIFY: Add inferParamType, update formatDuration/Timestamp
├── strings.ts                # MODIFY: Add new i18n strings
├── ToolCategoryIcon.tsx      # NEW: 18×18px coloured square sub-component
├── ParameterChip.tsx         # NEW: Type-aware chip with icon prefix
├── TrackBadge.tsx            # NEW: Platform name pill badge
├── toolCategories.ts         # NEW: Static category config map
└── paramTypeInference.ts     # NEW: inferParamType heuristic

shared/components/src/LogPanel/__tests__/
├── paramTypeInference.test.ts  # NEW: Unit tests for type inference
├── formatDuration.test.ts      # NEW: Unit tests for duration formatting
└── ParameterChip.test.tsx      # NEW: Component tests for chip rendering

apps/vscode/src/views/logPanelView.ts      # MODIFY: Remove PresentationMode, use ViewMode
apps/vscode/src/webview/web/logPanel.tsx    # MODIFY: Remove PresentationMode state
```

**Structure Decision**: All changes are within the existing `shared/components/src/LogPanel/` module (shared components) and `apps/vscode/` (extension integration). No new packages or workspace projects. This follows the established pattern of the LogPanel feature family (072, 076, 113).

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|-------------|-------------|---------|
| LogPanel (rich cards) | `shared/components/src/LogPanel/LogPanel.stories.tsx` | `log-panel.js` | Demonstrates rich card anatomy with all 5 tool categories, parameter chip types, and view modes |
| ParameterChip | `shared/components/src/LogPanel/ParameterChip.stories.tsx` | `parameter-chip.js` | Shows all chip type variants (colour, number, boolean, range, enum) |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/logpanel--rich-card`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `LogPanel.stories.tsx` - Rich Card | Card anatomy rendering, chip types, category icons | light, vscode | click card selection, tab switching |
| `LogPanel.stories.tsx` - Empty State | Empty message display | light, vscode | none |
| `LogPanel.stories.tsx` - Disabled Entry | Opacity, badge, interactivity | light, vscode | click disabled card |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/LogPanel.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=logpanel--rich-card&globals=theme:light
/iframe.html?id=logpanel--rich-card&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| View log entries | Log Panel | `.log-panel__entry`, `.log-panel__chip` | open plot, verify cards render with icons and chips |
| Switch view tabs | Log Panel | `[role="tab"]`, `[role="tabpanel"]` | click each of 4 tabs, verify layout changes |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors
- [x] Screenshots captured for evidence

**Test File Location**: `tests/e2e/test-log-panel.spec.ts` (update existing)

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh`
- Content injection via `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

## Complexity Tracking

No constitution violations — no entries needed.
