---
layout: future-post
title: "Planning: Unified Debrief Activity Panel"
date: 2026-02-03
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, vscode-extension, shared-components, ui-architecture]
excerpt: "Consolidating three sidebar panels into one unified webview with collapsible sections"
---

## What We're Building

Right now the Debrief sidebar in VS Code has three separate panels -- Time Controller, Tools, and Layers -- each with its own title bar, collapse affordance, and webview lifecycle. It works, but it wastes roughly 60 pixels of vertical space per extra panel header, and it means three independent message-passing channels between the extension host and the webviews. That is overhead we do not need.

Feature 047 replaces all three with a single webview containing collapsible sections. One `WebviewViewProvider`, one message channel, one React tree. The three capabilities remain distinct inside the panel -- they just share a container.

## How It Fits

This is a layout and architecture change, not a feature change. The Time Controller, Tools list, and Layers list keep their existing behaviour. What changes is where they live.

The important part is that the sub-components are being built as shared React components in `shared/components/`. That means they are not coupled to VS Code. When the Electron loader or Jupyter frontend arrives, the same `TimeController`, `ToolsList`, and `FeatureList` components can be composed into whatever layout those frontends need. The VS Code activity panel is just the first consumer.

This follows the "thick services, thin frontends" principle. The panel does not contain domain logic -- it renders state from the session store and dispatches actions back through the message protocol.

## Key Decisions

- **vscrui Pane component for collapsible sections.** This gives us native VS Code accordion styling without building our own. The Pane component handles expand/collapse, header rendering, and keyboard navigation.

- **Converting Tools and Layers from native tree views to React.** The existing Tools panel uses VS Code's built-in TreeView API. Moving to React means we lose native tree rendering, but gain composability and cross-frontend reuse. The Layers section already has React components (`FeatureList` and `LayersToolbar` from #045) so that conversion is straightforward.

- **React ErrorBoundary per section.** If the Tools list throws, the Time Controller and Layers keep working. Each section gets its own error boundary so a failure in one does not blank the entire panel.

- **Session-scoped collapse state.** Which sections are expanded persists within a VS Code session using the webview state API. We are not persisting this to disk -- if you restart VS Code, sections reset to their defaults (all expanded). That feels like the right trade-off: low complexity, no config file clutter.

- **No new dependencies.** The panel uses vscrui (#031, already integrated), React (already in the project), and the session-state store. Nothing new to install.

## The Numbers

Three panels currently consume about 132px of chrome (title bars, padding, borders). A single panel with collapsible sections drops that to roughly 72px -- a 45% reduction. On a 1080p display with a typical sidebar width, that reclaims enough space for two or three additional visible track entries in the Layers list. Not dramatic, but meaningful when you are working with exercises that have a dozen or more participants.

## What We'd Love Feedback On

- **Default section order.** We are planning Time Controller at the top, then Tools, then Layers. The logic is that time controls are used most frequently during playback, and layers are more of a "set and forget" concern. Does that match how analysts actually work, or would a different order be more natural?

- **Should collapse state persist across sessions?** We are leaning toward session-only persistence (resets on restart). But if analysts consistently collapse the same sections, maybe persisting to `workspaceState` is worth the small extra complexity.

- **Tool discoverability.** Moving tools from a native tree view to a React list means we control the rendering entirely. Are there affordances beyond a simple list that would help scientists find the right analysis tool -- grouping by category, recently-used, or something else?

-> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
