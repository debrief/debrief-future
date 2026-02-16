---
title: "Shipped: GoldenLayout Panel Management"
date: 2026-02-14
categories: [shipped]
tags: [web-shell, ui, goldenlayout, panels]
feature: 096-add-goldenlayout-panels
---

## What We Shipped

The web-shell's analysis workspace has graduated from a fixed flexbox layout to a fully interactive, VS Code-like panel workspace powered by GoldenLayout v2. Where analysts previously stared at a rigid 320px sidebar and an immovable map-over-chart arrangement, they now have a workspace that adapts to the task at hand.

The five-panel layout — Navigation, Activity, Log, Map, and Chart — still appears in its familiar default arrangement on first load. But everything about how those panels behave has changed:

- **Resizable panels** via draggable splitters. Grab any border between panels and drag to give more room to the map during spatial analysis, or widen the sidebar when navigating a deep STAC catalog.
- **Drag-and-dock rearrangement** with visual drop indicators. Drag a panel header to reposition it anywhere in the workspace — top, bottom, left, right, or as a new split.
- **Tabbed panel groups**. Drop a panel on the centre of another to merge them into a tabbed stack. Flip between the map and chart without both consuming screen space.
- **Pop-out panels** to separate browser windows. Move the map to a second monitor while keeping controls on the primary display.
- **Layout persistence** to localStorage. The workspace auto-saves on every change and auto-restores when the browser reopens. A "Reset Layout" action returns to the default five-panel arrangement at any time.
- **Empty state detection**. If all panels are closed, a Reset Layout prompt appears so the workspace never becomes permanently empty.

The CatalogOverview welcome view remains untouched — a full-screen map showing plot bounding boxes with a timeline strip, operating entirely outside of GoldenLayout. The transition between welcome and analysis views is clean in both directions.

## Architecture

Four pieces of infrastructure make this work:

- **Panel Registry** — an extensible `Map<string, PanelDefinition>` where each panel type registers its component, title, icon, and minimum dimensions. Adding a new panel type is a single `registry.register()` call.
- **GoldenLayout React Bridge** — a custom ~100-line bridge that uses GoldenLayout's `bindComponentEvent` to create a React root (`createRoot`) per panel. When application state changes, the bridge re-renders all mounted panels via `updateContextWrapper()` rather than relying on React's standard tree reconciliation, since each panel lives in its own React root.
- **PanelContext** — a React context that provides application state (plot data, session store, callbacks) to all panel wrappers. This decouples panels from the GoldenLayout infrastructure entirely — panel components consume context, not GoldenLayout props.
- **Layout Persistence** — `layoutPersistence.ts` handles save, load, and validation. Saved layouts carry a schema version number. On restore, the module checks that the version matches and that every referenced panel type exists in the registry. If anything is stale or corrupt, the system falls back to the default layout with a console warning. No silent failures.

The dark theme is handled by `PanelWorkspace.css`, which maps all `.lm_*` GoldenLayout classes to the existing VS Code CSS custom properties from `tokens.css`. The panel chrome matches the rest of the application without maintaining a separate colour palette.

## Key Design Decisions

**Reactive bridge pattern over standard React reconciliation.** GoldenLayout creates independent DOM containers for each panel, and our bridge mounts a separate React root into each one. This means React's top-down reconciliation does not naturally flow into panels. The bridge solves this by calling `updateContextWrapper()` whenever application state changes, which re-renders every mounted panel with the latest context values. It is a deliberate trade-off: slightly more manual wiring in exchange for clean separation between layout management and React rendering.

**PanelContext over direct props.** Panel wrappers consume application state through React context rather than receiving it as GoldenLayout component state. This keeps every panel wrapper a standard React component with no awareness of GoldenLayout. If the layout library were ever swapped, the panel components would not need to change.

**Panel Registry for extensibility.** The spec required that new panel types be addable without modifying infrastructure code (FR-016, SC-005). The registry pattern achieves this cleanly: call `registry.register()` with a type, title, component, and optional constraints. The bridge, persistence layer, and default layout config all resolve panel types through the registry. No switch statements, no hardcoded lists.

## Files Created

17 new files across core infrastructure and panel wrappers. 9 files form the PanelWorkspace module (registry, bridge, persistence, default layout, error boundary, theme CSS, container component, default registry factory, and barrel exports). 6 files provide panel wrappers and the shared PanelContext. 5 existing files were modified. The net effect on `App.tsx` was a reduction in complexity — 140 lines of flexbox layout code replaced with 7 lines of `PanelWorkspace` integration.

## What's Next

Three items follow directly from this work:

- **Playwright E2E tests** for panel-specific interactions — drag-and-dock sequences, persistence across reload, pop-out window behaviour, and welcome-to-analysis transitions.
- **shared-zustand BroadcastChannel sync** for cross-window state in pop-out panels, keeping selection, time position, and feature visibility in sync across windows.
- **Storybook story** for PanelWorkspace, providing an interactive demo of the default layout with resize and drag capabilities for the component library.

The panel workspace is the last structural piece the web-shell needed to become a credible analysis environment. The map, time controller, tools, layers, drawing tools, charts, undo/redo, and STAC file tree are all in place. Now analysts can arrange those pieces to match the task — and have the arrangement remembered when they come back.
