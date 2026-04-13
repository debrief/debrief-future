# Implementation Plan: Platform Registry — Unified Vessel Class + Platform Tree

**Branch**: `180-platform-registry` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/180-platform-registry/spec.md`

## Summary

Create a shared YAML registry file (`shared/data/platform-registry.yaml`) defining a unified vessel class tree where vessel classes are interior nodes and individual platforms are leaf instances. Provide Python and TypeScript loaders that resolve platform IDs to fully derived metadata (domain, vessel_role, vessel_type, vessel_class, name, nationality). Seed with the 10 known platforms currently hardcoded in `scripts/enrich-legacy-catalog.py`. This is the foundation item for E10 (NL-Assisted Catalog Discovery) — all subsequent E10 items depend on it.

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.x  
**Primary Dependencies**: PyYAML (Python — already transitive via LinkML), no new TypeScript runtime deps (build-time YAML→JSON conversion)  
**Storage**: Static YAML file at `shared/data/platform-registry.yaml`  
**Testing**: pytest (Python), vitest (TypeScript), golden fixture parity  
**Target Platform**: Local filesystem (offline by default)  
**Project Type**: Dual-language shared library (new `shared/data/` package)  
**Performance Goals**: Single platform lookup < 10ms in both languages  
**Constraints**: Offline-only, no network access, < 1MB registry file  
**Scale/Scope**: 10 platforms initially, tree supports arbitrary depth and 100s of platforms

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Static file, no network access |
| I. Defence-Grade Reliability | No silent failures | PASS | Load-time validation, explicit errors |
| II. Schema Integrity | Single source of truth | PASS | YAML file is the sole source; loaders derive from it |
| II. Schema Integrity | Schema tests mandatory | N/A | No LinkML schema changes (that is #181) |
| III. Data Sovereignty | Provenance always | N/A | Registry is reference data, not user data |
| IV. Architectural Boundaries | Services never touch UI | PASS | Registry returns data only |
| IV. Architectural Boundaries | Zero MCP dependency | PASS | Pure library, no MCP |
| V. Extensibility | Fail-safe loading | PASS | Load errors are explicit; no crash on missing registry |
| V. Extensibility | No vendor lock-in | PASS | YAML is an open standard |
| VI. Testing | Unit tests required | PASS | Tests planned for both loaders |
| VI. Testing | CI MUST pass | PASS | `task verify` gates the PR |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden fixtures defined before loader code |
| VIII. Documentation | Specs before code | PASS | This plan + spec precede all implementation |
| IX. Dependencies | Minimal dependencies | PASS | Python: PyYAML (already transitive). TypeScript: zero new runtime deps |
| X. Security | No secrets in code | PASS | Registry contains only vessel names and nationality codes |
| XI. Internationalisation | I18N from the start | N/A | Platform names are proper nouns, not translatable strings |
| XII. Community Engagement | Public by default | PASS | Planning post created |
| XIII. Contribution Standards | Atomic commits | PASS | One package, one feature |
| XIV. Pre-Release Freedom | Breaking changes permitted | N/A | New package, no backwards compatibility concerns |
| XV. Strict Type Safety | Explicit types everywhere | PASS | Both loaders will be fully typed (Python dataclass, TypeScript interface) |
| XV. Strict Type Safety | `Any`/`any` prohibited | PASS | All types concrete; YAML dict narrowed at parse boundary |

**Post-design re-check**: All gates still pass. No violations introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/180-platform-registry/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Developer guide
├── contracts/
│   └── platform-registry-api.md  # Loader API contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/data/
├── platform-registry.yaml         # The registry file (human-edited)
├── pyproject.toml                  # Python package: debrief-data
├── package.json                    # TypeScript package: @debrief/data
├── tsconfig.json                   # TypeScript config
├── vitest.config.ts                # Vitest configuration
├── scripts/
│   └── yaml-to-json.ts             # Build-time YAML → JSON converter
├── src/
│   ├── debrief_data/               # Python source
│   │   ├── __init__.py             # Exports: load_registry, PlatformRegistry, ResolvedPlatform
│   │   └── registry.py             # Loader implementation
│   └── ts/
│       ├── index.ts                # Exports: loadRegistry, PlatformRegistry, ResolvedPlatform
│       └── registry.ts             # Loader implementation
├── dist/
│   └── platform-registry.json      # Build output: JSON for TypeScript (gitignored)
└── tests/
    ├── fixtures/
    │   └── expected-platforms.json  # Golden fixture for cross-language parity
    ├── test_registry.py             # Python tests
    └── ts/
        └── registry.test.ts        # TypeScript tests
```

**Structure Decision**: New dual-language shared package at `shared/data/`, following the established pattern of `shared/schemas/` which also hosts both Python and TypeScript code. The YAML registry file sits at the package root for easy access. Python uses the `src/debrief_data/` layout. TypeScript uses `src/ts/` with build-time JSON conversion.

**Workspace integration**:
- Root `pyproject.toml`: add `shared/data` to `[tool.uv.workspace]` members and `[tool.uv.sources]`
- Root `pnpm-workspace.yaml`: already covers `shared/*` — no change needed

## Media Components

None — backend/infrastructure feature

## Storybook E2E Testing

None — no interactive UI components

## VS Code Webview E2E Testing

None — no extension workflow changes

## Complexity Tracking

No constitution violations — this section is not applicable.
