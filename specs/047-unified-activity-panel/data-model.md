# Data Model: Unified Debrief Activity Panel

**Feature**: 047-unified-activity-panel
**Date**: 2026-02-01

## Entities

### ActivityPanelState

Session-scoped UI state for the unified panel, persisted via VS Code webview state API.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| collapsedSections | `CollapsedSections` | all false | Which sections are collapsed |

### CollapsedSections

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| timeController | boolean | false | Time Controller section collapsed |
| tools | boolean | false | Tools section collapsed |
| layers | boolean | false | Layers section collapsed |

### ToolItem

Presentational data for a single tool in the ToolsList component. Derived from existing `MatchResult` in `ToolMatchAdapter`.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Tool identifier |
| name | string | Display name |
| description | string | Tool description |
| active | boolean | Whether tool is applicable to current selection |
| explanation | string | Why tool is active/inactive |
| icon | string | Codicon icon name |

### SectionConfig

Configuration for each collapsible section in the ActivityPanel.

| Field | Type | Description |
|-------|------|-------------|
| id | `'timeController' \| 'tools' \| 'layers'` | Section identifier |
| title | string | Display title (externalisable for i18n) |
| icon | string | Codicon icon for section header |
| component | ReactNode | The sub-component to render |

## State Transitions

```
Panel Opens → Load persisted state → Render sections (collapsed/expanded per state)
                                          ↓
User clicks section header → Toggle collapsed state → Persist → Re-render
                                          ↓
Sub-component error → ErrorBoundary catches → Show fallback in that section only
                                          ↓
Panel closes → State already persisted → No action needed
```

## Relationships

- `ActivityPanel` contains exactly 3 `CollapsibleSection` instances
- Each `CollapsibleSection` wraps exactly 1 sub-component (TimeController, ToolsList, or FeatureList+LayersToolbar)
- `ActivityPanelState` is 1:1 with the panel instance
- `ToolItem[]` is provided to `ToolsList` via props (data flows from extension host via messages)

## Validation Rules

- `collapsedSections` must have exactly 3 keys matching known section IDs
- `ToolItem.id` must be non-empty string
- At least one section must be expandable (UI does not prevent collapsing all, but all-collapsed is a valid state per spec edge cases)

## No New Schemas

This feature does not introduce new persistent data schemas. All data flows through existing session state (`@debrief/session-state`) and existing service interfaces (`ToolMatchAdapter`, `SessionManager`). The data model above describes in-memory UI state only.
