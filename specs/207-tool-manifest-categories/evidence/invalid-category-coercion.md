# Invalid Category Coercion — Fail-Closed Evidence

**Feature**: 207-tool-manifest-categories (US4)
**Requirement**: FR-007, FR-008, FR-010, SC-005

Spec assumption A3 + SC-005 require that a malformed or unexpected `debrief:uiCategory` on one tool does not break the Log Panel for other cards. This evidence captures the fail-closed behaviour at each layer.

## Layer 1 — Python construction (Pydantic)

```python
>>> from debrief_calc.models import Tool, ToolCategoryEnum, ContextType
>>> Tool.model_validate({
...     "name": "bad-tool",
...     "description": "Demo of fail-closed at construction",
...     "input_kinds": ["TRACK"],
...     "output_kind": "track/statistics",
...     "context_type": "single",
...     "category": "geometry",   # NOT one of the five canonical values
... })
pydantic_core._pydantic_core.ValidationError: 1 validation error for Tool
category
  Input should be 'import', 'style', 'calc', 'filter' or 'snapshot'
  [type=enum, input_value='geometry', input_type=str]
```

**Result**: misdeclaration on a Python-side tool is caught at import time. The misbehaving tool module fails to load; other tools still register. Article V.1 (fail-safe loading) holds.

Verified by `test_tool_rejects_invalid_category_string` and `test_tool_rejects_invalid_category_typo` in `services/calc/tests/test_models.py`.

## Layer 2 — JSON Schema validation

```python
>>> import json
>>> from jsonschema import Draft202012Validator, ValidationError
>>> schema = json.loads(open("shared/schemas/src/generated/json-schema/Tool.schema.json").read())
>>> validator = Draft202012Validator(schema)
>>> validator.validate({
...     "id": "bad-tool",
...     "name": "Bad",
...     "category": "geometry",
... })
jsonschema.exceptions.ValidationError:
  'geometry' is not one of ['import', 'style', 'calc', 'filter', 'snapshot']
```

**Result**: cross-language validation rejects the same value, closing the gap for non-Python consumers.

Verified by `test_invalid_category_rejected_by_json_schema` in `shared/schemas/tests/test_tool_category_round_trip.py`.

## Layer 3 — TypeScript typecheck

```typescript
// apps/vscode/src/tools/demo/badCategory.ts
export const toolDefinition: MCPToolDefinition = {
  name: 'bad-tool',
  description: 'Demo',
  inputSchema: { type: 'object', properties: {} },
  annotations: {
    'debrief:selectionRequirements': [],
    'debrief:category': 'demo',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'addition/feature',
    'debrief:uiCategory': 'geometry',   // ←
  },
};
```

```
$ pnpm typecheck
src/tools/demo/badCategory.ts(12,5): error TS2322:
Type '"geometry"' is not assignable to type
'"import" | "style" | "calc" | "filter" | "snapshot" | undefined'.
```

**Result**: TypeScript authors cannot compile a first-party tool with an invalid category. Caught at `tsc --noEmit` time — before the change ever reaches a runtime.

## Layer 4 — Runtime MCP boundary (defensive, for wire data)

If a malformed manifest reaches the VS Code extension at runtime (e.g. from a contrib tool that bypassed typecheck), the `mcpAdapter` boundary coerces the value and logs a developer-visible warning:

```typescript
// Captured behaviour from unit test:
// shared/components/src/ToolMatch/__tests__/mcpAdapter.test.ts
//   "coerces an invalid string to undefined and warns exactly once"

const mcp: MCPToolDefinition = { /* ... */,
  annotations: { /* ... */, 'debrief:uiCategory': 'geometry' as any } };
const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const tool = fromMCPTool(mcp);
// tool.category === undefined
// warn called once with:
//   '[debrief:uiCategory] tool "bad-tool" declared category "geometry"
//    which is not one of import|style|calc|filter|snapshot;
//    falling back to neutral grey'
```

**Result**: the card for `bad-tool` renders with the grey fallback icon. Other cards in the Log Panel are unaffected.

Verified by 4 tests in `shared/components/src/ToolMatch/__tests__/mcpAdapter.test.ts` ("coerces an invalid string to undefined and warns exactly once", "coerces a non-string value to undefined and warns", "does NOT warn when annotation is absent", "accepts canonical category value") and 1 test in `apps/vscode/tests/unit/calcServiceMcpAdapter.test.ts` ("coerces invalid uiCategory to undefined + warns").

## Layer 5 — Rendering fallback

At the LogPanel component layer, `resolveToolCategory(toolName, toolCategories)` returns `UNKNOWN_CATEGORY_CONFIG` for any of:

- `toolCategories` is `undefined` (manifest not yet delivered)
- `toolCategories[toolName]` is absent (tool not in manifest)
- `toolCategories[toolName]` is `null` (tool declared no category)
- `toolCategories[toolName]` is a non-canonical string (boundary somehow leaked)

Verified by 7 tests in `shared/components/src/LogPanel/__tests__/toolCategories.test.ts`.

## End-to-end guarantee

The defence in depth means a misdeclaration on **any one tool** cannot:
- crash the Log Panel
- affect sibling cards
- render a visibly wrong (non-grey, non-declared) colour
- ship to production without a developer-visible signal (ValidationError / typecheck error / `console.warn` / failing `task verify`)

This is the fail-closed contract SC-005 asked for.
