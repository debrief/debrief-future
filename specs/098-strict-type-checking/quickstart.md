# Quickstart: Strict Type Checking

**Feature**: 098-strict-type-checking
**Date**: 2026-02-17

## What This Feature Does

Enforces strict type safety across all Python and TypeScript code in the project. After implementation:

- Every function parameter, return type, and variable has an explicit type annotation
- `Any` (Python) and `any` (TypeScript) are prohibited in production code
- Static type checkers run in CI and block merges on violations
- The constitution mandates type safety as a non-negotiable development principle

## Developer Workflow Changes

### Python Development

**Before**: Write code, run `ruff check`, tests pass → merge.

**After**: Write code, run `ruff check`, run `pyright`, tests pass → merge.

```bash
# Run type checking locally
uv run pyright

# Run with ruff annotation checks
uv run ruff check --select ANN .
```

**What will fail**:
- Functions without return type annotations
- Parameters without type annotations
- Using `Any` anywhere in production code
- `dict[str, Any]` aliases — use typed models instead

### TypeScript Development

**Before**: Write code, run `eslint`, `tsc --noEmit`, tests pass → merge.

**After**: Same workflow, but `no-explicit-any` is now `error` instead of `warn`.

```bash
# Run type checking locally
pnpm typecheck

# Run linting (now catches any usage)
pnpm lint
```

**What will fail**:
- `any` type annotations or casts (`as any`)
- `Record<string, unknown>` for tool parameters — use typed interfaces
- Missing `parserOptions.project` in ESLint config (type-aware rules need it)

## How to Fix Common Violations

### Python: Replace `Any` with concrete types

```python
# Before
def process(data: dict[str, Any]) -> Any:
    return data["value"]

# After
from debrief_schemas import TrackFeature
def process(data: TrackFeature) -> str:
    return data.name
```

### Python: Type narrow at boundaries

```python
# Before
result = external_lib.get_data()  # returns Any

# After
from pydantic import TypeAdapter
adapter = TypeAdapter(list[TrackFeature])
result = adapter.validate_python(external_lib.get_data())
```

### TypeScript: Replace `any` with concrete types

```typescript
// Before
function handleResult(data: any): void { ... }

// After
import type { ToolExecutionResult } from './types/tool';
function handleResult(data: ToolExecutionResult): void { ... }
```

### TypeScript: Type narrow JSON

```typescript
// Before
const parsed = JSON.parse(text) as any;

// After
import { ToolExecutionResult } from './types/tool';
const parsed: unknown = JSON.parse(text);
// validate parsed against expected shape
```

## Files Changed

### New Files
- `pyrightconfig.json` — root-level pyright configuration
- ESLint configs for packages currently missing them (`web-shell`, `session-state`, `schemas`, `config-ts`, `utils`)
- `typecheck` task in `Taskfile.yml`

### Modified Files
- `CONSTITUTION.md` — Article XV: Strict Type Safety (already added)
- `ruff.toml` — add `ANN`, `TC` rule sets
- `Taskfile.yml` — add `typecheck` task
- `.github/workflows/ci.yml` — add `task typecheck` step
- All existing `.eslintrc.*` files — set `no-explicit-any: error`, add `parserOptions.project`
- `apps/web-shell/tsconfig.node.json` — add `strict: true`
- `shared/schemas/scripts/generate.py` — post-process `Any` in generated boilerplate
- ~30 Python files — replace `Any` with concrete types
- ~19 TypeScript files — replace `any` with concrete types

## Verification

```bash
# Full verification (what CI will run)
task lint && task typecheck && task test

# Quick check: count remaining Any/any violations
rg ': Any\b|-> Any\b' --type py --glob '!**/generated/**' -c
rg ': any\b|as any\b' --type ts -c
```
