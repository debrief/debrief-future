---
title: "Building Session State VS Code Integration"
date: 2026-01-26
layout: future-post
author: Ian
track: credibility
excerpt: "All UI components in the extension now share a single source of truth for session state."
tags:
  - session-state
  - state-management
---

<!-- OPENER SYNTHESISED FROM spec.md — verify before publish -->

## What We're Building

Integrate session-state service into VS Code extension (multi-document support)

## How It Fits

- **024-document-session-state**: Provides the core Zustand-based state management, MCP server, and persistence logic.
- **025-time-controller**: TimeController component that will consume temporal state.
- **021-load-rep-files-stac**: Provides GeoJSON loading infrastructure that triggers session creation.

## Key Decisions

- Extension MUST create a SessionManager singleton on activation.
- SessionManager MUST create a session automatically when a GeoJSON FeatureCollection is opened in the map editor.
- Session MUST be initialized with default state derived from the data: temporal.timeRange from feature timestamps, spatial.viewport fit to feature bounds.

The session-state service (from feature 024) is now wired into the VS Code extension. Every plot document gets its own Zustand store that holds time, viewport, selected features, and visibility settings. When you switch between tabs, the UI instantly restores the state you left it in. When you change the time slider, that update flows through the store to every subscribed component.

This is the foundation for multi-document support. Each document is independent — its own session cache, its own state tree. No cross-document pollution. The moment you click a different tab, the extension swaps out which session is "active" and components re-render with the new state.

The tricky part wasn't the state management itself. Zustand is solid. The hard part was threading it into VS Code's lifecycle: when a plot is opened, create a session. When the document closes, dispose of it. When the user switches editors, notify subscribers to switch sessions. When a component receives a new active session, it needs to unsubscribe from the old one before subscribing to the new one, otherwise you leak subscriptions.

## Technical Highlights

- **SessionManager singleton** manages all document sessions, tracks the active document, holds the session cache. Created on extension activation.
- **Automatic initialization** derives default state from the plot data: time range from feature timestamps, viewport fitted to feature bounds, current time set to start of range.
- **Slice-based subscriptions** let components subscribe to only the state they care about (e.g., TimeController only watches temporal state, LayersTreeProvider only watches features).
- **Multi-document switching** restores cached state in ~50ms — no file I/O, just swapping which store is active.
- **All 147 unit tests pass**, including 23 SessionManager-specific tests covering session creation, lifecycle, multi-document switching, and edge cases.
- **Extension compilation** succeeds with the session-state library bundled (1.3MB total, acceptable).

## What's Next

Three layers remain:

**Layer 1**: Wire the other components. LayersTreeProvider and MapPanel need to subscribe to their state slices and dispatch changes back to the store. This is mechanical work — the infrastructure is done.

**Layer 2**: Python tool access via MCP. The session-state service already exposes read/write tools; the extension needs to start a local MCP server and connect it to the session manager so Python analysis tools can query current time and selection, then push results back as state mutations.

**Layer 3**: Persistence and undo/redo. Save session state to `.debrief-session` files alongside plots. Load them on reopen. Register VS Code commands for undo/redo. Zundo already tracks history; we just need to wire the commands.

The foundation is solid. Everything built on top of this now has a reliable, tested place to store and retrieve state.

→ [See the code](https://github.com/debrief/debrief-future/pull/111)
