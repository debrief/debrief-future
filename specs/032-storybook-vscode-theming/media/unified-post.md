---
title: "Building Storybook VS Code Theming Documentation"
date: 2026-01-30
layout: future-post
author: Ian
track: credibility
excerpt: "We documented the complete Storybook VS Code theming system—21 variable mappings, token references, and a how-to guide for creating themed components."
tags:
  - storybook
  - theming
---

## What We're Building

We're creating a single, authoritative markdown document that explains how theming works in our Storybook setup for VS Code components. This isn't a generic design system doc—it's specific to the three-layer architecture we've chosen: CSS tokens (`--debrief-*` custom properties), a VS Code adapter that maps the editor's theme variables (`--vscode-*`) into our namespace, and a React ThemeProvider that manages context across the webview.

The guide will include complete token reference tables extracted directly from our source code, a step-by-step how-to for building a themed component, and troubleshooting guidance for common issues.

## How It Fits

Right now, developers adding components to Storybook have to figure out theming by reverse-engineering existing components. That friction slows down contribution and leads to inconsistently themed UI. Scientists and contributors from the DSTL community—many of whom are new to our codebase—need a clear, linear path: "I want to use the primary color. Here's how."

This documentation sits at the intersection of two worlds. On one side, designers and frontend engineers need the technical details: how tokens cascade, why we adapted VS Code's theme variables, where ThemeProvider sits in the component tree. On the other, defence analysts and maritime specialists need to know: "Will my component look right in light and dark mode? What colors are available?"

The guide makes that transparent.

## Key Decisions

**Single markdown file, not a spec.** We could have split this into implementation details, design rationale, and user guide, but that creates fragmentation. Developers need one source of truth.

**Token reference tables extracted from source.** Rather than hand-curating a static list, the guide includes tables generated from our actual `tokens.css` and `vsCodeAdapter.ts`. This means the documentation can't fall out of sync with the implementation.

**Step-by-step component example.** The howto walks through building a real component—let's say a Button—from token setup to Storybook display. Concrete beats abstract.

**Three-layer framing.** We're explaining not just what the layers do, but why they exist. The CSS tokens isolate us from VS Code's API surface. The adapter is the single point of translation. ThemeProvider makes context available to every component without prop drilling.

We documented the three-layer Storybook VS Code theming architecture in a single reference guide. The documentation covers:

## Lessons Learned

The architecture was well-structured. Three clear layers—VS Code variables at the bottom, semantic tokens in the middle, component styles on top—with good separation of concerns. The real challenge wasn't rethinking the design; it was ensuring completeness. Every token needed a light and dark value. Every VS Code variable needed to map to something concrete. No gaps left for developers to guess.

This taught me something about documentation work itself: the valuable part isn't rewriting architecture (usually the architecture is fine). It's being relentlessly thorough—hunting down every edge case, every token, every mapping—and presenting it so the next person doesn't have to hunt.

## What's Next

With the documentation shipped, the next developers onboarding to themed components should be able to follow the guide without confusion. We can also use this as a reference when adding new color tokens or adjusting the palette. The document becomes the source of truth for "how should this component integrate with the theme?"

This moves us further along the credibility track: we documented something that works, in production, handling real use cases.
