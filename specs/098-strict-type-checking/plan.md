# Implementation Plan: Strict Type Checking

**Branch**: `098-strict-type-checking` | **Date**: 2026-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/098-strict-type-checking/spec.md`

## Summary

Enforce strict type safety across all Python and TypeScript code. Add pyright for Python static type checking, promote ESLint `no-explicit-any` to `error` across all TypeScript packages, replace ~208 existing `Any`/`any` violations with concrete types, add ruff annotation rules, wire type checking into CI, and codify strict type safety in the constitution (Article XV — already added).

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.x
**Primary Dependencies**: pyright (new), ruff (existing — add ANN/TC rules), ESLint + @typescript-eslint (existing — tighten config)
**Storage**: N/A — configuration and code quality feature
**Testing**: pytest (Python), vitest/mocha (TypeScript), CI pipeline validation
**Target Platform**: Developer tooling + CI (Linux CI runners, local dev on macOS/Linux/Windows)
**Project Type**: Monorepo (uv workspaces for Python, pnpm workspaces for TypeScript)
**Performance Goals**: Type checking must complete within CI timeout (~10 min total pipeline)
**Constraints**: Zero `Any`/`any` in production code; generated code either post-processed or excluded with justification
**Scale/Scope**: 6 Python packages, 8+ TypeScript packages, ~208 existing violations to remediate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default, no silent failures | PASS | Type checking is local tooling — no network required |
| II. Schema Integrity | Single source of truth, schema tests mandatory | PASS | Schema-generated types must remain strict; post-processing preserves this |
| III. Data Sovereignty | Provenance always | N/A | No data transformations in this feature |
| IV. Architectural Boundaries | Services never touch UI | N/A | Configuration-only changes |
| V. Extensibility | No vendor lock-in | PASS | Pyright is open-source (MIT). ESLint is standard tooling |
| VI. Testing | Services require unit tests, CI must pass | PASS | CI changes add type checking as a gate — strengthens this article |
| VII. Test-Driven AI | Tests define done | PASS | Type checking is verifiable (zero violations = done) |
| VIII. Documentation | Specs before code | PASS | This spec + plan precedes implementation |
| IX. Dependencies | Minimal, vetted | PASS | Adding pyright (1 dependency). Ruff and ESLint already exist |
| X. Security | No secrets in code | N/A | No secrets involved |
| XI. Internationalisation | I18N from the start | N/A | No user-facing strings |
| XII. Community Engagement | Public by default | PASS | Planning post will announce the change |
| XIII. Contribution Standards | Atomic commits, CI must pass | PASS | CI gate addition aligns with this |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Pre-v4.0.0, type signature changes are acceptable |
| XV. Strict Type Safety | Explicit types, Any prohibited | PASS | This feature *implements* this article |

**Gate result**: PASS — no violations.

**Post-Phase 1 re-check**: PASS — design artifacts add pyright (1 new dependency, justified by Article XV mandate), ruff rule additions (existing tool), and ESLint config tightening (existing tool). No new architectural patterns introduced.

## Project Structure

### Documentation (this feature)

```text
specs/098-strict-type-checking/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: configuration entities
├── quickstart.md        # Phase 1: developer guide
├── contracts/           # Phase 1: configuration contracts
│   ├── pyright-config.ts
│   ├── eslint-type-safety.ts
│   ├── ruff-config.ts
│   └── ci-pipeline.ts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/               # Phase 2: planning post + LinkedIn
```

### Source Code (repository root)

```text
# Files modified across the existing monorepo structure:

pyrightconfig.json                    # NEW — root-level pyright config
ruff.toml                             # MODIFIED — add ANN, TC rules
Taskfile.yml                          # MODIFIED — add typecheck task
CONSTITUTION.md                       # MODIFIED — Article XV (already done)
.github/workflows/ci.yml              # MODIFIED — add task typecheck step

# ESLint configs — modified or created:
apps/vscode/.eslintrc.json            # MODIFIED — no-explicit-any: error
apps/loader/.eslintrc.cjs             # MODIFIED — no-explicit-any: error, add parserOptions.project
shared/components/.eslintrc.cjs       # MODIFIED — no-explicit-any: error, fix test override
apps/web-shell/.eslintrc.cjs          # NEW
services/session-state/.eslintrc.cjs  # NEW
shared/config-ts/.eslintrc.cjs        # NEW
shared/utils/.eslintrc.cjs            # NEW

# tsconfig fixes:
apps/web-shell/tsconfig.node.json     # MODIFIED — add strict: true
apps/web-shell/package.json           # MODIFIED — add typecheck script

# Schema generation:
shared/schemas/scripts/generate.py    # MODIFIED — post-process Any in boilerplate

# Python type remediation (~30 files across):
services/stac/src/debrief_stac/       # Replace dict[str, Any] aliases
services/io/src/debrief_io/           # Replace Any type aliases
services/calc/debrief_calc/           # Replace Any in models, tools
services/cli/debrief_cli/             # Replace Any usage

# TypeScript type remediation (~19 files across):
apps/vscode/src/                      # Replace any casts
apps/web-shell/src/                   # Replace any casts
shared/components/src/                # Replace any in production code
services/session-state/src/           # Replace any usage
```

**Structure Decision**: This feature modifies existing files across the monorepo. No new directories or packages are created. The only new root-level file is `pyrightconfig.json`.

## Media Components

None — backend/infrastructure feature. No visual components are created or modified.

## Storybook E2E Testing

None — no interactive UI components.

## Complexity Tracking

No constitution violations to justify.
