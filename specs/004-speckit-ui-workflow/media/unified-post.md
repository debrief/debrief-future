---
title: "Building SpecKit UI Workflow Enhancement"
date: 2026-01-11
layout: future-post
author: Ian
track: Shipped · This Week
excerpt: "SpecKit now detects UI features and generates interaction design sections automatically."
tags:
  - tooling
---

## What We're Building

When we specified the Loader Mini-App, something was missing. The functional requirements were solid: load a file, select a store, create a plot. But we had captured *what* without capturing *how users would experience it*. Single dialog or wizard? What decisions would users face? How would the screen states progress?

We are enhancing the SpecKit workflow to detect when a feature involves user-facing interfaces and automatically prompt for interaction design details. When you run `/speckit.specify` with a description mentioning "dialog", "wizard", or "app", the generated spec will now include a dedicated section for decision analysis, screen progression, and UI states. Backend services and APIs remain unchanged: the section only appears when relevant.

## How It Fits

This enhancement supports Constitution Article VIII ("Specs before code") by ensuring specifications are complete *before* implementation begins. Currently, UI gaps surface during `/speckit.clarify` or planning, forcing teams to backtrack. By capturing interaction design at specification time, we reduce rework and give reviewers a clearer picture of the proposed user experience.

SpecKit itself is our tool for standardised specification workflows. This is the first enhancement to make it context-aware, adapting its output based on feature characteristics rather than treating all features identically.

## Key Decisions

- **Keyword-based detection** rather than NLP or ML. Simple, predictable, and aligned with Constitution Article IX (minimal dependencies). Users can learn which words trigger the UI section.
- **UI indicators take precedence** over service indicators. A "dashboard API" gets the UI section because "dashboard" signals visual interaction.
- **Three-part UI section structure**: Decision Analysis (user goals and choice points), Screen Progression (state table), and UI States (empty, loading, error, success).
- **Backward compatible** by design. Existing specs (000-003) remain valid without modification. The UI section is additive and optional.
- **False positives preferred over false negatives**. When in doubt, include the section. It can be removed manually; missing it requires restarting.

SpecKit now distinguishes between UI features and backend services. When you run `/speckit.specify` with a description mentioning "dialog", "wizard", or "dashboard", the generated specification includes a dedicated section for capturing interaction design details: what decisions users face, how screens progress, and what different states look like.

We discovered this gap when specifying the Loader Mini-App. The functional requirements were solid: load a file, select a store, create a plot. But nothing captured *how* users would experience it. Single screen or wizard? What decisions would they face? What would error states look like? These details surfaced during clarification, forcing backtracking that could have been avoided.

## How It Works

The enhancement adds keyword-based feature detection to the `/speckit.specify` command. Three lists drive the logic:

**UI Triggers** (include UI section):
`dialog`, `screen`, `form`, `wizard`, `app`, `window`, `dashboard`, `modal`, `picker`

**Service Indicators** (no UI section):
`API`, `service`, `backend`, `parser`, `processor`, `handler`

**CLI Indicators** (no UI section):
`command`, `terminal`, `CLI`, `shell`

The precedence rule is simple: if *any* UI keyword appears, include the UI section. A description like "API with admin dashboard" generates the UI section because "dashboard" is a UI indicator.

When the UI section is included, it contains:
- **Decision Analysis**: What is the user trying to accomplish? What choices must they make?
- **Screen Progression**: A table showing state transitions through the happy path
- **UI States**: What the interface shows in empty, loading, error, and success conditions

Validation adapts accordingly. UI specs get additional checks for decision analysis and screen progression. Non-UI specs skip these items entirely.

## Lessons Learned

**Simple detection works.** Keyword matching is predictable and maintainable. Users can learn which words trigger UI sections. No ML, no NLP, no external dependencies.

**Backward compatibility removes barriers.** The UI section is optional. Existing specs (000-003) pass validation without modification. Teams can adopt the enhancement without rework.

**The gap was real.** Every UI feature we specified before this enhancement was missing interaction design details. Capturing them at specification time reduces clarification cycles and gives reviewers a clearer picture of the proposed experience.

## What's Next

Potential follow-on work:
- A dedicated `/speckit.ux` command for deeper interaction design exploration
- Integration with `/speckit.clarify` to prioritize UI-related questions
- ASCII wireframe support in the template

→ [View the PR](https://github.com/debrief/debrief-future/pulls)
→ [Try it yourself](https://github.com/debrief/debrief-future/blob/main/.claude/commands/speckit.specify.md)
