# Implementation Plan: Tool Parameter Context Menus

**Branch**: `091-tool-parameter-context-menus` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/091-tool-parameter-context-menus/spec.md`

## Summary

Add pre-execution parameter collection UI for analysis tools via inline context menus in the webview, and unify parameter value definitions under schema-defined types in LinkML. Currently, tools execute immediately on click with no parameter input — analysts must re-tune values post-execution via the LogPanel ParameterEditor. This feature adds successive context menus that appear before execution, collecting enum, boolean, and numeric/duration parameter values. Simultaneously, tool parameter enum values are migrated from hardcoded Python constants to LinkML-defined enums, establishing a single source of truth that flows through the schema generation pipeline into both Python and TypeScript.

## Technical Context

**Language/Version**: Python 3.11 (LinkML schemas, Pydantic models, calc service), TypeScript 5.x (VS Code extension, shared components, generated types)
**Primary Dependencies**: LinkML >= 1.7.0 (schema source), Pydantic v2 (Python validation), React 18.x (shared components), VS Code Extension API ^1.85.0, Zustand ^5.0.0 (session-state)
**Storage**: Local filesystem STAC catalogs (no storage changes for this feature)
**Testing**: pytest (Python schema/model tests), vitest (TypeScript component tests), Playwright (Storybook E2E), Storybook (visual component development)
**Target Platform**: VS Code extension webview (Chromium-based), web-shell (browser)
**Project Type**: Multi-workspace monorepo (uv workspaces for Python, pnpm workspaces for TypeScript)
**Performance Goals**: Context menus appear within 100ms of click; parameter selection adds < 200ms per parameter to total tool invocation time
**Constraints**: Offline-capable (no network for parameter resolution), custom webview menus (not VS Code QuickPick), backward compatible (no-parameter tools unaffected)
**Scale/Scope**: ~10 tools with parameters currently, ~5 parameter-value enums to define, 2 new UI components (ContextMenu, ParameterCollector), changes across 4 workspace packages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Parameter types resolved from locally generated types, no network required |
| I. Defence-Grade Reliability | No silent failures | PASS | Menu cancellation is explicit; invalid custom values show inline error messages |
| II. Schema Integrity | Single source of truth | PASS | Parameter-value enums defined in LinkML, derived to Python/TypeScript — core motivation of this feature |
| II. Schema Integrity | Schema tests mandatory | PASS | New enums require golden fixtures and round-trip tests |
| III. Data Sovereignty | Provenance always | PASS | Collected parameter values forwarded to executeTool, recorded in existing log/provenance system |
| IV. Architectural Boundaries | Services never touch UI | PASS | Context menus are entirely in the webview (frontend). Python services return data with parameter type metadata only |
| IV. Architectural Boundaries | Services have zero MCP dependency | PASS | Parameter types defined in pure Python models; MCP annotation is a thin wrapper |
| VI. Testing | Services require unit tests | PASS | Schema enums, model changes, and MCP output all tested |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden fixtures for new enums, component tests for ContextMenu |
| VIII. Documentation | Specs before code | PASS | This plan and spec precede implementation |
| IX. Dependencies | Minimal, vetted dependencies | PASS | No new external dependencies required |
| XI. Internationalisation | I18N from the start | PASS | Menu item labels are externalisable; enum display names can be localised |

**Gate result: ALL PASS** — No constitution violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/091-tool-parameter-context-menus/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Research decisions
├── data-model.md        # Phase 1: Entity model
├── quickstart.md        # Phase 1: Developer quickstart
├── contracts/           # Phase 1: API contracts
│   ├── tool-parameter-schema.yaml   # Extended ToolParameter with param_type
│   └── context-menu-messages.yaml   # Webview ↔ extension message contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── media/
│   ├── planning-post.md      # Blog planning announcement
│   └── linkedin-planning.md  # LinkedIn summary
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/schemas/src/linkml/
├── common.yaml                    # Extended: NamedColorEnum, MarkerSymbolEnum, CardinalDirectionEnum, DurationPresetEnum
└── tool.yaml                      # Extended: ToolParameter class with param_type, ParameterTypeEnum

shared/schemas/src/generated/
├── python/debrief_schemas/        # Regenerated: new Pydantic enums
├── typescript/types.ts            # Regenerated: new TypeScript enums
└── json-schema/                   # Regenerated: updated JSON Schema

services/calc/debrief_calc/
├── models.py                      # Modified: ToolParameter gains param_type field
└── tools/
    └── track/styling/
        ├── apply_symbol_style.py  # Modified: VALID_SYMBOLS → param_type="MarkerSymbol"
        ├── set_track_color.py     # Modified: add param_type="NamedColor" to color param
        ├── symbol_interval.py     # Modified: add param_type="DurationPreset" to interval param
        └── label_interval.py      # Modified: add param_type="DurationPreset" to interval param

shared/components/src/
├── ContextMenu/
│   ├── ContextMenu.tsx            # New: reusable inline context menu component
│   ├── ContextMenu.css            # New: styling with viewport repositioning
│   ├── ContextMenu.stories.tsx    # New: Storybook stories
│   └── index.ts                   # New: barrel export
├── ToolsPanel/
│   ├── ToolsPanel.tsx             # Modified: parameter collection flow before onRunTool
│   └── ParameterCollector.tsx     # New: sequential parameter collection orchestrator
├── LayersToolbar/
│   └── RunDropdown.tsx            # Modified: parameter collection flow in Analysis submenu
├── ToolMatch/
│   ├── mcpAdapter.ts              # Modified: extract x-debrief-param-type annotation
│   └── types.ts                   # Modified: ToolParameter type with param_type
└── ActivityPanel/
    └── types.ts                   # Modified: tool:run message gains params field

apps/vscode/src/
├── commands/executeTool.ts        # Modified: accept and forward params from message
└── webview/messages.ts            # Modified: tool:run message type extended

services/session-state/src/
└── log/types.ts                   # No change (ParameterValue already supports any value)

tests/
├── shared/schemas/                # New golden fixtures for parameter-value enums
└── shared/components/             # Component tests for ContextMenu, ParameterCollector
```

**Structure Decision**: This feature spans the existing multi-workspace monorepo structure. No new workspace packages are needed. Changes are distributed across `shared/schemas` (LinkML source + generation), `services/calc` (Python models + tools), `shared/components` (React UI), and `apps/vscode` (extension messaging). The new ContextMenu component lives in `shared/components` as a reusable primitive.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ContextMenu | `shared/components/src/ContextMenu/ContextMenu.stories.tsx` | `context-menu.js` | Demonstrates the inline parameter selection menu with enum choices, keyboard nav, and viewport repositioning |
| ToolsPanel (updated) | `shared/components/src/ToolsPanel/ToolsPanel.stories.tsx` | `tools-panel.js` | Shows the end-to-end flow: click tool → parameter menu → execution |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (ToolsPanel existing; ContextMenu new)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/contextmenu--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ContextMenu.stories.tsx` | Rendering, keyboard navigation, viewport repositioning, accessibility | light, dark, vscode | click to open, arrow key navigation, Enter to select, Escape to cancel, Custom input |
| `ToolsPanel.stories.tsx` | Tool button click triggers menu, parameter flow completion | light, dark, vscode | click tool with params, select value, verify tool runs |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*, role="menu", role="menuitem")
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ContextMenu.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=contextmenu--default&globals=theme:light
/iframe.html?id=contextmenu--default&globals=theme:dark
/iframe.html?id=contextmenu--default&globals=theme:vscode
```

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
