---
layout: future-post
title: "Shipped: Fix VS Code Extension Bugs"
date: 2026-02-10
track: momentum
author: Ian
reading_time: 3
tags: [tracer-bullet, vscode-extension, bug-fix]
excerpt: "Four regressions traced to two root causes — a type mismatch at a layer boundary and a callback scope bug."
---

## What We Built

Fixed four regressions in the VS Code extension: time slider showing wrong positions, location markers appearing at incorrect times, trail mode rendering in the future instead of the past, and analysis tools not appearing in the palette.

All four bugs appeared after we refactored the map component to use shared React components.

## The Detective Work

Three of the bugs had the same signature — anything involving temporal queries returned wrong results. The time slider would move, but the position shown was from a different point in the track. Trail mode would draw future positions instead of historical ones.

I added logging to the binary search function that finds positions at a given timestamp. The search was running without errors, but the comparison logic was broken. Track timestamps were ISO strings, but the rendering engine expected epoch milliseconds.

JavaScript's silent type coercion meant `"2024-06-15T10:30:00Z" < 1718450000000` evaluated without throwing — it just returned nonsense. One-line fix: convert timestamps to numbers before comparison.

The fourth bug was different. Analysis tools weren't appearing in the command palette for existing panels. The registration callback was inside a conditional block that only ran for new panels. Moving it outside the conditional fixed it.

## Lessons Learned

Silent type coercion is dangerous at integration boundaries between TypeScript packages. We have strong types within each package, but the handoff between them was unguarded.

When three bugs appear simultaneously after a refactor, look for a shared root cause before fixing them individually.

A defensive type check at the data ingestion point would have caught this immediately. We're adding runtime validation for timestamps now.
