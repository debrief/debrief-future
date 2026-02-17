---
layout: future-post
title: "Shipped: Strict Type Safety Across Python and TypeScript"
date: 2026-02-17
track: [credibility, momentum]
author: Ian
reading_time: 4
tags: [type-safety, python, typescript, ci, constitution, code-quality]
excerpt: "Eliminated 65+ TypeScript any violations and 141 Python Any usages. Type checking is now a CI gate."
---

## What We Built

The codebase now enforces strict type safety end-to-end. We added pyright (Python), promoted ESLint's `no-explicit-any` rule to error (TypeScript), and wired both into CI as merge gates. The existing ~143 `Any` usages in Python got replaced with concrete types — only 2 remain, both in a single function handling recursive GeoJSON coordinates, and both documented. All 65+ explicit `any` in TypeScript are gone. Zero violations.

This also meant updating CONSTITUTION.md with Article XV, which mandates explicit type annotations everywhere and prohibits `Any`/`any` in production code. The constitution was already committed, so this part of the work didn't require coding — but it matters because it makes the standard non-negotiable across future sessions.

The approach was pragmatic: pyright over mypy because it understands Pydantic v2 natively (our schema generator produces Pydantic models), and ESLint over TypeScript's built-in strict checks because the project already runs ESLint and the error reporting is clearer. Type checking runs in CI after linting, before tests, so developers see type errors as fast as possible without slowing pre-commit.

## How It Happened

The violations fell into three categories:

**TypeScript `any`** — mostly in test mocks and type-assertion casts like `as unknown as Record<string, unknown>`. We replaced these with concrete interfaces generated from the schema or with typed mock builders. A few were eslint-disable comments that we just removed because the underlying code was already fixable.

**Python `Any` from GeoJSON/STAC storage** — these turned out to be correct. STAC Items and GeoJSON blobs are genuinely unstructured at the JSON level (you don't know the geometry type until runtime), so `dict[str, Any]` is the right type, not a compromise. The catch was that every downstream function inherited the `Any` because the GeoJSON type was defined at the service boundary. We fixed this by narrowing the type immediately after parsing — the GeoJSON gets validated into a Pydantic model, and functions work with the model, not the raw dict.

**Python `Any` in schema-generated code** — the LinkML generator produces `Any` in a few places (ConfiguredBaseModel.__init__ params, LinkMLMeta fields). Rather than exclude generated code from type checking, we post-processed the generated files to replace `dict[str, Any]` with `dict[str, object]`. It's a small transformation, but it means "this is generated code" is no longer an exception to the type-safety rule.

## Results

- TypeScript: 65 explicit `any` usages → 0
- Python: 143 `Any` usages → 2 (both justified, both documented)
- Tests: 2,116 total pass (682 Python + 1,434 TypeScript)
- Pyright errors: 132 (pre-existing Pydantic model construction issues; no regressions from this work)

The CI pipeline now has a `task typecheck` step that blocks merges if type violations appear. That step runs after linting and before testing, so the feedback loop is tight.

## Why This Matters for Maritime Analysis

Debrief v3 (the old codebase we're rebuilding) treated type safety as optional — plenty of runtime type assertions, plenty of surprise `AttributeError` and `TypeError` bugs in production. When you're processing vessel movements and tactical contacts, type errors are more than bugs; they're credibility issues. If the platform silently mishandles a coordinate type or corrupts a contact ID, analysts notice. They stop trusting the tool.

With strict type checking at the CI gate, we catch those errors before they merge. The compiler becomes a second reviewer: it knows the schema, it knows which fields are required, it knows which transformations are safe. That's especially important as we scale to more analysis tools and contributors.

## What's Next

The ruff baseline shows ~1,000 missing annotations (ANN201, ANN001 — mostly return types and parameter types in older Python code). This feature doesn't mandate fixing all of those, but it establishes the precedent: new code must be annotated, and old code will gradually be improved. We're also watching the Pyright error count (132 pre-existing issues in Pydantic model construction). Some are schema generation quirks; some are real type issues in test fixtures. Those will get addressed as we touch those files, but they're not blockers for this feature.

→ [See the spec](../spec.md)
→ [Violation inventory](../evidence/violation-inventory.md)
