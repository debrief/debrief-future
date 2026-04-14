# Data Model: Nested Child Selection

**Feature**: 186-nested-child-selection
**Date**: 2026-04-14

All entities below are authored in LinkML (`shared/schemas/src/linkml/session-state.yaml`) as the single source of truth (Constitution Article II.1). Pydantic and TypeScript bindings are generated. This document specifies the target shape — any divergence between LinkML and the runtime types is a bug.

---

## Entities

### SelectionPath (value type: `string`)

A forward-slash-separated string identifying a specific element at any depth within a feature hierarchy. Not a dedicated class — paths are plain strings carried in `FeatureSelection.featureIds` and `FeatureSelection.primary` / `FeatureSelection.anchor`. Semantics are enforced at the boundary via validation.

**Structure**: `{featureId}[/{levelName}/{address}]*`

| Segment index | Role | Notes |
|---|---|---|
| 0 | Feature ID | Always present. Escaped per RFC 6901 (`~0` for `~`, `~1` for `/`). |
| 1, 3, 5, … | Level name | Must appear in the Level Registry (FR-005). |
| 2, 4, 6, … | Address | Interpreted per the level's `addressingMode`: `id` (literal string) or `index` (non-negative integer in decimal). |

**Examples**:

- `track-hms-defender` — whole-feature selection (depth 0).
- `track-hms-defender/positions/4` — position index 4 within the track (depth 1).
- `track-hms-defender/segments/leg-alpha/positions/3` — position within segment within track (depth 2).
- `track~1alpha` — feature whose ID literally contains a slash (escaped as `~1`).

**Validation rules** (FR-001, FR-005, FR-006, FR-012, FR-013):

- Non-empty after normalisation.
- No trailing slash (stripped during normalisation).
- Odd-indexed segments (level names) MUST be present in the Level Registry.
- Even-indexed segments ≥ 2 (addresses) MUST match the level's addressing mode:
  - `id` — any non-empty string (post-unescape).
  - `index` — a non-negative decimal integer with no leading zeros (except the literal `0`).
- Escape sequences: only `~0` and `~1` are legal; any other `~X` is rejected.
- No empty segments (no `//` after normalisation).

---

### AddressingMode (enum)

Authoritative set of addressing modes a level can use. Values are permissive_values in LinkML; derived as a literal union in TypeScript and an `Enum` in Pydantic.

| Value | Description |
|---|---|
| `id` | Address is a literal string identifier with stable identity across mutation. |
| `index` | Address is a non-negative integer ordinal; semantics break if the parent collection is reordered. |

---

### LevelDefinition (class)

A named nesting level within the feature hierarchy. Exactly one `LevelDefinition` per level name, stored in the Level Registry.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Unique level identifier appearing in selection paths (for example, `positions`, `segments`). |
| `addressingMode` | `AddressingMode` | yes | How addresses at this level are interpreted. |
| `description` | `string` | no | Human-readable description. |

**Invariants**:

- `name` is unique across the registry.
- Adding a level is additive; *changing* an existing level's `addressingMode` is a breaking schema change and requires a schema-version bump (FR-004, Article II.3).

---

### LevelRegistry (conceptual)

The set of all known `LevelDefinition` entries. Materialised in LinkML as a permissible-values enum (for validation) paired with a class-level `slot` that emits the full list of definitions. The TypeScript runtime constant is generated from this.

**Initial registry (post-186)**:

| `name` | `addressingMode` | `description` |
|---|---|---|
| `positions` | `index` | Individual position within a track or segment. |
| `segments` | `id` | Named track segment. |
| `points` | `index` | Individual point within a MultiPoint geometry. |
| `polygons` | `index` | Individual polygon within a MultiPolygon geometry. |

The first two are live today; `points` and `polygons` were added in 053 and remain.

---

### FeatureSelection (extended)

The complete selection state for a plot. Extends the existing `FeatureSelection` with a new `anchor` field for Shift+click range support.

