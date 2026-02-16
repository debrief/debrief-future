---
layout: future-post
title: "Planning: GoldenLayout Panel Management"
date: 2026-02-14
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, web-shell, panel-management]
excerpt: "Replacing the fixed flexbox layout with a VS Code-like panel workspace -- resize, drag, dock, tab, and pop-out."
---

## What We're Building

The web-shell analysis view currently uses a fixed CSS flexbox layout: a 320px sidebar on the left, map and chart stacked on the right. It works, but analysts can't resize anything, can't rearrange panels for different tasks, and can't pop the map onto a second monitor. We're replacing that fixed layout with GoldenLayout v2 -- a TypeScript-native panel management library that provides resize, drag-and-dock, tabs, pop-out windows, and layout serialization out of the box.

The five existing panels (Navigation, Activity, Log, Map, Chart) get arranged in a default layout that mirrors the current design, so nothing feels unfamiliar on first load. But now an analyst can grab a border and drag to resize. Drag a panel header to dock it somewhere else. Merge panels into tabbed groups. Pop a panel into its own browser window for dual-monitor setups. Close the browser, come back later, and find the layout exactly as they left it. A Panel Registry means adding a new panel type is a single registration call -- no infrastructure changes.

## How It Fits

This is the last piece of the web-shell becoming a credible analysis environment rather than a demo wrapper. We have the map, the time controller, the tools panel, layers, drawing tools, charts, undo/redo, the STAC file tree. What's been missing is letting analysts arrange those pieces to suit the task at hand -- giving more screen space to the map during spatial analysis, or tabbing the chart alongside the map to flip between views without both consuming space. GoldenLayout provides the container; the shared React components we've been building since the early tracer bullet slots right in as panel content.

## Key Decisions

- **GoldenLayout v2, not FlexLayout or react-mosaic**: GoldenLayout is framework-agnostic, TypeScript-native, and handles all five requirements (resize, drag, dock, tab, pop-out). FlexLayout is more React-native and the GoldenLayout maintainers actually recommend it for React projects, but GoldenLayout's broader adoption and our need for pop-out windows made it the better fit. react-mosaic lacks tabbed docking and pop-out entirely.
- **Custom React bridge (~100 lines) instead of third-party wrappers**: GoldenLayout doesn't have native React support, so we're building a thin bridge using `bindComponentEvent` to mount React components into GoldenLayout containers via `createRoot`. This avoids a dependency on community wrappers with uncertain maintenance.
- **Cross-window state sync via `shared-zustand` + BroadcastChannel**: When a panel pops out to a separate browser window, it re-mounts in a new JavaScript context with its own Zustand store. The `shared-zustand` library (1.5kB) bridges this using BroadcastChannel for sub-5ms latency. We sync temporal state, selection, and feature visibility. We deliberately don't sync undo/redo history or UI chrome state.
- **Layout persisted to localStorage with version-checked restore**: `LayoutManager.saveLayout()` returns a fully serializable config. We store it with a schema version number and validate on load -- if the version doesn't match or any referenced panel types are missing from the registry, we fall back to the default layout with a console warning. No silent corruption.
- **Welcome view stays outside GoldenLayout**: The CatalogOverview full-screen view works well as-is and doesn't need panel management. GoldenLayout initializes when transitioning to the analysis view and tears down when returning to the catalog.
- **~500 lines of infrastructure + ~200 lines per panel wrapper**: The Panel Registry, bridge layer, persistence logic, and default layout config are small. Each panel wrapper is a thin adapter around an existing shared component, mostly handling resize events and providing error boundaries.

## What We'd Love Feedback On

The default layout mirrors the current fixed design (25% sidebar, 75% content). Is this the right starting point, or would analysts prefer a different default arrangement? For example, a wider sidebar for the STAC tree, or the chart as a tab behind the map rather than a separate panel below it.

For pop-out panels, we're syncing selection, time position, and feature visibility across windows. Are there other state slices that should stay in sync? Anything that should explicitly not sync (e.g., should zooming the map in a pop-out window also zoom the main window's map)?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
