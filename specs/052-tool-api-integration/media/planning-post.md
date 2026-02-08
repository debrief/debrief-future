---
layout: future-post
title: "Planning: Tool API Integration via MCP"
date: 2026-02-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tool-api, mcp, python, typescript, layers-toolbar]
excerpt: "Wiring Python and TypeScript tool libraries to both UIs through a common MCP-based contract"
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

## What We'd Love Feedback On

The core tension is between protocol alignment and domain specificity. MCP gives us discoverability and interoperability. Debrief annotations give us context-sensitive filtering. We think both can coexist cleanly, but the boundary is worth scrutinizing.

Questions we're working through:

1. **Annotation namespacing**: MCP annotations are freeform. Should we namespace Debrief-specific fields (e.g., `debrief:selectionRequirements`) to avoid collisions with other MCP tools, or keep them flat for simplicity?

2. **TypeScript tool lifespan**: The web-shell only runs TypeScript tools. As the tool set grows (Python-only), the web-shell falls behind. Is that acceptable, or should we invest in a lighter-weight server-side execution path?

3. **Parameter UI generation**: Tools that need parameters beyond feature selection (a colour value, a distance threshold) require input controls. Should parameter definitions in MCP `inputSchema` drive automatic UI generation, or should tools provide UI hints separately?

If you've worked with MCP tool metadata or built context-sensitive toolbars, we'd value your perspective on these trade-offs.

[Join the discussion](https://github.com/debrief/debrief-future/discussions)