| Field | Type | Required | Change vs 053 | Description |
|---|---|---|---|---|
| `featureIds` | `string[]` (SelectionPath) | yes | **Strict** — flat-ID semantics dropped (FR-010) | Ordered collection of selection paths. Unique by path (FR-016). |
| `primary` | `string \| null` (SelectionPath) | yes | Strict | Primary designation; must be a member of `featureIds` or `null`. |
| `anchor` | `string \| null` (SelectionPath) | yes | **NEW** (FR-021) | Last-clicked path; used as the start point for `Shift+click` range. |
| `timestamp` | `TimeInstant` | yes | Unchanged | When selection was last modified. |

**Invariants**:

- Every entry in `featureIds` passes path validation against the Level Registry.
- `primary`, when non-null, appears in `featureIds`.
- `anchor`, when non-null, is a well-formed path; it does NOT need to appear in `featureIds` (it can outlive the entry that created it, so a subsequent Shift+click from an anchor that was toggled off still computes a range correctly — or falls back per FR-023 if needed).
- Duplicate paths are prohibited in `featureIds` (FR-016). Enforcement is at the action layer; the data model asserts this as an invariant for persistence validation.

---

### UnresolvableFlag (utility)

Not a persisted entity — computed at runtime by `resolve.ts` on load and on data reload. Pairs a persisted `SelectionPath` with a reason.

| Field | Type | Description |
|---|---|---|
| `path` | `string` (SelectionPath) | The path that could not be resolved. |
| `reason` | `UnresolvableReason` | Why resolution failed. |
| `discoveredAt` | `'click-time' \| 'restore-time'` | Context in which the failure was discovered. |

**`UnresolvableReason`** (enum):

- `index-out-of-bounds` — an `index`-mode address refers to a position beyond the parent's current length.
- `id-not-found` — an `id`-mode address refers to a child ID that is not present.
- `feature-not-found` — the root feature ID is not in the current feature collection.
- `level-not-in-registry` — a level name in the path is not present in the Level Registry (this indicates a malformed path that escaped the boundary check — should never occur if `FR-005` is enforced).

---

### ParsedPath (utility type, TypeScript only)

Internal representation used by `selectionPath.ts`. Not serialised, not part of the schema.

| Field | Type | Description |
|---|---|---|
| `raw` | `string` | Original path string (pre-normalisation). |
| `normalised` | `string` | Canonical form (trailing slash stripped, no double-slashes). |
| `root` | `string` | First segment (feature ID), unescaped. |
| `levels` | `PathLevel[]` | Array of level/address pairs. |
| `depth` | `number` | `levels.length`. |

---

### PathLevel (utility type)

| Field | Type | Description |
|---|---|---|
| `levelName` | `string` | Level identifier (for example, `positions`). |
| `address` | `string` | Raw address value; interpretation depends on the level's addressing mode. |
| `addressingMode` | `AddressingMode` | Resolved from the Level Registry at parse time. Present so downstream consumers do not need to re-query the registry. |

---

## Relationships

```text
Plot
  └── sessionState
       └── features
            └── selection: FeatureSelection
                 ├── featureIds: SelectionPath[]   ← strings, unique by path
                 │    ├── "track-001"              (depth 0)
                 │    └── "track-002/positions/4"  (depth 1)
                 ├── primary: SelectionPath | null (must ∈ featureIds if non-null)
                 ├── anchor:  SelectionPath | null (independent of featureIds)
                 └── timestamp: TimeInstant

LevelRegistry (schema-level, singleton)
  ├── LevelDefinition { name: "positions", addressingMode: "index", … }
  ├── LevelDefinition { name: "segments",  addressingMode: "id",    … }
  ├── LevelDefinition { name: "points",    addressingMode: "index", … }
  └── LevelDefinition { name: "polygons",  addressingMode: "index", … }
```

---

## State Transitions

