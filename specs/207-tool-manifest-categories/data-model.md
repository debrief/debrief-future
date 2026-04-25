# Data Model: Tool Manifest Lookup for Log Panel Category Resolution

**Feature**: 207-tool-manifest-categories
**Date**: 2026-04-22

## Overview

This feature adds a single enumerated value, `category`, to the `Tool` class, and establishes a runtime delivery path for it. No new classes are introduced; no existing consumers are renamed or restructured. All changes are additive.

The LinkML schema (`shared/schemas/src/linkml/tool.yaml`) is the source of truth. Pydantic and TypeScript types are regenerated. The MCP annotation `debrief:uiCategory` is the wire-format name.

## Entities

### ToolCategory (new enum)

The five canonical visual categories painted on Log Panel card icons. Matches SRD §5.

| Value | Meaning | SRD colour (info only) | SRD glyph (info only) |
|---|---|---|---|
| `import` | File/data ingestion tools | `#dbeafe` (blue) | ⬇ |
| `style` | Appearance-changing tools (colour, line width, symbols) | `#ede9fe` (purple) | 🎨 |
| `calc` | Analytical computation tools | `#dcfce7` (green) | ∿ |
| `filter` | Tools that narrow the dataset (by time, depth, trim) | `#fff7ed` (amber) | ⧖ |
| `snapshot` | Tools that export or capture state | `#fef9c3` (yellow) | 📷 |

**Nullability / "unknown"**: a sixth conceptual state — the neutral-grey fallback (`UNKNOWN_CATEGORY_CONFIG`) — exists at the rendering layer only. It is **not** a value of `ToolCategory`; it is the state produced when `category` is null or absent. This keeps the enum closed (important for Article XV.6) while still allowing the renderer to fail closed.

**LinkML representation** (`shared/schemas/src/linkml/tool.yaml`):
```yaml
enums:
  ToolCategoryEnum:
    description: >-
      Visual category for Log Panel icon rendering. Declared by the tool
      at registration; consumed by frontends to colour tool-icon glyphs.
      See docs/log-panel-ux-srd.md §5.
    permissible_values:
      import:
        description: File / data ingestion tools
      style:
        description: Appearance-changing tools (colour, line width, symbols)
      calc:
        description: Analytical computation tools
      filter:
        description: Tools that narrow the dataset (time / depth / trim)
      snapshot:
        description: Tools that export or capture state
```

**Generated Python** (`debrief_schemas.ToolCategory`):
```python
from enum import StrEnum

class ToolCategory(StrEnum):
    IMPORT = "import"
    STYLE = "style"
    CALC = "calc"
    FILTER = "filter"
    SNAPSHOT = "snapshot"
```

**Generated TypeScript** (`@debrief/schemas`):
```typescript
export type ToolCategory = 'import' | 'style' | 'calc' | 'filter' | 'snapshot';
```

### Tool (modified — existing class gains one attribute)

The existing `Tool` class in `shared/schemas/src/linkml/tool.yaml` gains one optional attribute:

```yaml
  Tool:
    attributes:
      # … existing id, name, description, version, requirements …
      category:
        description: >-
          Visual category for Log Panel icon rendering. Null / absent
          tools render with the neutral-grey "Other" icon. First-party
          tools MUST declare a value (enforced by test).
        range: ToolCategoryEnum
        required: false
```

No other attribute changes. The existing `debrief:category` (hierarchical path, e.g. `track/styling`) — which is NOT a LinkML attribute but a derived annotation — is unchanged. The two live side by side: `debrief:category` for tool-match / hierarchical grouping, `debrief:uiCategory` (from the new `Tool.category`) for Log Panel icons.

### MCPToolDefinition annotations (modified — existing interface gains one field)

`shared/utils/src/mcp-types.ts`:

```typescript
// Before:
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown> };
  annotations: {
    'debrief:selectionRequirements': MCPSelectionRequirement[];
    'debrief:category': string;
    'debrief:version': string;
    'debrief:outputKind': string;
  };
}

// After:
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown> };
  annotations: {
    'debrief:selectionRequirements': MCPSelectionRequirement[];
    'debrief:category': string;
    'debrief:version': string;
    'debrief:outputKind': string;
    'debrief:uiCategory'?: ToolCategory;  // NEW — optional
  };
}
```

### Tool Category Map (new runtime entity — not a schema type)

A runtime-only derived structure produced by the VS Code extension from `listTools()`:

```typescript
type ToolCategoryMap = Readonly<Record<string, ToolCategory | null>>;
```

Keys: tool IDs (kebab-case, e.g. `"move-track"`). Values: the declared `ToolCategory` or `null` if the tool did not declare one (or declared an invalid value that failed to parse — treated as null at the boundary).

This is not a schema type — it is a transient lookup built in the extension host and shipped to the webview once per manifest refresh.

### LogPanel tool categories prop (modified — existing props gain one field)

`shared/components/src/LogPanel/types.ts`:

