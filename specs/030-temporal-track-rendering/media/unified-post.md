---
title: "Building Temporal Track Rendering"
date: 2026-01-28
layout: future-post
author: Ian
track: credibility
excerpt: "Tracks now respond to time — full-track mode with position markers and snail-trail mode that draws the path as time advances."
tags:
  - mapview
  - temporal
  - tracks
---

## What We're Building

Static maps lie by omission. Show all track positions at once and you've got a spaghetti diagram that hides when vessels were where, when paths crossed, when situations developed. Maritime analysts need to see tracks through time, not just in space.

We're adding temporal awareness to our MapView component with two display modes. In **full-track mode**, you see the complete path with a highlight marker showing exactly where each vessel was at the current time. In **snail-trail mode**, tracks draw themselves as time advances — only the portion from start to "now" appears, revealing how situations developed without future positions cluttering the view.

The time controller we built last week provides the scrubber and playback controls. This work makes tracks actually respond to those controls.

## How It Fits

The new TemporalTrackLayer component sits within MapView, receiving the current time as a prop from the parent. It's a controlled component — no internal state for temporal position — which means the same code works in VS Code, Electron, or a browser demo.

Utility functions handle the temporal logic: a binary search finds the track point closest to any given time, and a slicing function extracts the trail portion. These are pure functions, easy to test independently of React or Leaflet.

## Key Decisions

- **Binary search for nearest point**: Track coordinates are naturally ordered by time. O(log n) lookup means we can handle tracks with thousands of points without missing our 10fps target during playback.

- **Memoization with render keys**: React-Leaflet's GeoJSON component doesn't efficiently update when data changes. The established pattern is to use memoized geometry plus a key that changes when the geometry changes, forcing a clean remount. Not elegant, but well-understood.

- **CircleMarker for position highlight**: Lightweight, no icon loading, scale-independent. A contrasting color against the track ensures visibility without pulsing animations that add visual noise during playback.

- **Props, not subscriptions**: The parent component subscribes to session state and passes temporal props down. Keeps TemporalTrackLayer testable in isolation and maintains our "thick services, thin frontends" pattern.

- **Graceful edge case handling**: Time before track start? Full mode shows the track without a marker. Time after track end? Marker stays at the final position. Empty track? Skip rendering entirely. No errors, just sensible defaults.

The map now understands time. Pass a `currentTime` to MapView and tracks with timestamp data render temporally instead of statically.

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
