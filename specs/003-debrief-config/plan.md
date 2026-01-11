# Implementation Plan: debrief-config

**Branch**: `003-debrief-config` | **Date**: 2026-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-debrief-config/spec.md`

## Summary

Shared configuration service for Debrief v4.x that manages STAC store registrations and user preferences across Python and TypeScript consumers. Both languages read/write the same JSON config file stored in platform-appropriate XDG locations. This enables the Electron loader to discover stores registered by Python services and vice versa.

## Technical Context

**Language/Version**: Python 3.11+ (primary), TypeScript 5.x (mirror library)
**Primary Dependencies**: Pydantic >=2.0.0 (Python), platformdirs (XDG paths), zod (TypeScript validation)
**Storage**: JSON file at XDG config location (~/.config/debrief/config.json on Linux)
**Testing**: pytest (Python), vitest (TypeScript), cross-language integration tests
**Target Platform**: Linux, macOS, Windows (all desktop platforms)
**Project Type**: Dual-language library (Python service + TypeScript package)
**Performance Goals**: <10ms config read/write (local file I/O)
**Constraints**: Offline-capable (Constitution Article I), no network dependencies
**Scale/Scope**: Single user config, ~10-50 store registrations, ~20 preference keys

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All core functionality works without network | PASS | Local file storage only |
| I.2 No cloud dependencies | Cloud features are optional extensions | PASS | No cloud features |
| I.3 No silent failures | Operations succeed fully or fail explicitly | PASS | Explicit exceptions for invalid paths, corrupt config |
| II.1 Single source of truth | LinkML master schemas | DEFER | Config schema simple enough to define directly; consider LinkML for v2 |
| III.1 Provenance always | Record lineage for transformations | N/A | Config is user settings, not analysis data |
| III.4 Data stays local | No telemetry without consent | PASS | No external calls |
| IV.1 Services never touch UI | Return data only | PASS | Pure library, no UI code |
| IV.3 Zero MCP dependency | Domain logic in pure Python | PASS | MCP wrapper optional, core logic independent |
| V.3 No vendor lock-in | Avoid proprietary dependencies | PASS | Standard JSON, open-source deps only |
| VI.2 Services require tests | Unit tests for all service code | PASS | pytest + vitest coverage required |
| IX.1 Minimal dependencies | Prefer standard library | PASS | platformdirs (Python), filelock (Python), proper-lockfile (TS), zod (TS) - all justified |

### Post-Design Re-check (Phase 1 Complete)

All gates PASS. Design phase confirmed:
- **platformdirs**: Required for XDG compliance across 3 platforms (Constitution IX.3 - no vendor lock-in)
- **filelock**: Required for safe concurrent access (Constitution I.3 - no silent failures)
- **proper-lockfile**: TypeScript equivalent of filelock
- **zod**: Required for TypeScript runtime validation (mirrors Pydantic)

No blocking issues identified. Ready for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/003-debrief-config/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
├── tasks.md             # Phase 2 output (/speckit.tasks)
└── media/               # Phase 2 media content
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
services/config/
├── pyproject.toml           # Python package definition
├── README.md
├── src/
│   └── debrief_config/
│       ├── __init__.py      # Public API exports
│       ├── core.py          # Domain logic (Config, StoreRegistration)
│       ├── paths.py         # XDG path resolution
│       ├── exceptions.py    # Custom exceptions
│       └── mcp_server.py    # Optional MCP wrapper
└── tests/
    ├── conftest.py          # Shared fixtures
    ├── test_core.py         # Unit tests
    ├── test_paths.py        # Platform path tests
    └── test_integration.py  # Round-trip tests

shared/config-ts/
├── package.json             # TypeScript package definition
├── tsconfig.json
├── src/
│   ├── index.ts             # Public API exports
│   ├── config.ts            # Config class
│   ├── paths.ts             # XDG path resolution
│   └── types.ts             # TypeScript types
└── tests/
    ├── config.test.ts       # Unit tests
    └── integration.test.ts  # Cross-language tests
```

**Structure Decision**: Dual-language implementation following existing service patterns. Python service in `services/config/` (consistent with `services/io/`, `services/stac/`). TypeScript library in `shared/config-ts/` (for consumption by Electron loader). Both share the same JSON config file format.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| II.1 Deferred LinkML | Config schema is simple (3 entities) | LinkML overhead unjustified for key-value config; can migrate later if schema grows |
| Dual-language impl | TypeScript needed for Electron loader | Single language would require IPC overhead for every config read |
