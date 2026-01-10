# Research: debrief-stac

**Feature**: Local STAC Catalog Operations
**Date**: 2026-01-09
**Status**: Complete

## Technical Decisions

### TD-001: STAC Specification Version

**Decision**: Use STAC 1.0.0 (current stable release)

**Rationale**:
- STAC 1.0.0 is the production-ready specification
- Wide ecosystem support (stac-validator, pystac, stac-browser)
- Stable API - no breaking changes expected

**Alternatives Considered**:
- STAC 1.1.0-beta: Rejected - unstable, may change
- Custom format: Rejected - loses ecosystem tooling

### TD-002: Python Library vs Direct JSON Manipulation

**Decision**: Direct JSON manipulation with Pydantic validation

**Rationale**:
- pystac adds unnecessary complexity for our use case
- Constitution Article IX: Minimal, vetted dependencies
- Direct manipulation gives full control over file structure
- Pydantic provides validation without heavy runtime dependency

**Alternatives Considered**:
- pystac library: Rejected - heavy dependency, abstracts too much
- No validation: Rejected - violates Constitution Article II (Schema Integrity)

### TD-003: FeatureCollection Storage Strategy

**Decision**: Single GeoJSON file per plot (`features.geojson`)

**Rationale**:
- Simplicity - one file per plot for all features
- Performance acceptable for target use case (thousands, not millions of features)
- Atomic writes - update entire file, no partial states

**Alternatives Considered**:
- Multiple files per feature type: Rejected - over-engineering for current scale
- SQLite/GeoPackage: Rejected - adds complexity, reduces portability
- Streaming JSON: Deferred - can add later if >10k features common

### TD-004: Concurrent Write Handling

**Decision**: Last-write-wins with advisory file locking

**Rationale**:
- Single-user desktop use case is primary target
- File-level locking sufficient for rare concurrent access
- No need for transaction log complexity

**Alternatives Considered**:
- Full ACID transactions: Rejected - over-engineering for file-based storage
- Merge conflicts: Rejected - GeoJSON merge is complex and error-prone
- Queue-based writes: Deferred - consider if multi-user scenarios emerge

### TD-005: MCP Integration Approach

**Decision**: FastMCP for tool registration with thin wrappers

**Rationale**:
- FastMCP provides decorator-based tool registration
- Thin wrappers keep domain logic in pure Python
- Constitution Article IV: Services have zero MCP dependency in core

**Alternatives Considered**:
- Raw MCP protocol: Rejected - more boilerplate
- mcp-common (planned): Deferred - not yet implemented
- REST API: Rejected - MCP is project standard

## Edge Case Handling

### EC-001: Disk Full During Asset Copy

**Handling Strategy**:
1. Check available space before copy (best effort)
2. Use atomic copy pattern (copy to temp, rename)
3. Clean up temp file on failure
4. Raise `IOError` with clear message

**Implementation Notes**:
- Python's `shutil.copy2` handles most edge cases
- Consider `os.statvfs()` for space check on Unix
- Windows space check via `shutil.disk_usage()`

### EC-002: Invalid GeoJSON Geometry

**Handling Strategy**:
1. Validate geometry type is known (Point, LineString, Polygon, Multi*)
2. Validate coordinates are numeric arrays
3. Do NOT validate geometric correctness (self-intersection, winding order)
4. Raise `ValueError` with specific field reference

**Rationale**: Full geometric validation is expensive and rarely needed for display. Source data quality is loader's responsibility.

### EC-003: Large FeatureCollections (>10k features)

**Handling Strategy**:
1. No artificial limits - accept large collections
2. Warn in documentation about performance implications
3. Load/save entire file (no streaming for v1)
4. Consider chunking or spatial indexing for future versions

**Performance Notes**:
- 10k simple Point features ≈ 2MB JSON ≈ 50ms parse time
- Acceptable for target use case
- Defer optimization until profiling shows need

### EC-004: Corrupted catalog.json

**Handling Strategy**:
1. Validate JSON syntax on load
2. Validate minimum STAC structure (type, id, links)
3. Raise `CatalogCorruptedError` with recovery suggestions
4. Do NOT attempt auto-recovery (data sovereignty)

**Recovery Guidance**:
- Manual inspection and repair
- Re-create catalog with `create_catalog(force=True)` (future)
- Restore from backup if available

## Dependency Analysis

### Required Dependencies

| Dependency | Version | Purpose | Constitution Check |
|------------|---------|---------|-------------------|
| pydantic | >=2.0.0 | Data validation | ✓ Already in use |
| debrief-schemas | workspace | Generated models | ✓ Internal package |

### Optional Dependencies

| Dependency | Version | Purpose | Notes |
|------------|---------|---------|-------|
| mcp | >=1.0.0 | MCP server | Optional extra for MCP exposure |

### Rejected Dependencies

| Dependency | Reason for Rejection |
|------------|---------------------|
| pystac | Heavy, over-abstraction |
| shapely | Not needed for basic geometry |
| geopandas | Heavy, not needed for JSON ops |

## Performance Considerations

### Target Metrics

- Catalog creation: <100ms
- Plot creation: <50ms
- Feature addition (1000 features): <500ms
- Plot read: <100ms
- Catalog listing (100 plots): <200ms

### Benchmarking Notes

- All operations are I/O bound, not CPU bound
- SSD vs HDD will dominate performance differences
- JSON parsing is fast for target data sizes

## Security Considerations

### Path Traversal Prevention

- Validate plot IDs contain no path separators
- Use `pathlib` for all path operations
- Resolve paths before operations

### No Secrets in Assets

- Assets are user data files, not credentials
- Provenance metadata contains file paths, not contents
- No execution of asset contents

## Open Questions (Resolved)

1. ~~How to handle concurrent writes?~~ → Last-write-wins (TD-004)
2. ~~MCP server approach?~~ → FastMCP wrappers (TD-005)
3. ~~Large file handling?~~ → Accept with documentation warnings (EC-003)
