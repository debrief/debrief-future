# Implementation Plan: debrief-config

**Branch**: `003-debrief-config` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-debrief-config/spec.md`

## Summary

Shared user state management service providing cross-platform config file storage (XDG paths) with dual Python/TypeScript libraries for STAC store registration and user preferences. Both languages read/write the same JSON config file, enabling the Electron loader to access stores registered from Python services.

## Technical Context

**Language/Version**: Python 3.11+ (service library), TypeScript 5.x (app library)
**Primary Dependencies**:
- Python: Pydantic v2, platformdirs>=4.0, filelock>=3.0
- TypeScript: proper-lockfile (no XDG library - manual implementation for path parity)
**Storage**: JSON file in XDG config directory (`~/.config/debrief/config.json` on Linux)
**Testing**: pytest (Python), Vitest + memfs (TypeScript)
**Target Platform**: Linux, macOS, Windows (cross-platform)
**Project Type**: Dual-language library (Python + TypeScript with shared JSON format)
**Performance Goals**: N/A (simple file I/O, no performance-critical paths)
**Constraints**: Offline-capable (Constitution Article I), local filesystem only, atomic write + lock file for concurrent access
**Scale/Scope**: Small singleton service (~500 LOC Python, ~300 LOC TypeScript)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All local filesystem, no network |
| I. Defence-Grade Reliability | No silent failures | PASS | Explicit errors for invalid catalog, corrupted config |
| II. Schema Integrity | Single source of truth | PASS | Pydantic-only (follows precedent of stac/io services for internal state) |
| III. Data Sovereignty | Data stays local | PASS | XDG local paths only |
| IV. Architectural Boundaries | Services never touch UI | PASS | Returns data only |
| VI. Testing | Services require unit tests | PASS | pytest (Python), Vitest (TypeScript) |
| VIII. Documentation | Specs before code | PASS | Spec exists |
| IX. Dependencies | Minimal, vetted dependencies | PASS | platformdirs, filelock (Python); proper-lockfile, memfs (TypeScript) - all MIT, vetted |

**Pre-design gate status**: PASS - all clarifications resolved (see [research.md](./research.md))

## Project Structure

### Documentation (this feature)

```text
specs/003-debrief-config/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
services/config/
├── src/debrief_config/
│   ├── __init__.py      # Public API exports
│   ├── config.py        # Core config management
│   ├── stores.py        # Store registration logic
│   ├── preferences.py   # User preferences logic
│   ├── paths.py         # XDG path resolution
│   ├── exceptions.py    # Custom exceptions
│   └── py.typed         # PEP 561 marker
├── tests/
│   ├── __init__.py
│   ├── conftest.py      # pytest fixtures
│   ├── test_config.py
│   ├── test_stores.py
│   ├── test_preferences.py
│   └── test_paths.py
└── pyproject.toml

packages/config/          # TypeScript library (new pnpm workspace)
├── src/
│   ├── index.ts         # Public API exports
│   ├── config.ts        # Core config management
│   ├── stores.ts        # Store registration logic
│   ├── preferences.ts   # User preferences logic
│   ├── paths.ts         # XDG path resolution
│   └── types.ts         # TypeScript interfaces
├── tests/
│   └── *.test.ts
├── package.json
└── tsconfig.json
```

**Structure Decision**: Dual-language library with Python in `services/config/` following existing service patterns, and TypeScript in new `packages/config/` directory for pnpm workspace. Both libraries share the same JSON config file format.

## Complexity Tracking

> No violations identified. Service follows established singleton service pattern.

---

## Post-Design Constitution Re-Check

*Re-evaluation after Phase 1 design completion.*

| Article | Requirement | Status | Design Evidence |
|---------|-------------|--------|-----------------|
| I. Defence-Grade Reliability | Offline by default | PASS | No network calls in design; all file operations local |
| I. Defence-Grade Reliability | No silent failures | PASS | All error conditions have explicit exceptions (see contracts/api.md) |
| I. Defence-Grade Reliability | Reproducibility | PASS | Deterministic JSON file format |
| II. Schema Integrity | Single source of truth | PASS | Pydantic models define structure; TypeScript mirrors exactly |
| III. Data Sovereignty | Data stays local | PASS | XDG paths only; no external calls |
| III. Data Sovereignty | Export-friendly | PASS | JSON format is human-readable and standard |
| IV. Architectural Boundaries | Services never touch UI | PASS | Returns data only; no rendering or display logic |
| V. Extensibility | Fail-safe loading | PASS | Corrupted config triggers recovery, not crash |
| VI. Testing | Services require unit tests | PASS | Test structure defined; pytest + Vitest |
| VIII. Documentation | Specs before code | PASS | spec.md, plan.md, data-model.md, contracts/api.md, quickstart.md complete |
| IX. Dependencies | Minimal, vetted | PASS | 2 Python deps (platformdirs, filelock); 2 TS deps (proper-lockfile, memfs) |
| X. Security | No secrets in code | PASS | Config stores paths and preferences only; no credentials |
| XI. I18N | Locale-aware | PASS | Locale preference stored for apps to use |

**Post-design gate status**: PASS - ready for task generation (/speckit.tasks)

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | Complete |
| Data Model | [data-model.md](./data-model.md) | Complete |
| API Contract | [contracts/api.md](./contracts/api.md) | Complete |
| Quickstart | [quickstart.md](./quickstart.md) | Complete |
| Tasks | tasks.md | Pending (/speckit.tasks) |
