---
layout: future-post
title: "Planning: Dynamic Blog Component Bundling"
date: 2026-01-17
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, speckit, blog-components, storybook]
excerpt: "Packaging interactive component demos as self-contained bundles for blog posts — no screenshots required."
---

## What We're Building

When you write about UI components, screenshots only tell half the story. Readers can see what a component looks like, but they can't interact with it — resize it, toggle states, see responsive behavior. Video adds some context, but it's still passive.

We're extending the speckit workflow to bundle interactive component demos directly into blog posts. When a shipped post showcases a new React component (map widget, timeline control, data table), the implementation workflow will identify the relevant Storybook story, package it as a self-contained JavaScript bundle, and embed it inline. Readers get a live, interactive demo without leaving the blog post.

This builds on our existing Storybook infrastructure. Stories are already written for component development and testing — this workflow repurposes them for public-facing content. The bundle is small (target 500KB), loads fast, and works on GitHub Pages with no server-side rendering.

## How It Fits

The speckit workflow already coordinates planning, implementation, PR creation, and publishing. This feature adds component bundling as an optional step:

- **Planning phase** (`/speckit.plan`): Template gains a "Media Components" section. The planning agent assesses whether the feature includes bundleable components and flags them.
- **Implementation phase** (`/speckit.implement`): If Media Components are specified, the agent builds esbuild bundles from Storybook stories. Bundles are self-contained (React included, CSS inlined) and output as IIFE format for simple script tag embedding.
- **PR phase** (`/speckit.pr`): Bundle paths are passed to the publish skill alongside blog post content.
- **Publishing phase** (`/publish`): Bundles are copied to `assets/components/{post-slug}/` in the website repo. Blog posts embed them with standard HTML div + script tags.

This keeps interactive demos in sync with code — if a component changes, the next shipped post automatically uses the updated bundle.

## Key Decisions

**Bundler**: Using esbuild with IIFE format. Fast, supports tree-shaking, produces predictable output. No complex plugin ecosystem needed.

**Self-containment**: Bundles include all dependencies (React, component library) and inline CSS. No CDN dependencies, no version conflicts. Trade-off is bundle size, but 500KB is acceptable for interactive content.

**Embed format**: Standard HTML `<div>` + `<script>` tag. Works with Jekyll, GitHub Pages, and any static site generator. No custom shortcodes or plugins required.

**Sizing**: Components render at 100% width (responsive), with author-controlled height via CSS custom properties. This avoids hardcoded dimensions while giving control over layout.

**Storybook link**: Every post with embedded demos must link to the full Storybook instance. The bundle is a teaser — readers who want to explore all states and variants can jump to the permanent Storybook URL.

**Size limit**: Soft limit of 500KB per bundle. If a component requires more (e.g., map tiles, heavy dependencies), we'll warn during build and require explicit approval.

## What We'd Love Feedback On

**Bundle size concerns**: Is 500KB reasonable for a blog post enhancement? Should we be more aggressive (250KB) or more permissive (1MB)?

**Embed approach**: We're using plain script tags for maximum compatibility. Would you prefer iframe isolation (safer, heavier) or web components (modern, less support)?

**Storybook vs standalone**: Should bundles link back to Storybook, or should they be fully standalone experiences? Current plan requires Storybook links to provide full context.

**Component selection**: Should the planning agent auto-detect bundleable components based on code changes, or should authors manually specify which demos to include?

**Performance**: Do we need lazy-loading for posts with multiple embedded components, or is eager loading acceptable?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
