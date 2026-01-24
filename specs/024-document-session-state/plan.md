# Implementation Plan: Session State Management

**Branch**: `024-document-session-state` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-document-session-state/spec.md`

## Summary

Implement a centralized session state management system for the Debrief VS Code extension that tracks temporal navigation, spatial viewport, feature selection/visibility, and document lifecycle. The system must support reactive UI subscriptions in TypeScript, programmatic access from Python via MCP/HTTP, undo/redo history, session persistence, and a standalone debug dashboard for development.

## Technical Context

**Language/Version**: TypeScript 5.x (state server + VS Code extension), Python 3.11+ (MCP client library)
**Primary Dependencies**: Zustand (state management), Express.js (HTTP server), @modelcontextprotocol/sdk (MCP), better-sse (SSE)
**Storage**: JSON file at user-defined path (session persistence)
**Testing**: Vitest (TypeScript unit tests), pytest (Python client), Playwright (dashboard e2e + screenshots)
**Target Platform**: VS Code Extension (primary), standalone HTTP server (debug mode)
**Project Type**: Monorepo service - TypeScript library with Python client bindings
**Performance Goals**: State updates propagate to UI within 100ms (SC-001), dashboard updates within 200ms (SC-008)
**Constraints**: Offline-capable (Constitution I.1), no cloud dependencies (Constitution I.2), ≥50 undo steps (SC-005)
**Scale/Scope**: Single editor session at a time, reasonable feature set sizes (1000s of features)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core functionality works without network | ✅ PASS | State management is entirely local |
| I.2 No cloud dependencies | No cloud services in critical path | ✅ PASS | HTTP server is local only |
| I.3 No silent failures | Operations succeed fully or fail explicitly | ✅ PASS | Validation errors return explicit messages |
| I.4 Reproducibility | Same inputs produce same results | ✅ PASS | State is deterministic |
| II.1 Single source of truth | LinkML master schemas | ✅ PASS | Session state schema defined in LinkML |
| II.2 Schema tests mandatory | Derived schemas pass adherence tests | ✅ PASS | Will include schema validation tests |
| III.1 Provenance always | Every transformation records lineage | ⚠️ N/A | Session state is ephemeral view state, not data transformation |
| IV.1 Services never touch UI | Return data only | ✅ PASS | State server returns data; UI subscribes |
| IV.2 Frontends never persist | All writes through services | ✅ PASS | Session files written by state service |
| IV.3 Zero MCP dependency | Domain logic in pure libraries | ✅ PASS | Core state logic separate from MCP wrapper |
| VI.1 Schema tests gate merges | Adherence tests must pass | ✅ PASS | Part of CI pipeline |
| VI.2 Services require unit tests | No code without tests | ✅ PASS | Unit tests for all state operations |
| VIII.1 Specs before code | Written specification required | ✅ PASS | This plan follows spec.md |

**Gate Status**: ✅ PASSED - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/024-document-session-state/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── mcp-tools.yaml   # MCP tool definitions
│   └── sse-events.yaml  # SSE event schemas
└── media/               # Phase 2 output
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
services/session-state/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Public API exports
│   ├── store/
│   │   ├── index.ts       # Store factory
│   │   ├── slices/
│   │   │   ├── temporal.ts
│   │   │   ├── spatial.ts
│   │   │   ├── features.ts
│   │   │   └── document.ts
│   │   └── middleware/
│   │       ├── undo.ts    # Undo/redo middleware
│   │       └── dirty.ts   # Dirty tracking middleware
│   ├── server/
│   │   ├── index.ts       # Express server setup
│   │   ├── mcp.ts         # MCP tool handlers
│   │   └── sse.ts         # SSE endpoint
│   ├── persistence/
│   │   ├── save.ts
│   │   ├── load.ts
│   │   └── schema.ts      # Version/migration
│   └── types/
│       └── index.ts       # Generated from LinkML
└── tests/
    ├── unit/
    │   ├── slices/
    │   ├── middleware/
    │   └── persistence/
    └── integration/
        ├── mcp.test.ts
        └── sse.test.ts

shared/schemas/src/
└── session-state.yaml     # LinkML schema definition

tools/debug-dashboard/
├── index.html             # Standalone HTML app
├── styles.css
├── app.js                 # Vanilla JS (no build required)
├── playwright.config.ts   # Playwright configuration
├── tests/
│   └── dashboard.spec.ts  # E2E tests with screenshot capture
└── screenshots/           # Generated visual artifacts
    ├── state-overview.png
    ├── selection-empty.png
    ├── selection-single.png
    └── selection-multi.png

services/session-state-py/
├── pyproject.toml
└── src/debrief_session/
    ├── __init__.py
    ├── client.py          # MCP client wrapper
    └── types.py           # Generated from LinkML
```

**Structure Decision**: Service-based architecture following project conventions. TypeScript state service in `services/session-state/`, Python client bindings in `services/session-state-py/`, debug dashboard as standalone HTML in `tools/debug-dashboard/`.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

None - backend/infrastructure feature (no Storybook components)

The session state service is a backend infrastructure component. However, **Playwright e2e tests will generate screenshots** demonstrating dashboard functionality and selection-sensitive tool behavior. These screenshots serve as visual documentation and can be included in shipped blog posts.

| Artifact | Source | Purpose |
|----------|--------|---------|
| `screenshots/state-overview.png` | Playwright test | Dashboard showing all four state slices |
| `screenshots/selection-empty.png` | Playwright test | Tool availability with no selection |
| `screenshots/selection-single.png` | Playwright test | Tool availability with single feature selected |
| `screenshots/selection-multi.png` | Playwright test | Tool availability with multiple features selected |

## Complexity Tracking

> No violations requiring justification.

*Constitution check passed without exceptions.*
