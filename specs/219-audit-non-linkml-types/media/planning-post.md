---
layout: future-post
title: "Planning: Audit non-LinkML Type Declarations"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, schema, architecture, type-safety]
excerpt: "Enumerating every hand-typed interface across the codebase so we can tell principle from accident."
---

## What We're Building

A single audit document — `docs/type-audit-2026.md` — that lists every hand-written TypeScript `interface`, `type`, and `enum` across `apps/`, `shared/`, and `services/`, and classifies each one. The goal is to know, by name, where we've chosen to hand-type something and where a type has quietly grown up outside the schema system.

Each declaration lands in one of five buckets: schema-rooted (correct, imported from LinkML-generated models), boundary-loose (crosses Python to TypeScript but isn't in LinkML — should be), single-domain-convenience (lives in one module, hand-typed by exception), must-promote-to-LinkML (shared but drifting), or drift-candidate (two or three near-duplicates that should collapse into one). Every entry carries a one-line justification so the call can be challenged later.

## How It Fits

The architectural rule is simple: types that cross the Python–TypeScript boundary are rooted in LinkML, single-domain types are hand-typed *by exception*. In practice the rule has been applied informally. A recent review (PR #465) surfaced a handful of cases where hand-typed interfaces — `Coordinate`, `ViewportPolygon`, `GeoJSONFeature`, `DisplayMode`, a few tool-result envelopes — had drifted from their schema counterparts or from each other.

Each of those has its own follow-up. What's missing is the inventory. Without one, Epic E11 (Schema-First Boundary Typing) is planned on gut feel, and every "we found another one" moment chips away at confidence that the epic has a knowable endpoint. This audit gives E11 a finite phase list to work through.

## Key Decisions

- **TypeScript compiler API over ripgrep patterns.** Regex scans miss re-exports and conditional types. The bundled TS compiler walks the AST accurately and adds zero new dependencies.
- **Automate signals, keep classification human.** The tool records signals — "imports from `@debrief/schemas`", "same name in multiple files", "eslint-disable nearby" — but the five-way classification is a human call with a written justification. Rules that encode judgement drift the same way code does; recording *where* judgement was applied lets a later reviewer challenge the specific call rather than the methodology.
- **Two-file JSON workflow.** `inventory-raw.json` is the deterministic enumerator output (byte-identical on re-run). `inventory-classified.json` is the curation layer. Committing both means the next audit measures progress against a real baseline instead of producing another best-effort snapshot.
- **One follow-up backlog item per type (or per drift cohort).** Keeps work parallelisable and traceable under E11.
- **No runtime changes.** This is tooling and documentation. The audit produces the phase list; fixes happen in later features.

## What We'd Love Feedback On

A few genuinely open questions before we start enumerating:

- Are five categories the right cut, or is the line between "single-domain-convenience" and "must-promote-to-LinkML" too fuzzy to be useful? A type used in one place today may cross the boundary tomorrow.
- Should single-file-use types ever be allowed to cross module boundaries via re-export, or does that always count as drift regardless of where the declaration lives?
- What's the right cadence for re-running this? Annual feels arbitrary; tied to epic milestones feels more honest but harder to schedule.

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
