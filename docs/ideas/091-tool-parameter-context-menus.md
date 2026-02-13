# Tool Parameter Context Menus

## Problem

When a tool button is clicked in the ToolsPanel or RunDropdown, tools execute immediately with default parameters. Tools that have configurable parameters (enum, boolean, duration, number) have no pre-execution UI to collect parameter values. The parameter infrastructure exists end-to-end (ToolParameter in Python, param slots in MCP, ParameterEditor in LogPanel for post-execution tuning) but the missing piece is the **pre-execution UI**.

## Proposed Solution

Two coupled changes:

### 1. Schema-defined parameter types (eliminate duplication)

Tools currently embed enum values directly in their `ToolParameter.choices` lists (e.g., `NAMED_COLORS`, `VALID_SYMBOLS`). This leads to duplication across Python tools and drift from LinkML schemas (e.g., `PointShapeEnum` has 3 values but `VALID_SYMBOLS` has 5).

Instead, tools declare a **semantic parameter type** and the schema pipeline provides the actual values:

- LinkML defines parameter-value enums (e.g., `NamedColorEnum`, `MarkerSymbolEnum`, `CardinalDirectionEnum`) plus numeric/duration preset enums
- `ToolParameter` gets a `param_type` field referencing these by name (e.g., `param_type="NamedColor"`)
- Tools no longer specify `choices=[...]` for schema-backed types
- Generated Pydantic enums validate server-side; generated TypeScript types validate client-side
- The MCP schema carries the type name (`x-debrief-param-type: "NamedColor"`) rather than flattening values into `enum: [...]`

### 2. Pre-execution context menus (the UI)

Show successive inline context menus in the webview to collect parameter values before execution:

- **Enum parameters**: Orchestrator resolves `param_type` → generated TypeScript enum → renders choices as menu items
- **Boolean parameters**: Show a toggle
- **Duration/number parameters**: Show preset choices from schema-defined preset enums plus a "Custom..." option that opens a text input

Tools with no parameters execute immediately as today.

## Success Criteria

**Parameter types (schema layer):**
- Parameter-value enums defined in LinkML (`NamedColorEnum`, `MarkerSymbolEnum`, `CardinalDirectionEnum`, etc.)
- `ToolParameter` model supports `param_type` field referencing schema-defined enums
- Tools declare `param_type` instead of hardcoding `choices`
- Existing `PointShapeEnum` reconciled with tool usage (add missing `diamond`, `cross` values)
- MCP schema output includes `x-debrief-param-type` annotation (not flattened `enum` array)
- Both Python (Pydantic) and TypeScript validate against generated types
- No duplicate enum value lists in tool source files

**Pre-execution UI:**
- Clicking a tool with parameters shows a context menu near the tool button
- Parameters are collected one at a time via successive menus
- Enum parameters: orchestrator resolves `param_type` to choices from generated types
- Boolean parameters show a toggle
- Duration/number parameters show preset choices plus "Custom..." option
- Tools with no parameters execute immediately (backward compatible)
- Collected parameters are forwarded through `tool:run` message to `executeTool` command

## Constraints

- Custom webview context menus (not VS Code QuickPick — trigger elements are deeply nested in the DebriefActivityPanel custom webview)
- Schema-first: all enumerable parameter types defined in LinkML, derived through pipeline into both languages
- Tools declare parameter types, never hardcode enum values
- Validation on both sides: Python (safety net) and TypeScript (UX)
- Backward compatible: no-parameter tools unaffected

## Out of Scope

- Modifying the existing post-execution ParameterEditor in LogPanel
- Building a general-purpose form system (successive menus only)
- Parameter validation beyond schema-provided constraints

## Affected Components

| Layer | Component | Change |
|-------|-----------|--------|
| Schema | `shared/schemas/src/linkml/common.yaml` | Add `NamedColorEnum`, `CardinalDirectionEnum`; extend `PointShapeEnum` with `diamond`, `cross` |
| Schema | `shared/schemas/src/linkml/tool.yaml` | Add `ToolParameter` class with `param_type` field, `ParameterTypeEnum` |
| Schema | Generated outputs | Pydantic enums + TypeScript types for all parameter-value enums |
| Python | `services/calc/debrief_calc/models.py` | Add `param_type` to ToolParameter, MCP output uses `x-debrief-param-type` |
| Python | Tool files (`set_track_color.py`, etc.) | Replace `choices=[...]` with `param_type="NamedColor"` etc., remove duplicate constants |
| Adapter | `shared/components/src/ToolMatch/mcpAdapter.ts` | Extract `x-debrief-param-type` from MCP definitions, resolve to generated enum values |
| Types | `shared/components/src/ActivityPanel/types.ts` | Add parameters to ToolsPanelItem, params to tool:run message |
| UI | New `ContextMenu` shared component | Inline menu with choices from resolved types, Custom..., keyboard support |
| UI | `ToolsPanel.tsx`, `RunDropdown.tsx` | Parameter collection flow before tool execution |
| Extension | `apps/vscode/src/commands/executeTool.ts` | Accept and forward params |
