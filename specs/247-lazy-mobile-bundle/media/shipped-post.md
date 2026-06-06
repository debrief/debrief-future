---
layout: future-post
title: "Building Smart Bundle Splits for Mobile"
date: 2026-05-07
track: [credibility]
author: Ian
reading_time: 6
tags: [backlog-navigator, performance, code-splitting]
excerpt: "Code-split the Backlog Navigator's mobile components behind lazy boundaries so desktop visitors never download code they won't render."
---

| Before | After |
|---|---|
| Desktop entry chunk ships every mobile-only component | Mobile subtree split into a separate chunk, fetched only on small viewports |
| Bundle guard summed all chunks — splitting just shifted bytes | Guard reads the Vite manifest and measures the entry chunk alone |
| Approaching the +30% cap committed in #244's baseline | Re-baselined to the post-split entry size; future PRs gate against the real floor |

## What We're Building

The Backlog Navigator runs as a single SPA, but its mobile components — CardList, ItemCard, BottomSheet, the two editor screens, StickyPushBar, MobileFilterBar — are dead weight on a desktop session. Until now they all rode along in the entry chunk that every visitor downloads on first paint. With the navigator's mobile PWA shipped in #244, that subtree had grown enough to push the desktop bundle towards the +30% cap we'd committed to in `scripts/bundle-baseline-244.json`.

This change code-splits the mobile subtree behind two `React.lazy` boundaries so a desktop visitor never pays for code they will never render. A mobile visitor sees a `SkeletonLoader` shimmer for the brief moment the chunk is in flight, and a `ChunkErrorBoundary` catches the gnarlier failure modes (stale deploys, flaky networks, Safari's idiosyncratic error message) and offers a Reload button rather than a blank screen.

## How It Fits

The bundle-budget guard introduced in #244 is the enforcement mechanism for our "first paint stays cheap" commitment, and it's where the interesting work lives. Splitting code is straightforward; making the *guard* honest about what it measures is the part that actually defends the saving over time. We flip Vite's `build.manifest` flag, teach `scripts/check-bundle-size.mjs` to identify the entry chunk from `dist/.vite/manifest.json`, and gzip-measure only that file. Without this step, simply moving bytes between chunks would satisfy the old guard while leaving the desktop visitor exactly where they started.

## Key Decisions

- **Two lazy boundaries, not one.** The naive split — wrapping `CardList` in `App.tsx` and stopping there — leaves half the mobile subtree in the entry chunk because `EditorOverlayProvider` statically imports both editor screens and renders them unconditionally. Splitting in both `App.tsx` and `editors/EditorOverlayProvider.tsx` was the only configuration that actually moved the editors out.
- **Manifest-aware measurement.** Vite's manifest is the canonical source of truth for "which file is the entry"; relying on filename heuristics or summing `dist/assets/*.js` would be fragile. Turning on `build.manifest = true` costs nothing and makes the guard precise.
- **Re-baseline rather than ratchet down quietly.** `bundle-baseline-244.json` is updated in this PR to the post-split entry-chunk size. The byte drop is the SC-001 evidence; from here on, regressions are measured against the new floor, not the inflated old one.
- **Zero new dependencies.** `React.lazy` and `Suspense` are React 18 built-ins, the manifest is built into Vite, and the PWA precache from #244 picks up the new chunk automatically. The skeleton fallback reuses `@debrief/components`'s existing `SkeletonLoader` rather than introducing a second shimmer primitive.

## The Numbers

The split delivered concrete byte savings. Desktop entry chunk dropped from 132.74 KB (gzipped) to 126.01 KB — a **6.73 KB reduction** that closes the gap on the +30% cap we'd been approaching:

| Metric | Pre-Split | Post-Split | Change |
|--------|-----------|-----------|--------|
| Desktop entry chunk (raw) | 438,966 B | 415,128 B | **-23.84 KB** |
| Desktop entry chunk (gzipped) | 132,742 B | 126,009 B | **-6.73 KB** |
| Budget headroom vs. +30% cap | +27.9 KB | +37.8 KB | +9.9 KB gained |

All 158 automated tests pass — 152 unit tests (Vitest), 6 Playwright E2E scenarios covering skeleton appearance, chunk-failure recovery, and viewport transitions. The bundle-budget guard's new manifest-aware contract exits 0 within budget across all test cases, and exits 2 appropriately when the manifest is misconfigured.

## The User Experience

On a cold mobile load, the navigator paints a skeleton card list immediately while the mobile chunk is in flight — no blank screen, no wait:

![Skeleton card list appears on cold mobile load before the real cards render](../evidence/screenshots/cold-mobile-skeleton-mobile-iphone.png)

If the chunk fetch fails — stale-deploy URL, network drop, or Safari's quirky error handling — the error boundary surfaces a recovery message with a Reload button rather than leaving the user staring at a skeleton indefinitely:

![Recovery banner explains the chunk load failed and offers a reload action](../evidence/screenshots/recovery-banner-mobile-iphone.png)

Desktop visitors see none of this machinery. The entry chunk they download is 6.73 KB smaller, and the mobile chunk is never requested at all. On a resize across the 1024px breakpoint, the navigator fetches and displays the mobile layout with the same skeleton-to-content transition.

## What's Next

This work unblocks two follow-ups: **#252** will apply a symmetric split to the desktop component tree, so mobile visitors also stop paying for desktop-only code (table, filter bar, keyboard shortcuts). **#253** will capture the bundle-guard contract as a documented ADR — the "entry chunk alone" measurement is a permanent cross-feature covenant that all future splits must respect.

→ [See the code](https://github.com/debrief/debrief-future/pull/247)
