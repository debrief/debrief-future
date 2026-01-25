# Usage Example: Context-Sensitive Tool Offering

## Overview

The ToolMatchService enables context-sensitive tool offering in Debrief v4.x.
It matches analysis tools to the current feature selection based on requirements.

## Basic Usage

```typescript
import {
  ToolMatchService,
  createSelectionFromCounts,
  Tool,
} from '@debrief/components';

// Define tools with requirements
const tools: Tool[] = [
  {
    id: 'range-calculation',
    name: 'Range Calculation',
    description: 'Calculate range between two tracks',
    requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
  },
  {
    id: 'track-summary',
    name: 'Track Summary',
    description: 'Summarize one or more tracks',
    requirements: [{ kind: 'TRACK', min: 1 }],
  },
  {
    id: 'global-stats',
    name: 'Global Statistics',
    description: 'Show global statistics (no selection required)',
    requirements: [],
  },
];

// Create the service
const service = new ToolMatchService(tools);

// Create a selection (2 tracks selected)
const selection = createSelectionFromCounts({ TRACK: 2 });

// Get active tools
const activeTools = service.getActiveTools(selection);
// Result: ['Global Statistics', 'Range Calculation', 'Track Summary']

// Get match results with explanations
const results = service.getMatchResults(selection);
// Result: All tools with isActive status and explanation for inactive ones
```

## Understanding Requirements

### Exact Count Requirement

```typescript
// Tool requires exactly 2 tracks
requirements: [{ kind: 'TRACK', min: 2, max: 2 }]

// Selection: 1 track → Inactive ("Requires exactly 2 tracks (1 selected)")
// Selection: 2 tracks → Active
// Selection: 3 tracks → Inactive ("Requires exactly 2 tracks (3 selected)")
```

### Minimum Requirement

```typescript
// Tool requires at least 1 track
requirements: [{ kind: 'TRACK', min: 1 }]

// Selection: 0 tracks → Inactive ("Requires at least 1 track")
// Selection: 1 track → Active
// Selection: 5 tracks → Active
```

### Multiple Requirements

```typescript
// Tool requires 1 track AND 1 point
requirements: [
  { kind: 'TRACK', min: 1, max: 1 },
  { kind: 'POINT', min: 1, max: 1 },
]

// Selection: 1 track only → Inactive ("Requires at least 1 point")
// Selection: 1 track + 1 point → Active
// Selection: 2 tracks + 1 point → Inactive ("Requires exactly 1 track")
```

### No Requirements (Always Active)

```typescript
// Tool has no requirements
requirements: []

// Any selection → Active
```

## React Integration

```tsx
import { useState, useMemo } from 'react';
import {
  ToolMatchService,
  createSelectionFromCounts,
} from '@debrief/components';

function ToolPanel({ tools, selectedFeatures }) {
  const [showInactive, setShowInactive] = useState(false);

  const service = useMemo(() => new ToolMatchService(tools), [tools]);

  const selection = useMemo(() => {
    // Count features by kind
    const counts: Record<string, number> = {};
    for (const feature of selectedFeatures) {
      const kind = feature.properties.kind;
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    return createSelectionFromCounts(counts);
  }, [selectedFeatures]);

  const results = service.getMatchResults(selection);

  return (
    <div>
      <h3>Available Tools</h3>
      <label>
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        Show inactive tools
      </label>
      <ul>
        {results
          .filter((r) => showInactive || r.isActive)
          .map((r) => (
            <li key={r.tool.id}>
              <strong>{r.tool.name}</strong>
              {r.isActive ? ' (Active)' : ` - ${r.explanation}`}
            </li>
          ))}
      </ul>
    </div>
  );
}
```

## Storybook Demo

Run Storybook to see the ToolMatchHarness component:

```bash
cd shared/components
pnpm storybook
```

Navigate to **ToolMatch > Harness** to interact with the tool matching demo.

## API Reference

### ToolMatchService

| Method | Description |
|--------|-------------|
| `constructor(tools: Tool[])` | Create service with tool inventory |
| `getActiveTools(selection)` | Get tools active for selection |
| `getInactiveTools(selection)` | Get tools inactive for selection |
| `getMatchResults(selection)` | Get all tools with match status |
| `isToolActive(tool, selection)` | Check if single tool is active |
| `getAllTools()` | Get all tools (sorted) |

### Helper Functions

| Function | Description |
|----------|-------------|
| `createSelection(kinds[])` | Create selection from kind array |
| `createSelectionFromCounts(counts)` | Create selection from count object |
| `getInactiveReason(tool, selection)` | Get explanation for inactive tool |
| `getAllInactiveReasons(tool, selection)` | Get all reasons (for multiple failures) |

### Types

```typescript
interface Tool {
  id: string;
  name: string;
  description?: string;
  version?: string;
  requirements?: SelectionRequirement[];
}

interface SelectionRequirement {
  kind: string;
  min?: number;
  max?: number;
}

type Selection = Map<string, number>;

interface MatchResult {
  tool: Tool;
  isActive: boolean;
  explanation: string;
}
```
