# Quickstart: Nested Child Selection

**Feature**: 186-nested-child-selection
**Supersedes**: the 053-nested-child-selection quickstart for any caller using the selection model after 186 lands.

## What's Changing

Feature 053 introduced path-based selection while keeping flat-ID semantics as a backwards-compatible fallback. Feature 186 finishes the job:

- **No more flat IDs.** Every selection entry is a path, always. `track-001` is still valid — it's just the single-segment form of the general shape.
- **Level Registry is authoritative.** Unknown level names are rejected at the boundary. The registry is sourced from LinkML, not hand-authored in TypeScript.
- **Ctrl+click toggles.** The old `addToSelection`/`removeFromSelection` split is gone; UI callers use `toggleInSelection` per click.
- **Shift+click selects a range.** New `selectRange` action computes an inclusive sibling range at index-based levels.
- **Selection persists per plot.** Tab-switch away and back, or reopen the plot entirely — your selection comes back. Paths that no longer resolve are kept and flagged, not silently dropped.
- **Map has two styles + a primary overlay.** Whole-feature selection and nested-child selection look distinct; the primary designation is an independent overlay that can be on either.
- **Unresolvable paths are observable.** Each occurrence emits a structured LogService warning and surfaces in the selection panel as an aggregate count.

## Selection Path Format

```text
{featureId}/{levelName}/{address}/{levelName}/{address}/...
```

**Examples**:

```typescript
"track-hms-defender"                                    // whole track (depth 0)
"track-hms-defender/positions/4"                        // position 4 in track (depth 1)
"track-hms-defender/segments/leg-alpha/positions/3"     // position 3 in segment (depth 2)
```

**Escaping** (RFC 6901): `~` → `~0`, `/` → `~1` within segment values.

## Key APIs

### Path Utilities (`services/session-state`)

```typescript
import {
  parsePath,
  buildPath,
  getRoot,
  getDepth,
  getParent,
  isRootPath,
  isDescendantOf,
  computeRange,
  validateAgainstRegistry,
  escapeSegment,
  unescapeSegment,
  getLevelRegistry,
} from '@debrief/session-state';

// Parse a path (rejects unknown level names now)
const parsed = parsePath("track-001/positions/4");
// → { root: "track-001", levels: [{ levelName: "positions", address: "4", addressingMode: "index" }], depth: 1 }

// Full validation including Level Registry
const result = validateAgainstRegistry("track-001/bananas/4");
// → { valid: false, errors: ["level 'bananas' is not in the Level Registry"] }

// Compute a Shift+click range
const range = computeRange("track-001/positions/4", "track-001/positions/9");
// → ["track-001/positions/4", ..., "track-001/positions/9"]

// Registry access (generated from LinkML)
const registry = getLevelRegistry();
const mode = registry.get("positions")?.addressingMode; // "index"
```

### Store Actions (`services/session-state`)

```typescript
// Single-click: replace the whole selection
store.setSelection(["track-001/positions/4"]);

// Ctrl+click: toggle a single path (add if absent, remove if present)
store.toggleInSelection("track-002/positions/7");

// Shift+click: select inclusive range from anchor to target
store.selectRange("track-001/positions/9");  // anchor is the last-clicked path

// Explicit anchor (rarely needed by UI code)
store.setAnchor("track-001/positions/4");

// Clear
store.clearSelection();

// Restore after reload; returns any unresolvable flags for UI surfacing
const unresolvable = store.restoreSelection(persistedSelection, featureCollection);
```

### Click Dispatcher

If you're wiring up a new click source (map, list panel in a later feature, etc.), use the shared dispatcher instead of implementing the modifier-combination branches yourself:

```typescript
import { dispatchClick } from '@debrief/session-state';

dispatchClick(store, {
  path: "track-001/positions/4",
  shift: event.shiftKey,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
});

// Clicking empty area clears selection
dispatchClick(store, { path: null, shift: false, ctrl: false, meta: false });
```

### Selectors

