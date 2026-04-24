---
title: "Building Tool API Integration via MCP"
date: 2026-02-06
layout: future-post
author: Ian
track: credibility
excerpt: "Four styling tools working identically in Python and TypeScript, wired to both UIs through MCP"
tags:
  - cross-language
  - layers-toolbar
  - mcp
  - tool-api
---

## What We're Building

We have tool specifications (feature 049) and a migration workflow (feature 050). Now we need the thing that makes them useful: actual tool implementations wired into actual applications.

Four migrated tools -- set-track-color, apply-symbol-style, label-interval, symbol-interval -- are getting Python and TypeScript implementations. Both languages produce tool definitions in MCP format. The VS Code extension reads tools from the Python calc service via MCP's `tools/list`. The web-shell reads tools from a TypeScript registry running in-browser. The Layers Toolbar doesn't care which backend it's talking to. It sees the same shape, applies the same filtering logic, presents the same UI.

The interesting part is what happens at the boundary between tools and UIs. Selection requirements -- "this tool needs two tracks" or "this tool needs one track and one contact" -- are encoded as MCP annotations. Any MCP client can discover these tools. Debrief-aware UIs additionally interpret the annotations to filter the Run dropdown by what the analyst has selected. Standard protocol, domain-specific metadata.

## How It Fits

Features 049 and 050 established the specification pipeline: document a tool, generate implementations, verify against golden examples. This feature is the next step: take those verified implementations and make them available to analysts through both UIs.

The Python calc service already exists as an MCP server. We're extending it to emit tool definitions with Debrief annotations. The `@tool` decorator on each Python function auto-generates a valid MCP tool entry -- selection requirements, parameter schemas, category, everything. Scientists authoring new tools in Python won't maintain separate definition files.

The shared `ToolMatchService` in `shared/components` consumes tool definitions from either language. VS Code and the web-shell both use it. One filtering implementation, two consumers.

## Key Decisions

- **MCP as the common contract**: Tool definitions follow MCP's standard format (`name`, `description`, `inputSchema`, `annotations`). We're not inventing a custom metadata format. This means future MCP clients get Debrief tools for free.
- **Python-first, TypeScript-transitional**: The four migrated tools exist in both languages. Future tools will be Python-only, written by analysts and scientists. The web-shell's tool set will eventually be a subset.
- **Each language generates its own tool-list**: Python tools self-describe via decorators. TypeScript tools self-describe via their registry. Neither derives definitions from the other or from the central specs. Both produce the same JSON shape.
- **Golden example verification for behavioral equivalence**: Every implementation is tested against JSON input/output pairs captured from the legacy Java tools. If Python and TypeScript both pass the same golden examples, they produce identical results. Floating-point tolerance is 1e-9.
- **Offline by default**: All tools execute locally. The Python service runs as a subprocess. TypeScript tools run in the browser. No network calls, no cloud dependencies.

The planning post asked: how do you make the same analysis tool work in a desktop app and a static website with no backend? Across 8 phases and 52 tasks, we now have an answer that actually works.

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
