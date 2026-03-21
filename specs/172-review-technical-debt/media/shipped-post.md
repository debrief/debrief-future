---
layout: future-post
title: "Shipped: Review Technical Debt"
date: 2026-03-20
track: [credibility]
author: Ian
reading_time: 5
tags: [tracer-bullet, technical-debt, monorepo, type-consolidation, architecture]
excerpt: "Consolidated 25 duplicate type definitions, unified 7 dependency mismatches, and eliminated cross-layer violations across the monorepo."
---

## What We Built

The monorepo had drifted. Twenty packages sharing types across import boundaries, dependency versions disagreeing between similar packages, type definitions duplicated 25 times over. None of it was breaking anything today, but each duplication made the next feature harder and the next refactor riskier.

This week was a focused cleanup pass. The kind of work that doesn't add user-facing capability but makes the codebase quieter and more reliable.

The numbers: 1458 tests passing (up from spec baseline), zero failures. 30 files modified across Python and TypeScript. All CI gates passing.

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
