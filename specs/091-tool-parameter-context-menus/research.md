# Research: Tool Parameter Context Menus

**Feature**: 091-tool-parameter-context-menus
**Date**: 2026-02-13

## Research Questions

### RQ-1: How should parameter-value enums be structured in LinkML?

**Decision**: Define parameter-value enums in `common.yaml` alongside existing enums, following the same pattern as `PointShapeEnum`. Each enum uses `permissible_values` with descriptions. A new `ParameterTypeEnum` in `tool.yaml` enumerates the available parameter type names.

**Rationale**: Existing enums (PointShapeEnum, LineCapEnum, etc.) already follow this pattern in `common.yaml`. Keeping parameter-value enums in the same file maintains consistency and ensures they flow through the existing generation pipeline (`gen-pydantic`, `gen-typescript`, `gen-json-schema`) without any changes to the pipeline itself.

**Alternatives considered**:
- Separate `parameter-types.yaml` file — rejected because it adds a new import to `debrief.yaml` and fragments related definitions (e.g., `PointShapeEnum` is already in `common.yaml` and is used as a parameter-value enum)
- Embed values in `tool.yaml` — rejected because the values are domain concepts (colors, shapes, directions) not tool-specific concepts

### RQ-2: Which parameter-value enums are needed?

**Decision**: Define these enums based on current tool usage:

| Enum Name | Values | Source |
|-----------|--------|--------|
| `MarkerSymbolEnum` | circle, square, diamond, triangle, cross | Reconciles `PointShapeEnum` (3 values) with `VALID_SYMBOLS` in `apply_symbol_style.py` (5 values). Extends PointShapeEnum with diamond, cross |
| `NamedColorEnum` | red, green, blue, yellow, orange, purple, cyan, magenta, white, black, grey | Common CSS named colors for track/feature coloring |
| `CardinalDirectionEnum` | N, NE, E, SE, S, SW, W, NW | 8-point compass for directional parameters |
| `DurationPresetEnum` | PT1M, PT5M, PT15M, PT30M, PT1H, PT2H, PT6H, PT12H, PT24H | ISO 8601 duration presets for interval parameters |
| `NumericPresetEnum` | 1, 2, 5, 10, 25, 50, 100 | Common numeric presets for count/distance parameters |

**Rationale**: These cover all current tool parameters. The `MarkerSymbolEnum` resolves the known PointShapeEnum/VALID_SYMBOLS mismatch. Duration and numeric presets provide sensible defaults while still allowing custom entry.

**Alternatives considered**:
- Extending `PointShapeEnum` directly — rejected because `PointShapeEnum` is used for GeoJSON point styling (a different semantic context). `MarkerSymbolEnum` can reference the same values but is specifically for tool parameter choices. However, the two should remain aligned — `PointShapeEnum` should also gain `diamond` and `cross` to prevent schema drift.
- Auto-generating presets from min/max ranges — rejected because preset curation requires domain knowledge (not all values in a range are useful)

### RQ-3: How should the ToolParameter model reference schema enums?

**Decision**: Add an optional `param_type: str | None = None` field to `ToolParameter` in `models.py`. When set, it names a schema-defined enum (e.g., `"NamedColor"`). The MCP output includes this as `x-debrief-param-type` in the JSON Schema properties annotation. The existing `choices` field is retained for backward compatibility but becomes redundant when `param_type` is set.

**Rationale**: The `param_type` field is a lightweight reference — just a string name. The client-side resolver maps this name to the generated TypeScript enum values. This avoids duplicating enum values in the MCP schema output (which currently would flatten them into a JSON Schema `enum` array).

**Alternatives considered**:
- Remove `choices` field entirely — rejected because it breaks backward compatibility and some parameters may have tool-specific choices not suitable for schema-level definition
- Use enum class reference instead of string name — rejected because LinkML enum names need to map across Python and TypeScript boundaries; a string name is the universal identifier
- Embed full enum values in `x-debrief-param-type` — rejected because it duplicates the schema (the TypeScript side already has the generated enum)

### RQ-4: How should the context menu UI component be structured?

**Decision**: Create a reusable `ContextMenu` component in `shared/components/src/ContextMenu/` that renders an absolutely-positioned menu anchored to a trigger element. A separate `ParameterCollector` component in `ToolsPanel/` orchestrates sequential parameter collection by rendering successive `ContextMenu` instances.

**Rationale**: Separation of concerns — `ContextMenu` is a generic menu primitive (items, keyboard nav, viewport repositioning), while `ParameterCollector` handles the tool-specific sequential flow (which parameter next, collecting values, firing execution). The `ContextMenu` pattern is consistent with the existing `AssociatedFilesDropdown` inline toggle pattern and `RunDropdown` nested menu styling.

