# Research: GoldenLayout Panel Management

**Feature**: 096-add-goldenlayout-panels
**Date**: 2026-02-14
**Status**: Complete — all unknowns resolved

---

## Decision 1: Panel Management Library

**Decision**: Use GoldenLayout v2 (npm: `golden-layout`)

**Rationale**: User-specified technology choice. GoldenLayout v2 is a TypeScript-native, framework-agnostic panel management library with built-in support for resize, drag-and-dock, tabs, pop-out windows, and layout serialization. All capabilities required by the spec (FR-001 through FR-016) are supported.

**Alternatives considered**:

| Library | React-native | Downloads/wk | Pop-out | Why not |
|---------|-------------|--------------|---------|---------|
| FlexLayout | Yes | 43k | Yes | GoldenLayout maintainers recommend this for React; however, user specifically chose GoldenLayout |
| react-mosaic | Yes | 26k | No | Tiling-only, no tabbed docking or pop-out |
| Allotment | Yes | — | No | Split-pane only (VS Code-derived), no docking or tabs |
| Lumino | No | — | Yes | Powers JupyterLab; heavyweight, not React-native |

**Risk**: GoldenLayout v2 lacks native React support. React components must be mounted into GoldenLayout containers using the `bindComponentEvent` / `unbindComponentEvent` API, which requires a custom bridge layer. This is well-documented and implemented by community libraries like `@annotationhub/react-golden-layout`.

---

## Decision 2: React Integration Pattern

**Decision**: Build a thin React wrapper that uses GoldenLayout's `VirtualLayout` mode with `bindComponentEvent` to mount React components into panel containers.

**Rationale**: GoldenLayout v2 provides a `bindComponentEvent` handler that fires whenever a new component should be created. Our wrapper will:
1. Receive the container element and component type from GoldenLayout
2. Create a React root (`createRoot`) inside the container element
3. Look up the component in the Panel Registry by type
4. Render the registered React component into the container
5. On `unbindComponentEvent`, unmount the React root

This avoids third-party wrapper dependencies and keeps the integration minimal. The wrapper is ~100 lines of code.

**Alternatives considered**:
- `@annotationhub/react-golden-layout`: Third-party wrapper, adds dependency with uncertain maintenance
- Direct DOM manipulation: Too low-level, loses React benefits

---

## Decision 3: State Synchronization for Pop-out Windows

**Decision**: Use `shared-zustand` library with BroadcastChannel API for cross-window state synchronization.

**Rationale**: When GoldenLayout pops a panel into a separate browser window, the React component re-mounts in a new JavaScript context with its own store instance. The BroadcastChannel API provides low-latency (<5ms) message passing between same-origin windows. The `shared-zustand` library (1.5kB) wraps this cleanly:

```typescript
import { share, isSupported } from 'shared-zustand';

if (isSupported()) {
  share('currentTime', store, { ref: 'debrief-temporal-time' });
  share('selection', store, { ref: 'debrief-features-selection' });
  // ... other shared slices
}
```

**What to sync**: Temporal state (currentTime, timeRange, displayMode), selection (featureIds), feature visibility (hiddenFeatureIds).

**What NOT to sync**: Undo/redo history (window-local), UI chrome state (sidebar tab, collapse states), plot data (immutable during session, loaded once).

**Alternatives considered**:
- localStorage + `storage` event: Higher latency, adds disk I/O overhead on every state change
- `window.opener` + `postMessage`: Fragile (only parent-child), breaks with multiple pop-outs
- SharedWorker: No Safari support, high complexity
- GoldenLayout EventHub: Only supports `userBroadcast` events in v2; suitable as complement but not primary mechanism

---

## Decision 4: Layout Configuration and Default Layout

**Decision**: Define the default layout as a GoldenLayout `LayoutConfig` object with a row-based hierarchy mirroring the current web-shell arrangement.

**Default layout structure**:
```
Root (row)
├── Sidebar Column (column, width: 25%)
│   ├── Navigation Panel (STAC File Tree)
│   ├── Activity Panel (Time, Tools, Layers)
│   └── Log Panel
└── Content Column (column, width: 75%)
    ├── Map Panel (height: 65%)
    └── Chart Panel (height: 35%)
```

