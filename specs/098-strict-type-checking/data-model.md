# Data Model: Strict Type Checking

**Feature**: 098-strict-type-checking
**Date**: 2026-02-17

This feature does not introduce new domain entities. It modifies how existing entities are typed across the codebase. The "data model" here describes the type-system constraints and configuration structures.

## Configuration Entities

### PyrightConfig

The root-level pyright configuration governing all Python packages.

| Field | Type | Description |
|-------|------|-------------|
| `include` | `string[]` | Directories to type-check (`services`, `shared`) |
| `exclude` | `string[]` | Directories to skip (generated code) |
| `pythonVersion` | `string` | Target Python version (`3.11`) |
| `typeCheckingMode` | `"basic" \| "standard" \| "strict"` | Strictness level — target is `strict` |
| `reportGeneralTypeIssues` | `boolean` | Report general type issues |
| `reportUnknownVariableType` | `boolean` | Flag variables with `Unknown` type |
| `reportUnknownMemberType` | `boolean` | Flag member access on `Unknown` |
| `reportUnknownArgumentType` | `boolean` | Flag arguments with `Unknown` type |
| `reportMissingTypeArgument` | `boolean` | Flag generics without type args |
| `disallowIncompleteDefs` | `boolean` | Require complete function signatures |

### ESLintTypeConfig

Per-package ESLint configuration for type-aware rules.

| Field | Type | Description |
|-------|------|-------------|
| `extends` | `string[]` | Must include `plugin:@typescript-eslint/recommended-requiring-type-checking` |
| `parserOptions.project` | `string` | Path to `tsconfig.json` for type-aware rules |
| `rules.@typescript-eslint/no-explicit-any` | `"error"` | Disallows `any` type annotations |
| `rules.@typescript-eslint/explicit-function-return-type` | `"warn" \| "error"` | Requires explicit return types |

### TypeViolationReport

Output from a type-checking run, used in CI and developer tooling.

| Field | Type | Description |
|-------|------|-------------|
| `language` | `"python" \| "typescript"` | Which language the violation is in |
| `file` | `string` | File path relative to repo root |
| `line` | `number` | Line number of the violation |
| `column` | `number` | Column number |
| `code` | `string` | Error code (e.g., `reportUnknownVariableType`, `no-explicit-any`) |
| `message` | `string` | Human-readable description |
| `severity` | `"error" \| "warning"` | Severity level |

## Modified Existing Types

### GeoJSON Type Aliases (Python)

**Current** (in `services/stac/src/debrief_stac/types.py`):
```python
STACCatalog: TypeAlias = dict[str, Any]
STACItem: TypeAlias = dict[str, Any]
GeoJSONFeature: TypeAlias = dict[str, Any]
```

**Target**: Replace with TypedDict or Pydantic models referencing schema-generated types.

### Tool Parameter Types (TypeScript)

**Current** (in `apps/vscode/src/types/tool.ts`):
```typescript
params?: Record<string, unknown>;
```

**Target**: Discriminated union or mapped type referencing per-tool parameter shapes derived from the schema's `ToolParameter` type.

## Relationships

```
LinkML Schema
    ├── gen-pydantic → Python Pydantic models (strict, no Any)
    ├── gen-typescript → TypeScript interfaces (strict, no any)
    └── gen-json-schema → JSON Schema (validation)

Python services consume Pydantic models ← PyrightConfig enforces
TypeScript frontends consume TS interfaces ← ESLintTypeConfig enforces
CI pipeline runs both checks ← Taskfile.yml orchestrates
```
