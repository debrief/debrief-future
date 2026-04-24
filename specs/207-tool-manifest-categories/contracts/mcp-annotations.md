# Contract: MCP Annotation `debrief:uiCategory`

**Feature**: 207-tool-manifest-categories
**Files under change**:
- Python: `services/calc/debrief_calc/models.py` (`Tool.to_mcp_tool()`)
- TypeScript type: `shared/utils/src/mcp-types.ts` (`MCPToolDefinition.annotations`)
- TypeScript tool declarations: `apps/vscode/src/tools/**/*.ts`

## Annotation key

**Key name**: `debrief:uiCategory`

**Type**: `ToolCategory` (see `tool-schema.md`) — always a canonical string value `'import' | 'style' | 'calc' | 'filter' | 'snapshot'` when present.

**Presence**: Optional. Absent when the tool did not declare a category.

## Python emission contract

`Tool.to_mcp_tool()` in `services/calc/debrief_calc/models.py`:

```python
def to_mcp_tool(self) -> dict[str, Any]:
    # … existing selection requirements, derived category, parameter schema …

    annotations: dict[str, Any] = {
        "debrief:selectionRequirements": selection_requirements,
        "debrief:category": category,          # existing — hierarchical
        "debrief:version": self.version,
        "debrief:outputKind": self.output_kind,
    }

    # NEW — only emitted when the tool declared a value
    if self.category is not None:
        annotations["debrief:uiCategory"] = self.category.value

    return {
        "name": self.name,
        "description": self.description,
        "inputSchema": {…},
        "annotations": annotations,
    }
```

### Invariants

1. **Absence vs null**: if the tool did not declare a category, the key is **absent** from the annotations dict (not emitted as `null`). This matches the TypeScript optional-field convention and keeps the JSON compact.
2. **Enum value fidelity**: the emitted string is exactly `category.value` — one of the five canonical strings. No translation, no alias.
3. **Independent of `debrief:category`**: the two annotations are derived from independent sources (`debrief:category` from `output_kind` heuristic, `debrief:uiCategory` from the declared field). They can disagree; no consistency check is performed.

## TypeScript type contract

`shared/utils/src/mcp-types.ts`:

```typescript
import type { ToolCategory } from '@debrief/schemas';

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
  };
  annotations: {
    'debrief:selectionRequirements': MCPSelectionRequirement[];
    'debrief:category': string;
    'debrief:version': string;
    'debrief:outputKind': string;
    'debrief:uiCategory'?: ToolCategory;  // NEW
  };
}
```

## TypeScript first-party tool declarations

Existing tool files under `apps/vscode/src/tools/**` that export an `MCPToolDefinition` MUST set `'debrief:uiCategory'`. Example (`apps/vscode/src/tools/track/styling/setTrackColor.ts`):

```typescript
export const setTrackColorTool: MCPToolDefinition = {
  name: 'set-track-color',
  description: 'Set the colour of a track feature.',
  inputSchema: { /* … */ },
  annotations: {
    'debrief:selectionRequirements': [/* … */],
    'debrief:category': 'track/styling',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'mutation/track/styled',
    'debrief:uiCategory': 'style',  // NEW — required for first-party
  },
};
```

## Validation at the boundary

`adaptMCPToolsForMatching` (in `shared/components/src/ToolMatch/mcpAdapter.ts`) is updated to extract `annotations['debrief:uiCategory']` into the derived `Tool` object returned to the frontend. Invalid string values (not matching the literal union) are:
- Caught at compile time for TypeScript callers (literal union on the annotation type).
- Coerced to `null` at runtime for values coming over the wire (defensive parse at the extension-host boundary):

```typescript
const ALLOWED: ReadonlySet<string> = new Set(['import','style','calc','filter','snapshot']);
const raw = def.annotations['debrief:uiCategory'];
const category: ToolCategory | null = (typeof raw === 'string' && ALLOWED.has(raw))
  ? (raw as ToolCategory)
  : null;
```

A runtime warning is logged (developer-visible only, not surfaced to end users) when the raw value is a non-null string that does not match the allowed set.

## Tests required by this contract

| Test | Location | Assertion |
|---|---|---|
| `test_to_mcp_tool_emits_ui_category` | `services/calc/tests/test_models_mcp.py` | When `Tool(category=ToolCategory.CALC)`, `annotations['debrief:uiCategory'] == 'calc'`. |
| `test_to_mcp_tool_omits_ui_category_when_null` | same | When `Tool(category=None)`, the key is absent from `annotations`. |
| `test_mcp_adapter_extracts_ui_category` | `shared/components/src/ToolMatch/__tests__/mcpAdapter.test.ts` | Adapter produces `{ category: 'style' }` for input with `'debrief:uiCategory': 'style'`. |
| `test_mcp_adapter_coerces_invalid_ui_category_to_null` | same | Adapter produces `{ category: null }` for input with `'debrief:uiCategory': 'geometry'` + logs warning. |
| `test_mcp_adapter_handles_missing_ui_category` | same | Adapter produces `{ category: null }` for input with no `'debrief:uiCategory'` key + no warning. |
