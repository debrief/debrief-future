# Research: Unified Debrief Activity Panel

**Feature**: 047-unified-activity-panel
**Date**: 2026-02-01

## Research Questions & Findings

### RQ-1: How to implement collapsible sections?

**Decision**: Use vscrui `Pane` component for collapsible section headers.

**Rationale**: The vscrui library already provides a `Pane` layout component with `title` and `actions` props. This gives native VS Code styling out of the box and avoids adding new dependencies. A thin `CollapsibleSection` wrapper will manage expand/collapse state and CSS transitions.

**Alternatives Considered**:
- Custom HTML details/summary element — rejected: doesn't match VS Code styling
- VS Code tree view with collapsible nodes — rejected: loses webview flexibility
- Custom accordion component — rejected: unnecessary when vscrui Pane exists

### RQ-2: How to convert Tools panel from TreeDataProvider to React?

**Decision**: Build a new `ToolsList` shared React component that renders tool match results as a flat list with vscrui components.

**Rationale**: The existing `ToolsTreeProvider` uses `ToolMatchAdapter` to get `MatchResult[]` (active/inactive tools with explanations). A React component can consume the same data shape via props, rendering each tool as a clickable row with icon, label, and status. The adapter logic stays in the VS Code extension host; the React component is purely presentational.

**Alternatives Considered**:
- Embed native tree view inside webview — rejected: not possible, tree views are VS Code-native only
- Keep Tools as a separate native panel — rejected: defeats the unified panel goal
- Use FeatureList component for tools — rejected: tools have different interaction model (execute vs select)

### RQ-3: How to handle Layers panel in the unified view?

**Decision**: Compose existing `FeatureList` + `LayersToolbar` components as the Layers section.

**Rationale**: These components already exist as shared React components with vscrui styling (spec #045). The `FeatureList` provides virtualized feature listing with multi-select, and `LayersToolbar` provides filter/run/associated-files functionality. Together they replace the `LayersTreeProvider` fully.

**Alternatives Considered**:
- Build new layers component from scratch — rejected: duplicates existing work
- Wrap tree view in webview — rejected: not technically possible

### RQ-4: What message passing pattern to use for the unified panel?

**Decision**: Single `WebviewViewProvider` with a unified message protocol extending the existing pattern from `timeRangeView.ts`.

**Rationale**: The existing pattern uses typed message unions, a ready-signal handshake, and a pending message queue. The unified panel will extend this with additional message types for tools (execute, refresh) and layers (toggle visibility, selection change). Each sub-component receives only its relevant messages.

**Message Types**:
- Existing: `timeChange`, `playbackStateChange`, `displayModeChange`, `updateTimeExtent`, `setCurrentTime`, `setUIState`, `webviewReady`
- New for tools: `updateToolMatches`, `executeTool`, `toolExecutionResult`
- New for layers: `updateFeatures`, `toggleVisibility`, `selectionChange`, `updateSelection`
- New for panel: `setSectionCollapsed`, `restoreCollapseState`

**Alternatives Considered**:
- Separate message channels per sub-component — rejected: adds complexity with no benefit in a single webview
- State management in webview only — rejected: tools and layers data originates from extension host services

### RQ-5: How to register the unified panel in VS Code?

**Decision**: Replace the three existing view registrations (`debrief.timeRange`, `debrief.tools`, `debrief.layers`) with a single `debrief.activity` webview view in `package.json`.

**Rationale**: VS Code's `contributes.views` allows webview views in activity bar containers. The existing `debrief` container already hosts the three views. Replacing them with one view simplifies the manifest and eliminates the multi-panel overhead that causes wasted vertical space.

**Migration**: The three old view IDs will be removed from `package.json`. The new `activityPanelView.ts` WebviewViewProvider replaces all three providers.

### RQ-6: How to persist collapse state within a session?

**Decision**: Use VS Code's `webview.getState()`/`setState()` API (same pattern as TimeController).

**Rationale**: The existing TimeController already persists UI state (current time, speed, display mode) via the VS Code webview state API. This state survives webview reloads but not editor restarts — exactly matching the FR-007 session-scoped requirement.

**State Shape**:
```typescript
interface ActivityPanelState {
  collapsedSections: {
    timeController: boolean;
    tools: boolean;
    layers: boolean;
  };
}
```

### RQ-7: How to achieve 20% vertical space reduction (SC-002)?

**Decision**: Eliminate per-panel chrome (title bars, padding, margins) by using a single webview with compact section headers.

**Rationale**: Each VS Code panel has ~28px of title bar + 8px padding top/bottom = ~44px overhead. Three panels = ~132px wasted. A single webview with ~24px section headers × 3 = ~72px, saving ~60px (~45% overhead reduction). Additional savings come from shared padding and removing inter-panel gaps.

**Measurement Plan**: Screenshot comparison of current 3-panel vs unified panel with identical content, measured in pixels.

### RQ-8: Error isolation strategy (FR-006)?

**Decision**: React Error Boundaries around each sub-component section.

**Rationale**: React's ErrorBoundary pattern catches rendering errors in child components and displays a fallback UI. Each of the three sections will be wrapped in its own ErrorBoundary, so a crash in ToolsList doesn't affect TimeController or FeatureList.

**Implementation**:
```tsx
<CollapsibleSection title="Time Controller">
  <ErrorBoundary fallback={<SectionError name="Time Controller" />}>
    <TimeController {...timeProps} />
  </ErrorBoundary>
</CollapsibleSection>
```

### RQ-9: esbuild configuration for unified panel?

**Decision**: Add a new entry point `activityPanel.tsx` to the existing esbuild webview config.

**Rationale**: The current config builds `map.ts` as an IIFE bundle. The `timeController.tsx` entry point follows the same pattern. The unified panel will replace the time controller entry point with a broader `activityPanel.tsx` that imports all three sub-components.

**Config Change**: Replace `src/webview/web/timeController.tsx` entry with `src/webview/web/activityPanel.tsx`, outputting to `dist/webview/activityPanel.js`.

## Technology Decisions Summary

| Decision | Choice | Key Reason |
|----------|--------|------------|
| Collapsible sections | vscrui Pane | Native styling, no new deps |
| Tools component | New ToolsList (React) | TreeDataProvider can't live in webview |
| Layers component | Existing FeatureList + LayersToolbar | Already built and tested |
| Message protocol | Extended typed union pattern | Proven in TimeController |
| VS Code registration | Single `debrief.activity` view | Replaces 3 views, saves chrome |
| State persistence | `getState()`/`setState()` | Session-scoped, existing pattern |
| Error isolation | React ErrorBoundary per section | Standard React pattern |
| Build | esbuild IIFE bundle | Existing pipeline |
