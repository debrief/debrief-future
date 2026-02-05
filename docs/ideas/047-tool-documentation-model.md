# Tool Documentation Model

Language-neutral tool specifications for consistency between Python and TypeScript implementations.

## Problem

As we test more using the web-client, we need tools that match the 'debrief-tools' model. Tools may be duplicated in Python and TypeScript, requiring a language-neutral documentation model to ensure both implementations behave identically.

## Proposed Solution

Create a shared tool specification system in `shared/tools/` with:

1. **Markdown specs with pseudocode** — Full algorithmic specifications with step-by-step logic
2. **Golden examples** — Input/output JSON pairs that define correct behavior
3. **Hierarchical organization** — Folder-based categories (e.g., `track/styling/`)
4. **Template with 9 sections**:
   - Metadata (name, version, category, status)
   - MCP (LLM-optimized descriptions for Claude)
   - Inputs (schema references, constraints, defaults)
   - Outputs (ToolResult schema reference)
   - Algorithm (pseudocode specification)
   - Edge Cases (empty inputs, invalid data, boundaries)
   - Examples (inline small, sister files for larger)
   - Changelog (version history)
   - References (related tools, papers, legacy code)

5. **Implementation linkage** — Python decorators and TypeScript annotations reference spec path (e.g., `@tool_spec("track/styling/set-track-color.1.0")`)

6. **Versioning** — Semver in filename (e.g., `set-track-color.1.0.md`)

## Success Criteria

- [ ] Template created at `shared/tools/TEMPLATE.md` with best-practice examples
- [ ] Four initial specs in `shared/tools/track/styling/`:
  - set-track-color
  - apply-symbol-style
  - label-interval
  - symbol-interval
- [ ] Python decorator infrastructure for `@tool_spec`
- [ ] Fixture directory structure established
- [ ] Example input/output pairs for each initial tool

## Constraints

- Inputs use existing GeoJSON feature schemas (no new schemas needed)
- Outputs use existing ToolResults schemas
- Golden examples are source of truth for testing
- Each implementation independently validates against fixtures

## Out of Scope

- Actual Python/TypeScript implementations of the initial tools
- CI integration for cross-implementation testing
- Migration of existing tools to the new model

## Interview Decisions

### Primary Goals
- **Consistency** (primary) — Ensure Python and TypeScript implementations behave identically
- **Testing** — Shared test fixtures validate both implementations
- **Discoverability** — MCP clients understand available tools

### Specification Detail Level
- Full algorithmic specification (step-by-step, no ambiguity)
- Golden examples for verification of implementation consistency

### Format
- Markdown with pseudocode for algorithm logic
- Small JSON examples inline, larger examples as sister files
- No new schemas needed — inputs are existing GeoJSON features, outputs use existing ToolResults schemas

### Location
- `shared/tools/` — parallel to `shared/schemas/`
- Hierarchical folder organization (expecting hundreds of tools)
- Starting category: `track/styling/`

### Example Files
- Hybrid approach: inline for small, sister files for larger
- Naming: `[tool-name].[example-name].input.json` and `[tool-name].[example-name].output.json`

### Implementation Linkage
- Decorator/annotation referencing spec path (e.g., `@tool_spec("track/styling/set-track-color.1.0")`)

### Testing Strategy
- Golden examples are source of truth
- Each implementation independently validates against fixtures
- If bug found: fix golden example first, then both implementations conform

### Versioning
- Semver in filename (e.g., `set-track-color.1.0.md`)
- Implementations declare target version via decorator

### MCP Integration
- Dedicated MCP section in each spec
- LLM-optimized descriptions with explicit control over presentation to Claude
