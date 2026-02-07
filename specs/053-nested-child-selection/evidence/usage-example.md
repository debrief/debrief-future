# Usage Example: Nested Child Selection

## Path Utilities

```typescript
import {
  parsePath, buildPath, getRoot, getDepth, getParent,
  isRootPath, validatePathStructure, validatePathSemantics,
  escapeSegment, unescapeSegment, getLevelRegistry,
} from '@debrief/session-state';

// ─── Parse a selection path ──────────────────────────────────
const parsed = parsePath("track-hms-defender/positions/4");
// → { raw: "track-hms-defender/positions/4",
//    root: "track-hms-defender",
//    levels: [{ levelName: "positions", address: "4" }],
//    depth: 1 }

// ─── Build a path from components ────────────────────────────
const path = buildPath("track-001", [
  { levelName: "segments", address: "leg-alpha" },
  { levelName: "positions", address: "3" },
]);
// → "track-001/segments/leg-alpha/positions/3"

// ─── Quick accessors (no full parse needed) ──────────────────
getRoot("track-001/positions/4");      // → "track-001"
getDepth("track-001/positions/4");     // → 1
isRootPath("track-001");              // → true
isRootPath("track-001/positions/4");  // → false
getParent("track-001/positions/4");   // → "track-001"
getParent("track-001");               // → null

// ─── Validation ──────────────────────────────────────────────
validatePathStructure("track-001/positions/4");
// → { valid: true, errors: [] }

validatePathStructure("track-001//positions/4");
// → { valid: false, errors: ["Path must not contain empty segments"] }

validatePathSemantics("track-001/positions/not-a-number");
// → { valid: false, errors: ['Level "positions" requires numeric index, got "not-a-number"'] }

// ─── RFC 6901 escaping ──────────────────────────────────────
escapeSegment("track/alpha");   // → "track~1alpha"
unescapeSegment("track~1alpha"); // → "track/alpha"

// ─── Level registry ─────────────────────────────────────────
const registry = getLevelRegistry();
registry.get("positions");  // → { name: "positions", addressingMode: "index", ... }
registry.get("segments");   // → { name: "segments", addressingMode: "id", ... }
```

## Store Actions

```typescript
import { getSessionStore, getRoot } from '@debrief/session-state';

const store = getSessionStore();

// Select a specific position within a track
store.getState().setSelection(["track-001/positions/4"]);
// → selection.featureIds = ["track-001/positions/4"]
// → selection.primary = "track-001/positions/4"

// Mixed-depth: whole track + position on different track
store.getState().setSelection(["track-001", "track-002/positions/7"]);
// → Both coexist in featureIds

// Add a child selection to existing
store.getState().addToSelection(["track-003/positions/0"]);
// → Appended to existing selection

// Remove exact path (no parent/child inference)
store.getState().removeFromSelection(["track-002/positions/7"]);

// Get unique root IDs for tool matching
const rootIds = [...new Set(
  store.getState().selection.featureIds.map(getRoot)
)];
// → ["track-001", "track-003"]

// Backward compatible: flat IDs still work
store.getState().setSelection(["track-001"]);
// → Works exactly as before Feature 053
```

## Round-Trip Integrity

```typescript
// Every path round-trips perfectly through parse → build
const paths = [
  "track-001",
  "track-001/positions/42",
  "track-001/segments/leg-alpha/positions/3",
];

for (const path of paths) {
  const parsed = parsePath(path);
  const rebuilt = buildPath(parsed.root, parsed.levels);
  console.assert(rebuilt === path); // Always true
}
```
