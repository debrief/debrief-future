---
layout: future-post
title: "Planning: Strict Type Checking"
date: 2026-02-17
track: [momentum]
author: Ian
reading_time: 4
tags: [type-safety, python, typescript, ci, constitution]
excerpt: "Eliminating Any/any across the monorepo: pyright for Python, tighter ESLint for TypeScript, and a new constitutional article"
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

## What We'd Love Feedback On

The biggest practical question is how to handle the tool parameter types. The schema defines `ToolParameter` with metadata fields, but what the MCP protocol actually delivers at runtime is a JSON blob. We're proposing a discriminated union on `toolId` at the `ToolExecutionRequest` level, so TypeScript knows which parameter shape to expect when a specific tool fires. That works cleanly for the tools we know about, but it requires the discriminated union to be updated whenever a new tool is added. Is that the right trade-off, or would a different approach — typed parameter schemas generated directly from the tool registry — handle the extensibility better?

The second question is test file exceptions. The spec allows `Any`/`any` in test files when mocking genuinely requires it, with a lint-disable comment and a specific justification. Where's the line between "genuinely necessary for mocking" and "just convenient"? If you've dealt with this in typed Python or TypeScript test suites, we'd like to hear what your rule ended up being.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
