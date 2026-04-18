---
layout: future-post
title: "Planning: Consolidating a drifted type back to the schema"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, tech-debt, schemas, typescript]
excerpt: "Two TypeScript interfaces with the same name drifted apart. We're collapsing them back to one, anchored to the LinkML schema."
---

## What We're Building

We have two TypeScript interfaces in the codebase both called `ResolvedPositionStyle`. One lives in `@debrief/utils` and lists three marker shapes. The other lives in `@debrief/components` and lists five. They also disagree on whether the label field is called `label` or `labelText`. Both were hand-typed independently of the LinkML schema that already defines the canonical list of point shapes, and they drifted.

This work consolidates them down to one interface, living in `@debrief/utils`, with its shape union derived directly from the schema-generated `PointShapeEnum`. No rendering behaviour changes — markers on the map and timeline will look identical before and after. It is defensive housekeeping: one less place where a hand-typed list can fall out of step with the schema.

## How It Fits

Future Debrief is built schema-first. LinkML is the source of truth, and we generate Pydantic models, JSON Schema, and TypeScript types from it. That discipline works well at the service boundary. It is less consistently applied on the rendering side, where it is tempting to write a quick union type next to the component that uses it. This change pulls one of those rendering-side types back into the schema-derived world, using a small TypeScript pattern (a template literal over the generated enum) that keeps the union open to string literals at call sites. That is important: callers can keep passing `'circle'` as a plain string, but the set of legal values now auto-extends whenever the schema grows a new shape.

It also sets up a wider audit, tracked separately in backlog item #206, of other rendering-side types that still parallel a LinkML enum by hand.

## Key Decisions

- **Derive the shape union from the schema, not retype it.** We use `` `${PointShapeEnum}` `` — a template literal over the generated enum — rather than referencing the enum directly. The practical effect: callers keep using string literals like `'circle'` with no churn, and the list of valid shapes stays locked to the schema. When LinkML grows a new shape, the TypeScript type extends automatically.
- **Standardise on `labelText`, not `label`.** The two interfaces disagreed on the field name for the resolved label. The renderer already uses `labelText`, and migrating the five test assertions on the utils side is a small change. The schema's `PositionStyleOverride.label` input field keeps its LinkML-defined name — only the resolved output field changes.
- **Consolidate the type, not the resolver implementations.** Each package has its own near-identical `resolvePositionStyle` / `computeAllPositionStyles`. They differ subtly on null-versus-undefined handling of overrides. That is a separate question and is out of scope here; we've logged it as a follow-up. This change is scoped tightly so the behaviour-change risk is zero.

Roughly 60 lines touched across 5 files. Behaviour is covered by existing vitest unit tests, existing Playwright E2E, and existing webview E2E. No new tests required — if anything goes wrong, the existing suite will catch it.

## What We'd Love Feedback On

- Is the template-literal derivation (`` `${SomeEnum}` ``) the right idiom for "TypeScript type pinned to a schema-generated enum, but still assignment-compatible with string literals"? If we start using it in more places, is there a shared type-patterns doc where the pattern belongs?
- How much other hand-typed drift is there? If you have spotted a rendering-side union that parallels a LinkML enum by hand, that is exactly the kind of thing #206 wants to hear about.

→ [Spec](https://github.com/debrief/debrief-future/blob/main/specs/201-position-style-consolidation/spec.md)
→ [Plan](https://github.com/debrief/debrief-future/blob/main/specs/201-position-style-consolidation/plan.md)
