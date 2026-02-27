# Violation Inventory — Strict Type Checking (098)

## TypeScript `any` Violations

### Before (baseline): ~65 explicit `any` usages

| Location | Count | Status |
|----------|-------|--------|
| apps/vscode/tests/ | 15 | FIXED — replaced with concrete interfaces |
| shared/components/src/MapView/ | 8 | FIXED — `as unknown as Record<string, unknown>` |
| shared/components/tests/ | 12 | FIXED — typed mocks and assertions |
| apps/web-shell/src/ | 6 | FIXED — typed service interfaces |
| services/session-state/tests/ | 3 | FIXED — concrete types |
| eslint-disable comments | ~21 | REMOVED — all no-explicit-any disables eliminated |

### After: 0 ESLint `no-explicit-any` violations

## Python `Any` Violations

### Before (baseline): ~143 explicit `Any` annotations

| Category | Count | Action |
|----------|-------|--------|
| `dict[str, Any]` for GeoJSON/STAC blobs | ~80 | KEPT — correct type for unstructured JSON |
| `dict[str, Any]` for MCP params/responses | ~25 | KEPT — protocol-level generic dicts |
| Pydantic `Any` fields (parameter values) | ~12 | KEPT with `# JSON-serializable value` comments |
| `Any` in function params/returns | ~8 | FIXED — `object` or concrete types |
| `_flatten_coordinates(coords: Any)` | 2 | KEPT — complex nested GeoJSON coordinates |

### After: 2 ANN401 violations (justified)

Both in `services/cli/debrief_cli/tools.py:_flatten_coordinates()` — handles recursive coordinate arrays of varying nesting depth (`number[]`, `number[][]`, `number[][][]`).

## Pyright Error Inventory (132 pre-existing)

| Category | Count | Root Cause |
|----------|-------|------------|
| reportCallIssue | 55 | Pydantic model constructors with snake_case vs camelCase |
| reportOptionalMemberAccess | 28 | Optional chaining on possibly-None returns |
| reportArgumentType | 20 | Type narrowing gaps in test fixtures |
| reportOptionalSubscript | 8 | Subscript on Optional values |
| reportOptionalCall | 7 | Calling potentially-None callables |
| reportFunctionMemberAccess | 5 | Pydantic model method resolution |
| reportInvalidTypeForm | 3 | Python 3.10+ union syntax in 3.11 context |
| reportMissingImports | 2 | Uninstalled dev packages |
| Other | 4 | Various edge cases |

**Note**: All 132 errors are pre-existing and not introduced by this feature. They are concentrated in test files (70/132) and relate to Pydantic v2 model construction patterns from LinkML-generated code.

## Ruff ANN Baseline

| Rule | Count | Description |
|------|-------|-------------|
| ANN201 | 768 | Missing return type annotation |
| ANN001 | 241 | Missing function parameter type |
| ANN202 | 22 | Missing return type for public method |
| ANN204 | 17 | Missing return type for __init__ |
| ANN401 | 2 | Use of Any (justified) |
| ANN002 | 3 | Missing *args type |
| ANN003 | 3 | Missing **kwargs type |
| TC001 | 3 | Move import into TYPE_CHECKING |
| TC003 | 2 | Move import into TYPE_CHECKING (stdlib) |
| TC005 | 1 | Found empty TYPE_CHECKING block |
| **Total** | **1,062** | Baseline for progressive improvement |
