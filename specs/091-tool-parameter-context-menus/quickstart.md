# Quickstart: Tool Parameter Context Menus

**Feature**: 091-tool-parameter-context-menus
**Date**: 2026-02-13

## Overview

This feature adds pre-execution parameter collection for analysis tools and migrates tool parameter values to schema-defined types. It touches four workspace packages:

1. **shared/schemas** — New LinkML enums, regenerated types
2. **services/calc** — Extended ToolParameter model, tool migrations
3. **shared/components** — New ContextMenu component, ParameterCollector, message protocol
4. **apps/vscode** — Extended executeTool handler

## Prerequisites

```bash
# Python environment
cd services/calc
uv sync

# TypeScript environment
cd shared/components
pnpm install

cd apps/vscode
pnpm install
```

## Development Workflow

### Phase A: Schema Layer (Python)

1. **Add parameter-value enums** to `shared/schemas/src/linkml/common.yaml`:
   - `NamedColorEnum`, `MarkerSymbolEnum`, `CardinalDirectionEnum`
   - `DurationPresetEnum`, `NumericPresetEnum`
   - Extend `PointShapeEnum` with `diamond`, `cross`

2. **Add ToolParameter class** to `shared/schemas/src/linkml/tool.yaml`:
   - `ParameterTypeEnum` with valid type names
   - `ToolParameter` class with `param_type` field

3. **Regenerate derived types**:
   ```bash
   cd shared/schemas
   make generate
   ```

4. **Add golden fixtures**:
   - Valid/invalid parameter-value enum fixtures in `shared/schemas/fixtures/`
   - Round-trip tests for new enums

5. **Run schema tests**:
   ```bash
   cd shared/schemas
   make test
   ```

### Phase B: Python Service Layer

1. **Extend ToolParameter model** in `services/calc/debrief_calc/models.py`:
   - Add `param_type: str | None = None` field
   - Add validator: if `param_type` set, must be valid `ParameterTypeEnum` member
   - Keep `choices` field for backward compatibility

2. **Update MCP output** to include `x-debrief-param-type`:
   - When `param_type` is set on a parameter, include it as a JSON Schema annotation
   - Do not flatten enum values when `param_type` is present

3. **Migrate tool files** to use `param_type`:
   - `apply_symbol_style.py`: `VALID_SYMBOLS` → `param_type="MarkerSymbol"`
   - `set_track_color.py`: Add `param_type="NamedColor"` to color param
   - `symbol_interval.py`: Add `param_type="DurationPreset"` to interval param
   - `label_interval.py`: Add `param_type="DurationPreset"` to interval param

4. **Run Python tests**:
   ```bash
   cd services/calc
   uv run pytest
   ```

### Phase C: TypeScript UI Layer

1. **Create ContextMenu component** in `shared/components/src/ContextMenu/`:
   - `ContextMenu.tsx` — Reusable inline menu with keyboard nav
   - `ContextMenu.css` — Styling with viewport repositioning
   - `ContextMenu.stories.tsx` — Storybook stories

2. **Create ParameterCollector** in `shared/components/src/ToolsPanel/`:
   - Orchestrates sequential parameter collection
   - Resolves `paramType` to enum values from generated types
   - Handles custom input for duration/numeric parameters
   - Fires `onComplete(params)` when all parameters collected

3. **Update ToolsPanel** to integrate parameter collection:
   - Check if clicked tool has parameters
   - If yes: show ParameterCollector before calling `onRunTool`
   - If no: call `onRunTool` immediately (unchanged)

4. **Update RunDropdown** with same parameter flow

5. **Extend message types**:
   - `ActivityPanelMessage`: `tool:run` payload gains `params` field
   - `ToolsPanelItem`: gains `parameters` array

6. **Update MCP adapter** to extract `x-debrief-param-type`

7. **Run TypeScript tests**:
   ```bash
   cd shared/components
   pnpm test
   pnpm storybook  # Visual verification
   ```

### Phase D: Extension Integration

1. **Update executeTool handler** to read `params` from message
2. **Forward params** to `calcService.executeTool()`
3. **Update message type definitions**

4. **Run extension tests**:
   ```bash
   cd apps/vscode
   pnpm test
   ```

## Key Files to Edit

| File | Change Type | Description |
|------|-------------|-------------|
| `shared/schemas/src/linkml/common.yaml` | Extend | Add 5 parameter-value enums, extend PointShapeEnum |
| `shared/schemas/src/linkml/tool.yaml` | Extend | Add ToolParameter class, ParameterTypeEnum |
| `services/calc/debrief_calc/models.py` | Modify | Add param_type field to ToolParameter |
| `services/calc/debrief_calc/tools/track/styling/apply_symbol_style.py` | Modify | Replace VALID_SYMBOLS with param_type |
| `services/calc/debrief_calc/tools/track/styling/set_track_color.py` | Modify | Add param_type to color param |
| `services/calc/debrief_calc/tools/track/styling/symbol_interval.py` | Modify | Add param_type to interval param |
| `services/calc/debrief_calc/tools/track/styling/label_interval.py` | Modify | Add param_type to interval param |
| `shared/components/src/ContextMenu/ContextMenu.tsx` | New | Reusable context menu component |
| `shared/components/src/ToolsPanel/ParameterCollector.tsx` | New | Sequential parameter collection |
| `shared/components/src/ToolsPanel/ToolsPanel.tsx` | Modify | Integrate parameter collection |
| `shared/components/src/LayersToolbar/RunDropdown.tsx` | Modify | Integrate parameter collection |
| `shared/components/src/ToolMatch/mcpAdapter.ts` | Modify | Extract x-debrief-param-type |
| `shared/components/src/ToolMatch/types.ts` | Modify | Add paramType to ToolParameter type |
| `shared/components/src/ActivityPanel/types.ts` | Modify | Add params to tool:run message |
| `apps/vscode/src/commands/executeTool.ts` | Modify | Forward params from message |
| `apps/vscode/src/webview/messages.ts` | Modify | Extend message type |

## Testing Checklist

- [ ] Schema: New enums pass golden fixture tests
- [ ] Schema: Round-trip tests pass for all parameter-value enums
- [ ] Python: ToolParameter with param_type validates correctly
- [ ] Python: MCP output includes x-debrief-param-type annotation
- [ ] Python: Migrated tools no longer have hardcoded choice lists
- [ ] TypeScript: ContextMenu renders with correct items
- [ ] TypeScript: Keyboard navigation works (arrows, Enter, Escape)
- [ ] TypeScript: Viewport repositioning prevents off-screen menus
- [ ] TypeScript: ParameterCollector sequences through multiple params
- [ ] TypeScript: Custom input validates and submits correctly
- [ ] TypeScript: tool:run message includes params when collected
- [ ] Integration: End-to-end tool execution with pre-selected params
- [ ] Backward compat: Tools with no parameters execute immediately
