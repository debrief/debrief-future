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
- TypeScript 5.x (React 18.x) + `golden-layout` v2.x (panel management), `shared-zustand` (cross-window state sync via BroadcastChannel), existing `@debrief/components`, `@debrief/session-state` (Zustand ^5.0.0) (096-add-goldenlayout-panels)
- Browser localStorage for layout persistence (~2-5 KB per saved layout) (096-add-goldenlayout-panels)

Only updated when a feature introduces a technology not already listed here.

- Python 3.11 (services, schemas, calc tools)
- TypeScript 5.x (VS Code extension, webview, shared components, session-state)
- React 18.x + react-leaflet 4.2
- Leaflet 1.9.x
- Zustand ^5.0.0 (session-state store)
- LinkML >= 1.7.0 (schema source) + gen-pydantic, gen-json-schema, gen-typescript
- Pydantic v2 (Python model validation)
- VS Code Extension API ^1.85.0
- MCP SDK (Python service exposure)
- esbuild (webview bundling)
- Vega-Lite 5.x / Vega 5.x / vega-embed 6.x (chart rendering) (085-chart-renderer)
- @geoman-io/leaflet-geoman-free ^2.19.2 (drawing tools) (093-drawing-toolbar-shape-palette)
- @tanstack/react-virtual (virtualised lists) (094-show-points-in-layers)
- vscrui ^0.1.0 (VS Code icons) (077-stac-file-tree)
- Playwright ^1.57.0 (E2E tests) (005-e2e-workflow-tests)
- pytest / pytest-cov (Python tests)
- Local filesystem STAC catalogs (JSON + GeoJSON storage)

## Recent Changes
- 094-show-points-in-layers: Added @tanstack/react-virtual
