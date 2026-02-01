---
layout: future-post
title: "Shipped: Storybook VS Code Theming Documentation"
date: 2026-01-30
track: [credibility]
author: Ian
reading_time: 5 min
tags: [documentation, theming, storybook, vscode]
excerpt: "We documented the complete Storybook VS Code theming system—21 variable mappings, token references, and a how-to guide for creating themed components."
---

## What We Built

We documented the three-layer Storybook VS Code theming architecture in a single reference guide. The documentation covers:

- **All 21 VS Code variable mappings** — how theme variables (e.g., `editorBackground`, `editorForeground`) connect to semantic color tokens
- **Complete token reference tables** — light and dark values for every color across the palette
- **Context decorator usage** — how to structure components to pick up theme changes in Storybook
- **Step-by-step how-to** — concrete code examples for creating a themed component from scratch

The existing theming system was already solid; the gap was simply that nobody had written it down comprehensively. Developers building themed components were piecing it together from scattered comments and trial-and-error.

## Lessons Learned

The architecture was well-structured. Three clear layers—VS Code variables at the bottom, semantic tokens in the middle, component styles on top—with good separation of concerns. The real challenge wasn't rethinking the design; it was ensuring completeness. Every token needed a light and dark value. Every VS Code variable needed to map to something concrete. No gaps left for developers to guess.

This taught me something about documentation work itself: the valuable part isn't rewriting architecture (usually the architecture is fine). It's being relentlessly thorough—hunting down every edge case, every token, every mapping—and presenting it so the next person doesn't have to hunt.

## What's Next

With the documentation shipped, the next developers onboarding to themed components should be able to follow the guide without confusion. We can also use this as a reference when adding new color tokens or adjusting the palette. The document becomes the source of truth for "how should this component integrate with the theme?"

This moves us further along the credibility track: we documented something that works, in production, handling real use cases.
