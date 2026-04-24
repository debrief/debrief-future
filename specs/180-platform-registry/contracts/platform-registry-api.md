# Platform Registry API Contract

**Feature**: 180-platform-registry
**Date**: 2026-04-13

This contract defines the public API surface of the platform registry loaders in both Python and TypeScript. Both languages MUST expose identical logical operations with equivalent semantics.

## Types

### ResolvedPlatform

All fields present when a platform is successfully resolved.

```json
{
  "id": "NELSON",
  "name": "HMS Nelson",
  "short_name": "NLSN",
  "nationality": "GB",
  "vessel_class": "surface/warship/frigate/type23",
  "vessel_type": "type23",
  "vessel_role": "frigate",
  "domain": "surface"
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Platform ID (JSON key) |
| `name` | string | No | Human-readable display name |
| `short_name` | string | Yes | Abbreviated identifier |
| `nationality` | string | No | ISO 3166-1 alpha-2 code |
| `vessel_class` | string | No | Full slash-separated path to parent class |
| `vessel_type` | string | No | Immediate parent class node key |
| `vessel_role` | string | Yes | Grandparent class node key (null if tree too shallow) |
| `domain` | string | No | First path segment |

## Operations

### `loadRegistry(path?)`

Load and validate the platform registry from a JSON file.

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `path` | string/Path | No | Package-relative default | Path to the registry file |

**Returns**: `PlatformRegistry` instance

**Errors**:
| Condition | Error |
|-----------|-------|
| File not found | `FileNotFoundError` / `Error("Registry file not found: ...")` |
| Invalid JSON | `ValueError` / `Error("Invalid registry format: ...")` |
| Missing `vessel_classes` root | `ValueError` / `Error("Registry must have 'vessel_classes' root key")` |
| Duplicate platform ID | `ValueError` / `Error("Duplicate platform ID 'X' found at paths ...")` |
| Platform missing `name` | `ValueError` / `Error("Platform 'X' missing required field 'name'")` |
| Platform missing `nationality` | `ValueError` / `Error("Platform 'X' missing required field 'nationality'")` |

### `registry.resolve(platform_id)`

Look up a single platform by ID and return its fully resolved metadata.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `platform_id` | string | Yes | Platform ID to look up |

**Returns**: `ResolvedPlatform | None` (Python) / `ResolvedPlatform | undefined` (TypeScript)

**Behaviour**:
- Returns the resolved platform record if found
- Returns `None`/`undefined` if the ID is not registered
- Empty string or whitespace-only input returns `None`/`undefined`
- Lookup is case-sensitive

### `registry.list_platforms()` / `registry.listPlatforms()`

Enumerate all registered platforms with their fully resolved metadata.

**Returns**: `list[ResolvedPlatform]` (Python) / `readonly ResolvedPlatform[]` (TypeScript)

**Behaviour**:
- Returns all platforms in the registry, each fully resolved
- Order is deterministic (sorted by platform ID, ascending)
- Empty registry returns an empty list

### `registry.find_by_class(class_path)` / `registry.findByClass(classPath)`

Find all platforms registered under a given vessel class path (including all descendant classes).

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `class_path` | string | Yes | Slash-separated path (e.g., "surface/warship/frigate") |

**Returns**: `list[ResolvedPlatform]` (Python) / `readonly ResolvedPlatform[]` (TypeScript)

**Behaviour**:
- Returns all platforms at or below the given class path in the tree
- For `"surface"`, returns all surface-domain platforms
- For `"surface/warship/frigate/type23"`, returns only platforms directly under type23
- Invalid path returns an empty list (no error)
- Order is deterministic (sorted by platform ID, ascending)

### `registry.is_valid_class(class_path)` / `registry.isValidClass(classPath)`

Check whether a class path corresponds to a real node in the taxonomy tree.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `class_path` | string | Yes | Slash-separated path to validate |

**Returns**: `bool` (Python) / `boolean` (TypeScript)

**Behaviour**:
- Returns `True`/`true` if the path resolves to a vessel class node
- Returns `False`/`false` for invalid paths, platform IDs, or empty strings
