# Quickstart: Nested Child Selection

**Feature**: 053-nested-child-selection

## What's Changing

The selection model is extended so that `featureIds` can contain **path strings** instead of just flat feature IDs. A path like `track-001/positions/4` identifies a specific position within a track.

**Backward compatible**: existing code that writes `"track-001"` produces a valid single-segment path. No breaking changes.

## Selection Path Format

```
{featureId}/{levelName}/{address}/{levelName}/{address}/...
```

**Examples**:
```typescript
"track-001"                                    // whole track (depth 0)
"track-001/positions/4"                        // position 4 in track (depth 1)
"track-001/segments/leg-alpha/positions/3"     // position 3 in segment (depth 2)
```

**Escaping** (RFC 6901): `~` → `~0`, `/` → `~1` within segment values.

## Key APIs

### Path Utilities (session-state package)

```typescript
import {
  parsePath,
  buildPath,
  getRoot,
  getDepth,
  getParent,
  isRootPath,
  validatePathStructure,
  escapeSegment,
  unescapeSegment,
} from '@debrief/session-state';

// Parse a path
const parsed = parsePath("track-001/positions/4");
// → { root: "track-001", levels: [{ levelName: "positions", address: "4" }], depth: 1 }

// Get root feature ID (for tool matching, feature lookup)
const root = getRoot("track-001/positions/4");
// → "track-001"

// Check depth
const depth = getDepth("track-001/positions/4");
// → 1

// Navigate up
const parent = getParent("track-001/segments/alpha/positions/3");
// → "track-001/segments/alpha"

// Build a path
const path = buildPath("track-001", [{ levelName: "positions", address: "4" }]);
// → "track-001/positions/4"

// Validate
const result = validatePathStructure("track-001/positions/4");
// → { valid: true, errors: [] }
```

### Store Actions (unchanged signatures)

```typescript
// Set selection with paths
store.setSelection(["track-001/positions/4"]);

// Add child selection alongside existing
store.addToSelection(["track-002/positions/7"]);

// Mixed-depth selection
store.setSelection(["track-001", "track-002/positions/5"]);

// Clear
store.clearSelection();
```

### New Selectors

```typescript
import { selectedRootIds, getPathsForRoot } from '@debrief/session-state';

// Get deduplicated root feature IDs
const roots = selectedRootIds(store.getState());
// ["track-001", "track-002"]

// Get all paths for a specific root
const paths = getPathsForRoot(store.getState(), "track-001");
// ["track-001", "track-001/positions/4"]
```

## Level Registry

| Level | Addressing | Example |
|-------|-----------|---------|
| `positions` | index | `/positions/4` |
| `segments` | id | `/segments/leg-alpha` |

## Rules

1. **Leaf-only**: selecting a child does NOT add the parent to the selection
2. **Coexistence**: parent and child paths CAN coexist in the same selection
3. **Exact match**: `removeFromSelection` uses exact path strings
4. **Tool matching**: tools see root feature kinds; paths are transparent to existing tool requirements

## Testing

```bash
# Unit tests for path utilities
npx vitest run services/session-state/src/utils/selectionPath.test.ts

# Store integration tests
npx vitest run services/session-state/src/store/slices/features.test.ts

# Golden fixture tests
npx vitest run services/session-state/src/utils/selectionPath.golden.test.ts
```
