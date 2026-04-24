# Usage Example: Declaring a Tool's Log Panel Category

**Feature**: 207-tool-manifest-categories
**Audience**: tool authors (Python + TypeScript)

## The one-line summary

Add `category=` (or `'debrief:uiCategory'`) when you register a tool. That's it. The Log Panel icon renders correctly everywhere.

## Python — adding a new calc tool

Before feature 207 (relying on the static shim in `shared/components/`):

```python
# services/calc/debrief_calc/tools/track/manipulation/interpolate.py
from debrief_calc import tool, ContextType

@tool(
    name="interpolate-track",
    description="Interpolate track positions between existing points.",
    input_kinds=["TRACK"],
    output_kind="mutation/track/interpolated",
    context_type=ContextType.SINGLE,
)
def interpolate_track(context, params):
    ...
```

**Problem**: New tool → Log Panel renders neutral grey until someone remembers to edit `shared/components/src/LogPanel/toolCategories.ts` and add `"interpolate-track": "calc"` to the static map. The signal in the icons silently decays every time.

After feature 207:

```python
# services/calc/debrief_calc/tools/track/manipulation/interpolate.py
from debrief_calc import tool, ContextType
from debrief_calc.models import ToolCategoryEnum

@tool(
    name="interpolate-track",
    description="Interpolate track positions between existing points.",
    input_kinds=["TRACK"],
    output_kind="mutation/track/interpolated",
    context_type=ContextType.SINGLE,
    category=ToolCategoryEnum.calc,           # NEW — declared at the source
)
def interpolate_track(context, params):
    ...
```

The Log Panel icon for `interpolate-track` entries renders with the green `calc` background (`#dcfce7`) and the `∿` glyph automatically. No file under `shared/components/src/LogPanel/` needs to change.

**Verification**:
```
$ uv run pytest services/calc/tests/test_first_party_categories.py -v
tests/test_first_party_categories.py::test_every_first_party_tool_has_a_category PASSED
tests/test_first_party_categories.py::test_every_category_is_canonical PASSED
tests/test_first_party_categories.py::test_every_first_party_tool_emits_ui_category_annotation PASSED
tests/test_first_party_categories.py::test_registry_is_non_empty PASSED
============================== 4 passed in 0.9s ==============================
```

If you forget the `category=` kwarg, the first test fails with a clear diagnostic:

```
AssertionError: The following first-party tools have no visual category declared:
  - interpolate-track

Add `category=ToolCategoryEnum.<one-of-five>` to their @tool decorator.
See specs/207-tool-manifest-categories/quickstart.md.
```

If you mistype (e.g. `category="geometry"`), Pydantic rejects at validation time:

```
pydantic_core._pydantic_core.ValidationError: 1 validation error for Tool
category
  Input should be 'import', 'style', 'calc', 'filter' or 'snapshot'
  [type=enum, input_value='geometry', input_type=str]
```

## TypeScript — adding a new VS Code extension tool

```typescript
// apps/vscode/src/tools/track/analysis/detectGaps.ts
import type { MCPToolDefinition } from '../../../types/tool';

export const toolDefinition: MCPToolDefinition = {
  name: 'detect-track-gaps',
  description: 'Flag gaps in a track longer than a threshold.',
  inputSchema: { /* ... */ },
  annotations: {
    'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
    'debrief:category': 'track/analysis',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'addition/track/gap_markers',
    'debrief:uiCategory': 'calc',           // NEW — declared at the source
  },
};
```

TypeScript's string-literal union catches typos at typecheck time:

```
$ pnpm typecheck
src/tools/track/analysis/detectGaps.ts(12,5): error TS2322:
Type '"geometry"' is not assignable to type
'"import" | "style" | "calc" | "filter" | "snapshot" | undefined'.
```

And the first-party coverage test catches omissions:

```
$ pnpm test -- firstPartyCategories
FAIL  tests/unit/firstPartyCategories.test.ts
  ✗ detect-track-gaps declares a debrief:uiCategory annotation
    expect(detect-track-gaps must declare debrief:uiCategory).toBeDefined()
```

## The five categories

| Value | When to use | Colour | Glyph |
|---|---|---|---|
| `import` | File / data ingestion | Blue `#dbeafe` | ⬇ |
| `style` | Appearance changes (colour, line width, symbols, labels) | Purple `#ede9fe` | 🎨 |
| `calc` | Analytical computation (derived geometry, measurements) | Green `#dcfce7` | ∿ |
| `filter` | Narrowing the dataset (time/depth/trim filters) | Amber `#fff7ed` | ⧖ |
| `snapshot` | Export or capture (PNG, CSV, GeoJSON dump) | Yellow `#fef9c3` | 📷 |

If none fits, pick the closest and raise the question — re-categorising is easy because every tool declares its own value in its own file.

## How it flows

```
LinkML ToolCategoryEnum
   ↓ generator
Python `ToolCategoryEnum` StrEnum ─────┐
   ↓                                   │
@tool(category=ToolCategoryEnum.calc)  │
   ↓                                   │
Tool.to_mcp_tool() → {"debrief:uiCategory": "calc"}
   ↓                                   │
MCP tools/list response ────────────── │
   ↓                                   │
calcService.listTools() (cached 60 s)  │
   ↓                                   │
calcService.getToolCategoryMap()       │
   ↓                                   │
{type: "tools:manifest", payload: {...}} → webview
   ↓
React state → <LogPanel toolCategories={...}>
   ↓
<ToolCategoryIcon toolCategories={...}>
   ↓
resolveToolCategory(toolName, toolCategories)
   ↓
TOOL_CATEGORY_CONFIGS[category] → icon background + glyph
```

The entire path is typed end-to-end. A typo anywhere in the pipeline fails either:
- **Pydantic validation** at tool registration (Python side), or
- **TypeScript typecheck** at author time (TS side), or
- **First-party coverage test** at `task verify` time (either side).

There is no silent failure mode. Unknown tools at the rendering layer fall back to neutral grey — no crash, no broken icon.
