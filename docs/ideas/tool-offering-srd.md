# SRD: Context-Sensitive Tool Offering in VS Code

## Overview

The VS Code extension offers analysis tools to the analyst based on their current selection. Tools are provided by `debrief-calc`, discovered at startup, filtered client-side by selection context, and executed via MCP. Results update the plot through `debrief-stac`.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VS Code Extension                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Tool Cache  │  │  Selection  │  │   Merge     │  │    UI      │ │
│  │ (metadata)  │  │   Model     │  │   Logic     │  │ (3 surfaces)│ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────────┘ │
└─────────┼────────────────┼────────────────┼─────────────────────────┘
          │                │                │
    startup: list_tools   │         write_plot(uri, fc, prov)
          │                │                │
          ▼                │                ▼
┌─────────────────┐        │        ┌─────────────────┐
│  debrief-calc   │◄───────┘        │  debrief-stac   │
│  (MCP server)   │  execute_tool   │  (MCP server)   │
│                 │  (features)     │                 │
└─────────────────┘        │        └─────────────────┘
                           │
                    features in,
                    envelope out
```

## Data Structures

### Tool Metadata

Retrieved from `debrief-calc` at startup via `list_tools` MCP call.

```typescript
interface ToolMetadata {
  tool_id: string;                // Unique identifier, e.g., "range_between"
  name: string;                   // Display name, e.g., "Calculate Range"
  description: string;            // Tooltip/help text
  version: string;                // Semantic version for provenance
  accepts: SelectionRequirement[];  // Must have at least one entry
}

interface SelectionRequirement {
  kind: string;                   // Feature kind, e.g., "track", "reference_location"
  min: number;                    // Minimum count required (required field)
  max: number | null;             // Maximum count allowed (null = unlimited)
}
```

**Validation rules:**
- `accepts` must contain at least one `SelectionRequirement` (empty array is invalid)
- `min` must be ≥ 0
- `max` must be ≥ `min` (or null for unlimited)

**Examples:**

```json
{
  "tool_id": "range_between_tracks",
  "name": "Calculate Range Between Tracks",
  "description": "Compute range over time between two tracks",
  "version": "1.0.0",
  "accepts": [
    { "kind": "track", "min": 2, "max": 2 }
  ]
}
```

```json
{
  "tool_id": "range_from_reference",
  "name": "Range from Reference",
  "description": "Calculate range from reference location to selected tracks",
  "version": "1.0.0",
  "accepts": [
    { "kind": "track", "min": 1, "max": null },
    { "kind": "reference_location", "min": 1, "max": 1 }
  ]
}
```

### Feature Kind

Features in the GeoJSON FeatureCollection use the standard GeoJSON `id` at root level, plus a `kind` property as discriminator:

```typescript
interface DebriefFeature extends GeoJSON.Feature {
  id: string;                     // Unique feature ID (GeoJSON standard location)
  properties: {
    kind: string;                 // "track" | "reference_location" | "sensor_contact" | ...
    // ... other kind-specific properties
  };
}
```

### Result Envelope

Returned by `debrief-calc` after tool execution:

```typescript
interface ToolResult {
  tool_id: string;
  tool_version: string;
  add: DebriefFeature[];       // New features to add
  update: DebriefFeature[];    // Modified features (matched by id)
  remove: string[];            // Feature IDs to remove
}
```

### Selection Summary

Input to the tool matching algorithm:

```typescript
interface SelectionSummary {
  kinds: Map<string, number>;    // Count of features by kind
  featureIds: string[];          // IDs of all selected features
  totalCount: number;            // Total features selected
}
```

### Provenance Metadata

Passed to `debrief-stac` when writing updated plot:

```typescript
interface ProvenanceRecord {
  tool_id: string;
  tool_version: string;
  timestamp: string;           // ISO 8601
  input_feature_ids: string[]; // IDs of features sent to tool
}
```

## MCP Interface

### debrief-calc Tools

**`list_tools`**

Returns all available tools with their metadata. Called once at extension startup.

```
Request:  (no parameters)
Response: { tools: ToolMetadata[] }
```

**`execute_tool`**

Executes a tool on provided features.

```
Request:  { 
  tool_id: string,
  features: DebriefFeature[]
}
Response: ToolResult | ToolError
```

**Error handling:** Follows MCP protocol standard errors. Tool-specific errors returned as:

```typescript
interface ToolError {
  error: {
    code: string;       // e.g., "INVALID_INPUT", "COMPUTATION_FAILED"
    message: string;    // Human-readable description
  }
}
```

### debrief-stac Tools

**`write_plot`**

Writes updated plot contents with provenance.

```
Request:  {
  plot_uri: string,
  feature_collection: GeoJSON.FeatureCollection,
  provenance: ProvenanceRecord
}
Response: { success: boolean }
```

## ToolMatchService

A shared TypeScript library in `/shared/tool-match/` providing:

- Tool matching algorithm
- SelectionSummary construction helpers
- Inactive tool explanation generation

This follows the "thick services, thin frontends" principle — matching logic is reusable across VS Code extension, storybook, and potential future frontends.

### Interface

```typescript
interface ToolMatchService {
  // Returns tools applicable to current selection
  getApplicableTools(
    tools: ToolMetadata[],
    selection: SelectionSummary
  ): ToolMetadata[];

