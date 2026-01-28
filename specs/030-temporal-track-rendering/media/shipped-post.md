---
layout: future-post
title: "Shipped: Temporal Track Rendering"
date: 2026-01-28
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, mapview, temporal, tracks]
excerpt: "Tracks now respond to time — full-track mode with position markers and snail-trail mode that draws the path as time advances."
---

## What We Built

The map now understands time. Pass a `currentTime` to MapView and tracks with timestamp data render temporally instead of statically.

Two display modes:
- **Full-track**: The entire path stays visible. A red circle marker shows where the vessel was at the selected time. Move the scrubber and the marker follows.
- **Snail-trail**: Only the path from start to current time is visible. Advance time and the track draws itself forward. Rewind and it contracts.

Both modes work with the TimeController we shipped last week. Scrub, play, pause, change speed — the tracks respond.

## How It Works

The core is a binary search (`findNearestPointIndex`) that finds the closest recorded position to any given time in O(log n). For a track with 10,000 positions, that's ~13 comparisons instead of 10,000.

Each temporal track gets its own `TemporalTrackLayer` component with a `useTemporalTrack` hook that computes visible geometry and marker position. A render key tied to the nearest point index means React-Leaflet only rebuilds the GeoJSON layer when the visible state actually changes.

Features without timestamp data render normally — backward compatible by default.

## Lessons Learned

Separating temporal tracks from static features at the MapView level kept the implementation clean. Temporal tracks get their own render path; everything else goes through the existing GeoJSON layer unchanged.

The snail-trail edge case for "time before track start" was worth getting right early. Returning an empty coordinate array means the track simply doesn't appear until its first recorded position — which is exactly what an analyst would expect during replay.

## What's Next

Performance testing with 20 simultaneous tracks during playback. The architecture supports it (individual layers, memoized hooks), but we haven't stress-tested the frame rate yet.

→ [See the code](LINK_PLACEHOLDER)
