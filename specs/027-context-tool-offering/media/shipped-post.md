---
layout: future-post
title: "Shipped: Context-Sensitive Tool Offering"
date: 2026-01-24
track: [credibility]
author: Ian
reading_time: 4
tags: [typescript, react, linkml, storybook, tool-matching]
excerpt: "Tools now appear based on what you've selected, with explanations for why others aren't available."
---

## What We Built

Debrief now has context-sensitive tool offering. Select two tracks on the map and you'll see range calculations. Select one track and one reference point, different tools appear. No selection means tools requiring selections stay hidden.

The core is ToolMatchService, a TypeScript library that matches tool requirements to the current selection. Each tool declares what it needs using a schema: "requires exactly 2 tracks" or "requires at least 1 track" or "requires 1 track AND 1 point." The service evaluates these requirements and returns which tools are active. For inactive tools, it generates human-readable explanations like "Requires at least 2 tracks (1 selected)."

## How We Built It

LinkML schemas came first. Tool and SelectionRequirement definitions in YAML, then generated TypeScript types and JSON Schema for validation. All development used these generated types from the start, not hand-written interfaces.

The matching algorithm is straightforward: for each tool, check every requirement against the selection. A requirement passes if the selection has the right count of that feature kind. All requirements must pass for the tool to be active. The explanation generator identifies which requirement failed and formats a message explaining what's missing or what's extra.

We verified this in phases. Unit tests first (38 tests covering all matching edge cases). Then a Storybook harness with a feature list on the left and tool list on the right. Select features, watch tools update. Toggle "show inactive tools" to see explanations. Playwright starts Storybook automatically and runs interaction tests, capturing screenshots for verification.

## Test Coverage

Schema validation: 8 tests (4 valid fixtures, 4 invalid)
Unit tests: 38 tests across matching and explanation generation
Storybook harness: Interactive verification with fixture data

The fixtures cover exact counts, minimum counts, multiple requirements, and tools with no requirements. Everything passes.

## Lessons Learned

Generating TypeScript from LinkML schemas worked better than expected. No drift between schema definitions and code, no hand-maintained type files. The trade-off is an extra build step, but it's worth it for the single source of truth.

Storybook as a verification harness surprised me. I expected it would only be useful for component documentation, but pairing it with Playwright gave us automated testing of UI interactions without building a full VS Code extension. We deferred Phase 3 (VS Code integration) because Phases 1-2 proved the logic works.

Explanation generation could have been an afterthought, but treating it as a first-class concern from the start made the feature more usable. Inactive tools aren't just hidden; they tell you what you need to do to enable them.

## What's Next

Phase 3 will wire ToolMatchService into the VS Code extension. That means connecting to the real MCP service for tool discovery, rendering tools in the sidebar panel and context menu, and handling tool execution. The matching logic is done; integration is what remains.

→ [See the spec](/home/user/debrief-future/specs/027-context-tool-offering/spec.md)
→ [Run the tests](https://github.com/debrief/debrief-future/tree/claude/implement-context-tool-matching-lYYIV)