**Rationale**: This mirrors the current `App.tsx` layout (320px sidebar + flex-1 right panel with map above chart). Using percentages instead of fixed pixels allows GoldenLayout's resize system to manage proportions.

**Serialization format**: GoldenLayout v2 distinguishes between `LayoutConfig` (developer-facing, optional properties) and `ResolvedLayoutConfig` (fully resolved, used for save/restore). Persistence uses `LayoutManager.saveLayout()` → `ResolvedLayoutConfig` → JSON → localStorage.

---

## Decision 5: Layout Persistence Strategy

**Decision**: Save layout to `localStorage` under key `debrief-panel-layout`. Use try/catch with silent fallback to default layout.

**Rationale**:
- `LayoutManager.saveLayout()` returns a `ResolvedLayoutConfig` that is fully JSON-serializable
- `ResolvedLayoutConfig.minifyConfig()` reduces storage size
- On load, `LayoutConfig.fromResolved(savedConfig)` converts back for `loadLayout()`
- Version the saved layout with a schema version number. If the stored version doesn't match the current version, discard and use default.

**Layout validation on restore**:
1. Parse JSON from localStorage
2. Check schema version matches current
3. Validate all component types exist in the Panel Registry
4. If any check fails, fall back to default layout with console warning

---

## Decision 6: Map Resize Handling

**Decision**: Use GoldenLayout's container `resize` event to call Leaflet's `invalidateSize()`.

**Rationale**: GoldenLayout v2 uses ResizeObserver internally and fires resize events on panel containers. The MapView wrapper will:
1. Listen for the container's `resize` event
2. Call `map.invalidateSize()` on the Leaflet instance
3. Use a small debounce (50ms) to avoid excessive calls during continuous drag

GoldenLayout v2 has a built-in `resizeDebounceInterval` (default: 100ms) that reduces resize events during continuous container changes.

---

## Decision 7: Theming

**Decision**: Use GoldenLayout's `goldenlayout-base.css` with a custom dark theme that maps to existing VS Code CSS variables from `tokens.css`.

**Rationale**: The web-shell already uses CSS custom properties from `@debrief/components/styles/tokens.css` that mirror VS Code's dark theme. GoldenLayout's dark theme CSS uses similar dark colors. We'll create `goldenlayout-debrief-theme.css` that overrides GoldenLayout's theme classes with our existing CSS variables:

```css
.lm_goldenlayout {
  background: var(--debrief-bg-primary);
}
.lm_header .lm_tab {
  background: var(--debrief-bg-secondary);
  color: var(--debrief-text-primary);
}
```

---

## Decision 8: Panel Registry Design

**Decision**: Implement a simple TypeScript Map-based registry where each panel type is registered with a factory function, display name, and default configuration.

**Rationale**: The spec requires new panels to be addable without modifying infrastructure (FR-016). A registry pattern achieves this:

```typescript
interface PanelDefinition {
  type: string;
  title: string;
  component: React.ComponentType<PanelProps>;
  minWidth?: number;
  minHeight?: number;
  defaultConfig?: Partial<ComponentItemConfig>;
}

const panelRegistry = new Map<string, PanelDefinition>();
```

New panels are added by calling `panelRegistry.set('my-panel', { ... })`. The GoldenLayout `bindComponentEvent` handler looks up the registry to find the React component to render.

---

## Decision 9: Welcome View → Analysis Transition

**Decision**: Keep conditional rendering in `App.tsx`. GoldenLayout initializes when `view === 'analysis'` and destroys when returning to `'welcome'`.

**Rationale**: The current `App.tsx` uses `view` state to conditionally render either the welcome view or analysis view. This pattern works well. The GoldenLayout instance will be created inside a `<PanelWorkspace>` component that mounts when the analysis view renders and unmounts when it doesn't. On unmount, save the current layout to localStorage. On mount, restore from localStorage or use default.

---

## Decision 10: Build Integration

**Decision**: Add `golden-layout` and `shared-zustand` as dependencies in `apps/web-shell/package.json`. Import CSS in `main.tsx`. No changes to Vite config needed.

**Rationale**: GoldenLayout is distributed as an ESM package with TypeScript types. Vite handles CSS imports natively. The existing Vite config with React plugin and path aliases needs no modification.

**New dependencies**:
- `golden-layout` (panel management)
- `shared-zustand` (cross-window state sync for pop-out panels)
