---
layout: future-post
title: "Planning: Session State Management"
date: 2026-01-24
track: [momentum]
author: Ian
reading_time: 4
tags: [session-state, vscode-extension, architecture]
excerpt: "Centralizing view state so map, timeline, and Python tools stay synchronized"
---

## What We're Building

When you're navigating a complex maritime plot — scrubbing through time, panning the map, selecting features — every UI component needs to agree on what "now" means. Move the time slider, and the map should update. Select a vessel, and the properties panel should show its attributes. Run a Python analysis tool, and it should be able to query what you're currently looking at.

This week we're implementing centralized session state for the VS Code extension. The state tracks four concerns: temporal (where you are in time, playback settings), spatial (what you're looking at on the map), features (what's selected, what's hidden), and document (dirty tracking, undo history).

The goal is coordination without coupling. UI components subscribe to the slices they care about. Python tools read and write state through a well-defined interface. Everything stays in sync without everything knowing about everything else.

## How It Fits

This is infrastructure for the "thick services, thin frontends" architecture. The VS Code extension is a thin frontend — it orchestrates components and handles user interaction, but domain logic lives in Python services. Those services need to know what the user is looking at (current time, viewport, selection) without being entangled with the UI.

Session state becomes the shared context. When a Python tool like "calculate closing rate for selected tracks" runs, it queries the selection from session state rather than requiring the user to pass feature IDs as arguments. When it wants to zoom to results, it updates the viewport state and the UI reacts.

## Key Decisions

We've made several technology choices based on our constraints:

- **Zustand for state management** — Its vanilla store works outside React (necessary for VS Code extension context), the `subscribeWithSelector` middleware enables fine-grained subscriptions, and it's about 1KB with no dependencies. We considered Redux Toolkit but it's heavyweight for single-session state.

- **Zundo for undo/redo** — Purpose-built for Zustand, supports excluding ephemeral state (like playback running/stopped) from history, and handles rapid changes through throttling. We'll keep 50 steps of history.

- **MCP with Streamable HTTP** — Python services access state through Model Context Protocol over HTTP. This is the standard we're using for all Python integration. The deprecated HTTP+SSE transport was an option, but Streamable HTTP is the current recommendation.

- **Standalone debug dashboard** — A separate HTML app that connects to the state server, rather than serving the dashboard from the server itself. This keeps the server minimal (pure API) and lets the dashboard evolve independently. Aligns with "thick services, thin frontends."

- **better-sse for real-time updates** — Server-Sent Events push state changes to the dashboard. WebSocket felt like overkill for server-push only.

## What We'd Love Feedback On

We're wrestling with a few questions:

**Conflict resolution**: When Python and UI both modify state, we're using last-write-wins. The alternative is some kind of priority or queueing. For exploratory analysis workflows, is last-write-wins good enough, or will users hit confusing situations?

**History granularity**: We're recording state changes at the slice level. Rapid panning generates many viewport updates — we throttle these before recording to history. But what's the right granularity for time navigation? Every click of "step forward"? Or should we batch those too?

**Session file scope**: Currently session files reference an external feature collection but don't embed it. This means a session file becomes invalid if the original data moves. Should sessions be self-contained (larger files, but portable), or is referencing external data the right tradeoff?

If you have thoughts, especially if you've built similar state management for analysis tools, we'd appreciate hearing them.

-> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
