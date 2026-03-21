---
layout: future-post
title: "Planning: Review Technical Debt"
date: 2026-03-20
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, technical-debt, monorepo, type-consolidation, architecture]
excerpt: "A codebase hygiene pass: 25 duplicate type definitions, 7 dependency mismatches, and cross-layer violations that need fixing."
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

## What We'd Love Feedback On

The type consolidation is the most consequential part of this work. Replacing 25 `GeoJSONFeature` definitions with `SafeFeature` imports is straightforward in principle, but there are subtle shape differences — some definitions use `coordinates: unknown`, others use `coordinates: number[] | number[][] | number[][][]`. The canonical `SafeFeature` uses `SafeGeometry | null` for the geometry field. If you've worked with any of these types and know of a case where the shape difference matters at runtime, that's worth flagging before we start the migration.

The cross-layer violation fix is also worth discussing. Moving domain types out of `@debrief/components` into `@debrief/utils` changes import paths across a lot of files. The alternative — keeping types where they are and accepting the architectural violation — is less disruptive but makes the dependency graph harder to reason about as we add more services. The trade-off feels clear to me, but I'm open to arguments otherwise.

-> [Join the discussion on GitHub](https://github.com/debrief/debrief-future/discussions)
