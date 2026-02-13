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
- Python 3.11 (decorator), Markdown (specs), JSON (golden examples) + None (standard library only for decorator) (049-tool-documentation-model)
- Filesystem only (markdown files, JSON fixtures) (049-tool-documentation-model)
- TypeScript 5.x (VS Code extension and webview) + VS Code Extension API ^1.85.0, React 18.x, @debrief/shared-components (001-wire-file-actions)
- Local filesystem (via VS Code workspace.fs API) (001-wire-file-actions)
- Markdown (command/agent definitions), Java (harness template) + None (Claude agent infrastructure, existing speckit patterns) (050-tool-migration-workflow)
- Filesystem only (Markdown files, JSON golden examples) (050-tool-migration-workflow)
- TypeScript 5.x (session-state package, VS Code extension, shared components), Python 3.11 (LinkML schemas, Pydantic models) + Zustand (state management), React 18.x (shared components), Leaflet 1.9.x (map rendering), LinkML (schema source), VS Code Extension API ^1.85.0 (053-nested-child-selection)
- In-memory Zustand store (session state); no persistent storage changes (053-nested-child-selection)
- Python 3.11 + debrief-io, debrief-stac, debrief-calc (workspace members), pytest, pytest-cov (005-e2e-workflow-tests)
- Local filesystem (temporary STAC catalogs via pytest `tmp_path`) (005-e2e-workflow-tests)
- TypeScript 5.x (test code), Python 3.11 (services under test) + code-server ^4.x, @playwright/test ^1.57.0 (already in project), @sparticuz/chromium (already in project) (005-e2e-workflow-tests)
- Local filesystem (STAC catalogs in test workspace) (005-e2e-workflow-tests)
- Markdown (specifications, discovery report), JSON (golden I/O fixtures), Java (legacy source analysis, optional capture harness using Gson 2.10.1) + None for the feature itself. The optional Java capture harness requires Gson 2.10.1. Four existing Claude Code commands (`/tool.discover`, `/tool.spec`, `/tool.implement`, `/tool.verify`) and four agents (`legacy-tool-analyst`, `tool-spec-author`, `tool-implementer`, `golden-example-validator`) from feature 050 are available in `debrief-future` but NOT in the legacy repo. (001-document-debrief-algorithms)
- Filesystem only (Markdown files, JSON fixtures staged in `_tool-migration/` at legacy repo root) (001-document-debrief-algorithms)
- Python 3.11 (calc service), TypeScript 5.x (VS Code extension, web-shell, shared components) + Pydantic v2 (Python models), MCP SDK (Python server), VS Code Extension API ^1.85.0, React 18 (shared components), Leaflet 1.9.x (map rendering) (052-tool-api-integration)
- Local filesystem STAC catalogs (for persisted results via existing stacService) (052-tool-api-integration)
- Python 3.11 (LinkML schemas, Pydantic v2 models), TypeScript 5.x (generated types) + LinkML 1.7+, gen-pydantic, gen-json-schema, gen-typescript (existing schema generators) (062-missing-feature-kind-enum-values)
- Local filesystem (STAC catalogs with GeoJSON payloads) (062-missing-feature-kind-enum-values)
- Python 3.11 (LinkML schemas, Pydantic models), standard library only (plus `pydantic>=2.0.0`) + LinkML >= 1.7.0 (schema definition + generators), Pydantic v2 (Python model validation) (070-prov-schema-foundation)
- TypeScript 5.x (Log Service, type updates, VS Code extension, web-shell) + Zustand ^5.0.0 (session-state store), existing stacService (file I/O), existing calcService (MCP parsing). No new external dependencies. (071-log-recording-service)
- Local filesystem -- GeoJSON files within STAC Item directories (read/write via stacService) (071-log-recording-service)
- TypeScript 5.x (VS Code extension + webview + shared components) + VS Code Extension API ^1.85.0, React 18.x, @debrief/components, Zustand ^5.0.0 (session-state), esbuild (webview bundling) (072-log-panel)
- VS Code webview state (getState/setState) for transient UI; VS Code globalState for cross-session presentation mode persistence (072-log-panel)
- TypeScript 5.x (session-state package) + Zustand ^5.0.0 (state management, existing) (073-undo-redo-split)
- In-memory only (undo stacks not persisted) (073-undo-redo-split)
- TypeScript 5.x (Log Service in session-state package, VS Code extension stacService) + Existing Log Service (#071), stacService, session-state Zustand store, Node.js `fs/promises`, `crypto.randomUUID()` (074-snapshots)
- Local filesystem — GeoJSON files within STAC Item directories (read/write via stacService) (074-snapshots)
- TypeScript 5.x (VS Code extension webview, shared components) + React 18.x, react-leaflet 4.2, Leaflet 1.9.x, Zustand (session-state), VS Code Extension API ^1.85.0 (077-fix-vscode-extension-bugs)
- N/A (no storage changes) (077-fix-vscode-extension-bugs)
- TypeScript 5.x (Log Service in session-state package, VS Code extension stacService) + Existing Log Service (#071), Snapshot Service (#074), stacService, session-state Zustand store, Node.js `fs/promises`, `crypto.randomUUID()` (075-branching)
- TypeScript 5.x (shared component library) + React 18.x (peer), vscrui ^0.1.0 (icons, existing), memfs ^4.x (devDependency for fixtures) (077-stac-file-tree)
- N/A — reads filesystem via injected adapter, does not persist state (077-stac-file-tree)
- TypeScript 5.x (session-state package, VS Code extension, shared components) + Zustand ^5.0.0 (session-state store), React 18.x (shared components), VS Code Extension API ^1.85.0, existing `@debrief/session-state` (Log Service, Snapshot Service), existing `calcService` (MCP tool invocation), existing `stacService` (file I/O) (076-replay-tune)
- Python 3.11 (debrief-calc service), TypeScript 5.x (VS Code extension, web-shell) + `debrief_calc` registry + `@tool` decorator (Python), `MCPToolDefinition` types (TypeScript). Standard library `math` module for trig functions — no external geo libraries. (056-move-shape)
- N/A — pure transformation tool, no persistence (caller handles STAC writes) (056-move-shape)
- Python 3.11 (LinkML schemas, Pydantic models, calc service), TypeScript 5.x (VS Code extension, shared components, generated types) + LinkML >= 1.7.0 (schema source), Pydantic v2 (Python validation), React 18.x (shared components), VS Code Extension API ^1.85.0, Zustand ^5.0.0 (session-state) (091-tool-parameter-context-menus)
- Local filesystem STAC catalogs (no storage changes for this feature) (091-tool-parameter-context-menus)
- Python 3.11 + pydantic >=2.0.0 (existing), stdlib `math` module only (080-buffer-zone-generator)
- N/A (stateless tool — caller handles STAC persistence) (080-buffer-zone-generator)
- TypeScript 5.x (shared components library) + Vega-Lite 5.x, Vega 5.x, vega-embed 6.x, React 18.x (peer) (085-chart-renderer)
- N/A (stateless — consumes dataset JSON, produces rendered charts) (085-chart-renderer)

## Recent Changes
- 039-wire-timecontroller-temporal-track: Added TypeScript 5.x (VS Code extension webview) + Leaflet (vanilla JS), VS Code webview API, `@debrief/session-state` (Zustand store)
