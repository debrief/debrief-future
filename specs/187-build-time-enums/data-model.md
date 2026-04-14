# Data Model: Build-Time Enum Extraction

**Feature**: 187-build-time-enums
**Date**: 2026-04-14

## Overview

This feature has one output entity (the **EnumBundle**) and several read-only input entities it derives from. The bundle is the contract with the LLM-prompt builder in #188; its shape is captured both here and in `contracts/enum-bundle.schema.json`.

## Output Entity

### `EnumBundle`

The compact JSON artefact written to `shared/data/enum-bundle.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_meta` | `BundleMeta` | yes | Provenance metadata for human reviewers |
| `vessel_class_tree` | `ClassTreeNode` (root) | yes | Hierarchical view of registry interior nodes (no platform leaves) |
| `nationalities` | `string[]` | yes | Sorted, deduplicated nationality codes from registry + catalog |
| `exercise_names` | `string[]` | yes | Sorted, deduplicated exercise names parsed from item titles |
| `tags` | `string[]` | yes | Sorted, deduplicated values from `debrief:tags` across all items |
| `feature_tags` | `string[]` | yes | Sorted, deduplicated values from `debrief:feature_tags` across all items |

**Validation rules:**
- All five list fields MUST be present; empty list is valid (e.g. an empty catalog yields `tags: []`).
- All string entries MUST be non-empty after trim (canonicalisation drops empty/whitespace-only values).
- All lists MUST be sorted alphabetically using a case-insensitive comparator.
- No two entries in the same list MUST share the same canonical key (lower-cased, trimmed).

#### `BundleMeta`

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `tool` | `string` | yes | `"scripts/extract-enum-bundle.py"` |
| `generated_from_registry` | `string` | yes | `"shared/data/platform-registry.json"` (path relative to repo root) |
| `generated_from_catalog` | `string` | yes | `"preview/workspace/samples/local-store"` (path relative to repo root) |
| `exercise_parse_rule` | `string` | yes | `"title prefix before ': '"` |
| `canonicalisation` | `string` | yes | `"trim + lowercase dedup, first-seen casing preserved"` |

The `_meta` block is informational only; the prompt builder ignores it. Underscore prefix mirrors the `_class` convention already used in `platform-registry.json`.

#### `ClassTreeNode`

A recursive structure derived from the platform registry's vessel-class tree, with all platform-instance leaves removed.

```text
ClassTreeNode = {
  "_class"?: { "full_name": string },     # passthrough from registry, only if present
  [child_segment: string]: ClassTreeNode  # interior children only — no platform leaves
}
```

**Construction rule:** A node is included if it has interior children OR carries a `_class` block. A node is excluded (along with all of its content) if it is a platform-instance leaf — defined as a dict that has a `name` field (matching the existing `_is_platform_entry` predicate in `debrief_data.registry`).

**Validation rules:**
- Root node has no `_class` (matches the registry shape).
- Every non-`_class` key MUST be either an interior class node (a dict with at least one of `_class` or further children) or absent.
- Leaf interior nodes (vessel types like `type23`) MUST be empty dicts after platform leaves are stripped, OR contain only `_class`. Either form is accepted; the bundle preserves whichever shape applies.

## Input Entities (read-only)

### `PlatformRegistry`

Loaded via `debrief_data.registry.load_registry()`. The bundle builder reads:
- `registry._tree` (the raw vessel-class tree) — used to project `vessel_class_tree`.
- `registry.list_platforms()` — iterated to harvest `nationality` codes.

The bundle does **not** copy `name`, `short_name`, or `id` from platform leaves into the output (Decision 4 in research.md).

### `CatalogItem` (per `item.json`)

Each `preview/workspace/samples/local-store/<item-id>/item.json` contributes:

| Source path | Used for | Notes |
|-------------|----------|-------|
| `properties.title` | `exercise_names` | Substring before first `": "`; absent → no contribution |
| `properties["debrief:tags"]` | `tags` | List of strings; absent → no contribution |
| `properties["debrief:feature_tags"]` | `feature_tags` | List of strings; absent → no contribution |
| `properties["debrief:platforms"][].nationality` | `nationalities` | List of objects; nationality may be absent on individual entries |

Items are read in alphabetical order of their containing directory name to keep first-seen casing deterministic.

## State and Lifecycle

The bundle has no runtime state. Lifecycle is:
1. Developer changes the registry, the catalog, or the extraction script.
2. Developer runs `scripts/extract-enum-bundle.py`.
3. Script writes `shared/data/enum-bundle.json` (overwriting the previous version).
4. Developer commits the regenerated bundle alongside the underlying changes.
5. Reviewer inspects the bundle diff in the PR.

There are no migrations, schema versions, or persistence concerns.

## Type Mapping

The Python implementation models the bundle with `TypedDict`s in `enum_bundle.py`:

```python
class BundleMeta(TypedDict):
    tool: str
    generated_from_registry: str
    generated_from_catalog: str
    exercise_parse_rule: str
    canonicalisation: str

class EnumBundle(TypedDict):
    _meta: BundleMeta
    vessel_class_tree: dict[str, object]   # recursive — ClassTreeNode
    nationalities: list[str]
    exercise_names: list[str]
    tags: list[str]
    feature_tags: list[str]
```

`vessel_class_tree` is typed as `dict[str, object]` because Python's `TypedDict` cannot express the recursive shape directly; the recursive contract is enforced by the JSON schema in `contracts/enum-bundle.schema.json` and by tests, not by the type checker. This is an acceptable narrowing because the value lives behind a single function (`extract_class_tree`) whose tests pin the shape.

No `Any` is used anywhere in the implementation (Article XV).

## Relationships

```text
PlatformRegistry ──┐
                   ├──► EnumBundle.vessel_class_tree (interior nodes)
                   └──► EnumBundle.nationalities (registry contribution)

CatalogItem ──┬──► EnumBundle.nationalities (catalog contribution)
              ├──► EnumBundle.exercise_names
              ├──► EnumBundle.tags
              └──► EnumBundle.feature_tags
```

The bundle is a strict function of its two inputs. No persistence layer; no caching beyond the in-memory `PlatformRegistry` returned by the loader.
