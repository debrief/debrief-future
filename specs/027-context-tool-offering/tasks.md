# Tasks: Context-Sensitive Tool Offering

**Feature**: Context-Sensitive Tool Offering
**Branch**: `027-context-tool-offering`
**Plan**: [plan.md](./plan.md)

## Phase 0: Schema Definition (LinkML)

### 0.1 Create LinkML schema for Tool metadata
- [ ] Create `shared/schemas/src/tool/tool.yaml`
- [ ] Define `Tool` class with name, description, version, requirements fields
- [ ] Define `SelectionRequirement` class with kind, min, max fields
- [ ] Add appropriate constraints (min >= 0, max >= min or null)

**Acceptance**: Schema validates sample tool definitions

### 0.2 Generate TypeScript types from LinkML
- [ ] Configure LinkML TypeScript generator in build
- [ ] Generate `types.ts` from `tool.yaml`
- [ ] Export types: `Tool`, `SelectionRequirement`
- [ ] Verify types are importable: `import { Tool } from '@debrief/schemas/tool'`

**Acceptance**: TypeScript compiler accepts generated types

### 0.3 Generate JSON Schema for validation
- [ ] Configure LinkML JSON Schema generator
- [ ] Generate `tool-metadata.schema.json`
- [ ] Verify schema validates example tool definitions

**Acceptance**: JSON Schema validates fixtures, rejects invalid data

### 0.4 Create schema adherence tests
- [ ] Create `shared/schemas/tests/tool/fixtures/` directory
- [ ] Add `valid-tool.json` - tool with standard requirements
- [ ] Add `valid-tool-no-requirements.json` - tool that accepts any selection
- [ ] Add `invalid-tool-missing-name.json` - should fail validation
- [ ] Add `invalid-requirement-negative-min.json` - should fail validation
- [ ] Write test that validates fixtures against schema

**Acceptance**: All valid fixtures pass, all invalid fixtures fail

---

## Phase 1: Unit Tests (Headless)

### 1.1 Create ToolMatchService module structure
- [ ] Create `shared/components/src/ToolMatch/` directory
- [ ] Create `index.ts` with public exports
- [ ] Import types from `@debrief/schemas/tool`

**Acceptance**: Module structure exists, types importable

### 1.2 Implement ToolMatchService core algorithm
- [ ] Create `ToolMatchService.ts`
- [ ] Implement `constructor(tools: Tool[])`
- [ ] Implement `getMatchResults(selection: Selection): MatchResult[]`
- [ ] Implement `isToolActive(tool: Tool, selection: Selection): boolean`
- [ ] Implement `getActiveTools(selection: Selection): Tool[]`

**Acceptance**: Service compiles, methods callable

### 1.3 Implement inactive tool explanations
- [ ] Create `explanations.ts`
- [ ] Implement `getInactiveReason(tool: Tool, selection: Selection): string`
- [ ] Format: "Requires N kind(s) (M selected)"
- [ ] Format: "Maximum N kind(s) allowed (M selected)"
- [ ] Format: "Does not accept kind features (N in selection)"

**Acceptance**: Explanations are human-readable and specific

### 1.4 Write unit tests for matching algorithm
- [ ] Create `shared/components/tests/ToolMatch/ToolMatchService.test.ts`
- [ ] Test: Tool with exact requirement (2 tracks) matches 2 tracks
- [ ] Test: Tool with exact requirement rejects 1 track
- [ ] Test: Tool with min-only requirement (1+ tracks) matches multiple
- [ ] Test: Tool with max requirement rejects excess
- [ ] Test: Tool with multiple requirements (track + point)
- [ ] Test: Tool with no requirements always active
- [ ] Test: Selection with extra kinds rejected
- [ ] Test: Empty selection matches tools with no requirements only

**Acceptance**: All unit tests pass

### 1.5 Write unit tests for explanations
- [ ] Create `shared/components/tests/ToolMatch/explanations.test.ts`
- [ ] Test: Under-selection explanation (needs 2, has 1)
- [ ] Test: Over-selection explanation (max 1, has 2)
- [ ] Test: Wrong kind explanation (has points, needs tracks)
- [ ] Test: Active tool returns empty string

**Acceptance**: All explanation tests pass

---

## Phase 2: Storybook Harness

### 2.1 Create fixture data files
- [ ] Create `shared/components/src/ToolMatch/ToolMatchHarness/fixtures/`
- [ ] Create `features.json` with sample GeoJSON features:
  - 3 tracks (track-1, track-2, track-3)
  - 2 reference locations (ref-1, ref-2)
  - 2 points (point-1, point-2)
- [ ] Create `tools.json` with sample tool definitions:
  - "Range Calculation" - requires exactly 2 tracks
  - "Bearing to Point" - requires 1 track + 1 point
  - "Area Analysis" - requires 3+ reference locations
  - "Track Summary" - requires 1+ tracks (no max)
  - "Global Statistics" - no requirements (always active)

**Acceptance**: Fixtures load without errors

### 2.2 Implement ToolMatchHarness React component
- [ ] Create `ToolMatchHarness.tsx`
- [ ] Left panel: Feature list with checkboxes, grouped by kind
- [ ] Right panel: Tool list showing active tools
- [ ] "Show inactive tools" toggle (default: hidden)
- [ ] When toggle on: show inactive tools with explanations
- [ ] Use ToolMatchService for matching logic
- [ ] Add `data-testid` attributes for Playwright

**Acceptance**: Component renders with fixture data

### 2.3 Create Storybook story
- [ ] Create `ToolMatchHarness.stories.tsx`
- [ ] Default story with fixture features and tools
- [ ] Story variant: "No Selection" (empty state)
- [ ] Story variant: "Two Tracks Selected" (shows Range Calculation)
- [ ] Story variant: "Show Inactive" (toggle enabled)

**Acceptance**: Stories render in Storybook

### 2.4 Configure Playwright for Storybook testing
- [ ] Create/update `shared/components/playwright.config.ts`
- [ ] Configure `webServer` to start Storybook on port 6006
- [ ] Set `baseURL` to Storybook URL
- [ ] Configure screenshot directory: `media/screenshots/`

**Acceptance**: `pnpm playwright test` starts Storybook automatically

### 2.5 Write Playwright interaction tests
- [ ] Create `shared/components/e2e/ToolMatchHarness.spec.ts`
- [ ] Test: Initial state shows "Global Statistics" only
- [ ] Test: Select 2 tracks → "Range Calculation" appears
- [ ] Test: Select 1 track + 1 point → "Bearing to Point" appears
- [ ] Test: Toggle "Show inactive" → all tools visible with explanations
- [ ] Test: Deselect all → returns to initial state

**Acceptance**: All Playwright tests pass

### 2.6 Capture screenshots for blog media
- [ ] Screenshot: Empty selection state
- [ ] Screenshot: Two tracks selected (Range Calculation active)
- [ ] Screenshot: Show inactive tools toggle enabled
- [ ] Save to `specs/027-context-tool-offering/media/screenshots/`

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
