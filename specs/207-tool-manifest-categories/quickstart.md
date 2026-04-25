# Quickstart: Declaring a Tool's Log Panel Category

**Feature**: 207-tool-manifest-categories
**Audience**: tool authors (Python + TypeScript)

## The one-line summary

Add `category="<one-of-five>"` when you register a tool. That's it — the Log Panel icon renders correctly everywhere.

## The five categories

| Category | Use for |
|---|---|
| `import` | Tools that load external data into a session (REP loader, CSV import, DPF parser). |
| `style` | Tools that change how features *look* (colour, line width, symbol, label interval). |
| `calc` | Tools that *compute* — new geometry, new measurements, derived tracks. |
| `filter` | Tools that *narrow* the dataset — by time, depth, bearing, trim. |
| `snapshot` | Tools that export or capture a view (PNG, CSV, GeoJSON dump). |

If none fits cleanly, pick the closest and raise it as a conversation — re-categorising is easy because every tool declares its own value.

If you genuinely should not have a category (e.g. a developer-only internal tool), omit the field. The Log Panel will render the card with a neutral-grey icon.

## Python (services/calc tools)

Add `category=ToolCategory.CALC` (or another value) to your `@tool` decorator:

```python
from debrief_calc import tool, ContextType
from debrief_schemas import ToolCategory  # generated from LinkML

@tool(
    name="range-between-tracks",
    description="Compute range between two tracks over time.",
    input_kinds=["TRACK"],
    output_kind="dataset/range_bearing_series",
    context_type=ContextType.MULTI,
    category=ToolCategory.CALC,       # <-- NEW
)
def range_between_tracks(context, params):
    ...
```

## TypeScript (apps/vscode extension tools)

Add `'debrief:uiCategory': '<one-of-five>'` to the tool's `MCPToolDefinition` annotations:

```typescript
import type { MCPToolDefinition } from '@debrief/utils';

export const setTrackColorTool: MCPToolDefinition = {
  name: 'set-track-color',
  description: 'Set the colour of a track feature.',
  inputSchema: { /* … */ },
  annotations: {
    'debrief:selectionRequirements': [/* … */],
    'debrief:category': 'track/styling',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'mutation/track/styled',
    'debrief:uiCategory': 'style',     // <-- NEW
  },
};
```

TypeScript's literal union will catch typos at `pnpm typecheck` time — `'styls'` or `'geometry'` won't compile.

## Contrib / third-party tools

Contrib tools follow the same contract as first-party tools. If your contrib tool declares a value, it will be rendered with the declared colour in the Log Panel. If it omits the field, the card renders grey — no upstream change required.

The contrib tool must be registered via the standard tool-registration path (`@tool` decorator in Python; `MCPToolDefinition` export consumed by the VS Code extension's tool loader in TypeScript). The Log Panel component itself does not need to know the contrib tool exists.

## Verifying your declaration

### Locally (fast feedback)

```bash
# Python — construct the tool and check the MCP annotation
uv run python -c "
from debrief_calc import registry
for t in registry.list_all():
    mcp = t.to_mcp_tool()
    print(t.name, '->', mcp['annotations'].get('debrief:uiCategory', '(unset)'))
"

# TypeScript — the first-party-coverage test walks all tool exports
pnpm --filter @debrief/vscode test -- first-party-categories
```

### In CI (hard gate)

`task verify` runs:
- `pnpm typecheck` — catches TypeScript typos.
- `uv run pyright` + Pydantic `ValidationError` in tests — catches Python typos.
- `uv run pytest services/calc/tests/test_first_party_categories.py` — catches missing declarations on first-party calc tools.
- `pnpm --filter @debrief/vscode test` — catches missing declarations on first-party VS Code tools.

A PR that introduces an invalid or missing category on a first-party tool will fail `task verify` and cannot merge.

## What the Log Panel does with your category

1. Your tool's category is carried in the MCP `tools/list` response (Python: `Tool.to_mcp_tool()` emits `debrief:uiCategory`; TypeScript: the exported `MCPToolDefinition` already carries it).
2. The VS Code extension's `calcService.listTools()` caches the response (60 s TTL).
3. On session start the extension pushes the tool-categories map to the Log Panel webview via a `tools:manifest` message.
4. The Log Panel React component looks up your tool ID in the map at render time and paints the card icon with the corresponding colour/glyph.

No part of the Log Panel source code knows your tool exists — the category flows from your declaration all the way to the pixel.

## Frequently asked questions

**Q: What if my tool legitimately does multiple things (e.g. import *and* style)?**
A: Pick the category that best reflects the tool's *primary* user-facing effect. Log Panel colouring is a visual grouping, not a taxonomy — a 1:1 mapping keeps it scannable.

**Q: Can I add a new category?**
A: Not in this feature. Expanding beyond the five SRD buckets is a separate conversation (spec assumption A2). Open a backlog item if you have a case.

**Q: What category should a destructive tool like `delete-features` use?**
A: Currently `style` (preserved from the interim static map to avoid visible behaviour change). A future conversation may introduce a destructive-operation bucket — out of scope for this feature (spec assumption A6 / research R7).

**Q: Will my tool break if I forget to declare a category?**
A: First-party tools: yes — `task verify` will fail. Contrib tools: no — the card renders with the neutral-grey icon and the tool works normally.

**Q: Do I need to update the LogPanel component when I add a new tool?**
A: No. That's the whole point of this feature. The only file you edit is the tool registration site.
