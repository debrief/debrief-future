# Data Model: GoldenLayout Panel Management

**Feature**: 096-add-goldenlayout-panels
**Date**: 2026-02-14

---

## Entities

### PanelDefinition

A panel type registered in the Panel Registry. Defines how a panel renders and its constraints.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `string` | Yes | Unique identifier for this panel type (e.g., `'map'`, `'chart'`, `'navigation'`) |
| `title` | `string` | Yes | Human-readable display name shown in tab headers |
| `component` | `React.ComponentType<PanelProps>` | Yes | React component to render inside the panel container |
| `icon` | `string \| undefined` | No | Codicon icon name for the tab header (e.g., `'map'`, `'list-tree'`) |
| `minWidth` | `number` | No | Minimum width in pixels (default: 200) |
| `minHeight` | `number` | No | Minimum height in pixels (default: 150) |
| `closable` | `boolean` | No | Whether the user can close this panel (default: true) |
| `singleton` | `boolean` | No | If true, only one instance of this panel type can exist at a time (default: true) |

**Validation rules**:
- `type` must be unique across all registrations
- `title` must be non-empty
- `minWidth` and `minHeight` must be positive integers if provided
- `component` must be a valid React component

---

### PanelProps

Props passed to every panel content component by the GoldenLayout bridge.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `container` | `GoldenLayout.Container` | Yes | GoldenLayout container reference (for resize events, state) |
| `isPopout` | `boolean` | Yes | True if this panel is currently in a popped-out window |
| `panelId` | `string` | Yes | Unique instance ID for this panel occurrence |

---

### PanelLayout (serialized)

The persisted layout configuration stored in localStorage. This is GoldenLayout's `ResolvedLayoutConfig` with an added version field.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `number` | Yes | Schema version for migration/invalidation (starts at 1) |
| `config` | `ResolvedLayoutConfig` | Yes | GoldenLayout's serialized layout tree |

**Validation rules**:
- `version` must match the current application's layout schema version
- `config` must be parseable by `LayoutConfig.fromResolved()`
- All `componentType` values in the config must exist in the Panel Registry

**State transitions**:
- `null` → `PanelLayout`: First save after user arranges panels
- `PanelLayout(v=N)` → `PanelLayout(v=N)`: Updated on every layout change (debounced)
- `PanelLayout(v=N)` → `null`: User triggers "Reset Layout" or version mismatch detected

---

### DefaultLayoutConfig

The hardcoded default layout used when no saved layout exists or when the user resets.

```
Root Row
├── Sidebar Column (25%)
│   ├── Stack: [Navigation] (25%)
│   ├── Stack: [Activity]   (50%)
│   └── Stack: [Log]        (25%)
└── Content Column (75%)
    ├── Stack: [Map]   (65%)
    └── Stack: [Chart]  (35%)
```

This is a static object — not persisted, defined in code.

---

## Relationships

```
PanelRegistry (Map<string, PanelDefinition>)
    │
    ├── PanelDefinition: 'navigation'  ──→ StacFileTree component
    ├── PanelDefinition: 'activity'    ──→ ActivityPanel component
    ├── PanelDefinition: 'log'         ──→ LogPanel component
    ├── PanelDefinition: 'map'         ──→ MapView component
    └── PanelDefinition: 'chart'       ──→ ChartRenderer component

GoldenLayout LayoutManager
    │
    ├── uses PanelRegistry to resolve component types
    ├── emits resize events → panel content components
    ├── serializes to → PanelLayout (localStorage)
    └── deserializes from → PanelLayout or DefaultLayoutConfig

App.tsx
    │
    ├── view === 'welcome' → CatalogOverview (no GoldenLayout)
    └── view === 'analysis' → PanelWorkspace (contains GoldenLayout)
```

---

## Storage

| Key | Location | Format | Size Estimate |
|-----|----------|--------|---------------|
| `debrief-panel-layout` | localStorage | JSON (minified `ResolvedLayoutConfig`) | ~2-5 KB |

No server-side storage. No STAC catalog changes. No schema changes needed.
