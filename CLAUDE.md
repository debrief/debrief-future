# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Future Debrief** — ground-up rebuild of Debrief maritime tactical analysis platform (v4.x). Currently in pre-implementation planning phase; no code exists yet.

Key architectural decisions:
- **Thick services, thin frontends** — domain logic in Python, frontends (VS Code, Electron, Jupyter) handle orchestration only
- **Schema-first** — LinkML master schemas generate Pydantic, JSON Schema, TypeScript
- **STAC for storage** — plots stored as STAC Items with GeoJSON payloads
- **MCP for integration** — services exposed via Model Context Protocol

## Planned Repository Structure

```
debrief/
├── shared/
│   ├── schemas/       # LinkML + generated Pydantic/JSON Schema/TypeScript
│   └── components/    # Shared React components (map, timeline)
├── services/
│   ├── mcp-common/    # Shared MCP utilities (singleton)
│   ├── stac/          # STAC catalog ops (singleton)
│   ├── config/        # User state, XDG config (singleton)
│   ├── io/            # File format handlers (extensible)
│   └── calc/          # Analysis tools (extensible)
├── contrib/           # Organisation-specific extensions
├── apps/
│   ├── loader/        # Electron mini-app
│   └── vscode/        # VS Code extension
└── docs/
```

## Build Sequence (Tracer Bullet)

0. **Schemas** — LinkML models, generators, adherence tests
1. **debrief-stac** — local STAC catalog operations
2. **debrief-io** — REP file parsing to GeoJSON
3. **debrief-config** — shared user state (Python + TypeScript)
4. **Loader** — Electron app for file loading
5. **debrief-calc** — context-sensitive analysis tools
6. **VS Code Extension** — display, selection, tool invocation

## Governing Principles (from CONSTITUTION.md)

- **Offline by default** — all core functionality works without network
- **Schema tests mandatory** — derived schemas must pass adherence tests before merge
- **Provenance always** — every transformation records lineage
- **Services never touch UI** — return data only
- **Tests required** — no service code merged without tests
- **Specs before code** — no implementation without written specification

## Tooling (Planned)

| Concern | Choice |
|---------|--------|
| Master schema | LinkML |
| Python packaging | uv workspaces |
| TypeScript packaging | pnpm workspaces |
| User config | XDG Base Directory |

## Key Documents

- `CONSTITUTION.md` — immutable development principles (supersedes all other docs)
- `ARCHITECTURE.md` — technical design decisions
- `VISION.md` — strategic context
- `docs/tracer-delivery-plan.md` — implementation roadmap

## Schema Test Strategy

Three approaches required:
1. **Golden fixtures** — canonical valid/invalid JSON in `/shared/schemas/fixtures/`
2. **Round-trip tests** — Python → JSON → TypeScript → JSON → Python
3. **Schema comparison** — Pydantic-generated JSON Schema must match LinkML-generated

## Active Technologies
- Python 3.11+ (generators, Pydantic models), TypeScript 5.x (generated interfaces) + LinkML, linkml-runtime, Pydantic v2, AJV (JSON Schema validation in JS) (000-schemas)
- N/A (schema package produces generated code, not persisted data) (000-schemas)
- Python 3.11+ + Pydantic >=2.0.0, debrief-schemas (workspace), mcp >=1.0.0 (optional) (002-debrief-io)
- N/A (pure transformation service - no persistence) (002-debrief-io)
- Python 3.11+ (primary), TypeScript 5.x (mirror library) + Pydantic >=2.0.0 (Python), platformdirs (XDG paths), zod (TypeScript validation) (003-debrief-config)
- JSON file at XDG config location (~/.config/debrief/config.json on Linux) (003-debrief-config)
- Markdown (command prompts and templates) + None (pure markdown files interpreted by Claude Code) (004-speckit-ui-workflow)
- N/A (no persistent data - modifies workflow templates) (004-speckit-ui-workflow)
- TypeScript 5.x (Electron main + React renderer) + Electron 28+, React 18+, debrief-config (TypeScript), debrief-io (Python via IPC), debrief-stac (Python via IPC) (004-loader-mini-app)
- N/A (all persistence via debrief-stac service) (004-loader-mini-app)

## Recent Changes
- 000-schemas: Added Python 3.11+ (generators, Pydantic models), TypeScript 5.x (generated interfaces) + LinkML, linkml-runtime, Pydantic v2, AJV (JSON Schema validation in JS)
