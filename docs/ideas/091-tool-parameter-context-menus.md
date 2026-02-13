# Tool Parameter Context Menus

## Problem

When a tool button is clicked in the ToolsPanel or RunDropdown, tools execute immediately with default parameters. Tools that have configurable parameters (enum, boolean, duration, number) have no pre-execution UI to collect parameter values. The parameter infrastructure exists end-to-end (ToolParameter in Python, param slots in MCP, ParameterEditor in LogPanel for post-execution tuning) but the missing piece is the **pre-execution UI**.

## Proposed Solution

Show successive inline context menus in the webview to collect parameter values before execution:

- **Enum parameters**: Show choices directly as menu items
- **Boolean parameters**: Show a toggle
- **Duration/number parameters**: Show a fixed set of generic presets (e.g., 1s to 1d) plus a "Custom..." option that opens a text input

Presets are defined generically in LinkML (e.g., a `DurationPreset` enum) and derived through the schema pipeline into Python and TypeScript. Tools with no parameters execute immediately as today.

## Success Criteria

- Clicking a tool with parameters shows a context menu near the tool button
- Parameters are collected one at a time via successive menus
- Enum parameters show their choices directly
- Boolean parameters show a toggle
- Duration/number parameters show preset choices plus "Custom..." option
- Presets are defined in LinkML and generated into Python and TypeScript
- Tools with no parameters execute immediately (backward compatible)
- Collected parameters are forwarded through `tool:run` message to `executeTool` command

## Constraints

- Custom webview context menus (not VS Code QuickPick -- trigger elements are deeply nested in the DebriefActivityPanel custom webview)
- Schema-first: presets defined in LinkML, derived through pipeline
- Backward compatible: no-parameter tools unaffected

## Out of Scope

- Modifying the existing post-execution ParameterEditor in LogPanel
- Building a general-purpose form system (successive menus only)
- Parameter validation beyond schema-provided constraints

## Affected Components

| Layer | Component | Change |
|-------|-----------|--------|
| Schema | `shared/schemas/src/linkml/tool.yaml` | Add ToolParameter class, ParameterType enum, preset enums |
| Python | `services/calc/debrief_calc/models.py` | Align ToolParameter with generated schema, add presets to MCP output |
| Adapter | `shared/components/src/ToolMatch/mcpAdapter.ts` | Extract parameter metadata from MCP definitions |
| Types | `shared/components/src/ActivityPanel/types.ts` | Add parameters to ToolsPanelItem, params to tool:run message |
| UI | New `ContextMenu` shared component | Inline menu with presets, Custom..., keyboard support |
| UI | `ToolsPanel.tsx`, `RunDropdown.tsx` | Parameter collection flow before tool execution |
| Extension | `apps/vscode/src/commands/executeTool.ts` | Accept and forward params |
