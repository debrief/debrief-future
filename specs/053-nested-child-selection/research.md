# Research: Nested Child Selection

**Feature**: 053-nested-child-selection
**Date**: 2026-02-07
**Status**: Complete

## Research Questions

### RQ-1: Path Format — JSON Pointer (RFC 6901) vs Custom

**Decision**: Adopt RFC 6901 escaping conventions (`~0` for `~`, `~1` for `/`) but use a domain-specific path structure, not full JSON Pointer syntax.

**Rationale**: Full JSON Pointer targets a single value in a JSON document using `/`-separated tokens where each token is a property name or array index. Our paths are semantic: they alternate between **level names** (e.g., `positions`, `segments`) and **addresses** (IDs or numeric indices). This is closer to a URI path than a JSON Pointer, but RFC 6901 escaping is well-specified and sufficient for our needs.

**Alternatives considered**:
- **Full JSON Pointer**: Too coupled to JSON document structure. Our paths describe a domain hierarchy, not a JSON traversal. Example: `/properties/positions/4` (JSON Pointer) vs `positions/4` (ours).
- **Dot-separated paths** (e.g., `track-001.positions.4`): Dots appear in domain identifiers (e.g., `hms.defender`), making escaping more complex. Forward slash is less common in maritime IDs.
- **Array-based paths** (e.g., `["positions", 4]`): Requires JSON serialisation for every path, making selection state heavier and less human-readable.

### RQ-2: Level Addressing Modes — How to Distinguish ID-based vs Index-based

**Decision**: Define a `LevelDefinition` registry in the shared schema. Each level name maps to an addressing mode (`id` or `index`). Consumers use this registry to interpret path segments correctly.

**Rationale**: The spec requires (FR-003) that some levels use ID-based addressing (e.g., `/segments/leg-alpha`) and others use index-based (e.g., `/positions/4`). Hard-coding this knowledge in every consumer is fragile. A shared registry makes the interpretation consistent and extensible.

**Registry (initial)**:

| Level Name | Addressing Mode | Description |
|------------|----------------|-------------|
| `positions` | `index` | Individual position within a track or segment |
| `segments` | `id` | Named track segment within a track |

**Alternatives considered**:
- **Convention-based** (numeric = index, non-numeric = ID): Ambiguous when IDs happen to be numeric (e.g., segment `001`).
- **Prefix-based** (`#4` for index, `leg-alpha` for ID): Introduces another escaping layer and is non-standard.
- **Per-path metadata**: Embedding addressing mode in each path would make paths verbose.

### RQ-3: Backward Compatibility Strategy

**Decision**: Extend the existing `featureIds` array to accept path strings. A single-segment path (no `/`) is semantically identical to a flat feature ID, preserving full backward compatibility.

**Rationale**: The existing `FeatureSelection.featureIds` field is typed as `string[]`. Path strings are strings. No type change is needed. Existing code that writes flat IDs (`"track-001"`) produces valid single-segment paths. Existing code that reads `featureIds` and treats them as opaque IDs will continue to work — it simply won't understand deeper paths, which is acceptable since those consumers will be updated incrementally.

**Migration path**:
1. Add path utility functions (parse, validate, getRoot, getDepth) to `session-state` package
2. Update `FeatureSelection` schema to document path semantics
3. Update consumers incrementally: map view, properties panel, tool matching
4. No breaking change; no version bump required

**Alternatives considered**:
- **New field** (`selectionPaths` alongside `featureIds`): Doubles the API surface and creates ambiguity about which field to use.
- **Wrapper type** (change `string[]` to `SelectionPath[]`): Breaking change to all consumers simultaneously.

### RQ-4: Selection Path Validation Strategy

**Decision**: Two-tier validation:
1. **Structural validation** (always applied): Non-empty, no trailing slash after normalisation, valid RFC 6901 escape sequences, no empty segments.
2. **Semantic validation** (optional, consumer-side): Level names exist in registry, addressing modes match, referenced data exists.

**Rationale**: The selection state itself should be lightweight and not require access to feature data for validation. Structural validation catches malformed paths. Semantic validation (does position 42 exist?) is the responsibility of consumers that resolve paths to data.

**Alternatives considered**:
- **Full validation at write time**: Requires access to feature data in the selection state, violating the current architecture where the store is data-agnostic.
- **No validation**: Risks storing garbage paths that cause downstream errors.

### RQ-5: Tool Matching with Hierarchical Selections

**Decision**: Tools continue to specify requirements as `SelectionRequirement` (kind + count). The `ToolMatchAdapter` extracts the **root feature ID** from each selection path to determine feature kind. Leaf-only semantics mean a child selection counts as one selection of the root feature's kind.

**Rationale**: Tools currently match based on feature kind counts (e.g., "requires 2 TRACKs"). A selection of `track-001/positions/4` is still a selection involving `track-001`, which has kind `TRACK`. This preserves existing tool matching logic while allowing tools to optionally inspect path depth for more specific requirements in the future.

**Future extension**: Tools may add optional `depth` requirements (e.g., "requires 1 TRACK at position depth") but this is out of scope for this feature.

**Alternatives considered**:
- **Separate kind for child selections**: Inventing kinds like `TRACK_POSITION` would require updating all tool definitions and the kind enumeration.
- **Ignore child selections in tool matching**: Would make tools that require "2 tracks" not match when positions within 2 tracks are selected, which is counterintuitive.

### RQ-6: Unresolvable Path Handling

**Decision**: Paths that reference non-existent elements (e.g., position index out of bounds after data reload) are retained in the selection state and flagged as unresolvable by the UI. The selection store does not remove them.

**Rationale**: Per the spec edge case, paths should be retained but marked. This prevents data-dependent side effects in the selection store and gives the user visibility into stale selections. The resolution check is a consumer concern (map view, properties panel).

**Alternatives considered**:
- **Auto-prune stale paths**: Requires the store to subscribe to data changes, coupling selection and data lifecycle.
- **Error on unresolvable**: Would clear the user's selection unintentionally during data reload.

## Technology Choices

### Path Parsing Library

**Decision**: No external library. Implement path utilities (parse, serialise, validate, escape, unescape) as pure functions in the `session-state` package.

**Rationale**: The path format is simple (split on `/`, unescape `~0`/`~1`). RFC 6901 libraries exist but add a dependency for ~20 lines of logic. Constitution Article IX requires minimal dependencies.

### Schema Extension

**Decision**: Extend the LinkML `session-state.yaml` schema to add `LevelDefinition` enum/class. Regenerate TypeScript and Pydantic types.

**Rationale**: Constitution Article II requires schema-first development. The level registry must be in the shared schema so all consumers agree on addressing modes.

### Testing Approach

**Decision**:
- **Unit tests**: Path utilities (parse, validate, escape round-trip), selection store actions with paths
- **Contract tests**: Golden fixture JSON files with valid/invalid path examples
- **Integration tests**: Map click → path-based selection → properties panel update → tool matching

**Rationale**: Constitution Article VI requires all three test types. Path utilities are pure functions well-suited to exhaustive unit testing. Golden fixtures ensure cross-language consistency.
