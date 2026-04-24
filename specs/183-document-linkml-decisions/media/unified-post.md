---
title: "Building Documenting the Platform Schema Decisions"
date: 2026-04-13
layout: future-post
author: Ian
track: credibility
excerpt: "Six architectural decisions from the platform schema overhaul are now recorded as ADRs — the rationale that downstream features need"
---

<!-- OPENER SYNTHESISED FROM spec.md — verify before publish -->

## What We're Building

Note the decisions made for 181 in the planning post document

## How It Fits

_Synthesis fallback — no in-scope/dependencies bullets detected._

## Key Decisions

- The project decisions file (`docs/project_notes/decisions.md`) MUST contain a new ADR for each of the 6 key decisions documented in the feature 181 planning post.
- Each ADR MUST follow the established format: date, ADR number, context, decision, alternatives considered, and consequences.
- Each ADR MUST be sequentially numbered continuing from the last existing entry (currently ADR-011).

Six Architectural Decision Records (ADR-012 through ADR-017) documenting the key decisions made during feature 181 (LinkML platform overrides). These cover why `VesselDomainEnum` moves to `common.yaml`, why `PlatformRecord` lives in `stac-extension.yaml`, why flat aggregate fields were removed rather than retained, why only `id` is required on platform records, what pattern constraints override fields use, and why all fixtures are regenerated rather than supplemented.

This is a documentation-only feature. No code changed. The value is institutional memory: every downstream feature in the E10 epic (#185 CQL2 array filters, #186 filter bar UI, #188 NL queries) depends on the schema structures introduced in 181, and contributors working on those features need to understand what was decided, why, and what was rejected — without hunting through planning posts or research notes.

## Why It Matters

Two of the six decisions were revised from what the 181 planning post originally proposed. The planning post said to keep flat aggregate fields during a transition period and add targeted fixtures alongside existing ones. The actual implementation removed the flat fields and regenerated all fixtures, aligning with Constitution Article XIV (pre-release freedom: strict on import, fix the data). Without ADRs recording the corrected decisions, a future contributor reading the planning post would get the wrong picture.

The ADRs also settle a question that appeared in multiple planning artifacts: whether `VesselDomainEnum` should move from `stac-extension.yaml` to `common.yaml`. The answer is yes — the ADR is the definitive record, even though the physical move hasn't happened yet.

## By the Numbers

| | |
|---|---|
| New ADR entries | 6 |
| ADR range | ADR-012 through ADR-017 |
| Constitution articles cited | Article XIV (clauses 1, 3, 4, 5) |
| Decisions revised from planning post | 2 |
| Code changes | 0 |

## What's Next

Save-time resolution (#183's original scope) is the next item in the E10 foundation sequence — the enrichment pipeline that actually populates `PlatformRecord` entries on STAC items. After that: sample catalog regeneration (#184) and CQL2 compound filters (#185).

→ [See the branch](https://github.com/debrief/debrief-future/tree/claude/implement-speckit-183-nzVAQ)
