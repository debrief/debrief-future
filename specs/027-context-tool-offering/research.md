# Research: Context-Sensitive Tool Offering

**Feature**: Context-Sensitive Tool Offering
**Date**: 2026-01-24
**Status**: Complete

## Research Questions

### 1. Tool Matching Algorithm Design

**Question**: How should the matching algorithm determine if a tool is applicable to a selection?

**Decision**: Constraint satisfaction with exact kind matching

**Rationale**: The SRD specifies that a tool is applicable when:
1. All `SelectionRequirement` entries are satisfied (counts within min/max bounds)
2. No extra feature kinds exist in selection beyond what tool accepts

This is a straightforward constraint satisfaction problem that can be implemented as a pure function.

**Algorithm**:
```
function isToolApplicable(tool: Tool, selection: Selection): boolean {
  // Build map of selected feature counts by kind
  const selectionCounts = groupByKind(selection.features)

  // Check each requirement is satisfied
  for (const req of tool.requirements) {
    const count = selectionCounts.get(req.kind) ?? 0
    if (count < req.min || count > req.max) {
      return false
    }
    selectionCounts.delete(req.kind)  // Mark as handled
  }

  // Reject if selection contains kinds not accepted by tool
  return selectionCounts.size === 0
}
```

**Alternatives Considered**:
- **Fuzzy matching**: Allow partial matches with scores. Rejected because spec requires exact constraint satisfaction.
- **Inclusive matching**: Allow extra feature kinds in selection. Rejected per SRD explicit rule.

### 2. SelectionRequirement Schema

**Question**: What structure should SelectionRequirement follow?

**Decision**: Simple object with kind, min, max fields

**Rationale**: The SRD defines SelectionRequirement as specifying feature kinds with minimum and maximum counts. This maps directly to a simple schema.

**Schema**:
```typescript
interface SelectionRequirement {
  kind: string      // e.g., "track", "reference_location", "point"
  min: number       // Minimum count required (0 = optional)
  max: number       // Maximum count allowed (Infinity for unlimited)
}

interface Tool {
  name: string
  description: string
  version: string
  requirements: SelectionRequirement[]
}
```

**Alternatives Considered**:
- **Separate optional vs required arrays**: More complex without benefit. Rejected.
- **Range object**: `{ range: [min, max] }` - Less readable than separate fields. Rejected.

### 3. Inactive Tool Explanations

**Question**: How should explanations for inactive tools be generated?

**Decision**: Template-based explanations derived from unmet requirements

**Rationale**: Users need to understand why a tool isn't available. The explanation should identify the specific unmet requirement and current selection state.

**Format Examples**:
- "Requires 2 tracks (1 selected)"
- "Requires at least 1 reference_location (0 selected)"
- "Does not accept point features (2 in selection)"

**Implementation**:
```typescript
function getInactiveReason(tool: Tool, selection: Selection): string {
  const counts = groupByKind(selection.features)

  for (const req of tool.requirements) {
    const count = counts.get(req.kind) ?? 0
    if (count < req.min) {
      return `Requires ${req.min} ${req.kind}${req.min > 1 ? 's' : ''} (${count} selected)`
    }
    if (count > req.max) {
      return `Maximum ${req.max} ${req.kind}${req.max > 1 ? 's' : ''} allowed (${count} selected)`
    }
    counts.delete(req.kind)
  }

  // Extra kinds in selection
  for (const [kind, count] of counts) {
    return `Does not accept ${kind} features (${count} in selection)`
  }

  return ''  // Tool is actually applicable
}
```

**Alternatives Considered**:
- **Full list of all unmet requirements**: Too verbose. Rejected in favor of first unmet requirement.
- **Generic "Not applicable"**: Not helpful for learning. Rejected.

### 4. Storybook + Playwright Testing Pattern

**Question**: How should the Storybook harness be tested with Playwright?

**Decision**: Use Storybook test runner with Playwright for component interaction tests

**Rationale**: The existing shared/components workspace uses Storybook 8.x which has built-in Playwright support via `@storybook/test-runner`.

**Pattern**:
1. Define fixture data in `.stories.tsx` file
2. Use `play` function for interaction tests
3. Run via `test-storybook` command which uses Playwright under the hood

**Example**:
```typescript
// ToolMatchHarness.stories.tsx
export const Default: Story = {
  args: {
    features: fixtureFeatures,
    tools: fixtureTools,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Select two tracks
    await userEvent.click(canvas.getByText('Track 1'))
    await userEvent.click(canvas.getByText('Track 2'))

    // Verify range calculation tool appears
    await expect(canvas.getByText('Range Calculation')).toBeVisible()
  },
}
```

**Alternatives Considered**:
- **Standalone Playwright tests against built Storybook**: More setup, slower. Rejected.
- **Cypress**: Different testing ecosystem. Rejected for consistency with existing setup.

### 5. Feature Kind Values

**Question**: What feature kinds should be supported?

**Decision**: Use existing GeoJSON feature kinds from debrief-schemas

**Rationale**: The project has existing schemas for track data. Feature kinds should align with the `kind` discriminator field in GeoJSON features.

**Known Kinds** (from specs/022-system-kind-discriminator):
- `track` - Vessel track data
- `point` - Reference points/positions
- `reference_location` - Named reference locations
- `annotation` - User annotations

**Implementation Note**: The matching algorithm is kind-agnostic - it treats `kind` as an opaque string. This allows future extension without algorithm changes.

**Alternatives Considered**:
- **Enum of known kinds**: Too restrictive for extensibility. Rejected.
- **Hierarchical kinds**: Over-engineered for current needs. Rejected.

## Summary

| Topic | Decision | Confidence |
|-------|----------|------------|
| Matching algorithm | Constraint satisfaction, exact kind matching | High |
| SelectionRequirement schema | Simple {kind, min, max} object | High |
| Inactive explanations | Template-based, first unmet requirement | High |
| Testing pattern | Storybook test runner with play functions | High |
| Feature kinds | Opaque strings matching existing schemas | High |

All NEEDS CLARIFICATION items have been resolved. Ready for Phase 1 design.
