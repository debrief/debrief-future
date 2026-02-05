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
├── demo/              # Browser-accessible demo environment
│   ├── Dockerfile     # Container definition
│   ├── fly.toml       # Fly.io configuration
│   ├── bin/           # Entry scripts and test scripts
│   ├── desktop/       # Desktop integration files
│   └── samples/       # Sample data files
└── docs/
```

## Demo Environment

**URL**: https://debrief-demo.fly.dev — browser-accessible XFCE desktop via noVNC. See `demo/` directory and `.github/workflows/test-demo.yml` for 7-layer test suite.

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

## Parallel Sessions (Worktrees)

`/speckit.start` auto-creates worktrees in `../worktrees/` (local) or branches (cloud). Set `SPECKIT_WORKTREES=true|false` to override. Cleanup: `source .specify/scripts/bash/common.sh && cleanup_stale_worktrees`.

## Key Documents

- `CONSTITUTION.md` — immutable development principles (supersedes all other docs)
- `ARCHITECTURE.md` — technical design decisions
- `VISION.md` — strategic context
- `docs/tracer-delivery-plan.md` — implementation roadmap
- `docs/storybook-vscode-theming.md` — Storybook VS Code theming guide

## Schema Test Strategy

Three approaches required:
1. **Golden fixtures** — canonical valid/invalid JSON in `/shared/schemas/fixtures/`
2. **Round-trip tests** — Python → JSON → TypeScript → JSON → Python
3. **Schema comparison** — Pydantic-generated JSON Schema must match LinkML-generated

## Tech Stack Summary

Python 3.11+ (services, schemas), TypeScript 5.x (frontends, VS Code), React 18+, LinkML, Pydantic v2, Storybook. Per-feature details in individual spec files under `.specify/`.

## Project Memory System

Institutional knowledge lives in `docs/project_notes/` for consistency across sessions.

### Memory Files

- **bugs.md** - Bug log with dates, solutions, prevention notes
- **decisions.md** - Architectural Decision Records (ADRs) with context and trade-offs
- **key_facts.md** - Project configuration, URLs, important constants
- **issues.md** - Work log with ticket IDs and URLs

### Memory-Aware Protocols

**Before proposing architectural changes:**
- Check `docs/project_notes/decisions.md` for existing decisions
- If conflicts exist, acknowledge and explain why change is warranted

**When encountering errors:**
- Search `docs/project_notes/bugs.md` for similar issues
- Document new bugs and solutions when resolved

**When looking up project config:**
- Check `docs/project_notes/key_facts.md` first

**When completing work:**
- Log in `docs/project_notes/issues.md` with ticket ID and URL

## Active Technologies
- TypeScript 5.x (VS Code extension webview) + Leaflet (vanilla JS), VS Code webview API, `@debrief/session-state` (Zustand store) (039-wire-timecontroller-temporal-track)
- N/A (in-memory temporal state only) (039-wire-timecontroller-temporal-track)
- Python 3.11 + None (stdlib only — json, pathlib, shutil) (040-stac-store-organization)
- Local filesystem (STAC 1.0.0 catalogs) (040-stac-store-organization)
- Python 3.11 (debrief-stac service), TypeScript 5.x (VS Code extension) + pystac concepts (manual STAC JSON), MCP SDK, VS Code extension API (001-save-calc-results-stac)
- Local filesystem STAC catalog (JSON + GeoJSON files) (001-save-calc-results-stac)
- TypeScript 5.x (VS Code extension webview) + Leaflet ^1.9.4 (already in project), VS Code extension API, esbuild (042-stac-catalog-overview-panel)
- Local filesystem STAC catalogs (read-only) (042-stac-catalog-overview-panel)
- TypeScript 5.x (VS Code extension) + VS Code extension API, debrief-io (REP parser), stacService (043-load-rep-new-plot)
- Local filesystem STAC catalogs (read-write) (043-load-rep-new-plot)
- TypeScript 5.x (VS Code extension) + VS Code extension API, existing `stacService`, existing `ioService`, Node.js `fs/promises`, `crypto.randomUUID()` (043-load-rep-new-plot)
- Markdown (documentation only — no code implementation) + N/A (reads existing source files for reference content) (032-storybook-vscode-theming)
- TypeScript 5.x (VS Code extension webview) + React 18, react-leaflet 4.2, @debrief/components, VS Code webview API (048-refactor-vscode-map-wrapper)
- VS Code webview state persistence (setState/getState) (048-refactor-vscode-map-wrapper)
- Python 3.11 (LinkML schemas, Pydantic models), TypeScript 5.x (generated types, VS Code extension webview) + LinkML (schema source), Pydantic v2 (Python validation), Leaflet 1.9.x (map rendering) (048-geojson-position-metadata)
- Local filesystem STAC catalogs (JSON + GeoJSON files) (048-geojson-position-metadata)

## Recent Changes
- 039-wire-timecontroller-temporal-track: Added TypeScript 5.x (VS Code extension webview) + Leaflet (vanilla JS), VS Code webview API, `@debrief/session-state` (Zustand store)
