# Data Model: Nested Child Selection

**Feature**: 053-nested-child-selection
**Date**: 2026-02-07

## Entities

### SelectionPath (new concept, implemented as `string`)

A forward-slash-separated string identifying a specific element at any depth within a feature hierarchy. Not a new type — paths are stored as plain strings in the existing `featureIds` array.

**Structure**: `{featureId}[/{levelName}/{address}]*`

| Segment | Description | Examples |
|---------|-------------|----------|
| Root (segment 0) | Feature ID | `track-hms-defender` |
| Level name (odd segments) | Named nesting level from registry | `positions`, `segments` |
| Address (even segments ≥ 2) | ID or index depending on level | `4` (index), `leg-alpha` (ID) |

**Examples**:
- `track-hms-defender` — whole-feature selection (depth 0, backward compatible)
- `track-hms-defender/positions/4` — position within track (depth 1)
- `track-hms-defender/segments/leg-alpha/positions/3` — position within segment within track (depth 2)

**Validation rules**:
- Must be non-empty string
- No trailing slash after normalisation
- Escape sequences: `~0` for literal `~`, `~1` for literal `/`
- No empty segments (no `//`)
- Odd-indexed segments (level names) must be known to the level registry for semantic validation

### LevelDefinition (new)

Defines a named nesting level and its addressing mode. Stored in the shared schema so all consumers agree.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | yes | Level identifier used in paths (e.g., `positions`) |
| `addressingMode` | `enum: id \| index` | yes | How addresses are interpreted |
| `description` | `string` | no | Human-readable description |

**Initial registry**:

| `name` | `addressingMode` | `description` |
|---------|-----------------|----------------|
| `positions` | `index` | Individual position within a track or segment |
| `segments` | `id` | Named track segment |

### FeatureSelection (extended)

The existing `FeatureSelection` interface is unchanged in structure. The semantic interpretation of `featureIds` is broadened to accept selection paths.

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| `featureIds` | `string[]` | **Semantics widened** | Now accepts selection path strings (previously flat IDs only) |
| `primary` | `string \| null` | **Semantics widened** | Now accepts a full selection path as primary |
| `timestamp` | `TimeInstant` | No change | When selection was made |

**Backward compatibility**: A single-segment path (no `/`) is identical to a flat feature ID.

### ParsedPath (new, utility type)

Result of parsing a selection path string. Used internally by path utility functions; not persisted.

| Field | Type | Description |
|-------|------|-------------|
| `raw` | `string` | Original path string |
| `root` | `string` | First segment (feature ID) |
| `levels` | `PathLevel[]` | Array of level/address pairs (may be empty for root-only paths) |
| `depth` | `number` | Number of nesting levels (0 = root only) |

### PathLevel (new, utility type)

A single level/address pair within a parsed path.

| Field | Type | Description |
|-------|------|-------------|
| `levelName` | `string` | Level identifier (e.g., `positions`) |
| `address` | `string` | The address value (interpreted as ID or index per registry) |

## Relationships

```
FeatureSelection
  └── featureIds: string[]  ← contains SelectionPath strings
       │
       ├── "track-001"  (depth 0 — whole feature)
       │
       └── "track-002/positions/4"  (depth 1 — child element)
            │
            ├── root: "track-002"
            └── levels: [{levelName: "positions", address: "4"}]

LevelDefinition (registry)
  ├── {name: "positions", addressingMode: "index"}
  └── {name: "segments", addressingMode: "id"}
```

## State Transitions

Selection state transitions remain the same as the existing model. The only change is that path strings flow through instead of flat IDs.

| Action | Current State | Input | New State |
|--------|--------------|-------|-----------|
| `setSelection` | Any | `["track-001/positions/4"]` | `{featureIds: ["track-001/positions/4"], primary: "track-001/positions/4"}` |
| `addToSelection` | `{featureIds: ["track-001"]}` | `["track-002/positions/7"]` | `{featureIds: ["track-001", "track-002/positions/7"]}` |
| `removeFromSelection` | `{featureIds: ["track-001", "track-001/positions/4"]}` | `["track-001/positions/4"]` | `{featureIds: ["track-001"]}` |
| `clearSelection` | Any | — | `{featureIds: [], primary: null}` |

## Schema Changes

### LinkML (session-state.yaml)

**New enum**:
```yaml
AddressingMode:
  description: How addresses in a selection path level are interpreted
  permissible_values:
    id:
      description: Address is a string identifier
    index:
      description: Address is a numeric position index
```

**New class**:
```yaml
LevelDefinition:
  description: Named nesting level within a feature hierarchy (FR-010)
  attributes:
    name:
      description: Level identifier used in selection paths
      range: string
      required: true
    addressingMode:
      description: How addresses at this level are interpreted
      range: AddressingMode
      required: true
    description:
      description: Human-readable description
      range: string
```

**Extended documentation on FeatureSelection**:
```yaml
FeatureSelection:
  description: >-
    Set of selected feature identifiers with metadata (FR-017).
    featureIds accepts selection path strings: forward-slash-separated
    segments following RFC 6901 escaping. A single-segment path is
    a flat feature ID (backward compatible).
```

### TypeScript (generated)

```typescript
export type AddressingMode = 'id' | 'index';

export interface LevelDefinition {
  name: string;
  addressingMode: AddressingMode;
  description?: string;
}

// Utility types (not in schema — internal to session-state)
export interface PathLevel {
  levelName: string;
  address: string;
}

export interface ParsedPath {
  raw: string;
  root: string;
  levels: PathLevel[];
  depth: number;
}
```
