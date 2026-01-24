# Implementation Plan: Context-Sensitive Tool Offering

**Branch**: `027-context-tool-offering` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-context-tool-offering/spec.md`

## Summary

Implement a context-sensitive tool offering system that matches analysis tools to user selections. The core ToolMatchService library provides selection-based filtering logic, verified first through headless unit tests (Phase 1), then via a Storybook harness with Playwright automation (Phase 2), before final VS Code integration (Phase 3, deferred).

## Technical Context

**Language/Version**: TypeScript 5.x (shared library, Storybook harness, VS Code extension)
**Primary Dependencies**: React 18+, Storybook 8.x, Vitest, Playwright
**Storage**: N/A (pure matching logic, no persistence in Phases 1-2)
**Testing**: Vitest (unit tests), Playwright (Storybook integration tests)
**Target Platform**: Browser (Storybook), VS Code Extension (Phase 3)
**Project Type**: Library + Storybook story within existing shared/components workspace
**Performance Goals**: Tool matching within 1 second for 50+ tools (SC-001, SC-005)
**Constraints**: Must work with fixture data (no MCP dependency in Phases 1-2)
**Scale/Scope**: Phases 1-2 only; Phase 3 (VS Code) deferred

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core functionality works without network | ✅ PASS | Fixture data, no MCP in Phases 1-2 |
| I.4 Reproducibility | Same inputs produce identical results | ✅ PASS | Pure function matching algorithm |
| II.1 Single source of truth | LinkML master schemas | ⚠️ DEFERRED | SelectionRequirement schema needed for Phase 3 |
| III.1 Provenance always | Every transformation records lineage | N/A | Phases 1-2: no transformations, matching only |
| IV.1 Services never touch UI | Python services return data only | ✅ PASS | TypeScript library, no Python in Phases 1-2 |
| IV.3 Services have zero MCP dependency | Domain logic in pure libraries | ✅ PASS | ToolMatchService is pure TypeScript |
| VI.1 Schema tests gate all merges | Derived schema adherence tests | ⚠️ DEFERRED | For Phase 3 MCP integration |
| VI.2 Services require unit tests | No service code without tests | ✅ PASS | Phase 1 is all unit tests |
| VII.1 Tests before implementation | Define expected behaviour first | ✅ PASS | Unit test fixtures defined before implementation |
| VIII.1 Specs before code | Written specification exists | ✅ PASS | spec.md complete with clarifications |

**Gate Status**: ✅ PASS - No blocking violations. Deferred items are Phase 3 scope.

## Project Structure

### Documentation (this feature)

```text
specs/027-context-tool-offering/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── tool-metadata.schema.json
├── checklists/          # Quality checklists
│   └── requirements.md
├── media/               # Phase 2 output
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   ├── ToolMatch/                    # NEW: Tool matching library
│   │   ├── index.ts                  # Public exports
│   │   ├── ToolMatchService.ts       # Core matching algorithm
│   │   ├── types.ts                  # Tool, SelectionRequirement, Selection types
│   │   ├── explanations.ts           # Inactive tool explanation generator
│   │   └── ToolMatchHarness/         # Storybook verification harness
│   │       ├── ToolMatchHarness.tsx  # React component
│   │       ├── ToolMatchHarness.stories.tsx  # Storybook story
│   │       └── fixtures/             # Test fixture data
│   │           ├── features.json     # Sample GeoJSON features
│   │           └── tools.json        # Sample tool definitions
│   └── ... (existing components)
├── tests/
│   └── ToolMatch/                    # NEW: Unit tests
│       ├── ToolMatchService.test.ts  # Matching algorithm tests
│       └── explanations.test.ts      # Explanation generator tests
├── e2e/                              # NEW: Playwright E2E tests
│   └── ToolMatchHarness.spec.ts      # Storybook interaction + screenshots
├── playwright.config.ts              # NEW: Playwright config with webServer
└── ... (existing config)
```

**Structure Decision**: ToolMatchService lives in shared/components as a standalone module with its own Storybook story. This allows reuse across Storybook harness and future VS Code extension.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ToolMatchHarness | `src/ToolMatch/ToolMatchHarness/ToolMatchHarness.stories.tsx` | `tool-match-harness.js` | Demonstrates selection → tool matching with fixture data |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/toolmatch-harness--default`

## Implementation Phases

### Phase 1: Unit Tests (Headless)

**Goal**: Verify ToolMatchService matching logic with fixture data

**Deliverables**:
1. `ToolMatchService.ts` - Core matching algorithm
2. `types.ts` - TypeScript interfaces (Tool, SelectionRequirement, Selection)
3. `explanations.ts` - Inactive tool explanation generator
4. Unit tests covering all matching edge cases

**Exit Criteria**: All unit tests pass

### Phase 2: Storybook Harness

**Goal**: Visual verification of selection → tool matching

**Deliverables**:
1. `ToolMatchHarness.tsx` - React component with feature list (left) and tool list (right)
2. `ToolMatchHarness.stories.tsx` - Storybook story with fixture data
3. `playwright.config.ts` - Configured to start Storybook via `webServer`
4. `ToolMatchHarness.spec.ts` - Playwright tests with interaction and screenshot capture

**Playwright Approach**:
- Playwright starts Storybook instance automatically (`webServer` config)
- Tests navigate to story URL, interact with harness, verify tool matching
- Screenshots captured at key states (empty, selection, tools shown, inactive toggle)
- Screenshots saved to `media/screenshots/` for shipped blog post

**Exit Criteria**: Playwright tests pass, screenshots captured for blog media

### Phase 3: VS Code Integration (Deferred)

**Goal**: Wire ToolMatchService into VS Code extension

**Deliverables**:
1. Integration with MCP `list_tools` and `execute_tool`
2. Context menu, sidebar panel, command palette UI surfaces
3. Provenance recording for tool results

**Exit Criteria**: All acceptance scenarios pass in VS Code

## Complexity Tracking

No constitution violations requiring justification. All deferred items are explicitly Phase 3 scope.
