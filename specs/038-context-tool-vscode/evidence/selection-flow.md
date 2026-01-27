# Selection Flow: Feature Selection to Tool Display

**Feature**: #038 context-tool-vscode

This document describes the data flow from user selection to tool display in the VS Code extension.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VS Code Extension                                  │
│                                                                              │
│  ┌──────────────┐     ┌─────────────────┐     ┌────────────────────┐       │
│  │   MapPanel   │────►│ SessionManager  │────►│  ToolMatchAdapter   │       │
│  │  (webview)   │     │ (session-state) │     │  (bridge service)   │       │
│  └──────────────┘     └─────────────────┘     └─────────┬──────────┘       │
│                                                          │                   │
│                                                          ▼                   │
│                                                 ┌────────────────────┐       │
│                                                 │   ToolMatchService  │       │
│                                                 │ (matching algorithm)│       │
│                                                 └─────────┬──────────┘       │
│                                                          │                   │
│                                                          ▼                   │
│                                                 ┌────────────────────┐       │
│                                                 │  ToolsTreeProvider  │       │
│                                                 │    (UI display)     │       │
│                                                 └────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Steps

### Step 1: User Selection in MapPanel

User clicks/ctrl-clicks features on the map webview.

**Data**:
```typescript
// WebviewToExtensionMessage
{
  type: 'selectionChanged',
  selection: {
    trackIds: ['track-hms-defender', 'track-uss-freedom'],
    locationIds: [],
    contextType: 'multi-track'
  }
}
```

### Step 2: Session State Update

SessionManager receives selection and updates session state.

**Data**:
```typescript
// FeatureSelection (session-state)
{
  featureIds: ['track-hms-defender', 'track-uss-freedom'],
  primary: 'track-hms-defender',
  timestamp: {
    epoch: 1706400000000,
    iso: '2026-01-27T22:00:00.000Z'
  }
}
```

### Step 3: Selection Subscription Fires

Extension.ts receives selection change via subscription.

**Code**:
```typescript
// extension.ts
subscribeToSelection(session, (selection: FeatureSelection) => {
  toolMatchAdapter.updateSelection(selection);
  toolsTreeProvider.refresh();
  void vscode.commands.executeCommand(
    'setContext',
    'debrief.hasSelection',
    selection.featureIds.length > 0
  );
});
```

### Step 4: ToolMatchAdapter Converts Selection

ToolMatchAdapter converts feature IDs to kind counts.

**Conversion**:
```typescript
// Input: ['track-hms-defender', 'track-uss-freedom']
// Output: Map { 'TRACK' => 2 }

// The adapter uses getFeatureKind callback:
const getFeatureKind = (featureId: string): string | undefined => {
  return mapPanel.getFeatureKind(featureId); // Returns 'TRACK'
};
```

### Step 5: ToolMatchService Evaluates Tools

ToolMatchService checks each tool's requirements against selection.

**Evaluation**:
```typescript
// Tool: Range & Bearing
// Requirements: [{ kind: 'TRACK', min: 2, max: 2 }]
// Selection: Map { 'TRACK' => 2 }
// Result: ACTIVE (2 >= 2 && 2 <= 2)

// Tool: Track Statistics
// Requirements: [{ kind: 'TRACK', min: 1, max: 1 }]
// Selection: Map { 'TRACK' => 2 }
// Result: INACTIVE (2 > 1, exceeds max)

// Tool: Distance to Point
// Requirements: [{ kind: 'TRACK', min: 1, max: 1 }, { kind: 'POINT', min: 1, max: 1 }]
// Selection: Map { 'TRACK' => 2 }
// Result: INACTIVE (0 < 1 for POINT)
```

### Step 6: ToolsTreeProvider Renders Results

ToolsTreeProvider queries adapter and builds tree items.

**Tree Structure**:
```
Tools
├── Range & Bearing              [active, clickable]
├── Closest Point of Approach    [active, clickable]
├── Relative Motion Analysis     [active, clickable]
│
│ (if "Show inactive" enabled)
├── ── 2 inactive tools ──
├── Track Statistics             [inactive, grayed]
│   └── "Need 1 TRACK, have 2"
└── Distance to Point            [inactive, grayed]
    └── "Need 1 POINT, have 0"
```

### Step 7: Context Values Updated

Extension.ts updates VS Code context for menu/command enablement.

**Context Values**:
```typescript
// Set for each tool
await vscode.commands.executeCommand(
  'setContext',
  'debrief.tool.range-bearing.active',
  true
);
await vscode.commands.executeCommand(
  'setContext',
  'debrief.tool.track-stats.active',
  false
);
```

## Key Interfaces

### FeatureSelection (session-state)

```typescript
interface FeatureSelection {
  featureIds: string[];      // All selected feature IDs
  primary: string | null;    // Primary selection for context
  timestamp: {
    epoch: number;
    iso: string;
  };
}
```

### Tool (schemas)

```typescript
interface Tool {
  id: string;
  name: string;
  description?: string;
  version?: string;
  requirements?: SelectionRequirement[];
}

interface SelectionRequirement {
  kind: string;    // 'TRACK', 'POINT', 'CIRCLE', etc.
  min?: number;    // Minimum count (default: 1)
  max?: number;    // Maximum count (undefined = no limit)
}
```

### MatchResult (ToolMatchService)

```typescript
interface MatchResult {
  tool: Tool;
  isActive: boolean;
  explanation?: string;  // Why inactive
}
```

## Performance Characteristics

| Operation | Timing | Notes |
|-----------|--------|-------|
| Selection change → adapter update | <1ms | In-memory conversion |
| Adapter → MatchService evaluation | <1ms | O(n) tools × requirements |
| TreeProvider refresh | <10ms | VS Code tree API |
| Context value updates | <5ms | Sequential executeCommand |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Unknown feature ID | Skipped in kind lookup, doesn't affect other features |
| CalcService unavailable | Tools panel shows "Analysis tools unavailable" message |
| Empty selection | Tools panel shows "Select features to see tools" message |
| No matching tools | Shows "No matching tools" if inactive toggle is off |
