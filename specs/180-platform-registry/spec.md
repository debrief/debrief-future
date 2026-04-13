# Feature Specification: Platform Registry — Unified Vessel Class + Platform Tree

**Feature Branch**: `180-platform-registry`  
**Created**: 2026-04-13  
**Status**: Draft  
**Epic**: E10 — NL-Assisted Catalog Discovery  
**Input**: User description: "[E10] Platform registry — unified vessel class + platform tree in `shared/data/platform-registry.yaml`; platforms as leaf instances under their class; Python + TypeScript loaders; seeded with 10 known platforms"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Resolve Platform Identity from Registry (Priority: P1)

A downstream service (such as the STAC save handler or import pipeline) needs to look up a platform identifier and receive the full set of metadata derived from that platform's position in the vessel class tree. For example, resolving `NELSON` should return its display name ("HMS Nelson"), nationality ("GB"), vessel class path ("surface/warship/frigate/type23"), vessel type ("type23"), vessel role ("frigate"), and domain ("surface") — all derived from where `NELSON` sits in the tree, plus its leaf-level attributes.

**Why this priority**: Platform resolution is the primary purpose of the registry. Every downstream consumer (schema enrichment, save-time resolution, import warnings, CQL2 filtering) depends on this capability. Without it, no other E10 item can proceed.

**Independent Test**: Load the registry file, call the resolver with a known platform ID, and verify all returned fields match the expected values derived from the tree structure.

**Acceptance Scenarios**:

1. **Given** the registry file exists with platform `NELSON` under `surface > warship > frigate > type23`, **When** the resolver is called with `platform_id = "NELSON"`, **Then** it returns `{ name: "HMS Nelson", short_name: "NLSN", nationality: "GB", vessel_class: "surface/warship/frigate/type23", vessel_type: "type23", vessel_role: "frigate", domain: "surface" }`.
2. **Given** the registry file exists, **When** the resolver is called with `platform_id = "UNKNOWN_SHIP"` (not in registry), **Then** it returns `None` / `undefined` (indicating unregistered platform).
3. **Given** the registry file exists, **When** the resolver is called with an empty string or null platform ID, **Then** it returns `None` / `undefined` without error.

---

### User Story 2 — Enumerate All Registered Platforms (Priority: P2)

A build-time script or UI component needs to list all known platforms in the registry, along with their resolved metadata, for purposes such as populating dropdown menus, generating enum files for LLM prompts, or validating import data.

