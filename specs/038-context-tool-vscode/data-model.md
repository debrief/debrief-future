# Data Model: Context-Sensitive Tool Offering VS Code Integration

**Feature**: #038 Context-Tool-VSCode
**Date**: 2026-01-27

## Entities

### Tool (from @debrief/components)

*Already defined in shared/schemas/src/linkml/tool.yaml - no changes needed.*

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier for execution and deduplication |
| name | string | Yes | Human-readable display name (2-4 words) |
| description | string | No | Brief description for tooltips (one sentence) |
| version | string | No | Semantic version for provenance tracking |
| requirements | SelectionRequirement[] | No | List of selection constraints (AND logic) |

### SelectionRequirement (from @debrief/components)

*Already defined in shared/schemas/src/linkml/tool.yaml - no changes needed.*

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kind | string | Yes | Feature kind (e.g., "TRACK", "CIRCLE", "POINT") |
| min | number | No | Minimum count required (default: 0) |
| max | number | No | Maximum count allowed (null = unlimited) |

### MatchResult (from @debrief/components)

*Already defined in shared/components/src/ToolMatch/types.ts - no changes needed.*

| Field | Type | Description |
|-------|------|-------------|
| tool | Tool | The tool being evaluated |
| isActive | boolean | Whether tool matches current selection |
| explanation | string | Human-readable reason if inactive (empty if active) |

### Selection (from @debrief/components)

*Type alias for Map<string, number> - kind to count mapping.*

```typescript
type Selection = Map<string, number>;
// Example: Map { 'TRACK' => 2, 'POINT' => 1 }
```

### FeatureSelection (from @debrief/session-state)

*Existing type - no changes needed.*

| Field | Type | Description |
|-------|------|-------------|
| featureIds | string[] | Selected feature IDs |
| primary | string | null | Primary selection for properties display |
| timestamp | TimeInstant | When selection was made |

### Provenance (new - for result features)

*Attached to result features as `properties.provenance`.*

| Field | Type | Description |
|-------|------|-------------|
| tool.id | string | Tool identifier |
| tool.name | string | Tool display name |
| tool.version | string | Tool version at execution time |
| timestamp | string | ISO8601 execution timestamp |
| sourceFeatureIds | string[] | Input feature IDs used |

**JSON Example**:
```json
{
  "provenance": {
    "tool": {
      "id": "range-and-bearing",
      "name": "Range & Bearing",
      "version": "1.0.0"
    },
    "timestamp": "2026-01-27T10:30:00Z",
    "sourceFeatureIds": ["track-1", "track-2"]
  }
}
```

### ResultEnvelope (from debrief-calc MCP response)

*Response from tool execution.*

| Field | Type | Description |
|-------|------|-------------|
| add | GeoJSONFeature[] | Features to add to plot |
| update | GeoJSONFeature[] | Features to replace in plot (by ID) |
| remove | string[] | Feature IDs to remove from plot |

## State Transitions

### Tool Availability State

```
[No Selection] ──select features──> [Selection Made]
       │                                  │
       │                                  ├─ match against requirements
       │                                  │
       v                                  v
[All Tools Inactive]          [Some Tools Active, Some Inactive]
       │                                  │
       │                                  ├─ click active tool
       │                                  │
       │                                  v
       │                        [Tool Executing]
       │                                  │
       │               ┌──────────────────┴──────────────────┐
       │               │                                      │
       │               v                                      v
       │        [Execution Success]                   [Execution Failure]
       │               │                                      │
       │               ├─ apply result envelope               ├─ show error
       │               ├─ persist with provenance             │
       │               v                                      v
       │        [Results Displayed]                   [Selection Unchanged]
       │               │
       └───────────────┴─ clear/change selection ──> [Selection Made]
```

### Tools Panel UI State

| State | Trigger | Display |
|-------|---------|---------|
| Loading | Extension activation | "Loading analysis tools..." |
| Error | MCP connection failure | "Unable to connect to analysis service..." |
| Empty | No selection | "Select features on the map..." |
| Active Tools | Selection with matches | List of applicable tools |
| Mixed (toggle on) | Selection + show inactive | Active tools + inactive with explanations |

## Relationships

```
┌─────────────────┐
│  SessionManager │
│  (singleton)    │
└────────┬────────┘
         │ provides selection
         v
┌─────────────────┐     converts to      ┌─────────────────┐
│ FeatureSelection│ ──────────────────> │    Selection    │
│ (session-state) │                      │ (ToolMatchSvc)  │
└─────────────────┘                      └────────┬────────┘
                                                  │ matches against
                                                  v
┌─────────────────┐     from MCP         ┌─────────────────┐
│   CalcService   │ ──────────────────> │     Tool[]      │
│ (VS Code ext)   │                      │ (cached, valid) │
└─────────────────┘                      └────────┬────────┘
                                                  │
                                                  v
                                         ┌─────────────────┐
                                         │  MatchResult[]  │
                                         │ (active/inactive)│
                                         └────────┬────────┘
                                                  │ displayed in
         ┌────────────────────────────────────────┼────────────────────────────────────────┐
         │                                        │                                        │
         v                                        v                                        v
┌─────────────────┐                      ┌─────────────────┐                      ┌─────────────────┐
│ ToolsTreeProvider│                     │  Context Menu   │                      │ Command Palette │
│   (sidebar)     │                      │   (submenu)     │                      │   (commands)    │
└─────────────────┘                      └─────────────────┘                      └─────────────────┘
```

## Validation Rules

### Tool Schema Validation

Tools from MCP must conform to LinkML-generated JSON Schema:
- `id` required, non-empty string
- `name` required, non-empty string
- `requirements[].kind` required if requirements present
- `requirements[].min` >= 0 if present
- `requirements[].max` >= min if both present

**Invalid tools are excluded with a warning log.**

### Selection Validity

- Selection can be empty (Map with 0 entries)
- Kind keys must be uppercase strings (e.g., "TRACK", not "track")
- Count values must be positive integers

### Provenance Completeness

All result features must have provenance with:
- `tool.id` matching the executed tool
- `timestamp` in ISO8601 format
- `sourceFeatureIds` array (can be empty for tools with no input requirements)
