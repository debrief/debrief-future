---
layout: post
title: "Config Service: Sharing state between Python and TypeScript"
date: 2026-01-10
author: ian
category: progress
tags: [tracer-bullet, config]
---

The next piece of the tracer bullet is surprisingly mundane: where does Debrief store its settings?

I'm building a config service that manages the list of STAC stores you've registered and your preferences. The wrinkle is that both Python services and the Electron loader need to read and write the same data. When you register a catalog from a Python MCP tool, it needs to appear in the loader's dropdown immediately.

The solution is straightforward — both languages share a JSON config file in the platform-appropriate location: `~/.config/debrief/` on Linux, `~/Library/Application Support/debrief/` on macOS, `%APPDATA%\debrief\` on Windows.

## The path parity problem

For Python, `platformdirs` handles XDG paths correctly on all platforms. It has 47 million weekly downloads and zero dependencies.

For TypeScript, the obvious library is `env-paths`. But it gets macOS wrong — it uses `~/Library/Preferences` instead of `~/Library/Application Support`. If the paths don't match, Python and TypeScript can't share the same file.

I wrote a 20-line manual implementation instead. It maps platforms to paths the same way `platformdirs` does. Twenty lines of code felt better than fighting a library that doesn't quite fit.

## Concurrent access

Two processes might write to config at the same time — the Python service registering a store while the Electron loader saves a preference. Without coordination, one write could clobber the other.

The approach: atomic write plus lock file. When writing config, write to a temp file first, then atomically rename it. A lock file prevents simultaneous writes. This keeps the config file human-readable (unlike SQLite) while preventing corruption.

Using `filelock` for Python and `proper-lockfile` for Node.js — both handle stale lock detection if a process crashes while holding the lock.

## Schema decision

I considered putting the config schema in LinkML to match the domain data approach. But config is internal application state, not data that crosses system boundaries. The existing services (debrief-stac, debrief-io) already use Pydantic directly for internal structures. Following that pattern.

## Open questions

A few things I'm not certain about:

- Should there be a "default store" preference that auto-selects in the loader? Or is that adding features before they're needed?
- When listing stores, should I re-validate that each catalog still exists? Catches moved/deleted catalogs but adds latency.
- Config has a `version` field for future migrations. What happens when v2 arrives — silent upgrade, backup old file, prompt user?

Small service — roughly 500 lines of Python, 300 lines of TypeScript. But it's foundational. Every component that needs to remember settings or discover available stores will use this.

-> [See the spec and design artifacts](https://github.com/debrief/debrief-future/tree/main/specs/003-debrief-config)
