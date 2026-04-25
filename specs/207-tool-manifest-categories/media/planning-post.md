---
layout: future-post
title: "Planning: Tool Manifest Lookup for Log Panel Categories"
date: 2026-04-22
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, log-panel, tool-manifest, contrib]
excerpt: "Letting tools declare their own Log Panel icon category, so new tools get the right colour without editing the UI."
---

## What We're Building

The Log Panel exists so an analyst can scan the provenance of an analysis at a glance. A coloured icon in the margin tells them whether a step was an import, a styling change, a calculation, a filter, or a snapshot. That glance only works if the icon is correct — and right now, it often isn't.

Today, the mapping from tool ID to icon category lives in a hand-maintained list of about sixteen entries in `shared/components/src/LogPanel/toolCategories.ts`. Anything not on that list renders neutral grey. Every new tool added under `services/calc/` — or eventually under `contrib/` — silently erodes the signal until someone remembers to edit the UI component library. This feature moves the declaration to the point where the tool is registered, so the signal stays correct by construction.

## How It Fits

The path is boring in the best way: the tool author declares a category in the same place they declare everything else about the tool. The MCP `tools/list` response carries the value out through the existing pipeline. The VS Code extension caches it, pushes it into the webview, and the Log Panel looks it up at render time. No new endpoint, no new service, no new file under `shared/components/src/LogPanel/` that ever needs editing again.

The source of truth is LinkML. A new `ToolCategoryEnum` sits in `shared/schemas/src/linkml/tool.yaml` alongside the existing `OutputKindEnum` and `ResultCategoryEnum`. Pydantic models and TypeScript literal unions regenerate from it, so a typo is caught at typecheck or Pydantic-validation time, not at render time.

This is the architectural follow-through on #176, which introduced the hand-coded shim. That shim was the right tactical move at the time; retiring it is the right move now.

## Key Decisions

- **LinkML is the single source of truth** for the category vocabulary. No hand-written duplicates in Python or TypeScript.
- **Additive MCP annotation.** A new `debrief:uiCategory` key sits alongside the existing `debrief:category` (the hierarchical path like `track/styling` used by tool-match). They serve different consumers and will coexist.
- **Two-commit migration.** Commit A lands the plumbing additively with the static map still in place. Commit B retires the map and turns on a first-party-coverage test. The intermediate state lets us run visual regression against a known-good baseline before the behaviour change lands.
- **Fail-closed fallback.** A missing or invalid category renders neutral grey — the same thing users see today. The semantics shift: grey now means "the tool chose not to declare" rather than "we forgot to hand-list it".
- **CI enforces first-party coverage.** A dedicated test walks the tool registry and fails if any first-party tool has `category is None`. Contrib tools are exempt, by design.

## What We'd Love Feedback On

Three things are genuinely open.

First, whether `debrief:category` and `debrief:uiCategory` should coexist. The hierarchical category drives tool-match and the visual category drives the Log Panel — they are genuinely different concerns — but the payload gets a bit fatter. Is the clarity worth the bytes?

Second, the five-bucket taxonomy (`import`, `style`, `calc`, `filter`, `snapshot`) doesn't have a natural home for destructive operations. `delete-features` currently maps to `style`, which is semantically odd. I'm preserving that mapping in this feature to avoid a visible behaviour change, but a sixth `destructive` bucket feels like a reasonable follow-up. Views welcome.

Third, this feature assumes contrib tools register via the standard `@tool` decorator path. The broader extension-discovery mechanism for `contrib/` is explicitly deferred by Article V of the constitution. I'd like a second pair of eyes on whether the manifest contract here constrains that later choice in ways we'll regret.

Discussion is open at [GitHub Discussions](https://github.com/debrief/debrief-future/discussions) — the `#176 follow-up` thread is the natural place for the taxonomy question.
