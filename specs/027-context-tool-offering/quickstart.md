# Quickstart: Context-Sensitive Tool Offering

Get started with the ToolMatchService in 5 minutes.

## Prerequisites

- Node.js 18+
- pnpm (workspace manager)

## Installation

The ToolMatchService is part of `@debrief/components`:

```bash
cd shared/components
pnpm install
```

## Basic Usage

### 1. Import the service

```typescript
import { ToolMatchService, Tool, Selection } from '@debrief/components/ToolMatch'
```

### 2. Define tools with requirements

```typescript
const tools: Tool[] = [
  {
    name: 'Range Calculation',
    description: 'Calculate range and bearing between two tracks',
    version: '1.0.0',
    requirements: [
      { kind: 'track', min: 2, max: 2 }
    ]
  },
  {
    name: 'Global Statistics',
    description: 'Compute statistics across all features',
    version: '1.0.0',
    requirements: []  // Always active
  }
]
```

### 3. Create a selection

```typescript
const selection: Selection = {
  features: [
    { type: 'Feature', properties: { kind: 'track', id: 'track-1' }, geometry: {...} },
    { type: 'Feature', properties: { kind: 'track', id: 'track-2' }, geometry: {...} }
  ]
}
```

### 4. Get matching tools

```typescript
const matcher = new ToolMatchService(tools)
const results = matcher.getMatchResults(selection)

// Results:
// [
//   { tool: { name: 'Range Calculation', ... }, isActive: true },
//   { tool: { name: 'Global Statistics', ... }, isActive: true }
// ]
```

### 5. Get inactive tool explanations

```typescript
const singleTrackSelection = { features: [track1] }
const results = matcher.getMatchResults(singleTrackSelection)

// Range Calculation result:
// {
//   tool: { name: 'Range Calculation', ... },
//   isActive: false,
//   inactiveReason: 'Requires 2 tracks (1 selected)'
// }
```

## Storybook Harness

Visual verification of tool matching:

```bash
cd shared/components
pnpm storybook
```

Navigate to **ToolMatch / Harness** to see the interactive demo:
- Left panel: Selectable GeoJSON features
- Right panel: Matching tools (with "Show inactive" toggle)

## Running Tests

```bash
# Unit tests
pnpm test

# Storybook interaction tests
pnpm test-storybook
```

## API Reference

### ToolMatchService

```typescript
class ToolMatchService {
  constructor(tools: Tool[])

  // Get match results for all tools
  getMatchResults(selection: Selection): MatchResult[]

  // Get only active tools
  getActiveTools(selection: Selection): Tool[]

  // Check if specific tool is active
  isToolActive(tool: Tool, selection: Selection): boolean

  // Get explanation for inactive tool
  getInactiveReason(tool: Tool, selection: Selection): string
}
```

### Types

```typescript
interface Tool {
  name: string
  description: string
  version: string
  requirements: SelectionRequirement[]
}

interface SelectionRequirement {
  kind: string
  min: number
  max: number | null  // null = unlimited
}

interface Selection {
  features: GeoJSON.Feature[]
}

interface MatchResult {
  tool: Tool
  isActive: boolean
  inactiveReason?: string
}
```

## Next Steps

- See [data-model.md](./data-model.md) for detailed entity definitions
- See [research.md](./research.md) for algorithm design decisions
- Run `pnpm storybook` to explore the visual harness