```typescript
import {
  selectedPaths,
  primarySelection,
  selectionAnchor,
  selectedRootIds,
  getPathsForRoot,
  unresolvableFlags,
} from '@debrief/session-state';

const paths = selectedPaths(store.getState());
const primary = primarySelection(store.getState());
const anchor = selectionAnchor(store.getState());
const roots = selectedRootIds(store.getState());
const trackPaths = getPathsForRoot(store.getState(), "track-001");

// Aggregate count of unresolvable entries (FR-028)
const unresolvable = unresolvableFlags(store.getState());
const count = unresolvable.length;
```

## Level Registry

Sourced from `shared/schemas/src/linkml/session-state.yaml` and generated into TypeScript and Pydantic.

| Level | Addressing | Example |
|-------|-----------|---------|
| `positions` | index | `/positions/4` |
| `segments` | id | `/segments/leg-alpha` |
| `points` | index | `/points/12` |
| `polygons` | index | `/polygons/2` |

**Adding a new level**: edit `session-state.yaml`, regenerate bindings, no TypeScript hand-edit required.

## Rules

1. **Paths only.** No flat-ID fallback anywhere in new code (FR-010).
2. **Reject unknown levels at the boundary.** `validateAgainstRegistry` is the single gate; every ingress point calls it (FR-005).
3. **Leaf-only semantics.** Selecting a child does NOT add the parent (FR-007).
4. **Toggle = unique by path.** Ctrl+click never creates duplicates (FR-016).
5. **Range needs a shared parent and an index-based last level.** Cross-parent or ID-level Shift+click falls back to single-click replace (FR-022–FR-024).
6. **Unresolvable is retained, not dropped.** Logged via LogService, counted in the panel (FR-027, FR-028).
7. **Persistence is per plot.** Reopen the same plot and the selection is back; open a different plot and you get its own selection (FR-017).

## Visual Contract

| Selection kind | Map style | Primary overlay |
|---|---|---|
| Whole feature (single-segment path) | Whole-feature style | Applied if the whole feature is primary |
| Nested child (multi-segment path) | Nested-child style (same regardless of depth) | Applied if the nested child is primary |
| Unresolvable entry | Dimmed last-known location (if any) + panel indicator | Not applicable — cannot be promoted to primary |

Both selection styles live in `shared/components/src/MapView/styles/selection.ts`. The primary overlay is composed on top and is independent of the whole-vs-nested distinction.

## Observability

Every unresolvable-path occurrence emits a structured log entry:

```typescript
{
  level: 'warning',
  event: 'selection.unresolvable-path',
  data: {
    path: 'track-A/positions/15',
    reason: 'index-out-of-bounds',
    discoveredAt: 'restore-time',  // or 'click-time'
    plotId: 'plot-2026-04-14-op-archer',
    rootFeatureId: 'track-A',
  },
}
```

View in the Log Panel (feature 176). Filter by `event = 'selection.unresolvable-path'` or by `data.plotId`.

## Testing

```bash
# Unit tests for path utilities, range, toggle, anchor, persistence
pnpm --filter @debrief/session-state test -- --run

# Integration test: save → reload → re-resolve
pnpm --filter @debrief/session-state test selection-persistence

# LinkML round-trip for the Level Registry
cd shared/schemas && pytest tests/test_level_registry_roundtrip.py

# Storybook E2E for map interactions
pnpm --filter @debrief/components test:e2e -- MapView-nested-selection.spec.ts

# Full VS Code webview E2E (click / Ctrl+click / Shift+click / tab-switch)
cd apps/web-shell && node run-playwright.mjs tests/e2e/test-nested-child-selection.spec.ts
```

## Migration Notes (for callers of 053)

If your code used the 053 API, update as follows:

| 053 call | 186 replacement |
|---|---|
| `store.addToSelection([path])` | `store.toggleInSelection(path)` per path, or `store.setSelection([...existing, path])` when you explicitly want append-not-toggle |
| `store.removeFromSelection([path])` | `store.toggleInSelection(path)` |
| Passing flat IDs to `setSelection` | Same call — a flat ID is already a single-segment path and still works; no behavioural change for the whole-feature case |
| Reading `selection.featureIds` as "the selected IDs" | Treat as "selected paths"; use `getRoot(path)` to derive the feature ID |

There is no deprecation shim. Update call sites atomically with the rest of 186.
