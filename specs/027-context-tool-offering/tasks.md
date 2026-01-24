# Tasks: Context-Sensitive Tool Offering

**Feature**: Context-Sensitive Tool Offering
**Branch**: `027-context-tool-offering`
**Plan**: [plan.md](./plan.md)

## Phase 0: Schema Definition (LinkML)

### 0.1 Create LinkML schema for Tool metadata
- [x] Create `shared/schemas/src/linkml/tool.yaml`
- [x] Define `Tool` class with name, description, version, requirements fields
- [x] Define `SelectionRequirement` class with kind, min, max fields
- [x] Add appropriate constraints (min >= 0, max >= min or null)

**Acceptance**: Schema validates sample tool definitions

### 0.2 Generate TypeScript types from LinkML
- [x] Configure LinkML TypeScript generator in build
- [x] Generate `types.ts` from `tool.yaml`
- [x] Export types: `Tool`, `SelectionRequirement`
- [x] Verify types are importable: `import { Tool } from '@debrief/schemas'`

**Acceptance**: TypeScript compiler accepts generated types

### 0.3 Generate JSON Schema for validation
- [x] Configure LinkML JSON Schema generator
- [x] Generate `Tool.schema.json` and `SelectionRequirement.schema.json`
- [x] Verify schema validates example tool definitions

**Acceptance**: JSON Schema validates fixtures, rejects invalid data

### 0.4 Create schema adherence tests
- [x] Create `shared/schemas/src/fixtures/valid/` and `invalid/` directories
- [x] Add `tool-valid-standard.json` - tool with standard requirements
- [x] Add `tool-valid-no-requirements.json` - tool that accepts any selection
- [x] Add `tool-invalid-missing-name.json` - should fail validation
- [x] Add `tool-invalid-requirement-negative-min.json` - should fail validation
- [x] Update validation script to test fixtures against Tool schema

**Acceptance**: All valid fixtures pass, all invalid fixtures fail

---

## Phase 1: Unit Tests (Headless)

### 1.1 Create ToolMatchService module structure
- [x] Create `shared/components/src/ToolMatch/` directory
- [x] Create `index.ts` with public exports
- [x] Import types from `@debrief/schemas`

**Acceptance**: Module structure exists, types importable

### 1.2 Implement ToolMatchService core algorithm
- [x] Create `ToolMatchService.ts`
- [x] Implement `constructor(tools: Tool[])`
- [x] Implement `getMatchResults(selection: Selection): MatchResult[]`
- [x] Implement `isToolActive(tool: Tool, selection: Selection): boolean`
- [x] Implement `getActiveTools(selection: Selection): Tool[]`

**Acceptance**: Service compiles, methods callable

### 1.3 Implement inactive tool explanations
- [x] Create `explanations.ts`
- [x] Implement `getInactiveReason(tool: Tool, selection: Selection): string`
- [x] Format: "Requires N kind(s) (M selected)"
- [x] Format: "Maximum N kind(s) allowed (M selected)"
- [x] Format: "Does not accept kind features (N in selection)"

**Acceptance**: Explanations are human-readable and specific

### 1.4 Write unit tests for matching algorithm
- [x] Create `shared/components/src/ToolMatch/__tests__/ToolMatchService.test.ts`
- [x] Test: Tool with exact requirement (2 tracks) matches 2 tracks
- [x] Test: Tool with exact requirement rejects 1 track
- [x] Test: Tool with min-only requirement (1+ tracks) matches multiple
- [x] Test: Tool with max requirement rejects excess
- [x] Test: Tool with multiple requirements (track + point)
- [x] Test: Tool with no requirements always active
- [x] Test: Selection with extra kinds rejected
- [x] Test: Empty selection matches tools with no requirements only

**Acceptance**: All unit tests pass (22 tests)

### 1.5 Write unit tests for explanations
- [x] Create `shared/components/src/ToolMatch/__tests__/explanations.test.ts`
- [x] Test: Under-selection explanation (needs 2, has 1)
- [x] Test: Over-selection explanation (max 1, has 2)
- [x] Test: Wrong kind explanation (has points, needs tracks)
- [x] Test: Active tool returns empty string

**Acceptance**: All explanation tests pass (16 tests)