**Why this priority**: Enumeration enables downstream features like build-time enum extraction (#187), import handler warnings (#182), and future UI pickers. It is the second most important capability after single-platform resolution.

**Independent Test**: Load the registry, call the enumeration function, and verify the returned list contains all 10 seeded platforms with correct metadata for each.

**Acceptance Scenarios**:

1. **Given** the registry is seeded with 10 known platforms, **When** the enumeration function is called, **Then** it returns exactly 10 platform entries, each with a platform ID, name, nationality, and full vessel class path.
2. **Given** the registry contains platforms under different vessel class branches, **When** enumeration is called, **Then** platforms from all branches (surface and subsurface) are included.
3. **Given** a new platform is added to the JSON file under an existing class, **When** the registry is reloaded and enumeration is called, **Then** the new platform appears in the list with correctly derived metadata.

---

### User Story 3 — Navigate the Vessel Class Taxonomy Tree (Priority: P3)

A downstream consumer needs to traverse the vessel class hierarchy itself — for example, to find all platforms of a given class, to list all frigate types, or to walk the tree for display purposes. The registry loaders expose the tree structure, not just individual platform lookups.

**Why this priority**: Tree traversal supports vessel taxonomy filtering (#133), CQL2 `array_filter` evaluation (#185), and the stakeholder demo UI (#190). It is valuable but not blocking for the immediate next items (#181, #182).

**Independent Test**: Load the registry, call the tree traversal function for vessel role "frigate", and verify all frigate-class platforms (NELSON, ARGYLL, etc.) are returned.

**Acceptance Scenarios**:

1. **Given** the registry tree has multiple frigate classes (type23, type26, fremm), **When** the consumer queries for all platforms under "frigate", **Then** all platforms across all frigate subclasses are returned.
2. **Given** the registry tree, **When** the consumer queries for all platforms under "surface", **Then** only surface-domain platforms are returned (no submarines).
3. **Given** a vessel class node with no platform instances (e.g., "fremm" has a `_class` entry but no leaf platforms), **When** the consumer queries that class, **Then** it returns an empty list of platforms but still recognises the class as valid.

---

### User Story 4 — Consistent Resolution Across Python and TypeScript (Priority: P2)

Both the Python service layer and the TypeScript frontend need to consume the same registry file and produce identical resolution results. An analyst looking up "NELSON" in the VS Code extension must see the same metadata that the Python STAC save handler writes to `item.json`.

**Why this priority**: Cross-language consistency is a hard requirement of the schema-first architecture. A mismatch between Python and TypeScript resolution would cause data integrity issues in the STAC catalog.

**Independent Test**: Load the registry in both Python and TypeScript loaders, resolve the same platform ID in both, and compare field-by-field that the outputs are identical.

**Acceptance Scenarios**:

1. **Given** the same registry JSON file, **When** both Python and TypeScript loaders resolve `platform_id = "MASON"`, **Then** both return identical values for all fields (name, nationality, vessel_class, vessel_type, vessel_role, domain).
2. **Given** the same registry JSON file, **When** both loaders enumerate all platforms, **Then** both return the same count and the same set of platform IDs.
3. **Given** a platform ID not in the registry, **When** both loaders attempt resolution, **Then** both return their language-appropriate "not found" value (Python: `None`, TypeScript: `undefined`).

---

### Edge Cases

- What happens when the registry JSON file is missing or unreadable? The loader raises/throws a clear error at load time rather than silently returning empty results.
- What happens when a platform entry is malformed (e.g., missing `nationality`)? The loader reports a validation error identifying the specific platform and missing field.
- What happens when two platforms share the same ID in different branches of the tree? The loader rejects the file with a duplicate-ID error at load time.
- What happens when the tree has deeply nested classes (more than the expected 4 levels)? The resolution logic handles arbitrary depth, deriving `domain` from the first segment and `vessel_type` from the immediate parent of the leaf.
- What happens when a `_class` metadata node is missing for a vessel class? The class is still valid; `full_name` defaults to the node key.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a single JSON registry file at `shared/data/platform-registry.json` that defines the vessel class hierarchy as a tree, with vessel classes as interior nodes and individual platforms as leaf entries.
- **FR-002**: Each platform leaf entry MUST include at minimum: a platform ID (the JSON key), a human-readable `name`, and a `nationality` (ISO 3166-1 alpha-2 country code).
- **FR-003**: Each platform leaf entry MAY include a `short_name` field (abbreviated identifier for compact display).
- **FR-004**: Each vessel class interior node MAY include a `_class` metadata entry with a `full_name` field providing a human-readable class label.
- **FR-005**: The system MUST derive the following fields from a platform's position in the tree: `domain` (first path segment), `vessel_role` (grandparent of the platform leaf), `vessel_type` (parent of the platform leaf), and `vessel_class` (full slash-separated path from root to the platform's parent node).
- **FR-006**: The system MUST provide a Python loader that reads the JSON file and exposes: (a) single-platform resolution by ID, (b) enumeration of all platforms, and (c) tree traversal by class path.
- **FR-007**: The system MUST provide a TypeScript loader that reads the same JSON file and exposes the same three capabilities as the Python loader.
- **FR-008**: Both loaders MUST produce identical resolution results for the same platform ID given the same registry file.
- **FR-009**: The registry MUST be seeded with the 10 known platforms currently hardcoded in `scripts/enrich-legacy-catalog.py` (`NELSON`, `COLLINGWOOD`, `FRIGATE`, `OWNSHIP`, `SENSOR`, `SUBJECT`, `TARGET`, `TMA_TRACK`, `OWNSHIP_A`, `OWNSHIP_B`).
- **FR-010**: The loaders MUST validate the registry at load time and report errors for: missing/unreadable file, invalid JSON, duplicate platform IDs across branches, and malformed platform entries (missing required fields).
- **FR-011**: The resolution logic MUST handle arbitrary tree depth, not just the 4-level structure used by the initial seed data.
- **FR-012**: Platform IDs MUST be case-sensitive (matching the conventions of the existing import pipeline).

### Key Entities

- **Platform**: A specific vessel instance (e.g., "HMS Nelson"). Identified by a unique `platform_id` string. Carries intrinsic attributes (`name`, `short_name`, `nationality`) and position-derived attributes (`domain`, `vessel_role`, `vessel_type`, `vessel_class`).
- **Vessel Class Node**: An interior node in the taxonomy tree representing a category of vessels (e.g., "type23", "frigate", "warship"). May carry a `_class` metadata entry with a `full_name`. Contains child nodes (further class refinements) and/or platform leaf entries.
- **Resolved Platform Record**: The complete set of metadata for a platform, combining its leaf-level attributes with its position-derived attributes. This is the output of a registry lookup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A single lookup of any registered platform by ID completes in under 10 milliseconds in both languages, ensuring registry resolution adds no perceptible delay to import or save operations.
- **SC-002**: All 10 seeded platforms resolve correctly in both Python and TypeScript loaders, with field-by-field parity confirmed by automated cross-language tests.
- **SC-003**: The registry file is the single source of truth — no platform metadata is hardcoded elsewhere in the codebase after this feature ships (the `PLATFORM_VESSEL_MAP` in `enrich-legacy-catalog.py` is superseded).
- **SC-004**: Adding a new platform to the registry requires editing only the JSON file — no code changes are needed for the new platform to be resolvable.
- **SC-005**: Load-time validation catches 100% of structural errors (duplicate IDs, missing required fields, malformed entries) with clear error messages identifying the specific problem.
- **SC-006**: The registry tree faithfully represents the vessel class taxonomy from the E10 epic design, matching the hierarchy documented in the epic breakdown.

## Assumptions

- The 10 existing platforms from `PLATFORM_VESSEL_MAP` in `scripts/enrich-legacy-catalog.py` represent the complete set of initially known platforms. The seed data will use the corrected taxonomy from the E10 epic (e.g., `COLLINGWOOD` is a Type 45 destroyer per the epic's registry design, not a Type 23 frigate as mapped in the current enrich script — both are addressed in the seed).
- The JSON file format uses the tree structure documented in the E10 epic: `vessel_classes` as the root key, with `surface` and `subsurface` as top-level domains.
- JSON is the project's standard data interchange format (consistent with STAC items, GeoJSON, vessel-taxonomy.json). Both Python and TypeScript read JSON natively with no additional dependencies.
- The `_class` metadata convention (underscore-prefixed key to distinguish class metadata from child nodes/platforms) is sufficient to disambiguate interior node metadata from child entries.
- The registry file lives in `shared/data/` rather than inside any service directory, because it represents domain knowledge shared across the entire system.
- A future UI for editing the registry will read and write JSON directly — no format conversion needed.
- Organisation-specific registry overlays (via `contrib/`) are explicitly out of scope for this feature.

## Dependencies

- **None** — this is a foundation item with no upstream dependencies. It is the first item in E10 Phase 0.

## Out of Scope

- Schema changes to LinkML/TrackProperties (that is #181)
- Save-time or import-time registry resolution integration (that is #182, #183)
- Sample catalog regeneration (that is #184)
- CQL2 `array_filter` extension (that is #185)
- Organisation-specific registry overlays via `contrib/`
- UI for browsing or editing the registry
- Runtime registry modification (the file is static; changes require editing the JSON file)
