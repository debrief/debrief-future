---
layout: future-post
title: "Planning: Per-Position Styling for Track Data"
date: 2026-02-04
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, schemas, geojson]
excerpt: "Bringing back legacy Debrief's per-position formatting while cleaning up our data model"
---

## What We're Building

Legacy Debrief users have spent years building analysis workflows around a specific capability: marking individual positions along a track. "Contact first detected here." "Course change at 1142." "Show symbols every 5 minutes so I can see progress." This isn't a nice-to-have — it's fundamental to how maritime analysts communicate and document their work.

Our current GeoJSON model doesn't support this. Every position on a track gets the same styling, and that's not how real analysis works. This feature adds three things: default styling for all positions, interval-based rules ("show a symbol every 5 minutes"), and explicit overrides for marking specific moments.

## How It Fits

This builds directly on the schema-first architecture we've been developing. The changes happen in LinkML (our source of truth), then propagate automatically to Pydantic models, TypeScript types, and JSON Schema. We're also fixing a data hygiene issue while we're in there — coordinates were being stored in two places, which is asking for trouble.

The pattern we're using here — defaults, then interval rules, then sparse overrides — is deliberate. It matches how legacy users actually work: set up a track with sensible defaults, apply some interval-based automation, then hand-annotate the interesting bits.

## Key Decisions

- **Coordinates live in geometry only.** Each position's coordinates come from `geometry.coordinates[i]`, not duplicated in the positions array. The two arrays are parallel and must stay in sync.

- **ISO 8601 durations for intervals.** `"PT5M"` means five minutes. It's a standard format that works across Python and TypeScript without ambiguity.

- **"Nearest position" for interval alignment.** Real track data rarely lands exactly on round intervals. When you ask for symbols every 5 minutes, you get them at the positions closest to each 5-minute mark.

- **Overrides are sparse.** Most positions don't need custom styling. The `position_style_overrides` array only contains entries for positions that differ from the defaults.

## What We'd Love Feedback On

- **Is the interval range right?** We're planning to support 1 second to 1 day. Legacy Debrief had specific presets in a dropdown — would fixed intervals work better than arbitrary durations?

- **Label text defaults.** When you enable labels but don't specify text, should they show the timestamp (our current plan) or something else like position number?

- **Override lookup by timestamp.** We're keying overrides by timestamp string. If you're working with tracks that might have duplicate timestamps (unusual but possible), would you prefer index-based lookup?

The implementation plan and schema details are in the [spec directory](https://github.com/debrief/debrief-future/tree/main/specs/048-geojson-position-metadata).
