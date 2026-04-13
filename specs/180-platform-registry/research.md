# Research: Platform Registry — Unified Vessel Class + Platform Tree

**Feature**: 180-platform-registry
**Date**: 2026-04-13

## R1: Package Placement — Where Do the Registry and Loaders Live?

**Decision**: Create a new `shared/data/` directory as a dual-language package housing both the JSON registry file and its Python + TypeScript loaders.

**Rationale**: The platform registry is domain knowledge, not storage infrastructure or UI. It sits at the same architectural level as `shared/schemas/` (which is already a dual-language package with both `pyproject.toml` and `package.json`). Placing registry + loaders together follows the repository's established convention of co-locating related Python and TypeScript code under `shared/`.

**Alternatives considered**:
- **JSON in `shared/data/`, Python loader in `services/stac/`, TS loader in `@debrief/utils`**: Rejected because it fragments the feature across three packages. Downstream consumers would import the resolver from different locations depending on language, complicating discoverability. Also violates the "single source of truth" principle — the loader code should live next to the data it loads.
- **JSON in `shared/schemas/`**: Rejected because the registry is not a schema. It's reference data that happens to be consumed by schema-typed code. Conflating the two would blur the boundary between data definitions and data instances.
- **Plain directory, no package**: Rejected because the loaders need to be importable from services (`debrief-stac`, `debrief-io`) and from TypeScript frontends. Making `shared/data/` a workspace member enables clean `from debrief_data import ...` and `import { ... } from '@debrief/data'` patterns.

**Package details**:
- Python: `debrief-data` (uv workspace member at `shared/data/`, src layout `src/debrief_data/`)
- TypeScript: `@debrief/data` (pnpm workspace member at `shared/data/`)
- JSON file: `shared/data/platform-registry.json` (consumed at load time by both languages)

## R2: JSON File Format — Tree Structure and Convention

**Decision**: Use JSON with the unified tree structure from the E10 epic design. `vessel_classes` is the root key. Interior nodes are vessel class categories. Leaf entries with a `name` field are platforms. `_class` entries carry class-level metadata.

**Rationale**: JSON is the project's standard data interchange format — STAC items, GeoJSON, the vessel-taxonomy fixture, and schema fixtures all use JSON. Using JSON for the registry avoids introducing a new format and eliminates any need for build-time conversion or additional parser dependencies. Both Python and TypeScript read JSON natively. The `_class` convention (underscore prefix) cleanly separates class metadata from child nodes and platform entries, with no ambiguity — platform entries always have a `name` field, `_class` entries have a `full_name` field.

**Alternatives considered**:
- **YAML instead of JSON**: Considered for readability (YAML's indentation-based nesting is visually cleaner for deep trees). Rejected because: (1) no other data file in the project uses YAML — it would introduce a new technology; (2) it would require PyYAML as an explicit dependency and either `js-yaml` or a build-time conversion step for TypeScript; (3) analysts will never edit the file by hand — a future custom UI will read/write JSON directly, making YAML's human-editing advantage irrelevant.
- **Flat list with parent references**: Rejected because it loses the structural information and requires reconstructing the tree at load time. The JSON tree naturally encodes hierarchy.
- **Separate files for taxonomy and platforms**: Rejected because it creates a join dependency — you'd need to resolve a platform's class by looking up a separate taxonomy file. The unified tree makes this implicit.

**Node discrimination rules**:
- A key starting with `_` is metadata (currently only `_class`)
- A key whose value has a `name` property is a platform leaf
- All other keys are child class nodes (recurse)

## R3: Loading Strategy — Native JSON in Both Languages

**Decision**: Both Python and TypeScript loaders read the same JSON file directly using their standard library JSON parsers. No build step, no format conversion, no additional dependencies.

**Rationale**: JSON is natively supported by both `json` (Python stdlib) and `JSON.parse` (JavaScript/TypeScript built-in). Since the registry is already in JSON format, both loaders can read it directly at load time. This is the simplest possible approach — no build scripts, no generated artifacts, no dependency management concerns. It also means the file is immediately consumable by any future tooling (editors, validation scripts, CI checks) without requiring a parser library.

**Alternatives considered**:
- **YAML source with build-time conversion**: The original plan. Rejected because it adds a build step, a conversion script, and a generated artifact to manage. The only benefit (YAML readability) was outweighed by the cost of introducing a new format to the project.
- **TypeScript module with embedded data**: Rejected because it would require regenerating the module on every registry edit and loses the advantage of having a single, tool-agnostic source file.

## R4: Cross-Language Parity Testing Strategy

**Decision**: Golden fixture approach — a single JSON file defines expected resolution results for all 10 seeded platforms. Both Python and TypeScript test suites load the same fixture and assert field-by-field parity.

**Rationale**: This is the same pattern used by `shared/schemas/` for schema adherence tests (golden fixtures in `shared/schemas/fixtures/`). A shared fixture ensures Python and TypeScript are tested against the same truth, making cross-language drift impossible.

**Alternatives considered**:
- **Separate test assertions per language**: Rejected because independently authored assertions could diverge silently. A developer might update the Python test to reflect a registry change but forget the TypeScript test.
- **Cross-process integration test** (Python resolves → pipe → TypeScript validates): Rejected as over-engineered for this case. The golden fixture approach is simpler and catches the same class of bugs.

**Fixture format**: `shared/data/tests/fixtures/expected-platforms.json` — array of resolved platform records, each with all fields (id, name, short_name, nationality, vessel_class, vessel_type, vessel_role, domain).

## R5: Relationship to Existing Vessel Taxonomy Fixture

**Decision**: The platform registry and `vessel-taxonomy.json` are complementary, not competing. The taxonomy fixture defines the classification hierarchy for UI rendering (labels, nesting). The platform registry defines which real-world vessels belong to which class. They share the same tree structure but serve different consumers.

**Rationale**: `vessel-taxonomy.json` (#133) provides `VesselTaxonomyNode` objects with `label` and `children` for driving the CascadingMenu UI. The platform registry provides platform instances with `name`, `nationality`, and `short_name` for data enrichment. They are both derived from the same conceptual tree but are consumed in different contexts (UI display vs data resolution). The registry JSON is the authoritative source; the taxonomy fixture could eventually be generated from it (out of scope for this feature).

**Consistency guarantee**: The vessel class path structure (e.g., `surface/warship/frigate/type23`) uses the same slash-separated convention in both files, ensuring interoperability between registry lookups and taxonomy-based filtering. Both files are JSON, making format handling consistent across the project.

## R6: Handling `vessel_role` Derivation at Varying Tree Depths

**Decision**: `vessel_role` is derived from the grandparent of the platform leaf node. `vessel_type` is the immediate parent. `domain` is always the first path segment. `vessel_class` is the full path from root to the platform's parent node.

**Rationale**: The E10 epic defines these derivation rules explicitly. At the standard 4-level depth (domain > role-category > role > type), this gives sensible results: for `NELSON` at `surface/warship/frigate/type23/NELSON`, `domain` = surface, `vessel_role` = frigate, `vessel_type` = type23. For deeper trees (e.g., a hypothetical 5th level), the same rules apply relative to the leaf position — `vessel_type` is always the parent, `vessel_role` is always the grandparent.

**Edge case — shallow trees**: If a platform sits at depth 2 (e.g., `surface/SOME_VESSEL`), `vessel_type` = surface (parent), `vessel_role` is undefined (no grandparent beyond root). The resolver returns `null`/`undefined` for fields that cannot be derived from the platform's position.