---

## Phase 2: Storybook Harness

### 2.1 Create fixture data files
- [x] Create `shared/components/src/ToolMatch/ToolMatchHarness/fixtures/`
- [x] Create `features.ts` with sample features:
  - 3 tracks (track-1, track-2, track-3)
  - 2 reference locations (ref-1, ref-2)
  - 2 narratives (narrative-1, narrative-2)
- [x] Create `tools.ts` with sample tool definitions:
  - "Range Calculation" - requires exactly 2 tracks
  - "Bearing to Point" - requires 1 track + 1 point
  - "Area Analysis" - requires 3+ points
  - "Track Summary" - requires 1+ tracks (no max)
  - "Global Statistics" - no requirements (always active)

**Acceptance**: Fixtures load without errors

### 2.2 Implement ToolMatchHarness React component
- [x] Create `ToolMatchHarness.tsx`
- [x] Left panel: Feature list with checkboxes, grouped by kind
- [x] Right panel: Tool list showing active tools
- [x] "Show inactive tools" toggle (default: hidden)
- [x] When toggle on: show inactive tools with explanations
- [x] Use ToolMatchService for matching logic
- [x] Add `data-testid` attributes for Playwright

**Acceptance**: Component renders with fixture data

### 2.3 Create Storybook story
- [x] Create `ToolMatchHarness.stories.tsx`
- [x] Default story with fixture features and tools
- [x] Story variant: "TwoTracksSelected" (shows Range Calculation)
- [x] Story variant: "TrackAndPoint" (shows Bearing to Point)
- [x] Story variant: "ShowInactive" (toggle enabled)
- [x] Story variant: "DarkTheme"

**Acceptance**: Stories render in Storybook

### 2.4 Configure Playwright for Storybook testing
- [x] Create `shared/components/playwright.config.ts`
- [x] Configure `webServer` to start Storybook on port 6006
- [x] Set `baseURL` to Storybook URL
- [x] Configure screenshot directory: `screenshots/`

**Acceptance**: `pnpm test:e2e` starts Storybook automatically

### 2.5 Write Playwright interaction tests
- [x] Create `shared/components/e2e/ToolMatchHarness.spec.ts`
- [x] Test: Initial state shows "Global Statistics" only
- [x] Test: Select 2 tracks → "Range Calculation" appears
- [x] Test: Select 1 track + 1 point → "Bearing to Point" appears
- [x] Test: Toggle "Show inactive" → all tools visible with explanations
- [x] Test: Deselect all → returns to initial state

**Acceptance**: All Playwright tests pass

### 2.6 Capture screenshots for blog media
- [x] Screenshot tests configured in Playwright spec:
  - Empty selection state
  - Two tracks selected (Range Calculation active)
  - Show inactive tools toggle enabled
- [ ] Run e2e tests to capture screenshots
- [ ] Copy screenshots to `specs/027-context-tool-offering/media/screenshots/`

**Acceptance**: Screenshots captured and suitable for blog post

---

## Phase 3: VS Code Integration (Deferred)

> Phase 3 is deferred until Phases 0-2 are verified. Tasks below are placeholders.

### 3.1 Wire ToolMatchService into VS Code extension
- [ ] Import ToolMatchService from @debrief/components
- [ ] Connect to extension selection model
- [ ] Trigger matching on selection change

### 3.2 Implement context menu integration
- [ ] Register context menu items for active tools
- [ ] Update menu on selection change

### 3.3 Implement sidebar panel
- [ ] Create tools panel in sidebar
- [ ] Show active tools with "Show inactive" toggle
- [ ] Display inactive tool explanations

### 3.4 Implement command palette integration
- [ ] Register commands for active tools
- [ ] Update available commands on selection change

### 3.5 Connect tool execution via MCP
- [ ] Call `execute_tool` on tool selection
- [ ] Apply result envelope to FeatureCollection
- [ ] Record provenance metadata

---

## Exit Criteria Summary

| Phase | Exit Criteria |
|-------|---------------|
| 0 | Schema adherence tests pass, TypeScript types importable |
| 1 | All unit tests pass |
| 2 | Playwright tests pass, screenshots captured |
| 3 | All acceptance scenarios pass in VS Code (deferred) |