```typescript
export interface LogPanelProps {
  // … existing fields …
  toolCategories?: Readonly<Record<string, ToolCategory | null>>;  // NEW — optional
}

export interface ToolCategoryIconProps {
  toolName: string;
  toolCategories?: Readonly<Record<string, ToolCategory | null>>;  // NEW — optional
  size?: number;
  className?: string;
}
```

## Relationships

```text
LinkML ToolCategoryEnum
  │
  ├── generates → Python `ToolCategory` StrEnum (debrief_schemas)
  │                                │
  │                                ▼
  │                         services/calc Tool(category=ToolCategory.CALC, …)
  │                                │
  │                                ▼
  │                         to_mcp_tool() emits {"debrief:uiCategory": "calc"}
  │                                │
  │                                ▼ (MCP tools/list response)
  │                         calcService.listTools() caches → getToolCategoryMap()
  │                                │
  │                                ▼ (tools:manifest extension→webview message)
  │                         logPanel.tsx state → <LogPanel toolCategories={…}>
  │                                │
  │                                ▼
  │                         <ToolCategoryIcon /> → resolveToolCategory(name, map)
  │                                │
  │                                ▼
  │                         TOOL_CATEGORY_CONFIGS[category] | UNKNOWN_CATEGORY_CONFIG
  │
  └── generates → TypeScript `ToolCategory` literal union (@debrief/schemas)
                                   │
                                   ▼
                            apps/vscode/src/tools/**/*.ts
                              'debrief:uiCategory': 'style'  (declared at source)
                                   │
                                   ▼ (same MCP tools/list pipeline)
                            (merges with Python tools in the same manifest)
```

## State transitions

The `ToolCategoryMap` has three observable runtime states:

| State | Condition | Rendering behaviour |
|---|---|---|
| **Unloaded** | `toolCategories === undefined` | Every card renders with `UNKNOWN_CATEGORY_CONFIG` (grey). |
| **Loaded with coverage** | `toolCategories[toolName]` is a valid `ToolCategory` | Card renders with the declared category's config. |
| **Loaded without coverage** | `toolCategories` is defined but `toolCategories[toolName]` is `undefined` or `null` | Card renders with `UNKNOWN_CATEGORY_CONFIG`. |

Transitions:
- **Unloaded → Loaded**: extension pushes first `tools:manifest` message after session start.
- **Loaded → Loaded (refresh)**: extension's 60 s cache refreshes and pushes a new message with the same or updated categories. React reconciliation re-renders affected cards.
- **Loaded → Unloaded**: session ends. Webview state reset to `undefined`.

## Validation rules

| Rule | Where enforced | Failure mode |
|---|---|---|
| `category` must be one of the five canonical values, or null | LinkML schema → Pydantic validator (Python) + literal union type (TypeScript) | Pydantic raises `ValidationError` at tool construction; TypeScript fails `pnpm typecheck`. |
| Every first-party tool (calc Python + VS Code extension TS) MUST have `category != null` | New tests: `services/calc/tests/test_first_party_categories.py`, `apps/vscode/src/tools/__tests__/first-party-categories.test.ts` | `task test` fails. |
| Duplicate tool IDs across registries | Existing `ToolRegistry.register()` | `ValueError` at load time; contrib package fails to load; core unaffected (Article V.1). |
| MCP annotation key is `debrief:uiCategory` and carries the tool's declared value | `Tool.to_mcp_tool()` in `debrief_calc/models.py`; TypeScript tool exports | Unit test: `test_to_mcp_tool_emits_ui_category`. |

## Changes vs. current model

| Entity | Before | After |
|---|---|---|
| LinkML `Tool` | No `category` attribute | New optional `category: ToolCategoryEnum` |
| LinkML enums | `OutputKindEnum`, `ResultCategoryEnum`, `ParameterTypeEnum` | + `ToolCategoryEnum` |
| Python `debrief_calc.Tool` | No `category` field | New optional `category: ToolCategory \| None = None` |
| Python `@tool` decorator | `name, description, input_kinds, output_kind, context_type, version, parameters` | + `category: ToolCategory \| None = None` |
| Python `Tool.to_mcp_tool()` | Emits `debrief:category` (hierarchical) | Also emits `debrief:uiCategory` (visual, when declared) |
| TypeScript `MCPToolDefinition.annotations` | 4 keys | 5 keys (new optional `debrief:uiCategory`) |
| TypeScript `LogPanelProps` | No `toolCategories` | New optional `toolCategories` prop |
| TypeScript `ToolCategoryIconProps` | No `toolCategories` | New optional `toolCategories` prop |
| TypeScript `resolveToolCategory(name)` | Single-arg lookup in `TOOL_ID_TO_CATEGORY` | Two-arg lookup; second arg is the manifest map |
| Module-level constant `TOOL_ID_TO_CATEGORY` | Hand-maintained list of 16 tool IDs | **Deleted** (Commit B) |
| Webview message contract | 7 extension→webview messages | 8 (+ `tools:manifest`) |

No persisted schema change. No session-state migration needed.
