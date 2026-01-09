# Future Debrief: Tracer Bullet Delivery Plan

## Naming

- **Future Debrief** — project name for the modernization effort
- **Debrief** — the application name
- **Version 4.x** — new version series (legacy is v3.x, branded "Debrief NG")

## Repo Structure

```
debrief/
├── schemas/                    # LinkML master schemas + generators
│   ├── src/
│   │   ├── linkml/            # Master .yaml schemas
│   │   ├── generated/
│   │   │   ├── python/        # Pydantic models
│   │   │   ├── json-schema/   # JSON Schema exports
│   │   │   └── typescript/    # TypeScript interfaces
│   │   └── fixtures/          # Golden test data
│   ├── tests/                 # Adherence tests (all three strategies)
│   └── pyproject.toml
│
├── services/
│   ├── mcp-common/            # Shared MCP utilities (singleton)
│   │   ├── src/debrief_mcp/
│   │   └── pyproject.toml
│   │
│   ├── stac/                  # Local STAC catalog management (singleton)
│   │   ├── src/debrief_stac/
│   │   │   ├── core.py        # Domain logic
│   │   │   └── mcp_server.py  # MCP wrapper
│   │   └── pyproject.toml
│   │
│   ├── config/                # Shared user state, XDG config (singleton)
│   │   ├── src/debrief_config/
│   │   └── pyproject.toml
│   │
│   ├── io/                    # Core file handlers (extensible)
│   │   ├── src/debrief_io/
│   │   │   ├── core.py
│   │   │   └── mcp_server.py
│   │   └── pyproject.toml
│   │
│   └── calc/                  # Core analysis tools (extensible)
│       ├── src/debrief_calc/
│       │   ├── core.py
│       │   └── mcp_server.py
│       └── pyproject.toml
│
├── contrib/                    # Organisation-specific extensions
│   └── dstl/                  # Example: DSTL-specific handlers/tools
│       ├── io/
│       │   ├── src/debrief_io_dstl/
│       │   └── pyproject.toml
│       └── calc/
│           ├── src/debrief_calc_dstl/
│           └── pyproject.toml
│
├── apps/
│   ├── loader/                # Electron mini-app
│   │   ├── src/
│   │   └── package.json
│   │
│   └── vscode/                # VS Code extension
│       ├── src/
│       └── package.json
│
├── docs/                      # Detailed documentation
│
├── pyproject.toml             # uv workspace root
├── pnpm-workspace.yaml        # pnpm workspace root
├── README.md                  # Project overview
├── ARCHITECTURE.md            # System design & decisions
├── CONTRIBUTING.md            # How to contribute
├── CHANGELOG.md               # Version history
└── LICENSE
```

## Extension Model

**Singleton services** — one instance, shared by all:
- `stac` — STAC catalog operations
- `config` — user state management  
- `mcp-common` — shared MCP infrastructure

**Extensible services** — core in `/services/`, org-specific in `/contrib/`:
- `io` — file format handlers
- `calc` — analysis tools

Organisations can either:
1. Add their extensions to `/contrib/{org}/` in the main repo
2. Maintain a separate repo with the same structure

## Tooling

| Concern | Choice |
|---------|--------|
| Master schema format | LinkML (.yaml) |
| Python package management | uv workspaces |
| TypeScript package management | pnpm workspaces |
| Shared user state | JSON file in XDG config directory |
| MCP wrappers | Shared infrastructure in `/services/mcp-common/` |

## Build Sequence

### Stage 0: Schemas
Foundation for everything else.

**Deliverables:**
- LinkML models for: GeoJSON profile, STAC conventions, tool metadata
- Generators configured: Pydantic, JSON Schema, TypeScript
- Test fixtures: valid and invalid examples for each schema
- Adherence tests: golden fixtures, round-trip, schema comparison
- CI pipeline validating all derived schemas

**Exit criteria:** Can generate all derived schemas, all tests pass, adding a field to LinkML propagates correctly to all targets.

### Stage 1: debrief-stac
Local STAC catalog operations.

**Deliverables:**
- Python library using generated Pydantic models
- Create catalog, create plot, read plot, list assets, update plot
- MCP wrapper via mcp-common
- Unit tests against schema fixtures

**Exit criteria:** Can programmatically create a local STAC catalog with a plot Item.

### Stage 2: debrief-io
File parsing (pure transformation).

**Deliverables:**
- REP parser (minimal subset for test data)
- Output as validated GeoJSON features
- MCP wrapper
- Test with provided two-track + reference location dataset

**Exit criteria:** Can parse test REP file, receive validated GeoJSON features.

### Stage 3: debrief-config
Shared user state.

**Deliverables:**
- Python library: read/write known STAC stores to XDG config
- TypeScript equivalent (for apps)
- Platform abstraction (Linux, macOS, Windows paths)

**Exit criteria:** Can register a STAC store from Python, read it from TypeScript.

### Stage 4: Loader Mini-App
Electron orchestration.

**Deliverables:**
- Electron + React app
- Reads debrief-config for available stores
- UI: create new plot / add to existing
- Calls debrief-io → receives features
- Calls debrief-stac → writes to plot
- Copies source file to assets, records PROV

**Exit criteria:** Right-click REP file → choose destination → file loaded into STAC plot with provenance.

### Stage 5: debrief-calc
Context-sensitive analysis tools.

**Deliverables:**
- Tool metadata schema (already in Stage 0)
- 3-4 representative tools across selection contexts
- Tool registry and discovery by context
- MCP wrapper

**Exit criteria:** Can query tools for a selection type, execute tool, receive GeoJSON result.

### Stage 6: VS Code Extension
Display and interaction.

**Deliverables:**
- Reads debrief-config for known stores
- Browse STAC catalog
- Display plot (Leaflet map with tracks, reference location)
- Selection model
- Tool discovery via debrief-calc MCP
- Execute tool → write result → refresh display

**Exit criteria:** Full workflow demonstrable end-to-end.

## Schema Test Strategy

Three complementary approaches:

1. **Golden fixtures** — `/schemas/fixtures/` contains canonical valid/invalid JSON. Each language loads and validates.

2. **Round-trip tests** — Python generates data → JSON → TypeScript deserializes → serializes → Python validates. Proves interoperability.

3. **Schema comparison** — Generated JSON Schema from Pydantic must match generated JSON Schema from LinkML. Structural diff catches drift.

## Dependencies

```
Stage 0 (schemas)
    ↓
Stage 1 (stac) ← depends on schemas
    ↓
Stage 2 (io) ← depends on schemas
    ↓
Stage 3 (config) ← independent, parallel possible
    ↓
Stage 4 (loader) ← depends on stac, io, config
    ↓
Stage 5 (calc) ← depends on schemas
    ↓
Stage 6 (vscode) ← depends on stac, calc, config
```

Note: Stages 2, 3, and 5 could partially overlap once Stage 1 establishes patterns.

## Risks

| Risk | Mitigation |
|------|------------|
| LinkML learning curve | Timebox Stage 0; fall back to JSON Schema if blocked |
| uv workspace immaturity | Single `pyproject.toml` fallback with path dependencies |
| MCP protocol limitations | mcp-common abstracts; can add REST alongside if needed |
| Electron complexity | Keep loader minimal — load workflow only |
