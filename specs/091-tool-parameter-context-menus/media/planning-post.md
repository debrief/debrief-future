---
layout: future-post
title: "Planning: Tool Parameter Context Menus"
date: 2026-02-13
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, context-menus, schema-first, linkml]
excerpt: "Choose your parameter values before the tool runs, not after -- inline context menus for pre-execution configuration."
---

## What We're Building

Right now, when an analyst clicks a tool button in Future Debrief -- say, "Set Track Color" -- it executes immediately with default values. Want red instead of the default? You run the tool, get the wrong colour, then re-tune the parameter in the Log Panel afterward. The first execution is always wasted for non-default values.

We're adding inline context menus that appear between the click and the execution. Click "Set Track Color", a menu pops up showing available colours, you pick red, and the tool runs once with the right value. For tools with multiple parameters -- a symbol style tool that needs both a marker shape and a colour -- the menus appear in sequence, one parameter at a time, and the tool fires only after the last selection.

This is not a modal dialog or a form. It's a lightweight context menu anchored near the button, with keyboard navigation (arrow keys, Enter, Escape). Tools with no parameters still execute immediately on click -- no change to existing behaviour.

## How It Fits

This is where something interesting happens architecturally. The parameter values that populate these menus -- colours, marker shapes, compass directions, duration intervals -- are currently hardcoded as Python constants scattered across individual tool files. The `apply_symbol_style` tool has a `VALID_SYMBOLS` list with 5 values. The `PointShapeEnum` in the LinkML schema has 3 values. They've drifted apart.

So the schema work comes first. We're defining parameter-value enums (`NamedColorEnum`, `MarkerSymbolEnum`, `CardinalDirectionEnum`, `DurationPresetEnum`, `NumericPresetEnum`) in the LinkML `common.yaml` alongside existing enums. These flow through the generation pipeline into Pydantic models and TypeScript types. Each tool then references a parameter type by name rather than maintaining its own list of valid values. Add a colour to the schema, regenerate, and every tool that uses `NamedColor` gains it -- in both the Python validation and the TypeScript menu, with no tool source changes.

The MCP output carries a custom `x-debrief-param-type` annotation rather than flattening enum values into a plain JSON Schema array. The webview client resolves that type name against the generated TypeScript enums. This keeps the resolution chain explicit and testable at each step.

Changes touch four workspace packages -- `shared/schemas`, `services/calc`, `shared/components`, and `apps/vscode` -- but no new packages and no new external dependencies.

## Key Decisions

- **Schema-defined parameter types, not hardcoded lists**: The whole point. Tool source files stop owning their parameter values. The schema is the single source of truth, consistent with our schema-first architecture.

- **`x-debrief-param-type` annotation in MCP**: Rather than embedding all enum values in the MCP tool definition (which duplicates the schema), the definition carries a type name. The client resolves it locally from generated types. Works offline, no network needed.

- **Reusable ContextMenu component, separate ParameterCollector orchestrator**: The menu is a generic primitive (items, keyboard nav, viewport repositioning). The sequential parameter collection logic is separate. This means the ContextMenu can be reused elsewhere -- it's not coupled to tool execution.

- **Custom value input for numeric and duration parameters**: Preset menus include a "Custom..." option that transitions to a text input in place. Validation reuses the existing `parameterValidation.ts` logic from the ParameterEditor. No duplication of validation rules.

- **PointShapeEnum extended to reconcile with tool usage**: The schema currently has 3 point shapes (circle, square, triangle). Tools actually use 5 (adding diamond and cross). We're extending the schema to match reality, and defining a parallel `MarkerSymbolEnum` for the parameter-type context. Same values, different semantic roles.

- **Backward compatible message format**: The `tool:run` message gains an optional `params` field. Omitted means defaults, same as today. No new message types.

## What We'd Love Feedback On

- **Sequential menus vs. combined panel**: We're collecting parameters one at a time in successive context menus. For a tool with three parameters, that's three menus. An alternative is a small panel showing all parameters at once. The sequential approach is lighter and keeps each decision focused, but for tools with many parameters it could feel like too many clicks. Where's the threshold?

- **Preset curation for numeric values**: The `NumericPresetEnum` includes 1, 2, 5, 10, 25, 50, 100. These are general-purpose. Should domain-specific parameter types have their own curated presets (e.g., range intervals in nautical miles), or is the combination of generic presets plus custom entry sufficient?

- **Dual enum pattern**: `PointShapeEnum` (styling context) and `MarkerSymbolEnum` (parameter context) have identical values but different names. This preserves semantic separation at the cost of slight duplication. The alternative is using `PointShapeEnum` directly as the parameter type, which is simpler but conflates styling and parameter concepts. Worth the distinction?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
