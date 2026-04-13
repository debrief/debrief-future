# Data Model: Platform Registry — Unified Vessel Class + Platform Tree

**Feature**: 180-platform-registry
**Date**: 2026-04-13

## Entities

### PlatformEntry (JSON leaf node)

The raw platform data as authored in the JSON registry file.

```json
{
  "NELSON": {
    "name": "HMS Nelson",
    "short_name": "NLSN",
    "nationality": "GB"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable display name (e.g., "HMS Nelson") |
| `short_name` | string | No | Abbreviated identifier for compact display (e.g., "NLSN") |
| `nationality` | string | Yes | ISO 3166-1 alpha-2 country code (e.g., "GB", "US") |

The JSON object key (e.g., `"NELSON"`) serves as the platform ID. Platform IDs are case-sensitive.

### VesselClassMeta (JSON `_class` node)

Optional metadata attached to a vessel class node in the tree.

```json
{
  "type23": {
    "_class": { "full_name": "Type 23 (Duke-class)" }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `full_name` | string | No | Human-readable class label. Defaults to the node key if omitted. |

### ResolvedPlatform (output of registry lookup)

The complete metadata for a platform, combining leaf-level attributes with position-derived attributes.

```typescript
interface ResolvedPlatform {
  readonly id: string;            // Platform ID (JSON key, e.g., "NELSON")
  readonly name: string;          // From leaf: "HMS Nelson"
  readonly short_name?: string;   // From leaf: "NLSN" (optional)
  readonly nationality: string;   // From leaf: "GB"
  readonly vessel_class: string;  // Derived: full path to parent ("surface/warship/frigate/type23")
  readonly vessel_type: string;   // Derived: parent node key ("type23")
  readonly vessel_role: string;   // Derived: grandparent node key ("frigate")
  readonly domain: string;        // Derived: first path segment ("surface")
}
```

```python
@dataclass(frozen=True)
class ResolvedPlatform:
    id: str               # Platform ID (JSON key)
    name: str             # From leaf
    nationality: str      # From leaf
    vessel_class: str     # Derived: full path to parent
    vessel_type: str      # Derived: parent node key
    vessel_role: str      # Derived: grandparent node key
    domain: str           # Derived: first path segment
    short_name: str | None = None  # From leaf (optional)
```

### VesselClassNode (in-memory tree representation)

The parsed tree structure used internally by the loaders.

```typescript
interface VesselClassNode {
  readonly key: string;                                    // Node key in the tree (e.g., "frigate")
  readonly full_name?: string;                             // From _class metadata, or key
  readonly children: ReadonlyMap<string, VesselClassNode>; // Subclass nodes
  readonly platforms: ReadonlyMap<string, PlatformEntry>;   // Leaf platforms at this level
}
```

## Relationships

```
platform-registry.json
    │
    └──[loadRegistry()]──→ PlatformRegistry (parsed tree + index)
                                │
                                ├──[resolve(id)]──→ ResolvedPlatform | null
                                │
                                ├──[listPlatforms()]──→ ResolvedPlatform[]
                                │
                                └──[findByClass(path)]──→ ResolvedPlatform[]
```

## Data Flow

1. **Load time (Python)**: `platform-registry.json` → `json.load()` → tree walk → `PlatformRegistry` instance
2. **Load time (TypeScript)**: `platform-registry.json` → `JSON.parse()` / `import` → tree walk → `PlatformRegistry` instance
3. **Resolve time**: Consumer calls `registry.resolve("NELSON")` → walks index to find platform → returns `ResolvedPlatform` with derived positional fields

## Validation Rules

- The JSON file MUST have `vessel_classes` as the root key
- Each platform entry MUST have `name` (non-empty string) and `nationality` (2-letter uppercase string)
- Platform IDs MUST be unique across the entire tree (not just within a branch)
- Platform IDs are case-sensitive strings
- `_class` keys are reserved for vessel class metadata — they are not platform entries
- A node is classified as a platform if its value is a mapping containing a `name` field
- The tree MUST have at least one level below the root (i.e., `vessel_classes` cannot be empty)

## Seed Data Summary

10 platforms from `scripts/enrich-legacy-catalog.py`, mapped to the E10 epic taxonomy:

| ID | Name | Nationality | Vessel Class Path |
|----|------|-------------|-------------------|
| NELSON | HMS Nelson | GB | surface/warship/frigate/type23 |
| COLLINGWOOD | HMS Collingwood | GB | surface/warship/destroyer/type45 |
| FRIGATE | HMS Argyll | GB | surface/warship/frigate/type23 |
| OWNSHIP | HMS Defender | GB | surface/warship/destroyer/type45 |
| SENSOR | HMS Richmond | GB | surface/warship/frigate/type23 |
| SUBJECT | Contact Alpha | GB | subsurface/submarine/ssn/astute |
| TARGET | Contact Bravo | GB | subsurface/submarine/ssk/type212 |
| TMA_TRACK | TMA Solution Track | GB | subsurface/submarine/ssn/trafalgar |
| OWNSHIP_A | HMS Lancaster | GB | surface/warship/frigate/type23 |
| OWNSHIP_B | USS Mason | US | surface/warship/destroyer/arleigh-burke |

## State Transitions

N/A — the registry is a static, immutable data file. It has no runtime state transitions. Changes require editing the JSON file and reloading.
