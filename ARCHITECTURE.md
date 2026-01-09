# Architecture

This document captures the key architectural decisions for Debrief v4.x.

## Design Principles

### Thick Services, Thin Frontends

Domain logic lives in Python services. Frontends (VS Code extension, Electron apps, Jupyter) handle only:

- Policy decisions (e.g., where to store provenance)
- Orchestration between services
- User interaction

This maximises reuse — the same service supports a right-click desktop workflow, an interactive notebook, and an AI-assisted analysis session.

### Schema-First Development

A single source of truth for data structures:

1. **LinkML** — master schemas authored in YAML
2. **Generated outputs** — Pydantic models, JSON Schema, TypeScript interfaces
3. **Adherence tests** — verify all derived schemas match

Changes propagate automatically. No drift between Python and TypeScript representations.

### Open Standards

- **GeoJSON** — track and feature representation
- **STAC** — storage structure (plot = STAC Item, source files = assets)
- **Provenance (PROV)** — audit trail for transformations

## Component Overview

### Shared Libraries

Located in `/shared/`, consumed by services and apps:

| Library | Purpose |
|---------|---------|
| `schemas` | LinkML master schemas, generated Pydantic/JSON Schema/TypeScript |
| `components` | Shared React components (map, timeline, feature list) |

The components library enables UI consistency across Electron apps, VS Code extension webviews, and browser deployments.

### Singleton Services

These exist once, shared across all deployments:

| Service | Purpose |
|---------|---------|
| `stac` | STAC catalog operations — create/read/update plots, manage assets |
| `config` | User state — known STAC stores, preferences (XDG config) |
| `mcp-common` | Shared MCP infrastructure for service wrappers |

### Extensible Services

Core implementations in `/services/`, organisation-specific bundles in `/contrib/`:

| Service | Purpose |
|---------|---------|
| `io` | File format handlers — parse source files to GeoJSON features |
| `calc` | Analysis tools — context-sensitive operations on features |

### Extension Model

Organisations bundle their `io` handlers and `calc` tools together:

```
/contrib/
  dstl/
    io/       # DSTL-specific file formats
    calc/     # DSTL-specific analysis tools
  nato/
    io/
    calc/
```

External organisations may maintain their own repos with the same structure.

### Apps

| App | Purpose |
|-----|---------|
| `loader` | Electron mini-app for file loading workflow |
| `vscode` | VS Code extension for display, selection, tool invocation |

## Data Model

### Plot Structure

A plot is a STAC Item containing:

- **GeoJSON FeatureCollection** — tracks, reference locations, analysis results
- **Assets** — source files (copied on load)
- **Provenance** — lineage linking features to sources and transformations

### GeoJSON Profile

Debrief defines conventions for GeoJSON properties:

- Track features include temporal data, platform metadata
- Sensor contacts link to parent tracks
- Analysis results reference input features

Full profile documented in `/shared/schemas/`.

## Integration Layer

### MCP (Model Context Protocol)

Each Python service follows the pattern:

```
/services/io/
  src/debrief_io/
    core.py          # Domain logic (zero MCP dependency)
    mcp_server.py    # Thin wrapper exposing tools
```

MCP enables:

- VS Code extension invoking Python tools
- LLM orchestration (future)
- Uniform tool discovery and invocation

Shared MCP utilities in `/services/mcp-common/` ensure consistency.

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Master schema | LinkML | Purpose-built for multi-target generation |
| Python packaging | uv workspaces | Fast, modern monorepo support |
| TypeScript packaging | pnpm workspaces | Strict, efficient |
| User config location | XDG Base Directory | Cross-platform standard |
| Spatial storage | STAC | Asset management, catalog browsing, ecosystem tooling |
| Feature format | GeoJSON | Universal, tooling interoperability |
| Service integration | MCP | Emerging standard, thin wrapper layer |

## Deployment Scenarios

The architecture supports:

1. **Desktop analyst** — Electron loader + VS Code extension, local STAC catalogs
2. **Notebook user** — Jupyter importing services directly, in-memory analysis
3. **Team deployment** — STAC server for shared catalogs (future)
4. **Air-gapped** — fully offline, local static catalogs only

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| LinkML learning curve | Timebox; fallback to JSON Schema |
| MCP ecosystem maturity | Thin wrapper; can add REST alongside |
| GeoJSON limitations for complex data | Extensible properties; linked documents for complex structures |

## Document History

| Date | Change |
|------|--------|
| January 2026 | Initial architecture decisions |
