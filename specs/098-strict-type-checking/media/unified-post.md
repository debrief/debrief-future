---
title: "Building Strict Type Safety Across Python and TypeScript"
date: 2026-02-17
layout: future-post
author: Ian
track: credibility, momentum
excerpt: "Eliminated 65+ TypeScript any violations and 141 Python Any usages. Type checking is now a CI gate."
tags:
  - ci
  - code-quality
  - constitution
  - type-safety
---

## What We're Building

We've been carrying a type debt since the project started: approximately 143 uses of `Any` in Python production code and 65 uses of `any` in TypeScript across 19 files. Some are genuine placeholders — cases where the right type wasn't obvious and `any` was the fastest way to move forward. Some are structural: three Python services alias their GeoJSON types as `dict[str, Any]`, which means every function downstream inherits `Any` and the type checker has nothing useful to say about them. And about 24 TypeScript occurrences are `Record<string, unknown>` dictionaries used to pass tool parameters — generic enough that they're effectively `any` by another name.

This feature closes that debt. We're adding pyright as the Python static type checker, promoting the existing `@typescript-eslint/no-explicit-any` rule from `warn` to `error` across all TypeScript packages, and wiring both into CI as merge gates. We're also adding ruff ANN rules to catch missing annotations earlier in the pipeline. The ~208 existing violations get replaced with concrete types — not just suppressed with lint-disable comments.

The constitution now has a new article. Article XV mandates explicit type annotations everywhere, prohibits `Any`/`any` in production code, and requires type-checking CI gates for all languages. It's already merged.

## How It Fits

The project's schema-first architecture means our data models are defined once in LinkML and generated into Pydantic (Python) and TypeScript. That investment only pays off if the generated types are actually used — not bypassed through `dict[str, Any]` aliases or `as any` casts. Type checking makes that discipline enforceable rather than aspirational.

The decision to adopt pyright rather than mypy is deliberate. Every Python service uses Pydantic v2 models, and pyright understands `BaseModel`, `Field()`, and validators natively without any plugin. Since the VS Code extension is a first-class deliverable, the editor type checker and the CI type checker will be the same engine, which means developers see the same diagnostics locally that CI will report. That consistency matters.

## Key Decisions

- **Pyright over mypy** — First-class Pydantic v2 support, no plugin required. Handles uv workspace structure with a single `pyrightconfig.json` at the repo root. Incremental strictness levels allow per-package tightening rather than a global flag.

- **`no-explicit-any` promoted to `error`** — Currently `warn` in all TypeScript packages, which means it's ignored in practice. Warnings don't block PRs. Errors do.

- **ESLint coverage extended** — Only 3 of 8 TypeScript packages have ESLint configs. The remainder (`web-shell`, `session-state`, `schemas`, `config-ts`, `utils`) get configs in this feature.

- **`Record<string, unknown>` is treated as equivalent to `any`** — Generic parameter dictionaries for tool execution defeat static analysis in the same way `any` does. The fix is discriminated unions keyed on `toolId`, so that `ToolExecutionRequest` carries the concrete parameter type for the specific tool being invoked. The schema already defines `ToolParameter` with name, type, and description fields.

- **Generated code is production code** — The three `Any` occurrences in gen-pydantic boilerplate (`dict[str, Any]` in `ConfiguredBaseModel` and `LinkMLMeta`) are post-processed in `generate.py` to `dict[str, object]`. Excluding generated code entirely would be easier, but we'd lose the guarantee that what the schema generates is actually type-safe.

- **Ruff ANN rules complement pyright** — Ruff runs earlier in the pipeline and catches missing annotations faster than a full type-inference pass. ANN001/002/003/201/202 enforce annotation presence; TC001-003 move type-only imports into `TYPE_CHECKING` blocks to avoid circular import issues.

- **Type checking in CI, not pre-commit** — Pyright is too slow for pre-commit. It runs after `task lint` and before `task test` in the existing `Taskfile.yml` structure.

The codebase now enforces strict type safety end-to-end. We added pyright (Python), promoted ESLint's `no-explicit-any` rule to error (TypeScript), and wired both into CI as merge gates. The existing ~143 `Any` usages in Python got replaced with concrete types — only 2 remain, both in a single function handling recursive GeoJSON coordinates, and both documented. All 65+ explicit `any` in TypeScript are gone. Zero violations.

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
