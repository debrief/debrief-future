# Research: Strict Type Checking

**Feature**: 098-strict-type-checking
**Date**: 2026-02-17

## R1: Python Static Type Checker Selection

**Decision**: Pyright

**Rationale**:
1. **First-class Pydantic v2 support** — pyright understands `BaseModel`, `Field()`, validators, and `model_config` natively without any plugin. Every Python service in this project uses Pydantic v2 models. Mypy requires the `pydantic.mypy` plugin for equivalent support.
2. **uv workspace compatibility** — pyright handles `pyproject.toml` workspaces with a single `pyrightconfig.json` at the repo root, covering all 6+ packages in one pass.
3. **VS Code alignment** — since `apps/vscode/` is a first-class deliverable, pyright/Pylance is the same engine used in the editor. CI and editor diagnostics will be consistent.
4. **Incremental mode levels** — pyright's `off` → `basic` → `standard` → `strict` allows gradual tightening per-file or per-package, rather than a global all-or-nothing flag.
5. **Speed** — pyright is significantly faster than mypy for large codebases, especially in incremental mode.

**Alternatives Considered**:
- **mypy**: More mature ecosystem, broader third-party stub coverage. However, requires `pydantic.mypy` plugin, slower, and less natural workspace support. The existing `# type: ignore[attr-defined]` comments in the codebase are compatible with both tools.
- **ruff**: Already in use for linting. Has `ANN` rules for annotation presence but **cannot perform type inference or type correctness checking**. Not a substitute for pyright or mypy. Will add `ANN` rules as a complement.
- **basedpyright**: Fork of pyright with stricter defaults. Considered overkill for initial rollout; can upgrade later.

## R2: Current TypeScript Type Checking State

**Decision**: Promote existing configuration to consistent strict standard across all packages.

**Rationale**: TypeScript is already mostly strict, but enforcement is inconsistent:

| Gap | Current State | Required Change |
|-----|---------------|-----------------|
| `no-explicit-any` | Inherited as `warn` from `recommended` everywhere; `off` in shared/components test files | Set to `error` in all configs; keep test override but require per-line justification |
| ESLint coverage | Only 3 of 8 TypeScript packages have ESLint configs | Add configs to `web-shell`, `session-state`, `schemas`, `config-ts`, `utils` |
| Type-aware rules | Only `apps/vscode` uses `recommended-requiring-type-checking` | Enable in all packages with `parserOptions.project` |
| Webview linting | `apps/vscode` excludes `src/webview/web/**` from ESLint | Add ESLint config for webview |
| `web-shell/tsconfig.node.json` | Missing `strict: true` | Add `strict: true` |
| Typecheck in CI | Root `pnpm typecheck` exists but not called in `ci.yml` | Add `task typecheck` step to CI |
| `web-shell` typecheck | No `typecheck` script in package.json | Add `typecheck` script |

**Alternatives Considered**:
- **Flat ESLint config**: Migrating to ESLint v9 flat config would allow a single root config. Deferred — too much churn for this feature. Current per-package `.eslintrc` approach is workable.
- **Biome**: Faster linter+formatter with built-in TypeScript support. Deferred — ESLint is well-established in the codebase and switching tools is out of scope.

## R3: Generated Schema Types

**Decision**: No action needed for generated TypeScript. Minor post-processing for generated Python.

**Rationale**:
- **TypeScript**: Zero `any` type annotations in generated output. The `strict: true` tsconfig enforces this. Two "any" matches are prose in JSDoc comments, not type annotations.
- **Python**: Three `Any` occurrences, all in gen-pydantic boilerplate classes (`ConfiguredBaseModel`, `LinkMLMeta`), not in domain model fields. These are infrastructure classes the generator always emits.
  - `dict[str, Any]` in serializer method → can be post-processed to `dict[str, object]`
  - `dict[str, Any]` in `LinkMLMeta` root model → can be post-processed to `dict[str, object]`
- The `ruff.toml` already excludes `shared/schemas/src/generated/` from linting. Pyright can similarly exclude generated code, or the post-processing in `generate.py` can patch the three occurrences.

**Alternatives Considered**:
- **Upstream fix**: Submit a PR to `linkml/linkml` to make `gen-pydantic` emit `object` instead of `Any` in boilerplate. Good long-term fix, but unreliable timeline.
- **Exclude generated code entirely**: Simpler but undermines the goal of treating generated code as production code. Post-processing is a better fit.

