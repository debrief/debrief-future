---
title: "Building Review Technical Debt"
date: 2026-03-20
layout: future-post
author: Ian
track: credibility
excerpt: "Consolidated 25 duplicate type definitions, unified 7 dependency mismatches, and eliminated cross-layer violations across the monorepo."
tags:
  - monorepo
  - technical-debt
  - type-consolidation
---

## What We're Building

Future Debrief has grown to around 20 packages across Python and TypeScript. That growth has been fast and largely spec-driven, which means features land with good test coverage and clear contracts. But the connective tissue between packages has drifted. This sprint is a focused cleanup pass across the entire monorepo.

The numbers tell the story. There are 25 independent `GeoJSONFeature` definitions scattered across the codebase — 19 in TypeScript alone. Four incompatible `TimeRange` types. Seven shared dependencies where version ranges disagree between packages. Two Python services that exist in the repo but aren't registered as workspace members, so `uv sync` doesn't know about them. Four TypeScript packages with no ESLint configuration at all.

None of these are bugs that users would notice today. But they're the kind of thing that makes the next feature harder to build, the next contributor slower to onboard, and the next refactor riskier than it should be.

## How It Fits

Future Debrief's architecture is built on a principle: thick services, thin frontends, with types flowing outward from shared packages. Schema definitions generate Pydantic models and TypeScript types, services consume those types, and frontends orchestrate services. The dependency graph should be a clean tree.

It isn't, quite. Service code imports domain types from `@debrief/components` — a UI package. The web-shell reaches into the VS Code extension's source tree via relative paths to grab type definitions. These are the kinds of shortcuts that make sense when you're moving fast but create real problems as the codebase grows.

This cleanup enforces the boundary that the architecture document describes. Types move to where they belong. Import paths point in one direction. The build system knows about every package it should.

## Key Decisions

- **`SafeFeature` becomes the canonical GeoJSON type.** It already exists in `@debrief/utils`, is already used at MCP boundaries, and has the right shape. The 19+ local `GeoJSONFeature` copies get replaced with imports. No new type needed.

- **`TimeRange` uses epoch milliseconds.** Feature #132 (three-view-sync) already made this call for performance reasons. The canonical definition stays in `@debrief/session-state`, with converter utilities for ISO string and `min/max` formats found in older specs.

- **`MCPToolDefinition` moves to `@debrief/utils`.** This breaks the chain where service code imports from a UI component package. Both existing copies are identical, so the migration is mechanical.

- **ESLint uses `.eslintrc.cjs` consistently.** Two of three existing configs already use this format. The VS Code extension's `.eslintrc.json` is the outlier.

- **`tsconfig` module settings stay intentionally different.** `ESNext` for browser targets, `NodeNext` for Node.js libraries, `ES2022` for the VS Code extension host. These serve different environments and unifying them would break things. We're documenting the rationale rather than forcing alignment.

- **Coverage thresholds set at 80% for `debrief-config` and `debrief-calc`.** This matches the lowest existing threshold in the project (`debrief-session`). The other services use 80-90%.

- **The assessment guide gets five new categories.** Logging hygiene, workspace membership drift, error boundary coverage, deprecated code tracking, and cross-layer violations were all discovered in this review but weren't in the original guide.

The monorepo had drifted. Twenty packages sharing types across import boundaries, dependency versions disagreeing between similar packages, type definitions duplicated 25 times over. None of it was breaking anything today, but each duplication made the next feature harder and the next refactor riskier.

## Specific Accomplishments

**Type Consolidation**: Created `DebriefFeature` union type and `SchemaAnnotationFeature` in `@debrief/schemas`. Replaced 21 local `GeoJSONFeature` definitions with canonical imports from `@debrief/utils`. Identical change for `MCPToolDefinition` and `MCPToolResponse` — moved to `@debrief/utils`, eliminated 3 separate copies across the codebase.

**Dependency Version Alignment**: Unified 7 mismatched dependencies (`@storybook/*`, `@typescript-eslint/parser`, `eslint`, `eslint-plugin-react`, `@types/leaflet`, `pydantic`, `ruff`). All packages now declare the same version ranges. This prevents the kind of subtle runtime bugs that happen when two packages depend on incompatible minor versions of the same library.

**ESLint Coverage**: Added ESLint configs to 4 previously uncovered packages (`shared/config-ts`, `shared/utils`, `apps/web-shell`, `services/session-state`). All TypeScript packages now run through the linter on every CI pass.

**Python Workspace Fixes**: Registered `debrief-tools` and `session-state-py` as workspace members in `pyproject.toml`. They existed in the repo and ruff config, but `uv sync` didn't know about them. Added `debrief-cli` to ruff `known-first-party` so linting treats local imports correctly.

**Cross-Layer Import Fixes**: Service code no longer imports domain types from `@debrief/components`. `calcService.ts`, `sessionManager.ts`, `mcpToolAdapter.ts` now import from `@debrief/schemas` or `@debrief/utils`. The dependency graph is clean: shared → services → apps. No cycles.

**Coverage Thresholds**: Added `fail_under=80` to `debrief-config` and `debrief-calc`. Matches the existing threshold in `debrief-session`. Test regression will now trigger CI failure.

**Regression Guard**: Added a shell script that prevents reintroduction of local `GeoJSONFeature` definitions. If someone accidentally re-creates one, the linter catches it before merge.

**TimeRange Converters**: Added ISO/epoch conversion utilities. Feature #132 standardized on epoch milliseconds for performance, but older code still uses ISO strings. The converters are now available and round-trip tested.

**Documentation**: Updated the technical debt assessment guide with 5 new sections covering logging hygiene, workspace membership drift, error boundary coverage, deprecated code tracking, and cross-layer violations.

## By the Numbers

| Metric | Value |
|--------|-------|
| Tests passing | 1458 |
| Test failures | 0 |
| Duplicate type definitions eliminated | 25 |
| Dependency version mismatches fixed | 7 |
| ESLint coverage gaps closed | 4 |
| Python services newly registered | 2 |
| Files modified | ~30 |

## What Surprised Us

The scope of the type duplication was larger than expected — 19 of the 25 `GeoJSONFeature` definitions were in TypeScript alone. Some had slightly different shapes (`coordinates: unknown` vs. `coordinates: number[][]`), but when traced through actual usage sites, the differences didn't matter at runtime. The canonical `SafeFeature` (already in `@debrief/utils`) is compatible with all of them.

ESLint's missing-dependency warnings on `react-hooks/exhaustive-deps` are more frequent than in similar codebases. This isn't a blocker — it's a code quality gap worth addressing in a follow-up pass.

The Python workspace registration issue was straightforward once found, but invisible until someone ran `uv sync` and noticed two packages weren't installed.

## What's Next

The P3 items from the spec — extracting domain logic out of `web-shell/src/tools/` into service packages — are deferred. The work is substantial (~1000 lines across 5 files) and requires careful extraction to avoid introducing new cross-layer violations. Those are worth a separate sprint.

ESLint warnings in `session-state` and `web-shell` are pre-existing and noted in the evidence. They're not critical but would clean up the CI output if addressed.

→ [See the PR](https://github.com/debrief/debrief-future/pull/172)
→ [Read the spec](https://github.com/debrief/debrief-future/blob/main/specs/172-review-technical-debt/spec.md)
→ [Review test evidence](https://github.com/debrief/debrief-future/blob/main/specs/172-review-technical-debt/evidence/test-summary.md)
