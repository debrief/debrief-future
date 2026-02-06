---
layout: future-post
title: "Shipped: Tool API Integration via MCP"
date: 2026-02-06
track: [credibility]
author: Ian
reading_time: 5
tags: [tool-api, mcp, python, typescript, layers-toolbar, cross-language]
excerpt: "Four styling tools working identically in Python and TypeScript, wired to both UIs through MCP"
---

## What We Built

The planning post asked: how do you make the same analysis tool work in a desktop app and a static website with no backend? Across 8 phases and 52 tasks, we now have an answer that actually works.

Four styling tools -- set-track-color, apply-symbol-style, label-interval, symbol-interval -- are implemented in both Python and TypeScript. The Python implementations run in the calc service, exposed via MCP. The TypeScript implementations run directly in the browser. Both produce identical outputs for the same inputs (verified down to 1e-9 floating-point tolerance). An analyst using VS Code and an analyst using the web-shell see the same tools, get the same filtering behavior, and get the same results.

The piece that ties it together is the `@tool` decorator. A Python function decorated with `@tool` auto-generates a complete MCP tool definition -- name, description, input schema, selection requirements, category. Scientists writing new tools don't maintain separate definition files. They write a function, add a decorator, and the tool appears in the MCP `tools/list` response. The CalcService picks it up. The Layers Toolbar picks it up. No UI changes needed.

## How It Works

Tool discovery happens through MCP's standard `tools/list` endpoint. Each tool definition carries `debrief:selectionRequirements` annotations -- the namespaced approach we settled on from the planning post's open question. These annotations tell the UI what features a tool needs: "one or more tracks" for styling tools, "one track and one shape" for range-bearing.

A shared `ToolMatchService` in `@debrief/components` consumes these definitions through a thin `mcpAdapter` layer that converts MCP format to the matcher's input. Both VS Code and the web-shell use the same matching logic. When an analyst selects two tracks, both UIs enable the same four styling tools. When the selection is empty, both disable everything. One implementation, two consumers.

The web-shell's tool service runs TypeScript tools directly in the browser. It filters out Python-only tools (track-stats, range-bearing, area-summary) automatically -- they simply don't exist in its registry. No special exclusion logic required.

On the Python side, mutation tools route through `build_mutation`, which attaches provenance metadata to every response. Every result records which tool produced it, from which input features, with a human-readable label. This provenance flows through to STAC persistence.

## Test Results

We landed 96 new tests across both languages:

**Python (56 new, 268 total passing):**
- 10 foundation tests for `to_mcp_tool` generation
- 6 MCP server contract and integration tests
- 11 tool execution pipeline tests
- 22 golden example tests across all 4 tools
- 7 cross-language parity tests

**TypeScript (40 new):**
- 10 `mcpAdapter` tests
- 8 `mcpToolMatch` tests
- 22 golden example tests across all 4 tools

Cross-language parity verified for every tool: Python and TypeScript both pass the same golden examples captured from the legacy Java implementations. If both languages produce the same output for the same input, we have behavioral equivalence with the system analysts already trust.

## Lessons Learned

**The `debrief:` namespace was worth the extra characters.** We debated keeping annotation keys flat for simplicity. Namespacing with `debrief:selectionRequirements` and `debrief:resultType` turned out to be the right call. It makes the boundary between standard MCP and domain-specific metadata explicit. Any generic MCP client can discover our tools and ignore our annotations cleanly.

**Golden examples are the best cross-language contract.** We considered testing parity by running both implementations and comparing outputs dynamically. Instead, we captured JSON input/output pairs from the legacy Java tools and tested each language independently against those fixtures. Simpler to debug, easier to extend, and it also verifies we match the legacy system -- not just each other.

**The thin adapter pattern paid off immediately.** The `mcpAdapter` is about 30 lines of code. It converts MCP tool definitions into the shape `ToolMatchService` expects. When we inevitably change how MCP annotations are structured, only the adapter changes. The matching logic and the tool definitions stay stable.

**Python-first is the right default.** Scientists will author tools in Python. The TypeScript implementations exist for the web-shell demo and for the initial set of migrated tools. Having both languages for these four tools proved the architecture works cross-language. But we're not committing to dual implementations for every future tool -- the web-shell will have a smaller tool set, and that's fine.

## What's Next

The four styling tools are the proof that the pipeline works end to end: specify, implement, verify, wire to UI. The next tools to migrate will be analysis operations -- track-stats, range-bearing -- which produce derived data rather than mutations. That exercises a different code path in `build_response` and different result display in the Layers panel.

We also need parameter UI generation. The current tools take simple inputs (a color string, an interval number), but future tools will need richer parameter controls. The MCP `inputSchema` already describes parameters formally -- the question is how much UI we auto-generate from that schema versus hand-crafting per tool.

-> [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/052-tool-api-integration)
-> [Test summary](https://github.com/debrief/debrief-future/tree/main/specs/052-tool-api-integration/evidence/test-summary.md)
