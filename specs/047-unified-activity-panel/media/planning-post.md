---
layout: future-post
title: "Planning: Unified Debrief Activity Panel"
date: 2026-02-01
track: [momentum]
author: Ian
reading_time: 2
tags: [tracer-bullet, vs-code-extension, ui-components]
excerpt: "Consolidating three VS Code sidebar panels into one unified Activity Panel with collapsible sections"
---

## What We're Building

The VS Code extension currently has three separate sidebar panels: Time Controller for temporal navigation, Tools for context-sensitive analysis, and Layers for plot visibility management. I'm consolidating these into a single unified Activity Panel with collapsible sections.

This matters because analysts work with these controls constantly during exercise review. Having them scattered across separate panels means more clicking, more cognitive overhead, and less screen space for the plot itself. A unified panel keeps all controls within reach while giving analysts fine-grained control over what they see.

## How It Fits

Future Debrief's architecture separates domain logic (Python services) from presentation (thin frontends). The VS Code extension orchestrates these services through MCP and presents results. This unified panel follows that pattern — it's pure presentation layer, coordinating state across Time Controller, Tools, and Layers without duplicating any domain logic.

## Key Decisions

- Using vscrui Pane components for collapsible sections (native-looking accordions)
- Converting existing TreeView registrations to React components
- Supporting all three theme variants (light/dark/VS Code) via --debrief-* CSS tokens
- Codicon icons throughout for consistency with VS Code
- Shared components in @debrief/components package
- Single WebviewViewProvider rather than three separate providers
- Message passing for state sync with extension host

## What We'd Love Feedback On

- Should sections remember their collapsed/expanded state between sessions?
- Default section order: Time Controller, Tools, Layers? Or something else?
- Any concerns about performance with all three sections in a single webview?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
