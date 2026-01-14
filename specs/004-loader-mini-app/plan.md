# Implementation Plan: Loader Mini-App

**Branch**: `004-loader-mini-app` | **Date**: 2026-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-loader-mini-app/spec.md`

## Summary

Build a lightweight Electron desktop application that orchestrates the file loading workflow for Debrief. The app provides a two-step wizard UI (store selection → plot configuration) that integrates three Python services (debrief-config, debrief-io, debrief-stac) to load maritime REP data files into STAC catalog plots with full provenance tracking.

## Technical Context

**Language/Version**: TypeScript 5.x (Electron main + React renderer)
**Primary Dependencies**: Electron 28+, React 18+, debrief-config (TypeScript), debrief-io (Python via IPC), debrief-stac (Python via IPC)
**Storage**: N/A (all persistence via debrief-stac service)
**Testing**: Vitest (unit), Playwright (E2E), Storybook (component preview)
**Target Platform**: Linux, macOS, Windows (Electron cross-platform)
**Project Type**: Desktop application (Electron with React renderer)
**Performance Goals**: Full workflow in <30 seconds for typical REP file (per SC-001)
**Constraints**: Offline-capable, cross-platform, must integrate with Python services via IPC
**Scale/Scope**: Single-user desktop app, typical 1-10 STAC stores, 10-100 plots per store

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| **I. Defence-Grade Reliability** | Offline by default | ✅ PASS | App works entirely offline with local STAC stores |
| **I.3** | No silent failures | ✅ PASS | Spec requires actionable error messages (FR-011) |
| **II. Schema Integrity** | Use derived schemas | ✅ PASS | Will consume schemas from debrief-schemas package |
| **III. Data Sovereignty** | Provenance always | ✅ PASS | FR-009 requires full provenance recording |
| **III.2** | Source preservation | ✅ PASS | FR-008 copies source file to assets |
| **IV. Architectural Boundaries** | Services never touch UI | ✅ PASS | Electron app orchestrates, Python services do logic |
| **IV.2** | Frontends never persist | ✅ PASS | All writes go through debrief-stac service |
| **VI. Testing** | Unit tests required | ✅ PASS | Vitest for components, Playwright for E2E |
| **VIII. Documentation** | Specs before code | ✅ PASS | Full spec completed with UI wireframes |
| **XI. Internationalisation** | I18N from the start | ⚠️ NEEDS DESIGN | String externalization strategy needed |
| **XII. Community Engagement** | Beta previews | ✅ PASS | Storybook deployment planned (P3 user story) |

**Gate Status**: PASS (I18N design deferred to research phase)

## Project Structure

### Documentation (this feature)

```text
specs/004-loader-mini-app/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (IPC message schemas)
├── media/               # Phase 2 output (blog/LinkedIn drafts)
└── tasks.md             # Created by /speckit.tasks (not this command)
```

### Source Code (repository root)

```text
apps/loader/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Entry point, window management
│   │   ├── ipc/                 # IPC handlers for Python service calls
│   │   │   ├── config.ts        # debrief-config integration
│   │   │   ├── io.ts            # debrief-io integration
│   │   │   └── stac.ts          # debrief-stac integration
│   │   └── file-association.ts  # OS file association handling
│   │
│   ├── renderer/                # React renderer process
│   │   ├── App.tsx              # Root component
│   │   ├── components/          # Reusable UI components
│   │   │   ├── StoreSelector/   # Step 1 - store selection
│   │   │   ├── PlotConfig/      # Step 2 - tabbed plot configuration
│   │   │   ├── ProgressView/    # Processing state display
│   │   │   └── common/          # Shared UI elements
│   │   ├── hooks/               # React hooks for service integration
│   │   ├── i18n/                # Internationalization strings
│   │   └── types/               # TypeScript type definitions
│   │
│   └── preload/                 # Electron preload scripts
│       └── index.ts             # Secure IPC bridge
│
├── tests/
│   ├── unit/                    # Vitest unit tests
│   ├── integration/             # Service integration tests
│   └── e2e/                     # Playwright E2E tests
│
├── .storybook/                  # Storybook configuration
├── stories/                     # Component stories for preview
├── package.json
├── electron.config.ts
└── vite.config.ts
```

**Structure Decision**: Electron app structure with clear separation between main process (Node.js, IPC) and renderer process (React UI). Python service integration via IPC to maintain architectural boundaries per Constitution Article IV.

## Complexity Tracking

No constitution violations requiring justification. The design follows established patterns:
- Single Electron app (not multiple projects)
- Standard service integration via IPC
- No custom persistence layer (delegates to debrief-stac)