## R4: `Record<string, unknown>` in Tool Parameters

**Decision**: Replace generic dictionaries with discriminated union types referencing existing schema types.

**Rationale**: There are ~24 occurrences of `Record<string, unknown>` for tool parameters across the codebase. The core issue is in `ToolExecutionRequest.params` (`apps/vscode/src/types/tool.ts:374`). The schema already defines `ToolParameter` with `name`, `type`, `description`, `default`, and `required` fields. Tool parameter shapes are knowable at design time from the tool registry.

**Approach**:
1. Define per-tool parameter types derived from the schema's `ToolParameter` definitions
2. Use a discriminated union on `toolId` so that `ToolExecutionRequest` carries tool-specific typed params
3. At boundaries (MCP responses, JSON parsing), validate into the typed structure before passing to application code
4. `ParameterCollector` component can use the typed parameter definitions for form generation

**Alternatives Considered**:
- **Generic with runtime validation only**: Keep `Record<string, unknown>` but validate at runtime with Zod. This maintains the generic dictionary pattern, which defeats static analysis.
- **Mapped type from tool registry**: Use TypeScript mapped types to auto-derive parameter types from a central registry object. More DRY but harder to read and debug.

## R5: CI Pipeline Changes

**Decision**: Add two new steps to `ci.yml` via `Taskfile.yml`.

**Rationale**: The existing CI structure uses `Taskfile.yml` to orchestrate `task lint` and `task test`. Adding type checking follows the same pattern:

1. **`task typecheck`** (new) — calls `pnpm -r typecheck` (TypeScript) and `uv run pyright` (Python)
2. This step runs after `task lint` and before `task test`
3. The root `package.json` already has a `typecheck` script but it's never called in CI — just wire it up
4. Add `pyright` to the root `pyproject.toml` dev dependencies

**Alternatives Considered**:
- **Separate workflow**: Create a `type-check.yml` workflow. Rejected — this adds workflow sprawl. Type checking is a core quality gate like linting, so it belongs in the primary CI job.
- **Pre-commit hook**: Run pyright as a pre-commit hook. Rejected — pyright is too slow for pre-commit. Use CI enforcement instead.

## R6: Ruff Rule Additions for Python

**Decision**: Add `ANN` (flake8-annotations) and `TC` (flake8-type-checking) rule sets to `ruff.toml`.

**Rationale**:
- `ANN` rules enforce annotation presence on function parameters and return types. This catches the "missing annotation" class of issues that pyright's strict mode also flags, but ruff catches them faster (in lint, before type checking).
- `TC` rules move type-only imports into `TYPE_CHECKING` blocks, which is a best practice for typed codebases and avoids circular import issues.
- These complement pyright rather than replacing it.

**Rules to enable**:
- `ANN001` — missing type annotation for function argument
- `ANN002` — missing type annotation for `*args`
- `ANN003` — missing type annotation for `**kwargs`
- `ANN201` — missing return type annotation for public function
- `ANN202` — missing return type annotation for private function
- `TC001`, `TC002`, `TC003` — type-checking import rules

**Alternatives Considered**:
- **Rely on pyright alone**: Pyright's strict mode flags missing annotations. However, ruff is faster and runs earlier in the pipeline, providing quicker feedback.
- **Enable all ANN rules**: `ANN101`/`ANN102` (self/cls annotations) are deprecated as of Python 3.11. Skip these.

## R7: `dict[str, Any]` GeoJSON Type Aliases

**Decision**: Replace GeoJSON type aliases with proper TypedDict or Pydantic models.

**Rationale**: The Python codebase has several type aliases like:
```python
STACCatalog: TypeAlias = dict[str, Any]
STACItem: TypeAlias = dict[str, Any]
GeoJSONFeature: TypeAlias = dict[str, Any]
```
These are the primary source of `Any` propagation — every function consuming GeoJSON inherits `Any`. The schema already defines `TrackFeature`, geometry types, and other GeoJSON structures as Pydantic models. The fix is to use those schema-generated types instead of `dict[str, Any]`.

For STAC types that aren't in the schema (catalog, item), define `TypedDict` structures matching the STAC specification's required fields.

**Alternatives Considered**:
- **Use `dict[str, object]`**: Slightly better than `Any` (prevents attribute access without narrowing) but still loses field-level type information.
- **Third-party STAC library types**: Libraries like `pystac` provide typed models, but adding a dependency violates Article IX (minimal dependencies).