**Alternatives considered**:
- VS Code QuickPick API — rejected per spec constraints; trigger elements are deeply nested in the custom webview where QuickPick cannot be positioned
- Single monolithic ParameterMenu component — rejected because it would couple generic menu behaviour with tool-specific collection logic
- Modal dialog for all parameters at once — rejected because the spec requires successive menus (one parameter at a time), which is lighter and more focused

### RQ-5: How should parameter type resolution work on the client side?

**Decision**: The MCP adapter (`mcpAdapter.ts`) extracts `x-debrief-param-type` from the tool definition's `inputSchema.properties[paramName]` annotations. The `ToolMatch/types.ts` `ToolParameter` type gains a `paramType?: string` field. The `ParameterCollector` component resolves this type name to actual enum values using a lookup function that imports the generated TypeScript enums.

**Rationale**: This keeps the resolution chain explicit: MCP definition → adapter extraction → type annotation → enum lookup. Each step is independently testable. The generated TypeScript enums are already available as imports in the shared components package.

**Alternatives considered**:
- Send enum values in the MCP response — rejected because it duplicates data that's already available from generated types
- Central registry service for parameter types — rejected as over-engineering for the current scale (~5 enum types)
- Runtime fetch of enum values from schema — rejected because it violates offline-first (and the values are already baked into generated types at build time)

### RQ-6: How should the tool:run message format be extended?

**Decision**: Extend the existing `tool:run` message payload from `{ toolId: string }` to `{ toolId: string; params?: Record<string, unknown> }`. The `params` field is optional — if omitted, the tool uses defaults (backward compatible). The extension host's `executeTool` handler reads `params` and forwards them to `calcService.executeTool()`.

**Rationale**: Minimal change to the message protocol. The `params` field uses the same `Record<string, unknown>` shape already expected by `ToolExecutionRequest.params`, which is already defined but not currently populated from the UI.

**Alternatives considered**:
- New message type `tool:runWithParams` — rejected because it doubles the message handling without benefit
- Typed params with full ParameterValue objects — rejected because the pre-execution context only needs the value, not replay metadata (default/tunable flags are added by the execution handler)

### RQ-7: How should PointShapeEnum be reconciled with MarkerSymbolEnum?

**Decision**: Extend `PointShapeEnum` in `common.yaml` to include `diamond` and `cross` (matching the 5 values in `VALID_SYMBOLS`). Define `MarkerSymbolEnum` as a separate enum with the same 5 values. Both exist independently — `PointShapeEnum` is used for GeoJSON styling properties, `MarkerSymbolEnum` is used as a tool parameter type. The values are identical but the semantic contexts are different.

**Rationale**: `PointShapeEnum` is used by `PointProperties.shape` and `PositionStyle.symbol` in `styling.yaml`. Adding `diamond` and `cross` makes the styling schema match actual tool capabilities. `MarkerSymbolEnum` exists as the parameter-type reference because parameter type enums need their own naming convention (`*Enum` pattern in tool parameter space).

**Alternatives considered**:
- Use `PointShapeEnum` directly as the parameter type — viable, but conflates styling concepts with parameter concepts. If a parameter needed a subset of shapes, there would be no clean way to express it
- Only update `PointShapeEnum`, don't create `MarkerSymbolEnum` — simpler but loses the semantic distinction. Chosen as an acceptable fallback if the dual-enum approach creates confusion

### RQ-8: How should custom value input work for duration/numeric parameters?

**Decision**: When the analyst selects "Custom..." from the preset menu, the `ContextMenu` transitions to a text input mode. The input field appears in place of the menu items. The analyst types a value and presses Enter to confirm or Escape to cancel. Validation runs on confirm — if invalid, an inline error message appears and the input remains focused. The validation logic reuses the type-specific validators from the existing `ParameterEditor` component (`parameterValidation.ts`).

**Rationale**: Reusing the existing validation logic from `parameterValidation.ts` (which handles float, integer, duration, enum, boolean, string types) avoids duplicating validation rules. The inline transition from menu to input keeps the interaction in the same spatial location.

**Alternatives considered**:
- Separate input dialog — rejected because it breaks the spatial continuity of the inline menu
- Validation on blur instead of confirm — rejected because it creates ambiguity about when the value is accepted
- No validation (let the server reject) — rejected because it violates the "no silent failures" constitution principle; immediate feedback is better

## Unresolved Questions

None — all research questions have been resolved with clear decisions.
