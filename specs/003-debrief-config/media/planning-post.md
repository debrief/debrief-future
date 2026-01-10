---
layout: post
title: "Planning: debrief-config"
date: 2026-01-10
author: ian
category: planning
tags: [tracer-bullet, config]
---

## What We're Building

This week we're tackling a problem that sounds simple but has some interesting cross-platform wrinkles: **where does Debrief store its settings?**

The debrief-config service manages shared user state - specifically, the list of STAC stores you've registered and your preferences. The twist is that we need this to work from both Python services and the Electron loader app. When you register a STAC catalog from a Python MCP service, that registration needs to appear instantly in the loader's dropdown. Both languages will read and write the same JSON config file, stored in the platform-appropriate location: `~/.config/debrief/` on Linux, `~/Library/Application Support/debrief/` on macOS, and `%APPDATA%\debrief\` on Windows.

This is a small service (roughly 500 lines of Python, 300 lines of TypeScript), but it's foundational. Every other component that needs to remember user settings or know about available data stores will use this.

## How It Fits

In the tracer bullet sequence, debrief-config sits at Stage 3 - after schemas, STAC operations, and file parsing, but before the Electron loader. It's the bridge that lets the TypeScript frontend discover what the Python backend knows about. Without it, you'd have to manually tell the loader about every catalog you create - which defeats the point of a seamless workflow.

## Key Decisions

We've done the research and made some calls. Here's what we've landed on:

- **Python XDG paths**: Using `platformdirs` (47M weekly downloads, zero dependencies, maintained by PyPA). It handles all the cross-platform path resolution we need.

- **TypeScript XDG paths**: Writing our own 20-line implementation. Why? The obvious choice (`env-paths`) uses `~/Library/Preferences` on macOS, but `platformdirs` uses `~/Library/Application Support`. If the paths don't match, Python and TypeScript can't share the same config file. Twenty lines of code is a small price for guaranteed path parity.

- **Concurrency handling**: Atomic write plus lock file. When you write config, we write to a temp file first, then atomically rename it. A lock file prevents two processes from writing at the same time. This keeps the config file human-readable (unlike SQLite) while preventing corruption.

- **Schema approach**: Pydantic models only, not LinkML. Config is internal application state, not domain data. Our existing services (debrief-stac, debrief-io) already follow this pattern for internal structures. LinkML is for data that crosses system boundaries - config doesn't.

- **Testing**: pytest for Python, Vitest with memfs for TypeScript. Both use mocked filesystems so we can test all platform paths without needing three different machines.

## What We'd Love Feedback On

We're confident about the technical approach, but there are a few design questions we'd value input on:

1. **Default store behaviour**: Should there be a "default store" preference that gets auto-selected in the loader? Or is that premature optimisation?

2. **Store validation timing**: We currently validate that a path points to a valid STAC catalog when you register it. Should we also re-validate on every `list_stores()` call (slower but catches moved/deleted catalogs)?

3. **Config versioning**: We're adding a `version` field to the config format. What should happen when we need to migrate to v2? Silent auto-upgrade? Backup old file? Prompt user?

4. **TypeScript API naming**: Python uses `snake_case` (`register_store`, `list_stores`). TypeScript convention is `camelCase` (`registerStore`, `listStores`). We're planning to follow language conventions rather than force parity. Any strong opinions?

If you've built cross-platform config systems before, or have preferences about any of the above, we'd genuinely like to hear from you.

-> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
