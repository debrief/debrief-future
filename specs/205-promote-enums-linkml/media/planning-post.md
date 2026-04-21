---
layout: future-post
title: "Planning: Promote DisplayMode and PlaybackState to LinkML"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, schema, linkml, type-safety, tech-debt]
excerpt: "Eliminating four hand-typed TypeScript enum definitions by promoting DisplayMode and PlaybackState into the LinkML master schema."
---

## What We're Building

Four hand-typed TypeScript type definitions are coming out of the codebase this week. Two of them define `DisplayMode`, two define `PlaybackState` — and none of the four agree with each other.

The `shared/components` package describes display mode as `'full' | 'trail'`. The `services/session-state` package calls the same concept `'normal' | 'snailTrail'`. Every time code crosses that package boundary, something has to translate silently between the two vocabularies — or quietly gets it wrong. The `PlaybackState` drift is subtler: one package knows about `stopped`, the other doesn't, so a valid state can fall through a case handler that was never written to see it.

The fix is straightforward: both enums already exist in the LinkML master schema. `PlaybackStateEnum` is already wired correctly; it just needs its TypeScript post-processor patch. `DisplayModeEnum` needs a vocabulary rename — `normal` → `full`, `snailTrail` → `trail` — to match the clearer, user-facing terms. After that, both generated types replace all four hand-written ones, and the translation layer disappears.

No new capabilities ship from this. What ships is the guarantee that a developer reaching for either type gets exactly one definition, from one place, backed by the schema.

## How It Fits

Debrief's constitution requires that all type definitions originate in the LinkML schema — code generation, not hand-authorship, is the source of truth. `DisplayMode` and `PlaybackState` predate that discipline. They were written quickly as inline union literals, then copied across packages as the codebase grew, and the copies naturally drifted.

This is the third of three parallel items clearing that backlog. Feature #203 handles spatial types, #204 handles raw GeoJSON feature types, and this one handles the display and playback enums. Each is an atomic PR — schema edit, regeneration, and consumer migration all reviewed together so the repository is never in a half-migrated state.

The TypeScript generator emits `string` for enum-ranged slots, which is a known upstream limitation. The existing `generate.py` post-processor already works around this for `PointShapeEnum` using template-literal type aliases. This PR adds the same pattern for both new enums: `export type PlaybackState = \`${PlaybackStateEnum}\`` gives consumers a narrow string type they can compare with `=== 'playing'` without any coercion.

## Key Decisions

- **`full`/`trail` wins over `normal`/`snailTrail`** — the shared/components vocabulary describes what the user sees (the full track, or just the historical trail up to now). `snailTrail` is an internal rendering term; retiring it in favour of `trail` makes the schema readable to someone unfamiliar with the rendering implementation.
- **Three-value `PlaybackState` is the canonical superset** — `stopped`, `playing`, `paused`. Components that previously only handled two values will treat `stopped` identically to `paused` in rendering. No visual change; the state machine just stops pretending `stopped` can't happen.
- **Template-literal type aliases, not enum constants** — `PlaybackState = \`${PlaybackStateEnum}\`` rather than requiring `PlaybackStateEnum.playing` everywhere. Consumers keep writing string comparisons; only the import origin changes.
- **Single atomic PR** — schema change, regeneration diff, vocabulary migration, and consumer updates ship together so reviewers can evaluate consistency across the whole change.
- **No translation shims** — the session-state package migrates directly to `'full'`/`'trail'`; nothing maps old values to new ones at runtime.

## What We'd Love Feedback On

Two questions worth settling before implementation locks in:

**Display mode vocabulary**: `full` and `trail` are the current proposal. Would `complete` and `history` be clearer — especially to analysts who aren't familiar with the snail-trail concept from cartography? The term needs to work in a schema description, a UI label, and a code comparison without ambiguity.

**Enum constants vs string literals**: The template-literal pattern keeps consumers writing `mode === 'trail'`, which is idiomatic TypeScript. The alternative — requiring `mode === DisplayModeEnum.trail` — is more explicit about where the value comes from and harder to mistype. Is there appetite for the more explicit form, or does it add ceremony without meaningful safety benefit given that the type is already narrowed?

→ [Join the discussion](https://github.com/debrief/debrief/discussions)