| Action | Preconditions | New state |
|---|---|---|
| `setSelection(paths)` (replace) | Every `path` validates | `featureIds = paths` (deduplicated, order preserved by first occurrence); `primary = paths[0] ?? null`; `anchor = paths[paths.length - 1] ?? null`; `timestamp = now` |
| `toggleInSelection(path)` (FR-016) | `path` validates | If `path ∈ featureIds`: remove it, update `primary` if needed (fall through to next entry or null), `anchor = path`. Otherwise: append, `primary = path`, `anchor = path`. |
| `selectRange(targetPath)` (FR-022) | `anchor` is non-null, shares prefix with `targetPath` up to the last level, last level is `index`-mode | Replace any `featureIds` entries under the shared parent with the inclusive range from `anchor` to `targetPath`; entries under other parents untouched; `primary = targetPath`; `anchor = targetPath`. |
| `selectRange(targetPath)` fallback (FR-023) | Above preconditions fail | `setSelection([targetPath])`. |
| `clearSelection()` (FR-015) | None | `featureIds = []`, `primary = null`, `anchor = null`, `timestamp = now`. |
| `restoreSelection(persisted)` (FR-018) | Raw bytes validated by Pydantic/Zod | Paths re-resolved against live data. Resolvable paths reinstated; unresolvable paths retained and flagged via `UnresolvableFlag[]` (surfaced to UI via a derived selector). `anchor` restored; if unresolvable, a subsequent Shift+click falls back per FR-023. |

---

## Schema Changes (LinkML → generated bindings)

### LinkML (`shared/schemas/src/linkml/session-state.yaml`)

**Existing (carried from 053)** — kept as-is:

- `AddressingMode` enum (`id`, `index`).
- `LevelDefinition` class with `name`, `addressingMode`, `description`.

**New in 186**:

- `SelectionPath` slot (type `string`) with pattern-level documentation referencing FR-001, FR-005, FR-006. No regex constraint at the LinkML layer — validation is in code (RFC 6901 escaping is not expressible cleanly as a single regex).
- `UnresolvableReason` enum with the four values listed above.
- `FeatureSelection.anchor` slot (range `string`, required, nullable). Existing `featureIds` and `primary` slot docstrings updated to cite FR-010 and remove any mention of flat-ID backward compatibility.
- `LevelRegistry` class holding an array of `LevelDefinition` entries; this materialises the registry as a schema-visible object so Pydantic can carry a typed constant and TypeScript can generate a typed map.

### Generated TypeScript (`@debrief/schemas`)

```typescript
export type AddressingMode = 'id' | 'index';

export interface LevelDefinition {
  name: string;
  addressingMode: AddressingMode;
  description?: string;
}

export type UnresolvableReason =
  | 'index-out-of-bounds'
  | 'id-not-found'
  | 'feature-not-found'
  | 'level-not-in-registry';

export interface FeatureSelection {
  featureIds: string[];
  primary: string | null;
  anchor: string | null;
  timestamp: TimeInstant;
}

// Generated constant populated from the LinkML LevelRegistry
export const LEVEL_REGISTRY: ReadonlyMap<string, LevelDefinition>;
```

### Generated Pydantic (`debrief_schemas`)

```python
from enum import Enum
from typing import Optional
from pydantic import BaseModel

class AddressingMode(str, Enum):
    id = "id"
    index = "index"

class UnresolvableReason(str, Enum):
    index_out_of_bounds = "index-out-of-bounds"
    id_not_found = "id-not-found"
    feature_not_found = "feature-not-found"
    level_not_in_registry = "level-not-in-registry"

class LevelDefinition(BaseModel):
    name: str
    addressing_mode: AddressingMode
    description: Optional[str] = None

class FeatureSelection(BaseModel):
    feature_ids: list[str]
    primary: Optional[str]
    anchor: Optional[str]
    timestamp: TimeInstant
```

---

## Derived Types (utility, TypeScript only — not in schema)

These live in `services/session-state/src/utils/selectionPath.ts` and are not part of the persisted schema:

```typescript
export interface PathLevel {
  levelName: string;
  address: string;
  addressingMode: AddressingMode;
}

export interface ParsedPath {
  raw: string;
  normalised: string;
  root: string;
  levels: PathLevel[];
  depth: number;
}

export interface PathValidationResult {
  valid: boolean;
  errors: string[];
}

export interface UnresolvableFlag {
  path: string;
  reason: UnresolvableReason;
  discoveredAt: 'click-time' | 'restore-time';
}
```