  // Returns all tools with applicability status and explanation
  getToolsWithStatus(
    tools: ToolMetadata[],
    selection: SelectionSummary
  ): ToolWithStatus[];
}

interface ToolWithStatus {
  tool: ToolMetadata;
  applicable: boolean;
  explanation: string | null;  // e.g., "Requires 2 tracks (1 selected)"
}
```

### Explanation Generation

For inactive tools, generate human-readable explanations:

| Condition | Example Explanation |
|-----------|---------------------|
| Missing kind | "Requires reference_location" |
| Insufficient count | "Requires 2 tracks (1 selected)" |
| Excess count | "Requires exactly 1 track (3 selected)" |
| Extra kinds in selection | "Cannot use with reference_location in selection" |
| Multiple unmet | "Requires 2 tracks and 1 reference_location" |

## VS Code Extension Behaviour

### Startup

1. Connect to `debrief-calc` MCP server
2. Call `list_tools` to retrieve all tool metadata
3. **Validate each tool against JSON schema** (generated from LinkML, located in `/shared/schemas/`)
4. **On validation failure**: Skip tool, notify user via VS Code warning notification, continue with valid tools
5. Cache valid tool metadata for session lifetime
6. Connect to `debrief-stac` MCP server

### Selection Model

Selection can come from two sources, kept synchronised:
- **Map view**: Click or marquee selection on the Leaflet map
- **Tree view**: Selection in the Outline panel

When selection changes in either view, the other updates to match. Tool matching uses this unified selection state.

### Selection Change

When the analyst's selection changes:

1. Count features by `kind` in current selection
2. For each cached tool, evaluate whether selection satisfies `accepts` requirements
3. Update all three UI surfaces with applicable tools

### Tool Matching Algorithm

A tool is applicable if:
1. **All** its `SelectionRequirement` entries are satisfied
2. **No extra kinds** are present in the selection beyond what the tool accepts

```typescript
function isToolApplicable(tool: ToolMetadata, selection: SelectionSummary): boolean {
  const acceptedKinds = new Set(tool.accepts.map(req => req.kind));
  
  // Check no extra kinds in selection
  for (const kind of selection.kinds.keys()) {
    if (!acceptedKinds.has(kind)) return false;
  }
  
  // Check all requirements met
  for (const req of tool.accepts) {
    const count = selection.kinds.get(req.kind) || 0;
    if (count < req.min) return false;
    if (req.max !== null && count > req.max) return false;
  }
  
  return true;
}
```

**Example:** Tool accepts `[{ kind: "track", min: 1, max: 1 }]`. Selection has 1 track + 1 reference_location → **not applicable** (extra kind present).

This logic lives in `ToolMatchService`, not the extension.

### Tool Execution Flow

1. User triggers tool (via any UI surface)
2. Extension retrieves full GeoJSON features for current selection
3. Extension calls `execute_tool` with `tool_id` and features
4. Extension receives `ToolResult` envelope (or `ToolError`)
5. **On error**: Display error message to analyst; abort
6. Extension applies envelope to local FeatureCollection:
   - Add features from `add`
   - Replace features in `update` (matched by `id`)
   - Remove features listed in `remove`
7. Extension constructs `ProvenanceRecord`
8. Extension calls `write_plot` with updated FeatureCollection and provenance
9. Extension refreshes display

### Error Handling

- **Tool execution failure**: Display error message to analyst; no changes to plot
- **STAC write failure**: Display error; local state may differ from persisted (analyst can retry)
- **MCP connection loss**: Disable tool UI; attempt reconnection

## UI Surfaces

The extension exposes applicable tools through three surfaces for evaluation.

### Common Behaviour

All surfaces share these behaviours:
- **Ordering**: Tools displayed alphabetically by name
- **Inactive tools toggle**: "Hide inactive tools" (default: on). When off, inactive tools appear disabled with tooltip explaining why.
- **Toggle persistence**: Stored in VS Code user settings, persists across sessions
- **Tooltip on inactive**: e.g., "Requires 2 tracks (1 selected)"

### 1. Context Menu

Right-click on selected features shows "Debrief Tools" submenu with applicable tools.

**Implementation notes:**
- Register dynamic context menu contribution
- Filter tool list when menu opens (respects inactive toggle setting)
- Menu item triggers tool execution
- Inactive tools shown greyed with explanatory tooltip

### 2. Tools Panel

Dedicated sidebar panel showing:
- Current selection summary (e.g., "2 tracks selected")
- Toggle: "Hide inactive tools"
- List of tools with name, description, and status
- Click to execute (active tools only)

**Implementation notes:**
- TreeView or WebView provider
- Subscribes to selection change events
- Updates dynamically
- Inactive tools show explanation inline or on hover

### 3. Command Palette

Tools registered as VS Code commands, visible via Ctrl+Shift+P.

**Implementation notes:**
- Commands registered at startup
- Inactive tools omitted from palette (VS Code limitation: no native "disabled" command support)
- The Tools Panel in the Debrief Activity pane provides the "show disabled" capability instead

**Note:** Command palette cannot show inactive tools with explanations due to VS Code API limitations. Analysts wanting to see why a tool is unavailable should use the Tools Panel.

## Tracer Scope

For the tracer bullet implementation:

**In scope:**
- `ToolMatchService` shared library with matching algorithm and explanation generation
- Tool metadata caching from `debrief-calc`
- Schema validation of tool metadata on receipt
- Client-side tool filtering by selection kind and cardinality
- Tool execution via MCP (features in, envelope out)
- Envelope application (add/update/remove)
- Plot write via `debrief-stac` with full provenance
- All three UI surfaces (context menu, panel, command palette)
- Inactive tools toggle with explanatory tooltips
- Storybook for visual verification (fixture-driven, standalone HTML)
- Parameterless tools only

**Out of scope (future):**
- Tool parameters with schema-driven UI
- Tool categories or grouping
- Favourites or recent tools
- Keyboard shortcuts for specific tools
- Tool execution progress indication
- Undo/redo

## Example Tracer Tools

Suggested tools to exercise different selection contexts:

| Tool | Accepts | Produces |
|------|---------|----------|
| Track Statistics | 1 track | New measurement feature (add) |
| Range Between Tracks | 2 tracks exactly | New range-over-time feature (add) |
| Range from Reference | 1+ tracks, 1 reference | New range features per track (add) |
| Smooth Track | 1 track | Modified track (update) |

## Verification

### Unit Tests

Located with `ToolMatchService` in `/shared/tool-match/`:

- Matching algorithm correctness
- Edge cases (empty selection, no matching tools, all tools match, extra kinds)
- Explanation generation accuracy
- Schema validation

### Storybook

Standalone HTML page for visual verification of tool matching. Not connected to live Python API.

**Purpose:**
- Human verification of matching behaviour
- Embeddable in blog posts demonstrating the feature
- Regression testing via visual inspection

**Fixture Format:**

```typescript
interface ToolMatchFixture {
  name: string;                      // Fixture name for display
  description: string;               // What this fixture tests
  tools: ToolMetadata[];             // Snapshot of tool metadata
  selection: SelectionSummary;       // Test selection
  expectedApplicable: string[];      // Expected applicable tool_ids
}
```

**Implementation:**
- Loads fixtures from JSON file
- Displays each fixture as a card showing:
  - Selection summary
  - List of all tools with applicable/inactive status
  - Inactive tool explanations
- Highlights any mismatches between expected and actual results
- Purely client-side (no server required)

**Location:** `/apps/storybook/tool-match/` or similar standalone location.

## Success Criteria

1. Tool list retrieved at startup, validated, cached correctly
2. Selection changes update applicable tools within 100ms
3. All three UI surfaces show consistent tool availability
4. Inactive tools show correct explanatory tooltips
5. Tool execution sends correct features, receives envelope
6. Envelope applied correctly (add/update/remove)
7. Provenance written with full lineage
8. Display refreshes after tool execution
9. Storybook fixtures pass visual verification
10. ToolMatchService unit tests pass

## Resolved Design Decisions

1. **Refresh strategy**: Explicit refresh only. No periodic re-fetching.
2. **Multi-plot context**: Tools apply to the active editor's plot.
3. **Tool ordering**: Alphabetical by name. UI provides "Hide inactive tools" toggle (default: hidden). Inactive tools shown disabled with tooltip explaining why (e.g., "Requires 2 tracks (1 selected)").

## Document History

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | January 2026 | Initial draft from design discussion |
| 0.2 | January 2026 | Added ToolMatchService, SelectionSummary, schema validation, storybook, inactive tool explanations |
| 0.3 | January 2026 | Review fixes: GeoJSON standard id, exact matching (no extras), tool_id naming, selection model, toggle persistence, schema source, error handling, command palette limitations |
