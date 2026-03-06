---
layout: future-post
title: "Shipped: STAC Extension Spec + Mock Data Fixtures"
date: 2026-03-06
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac, schemas, e08-discovery-ui]
excerpt: "6 extension properties, 100 realistic fixtures, and a vessel taxonomy — the data contract for Discovery UI."
---

## What We Built

Every component in the Discovery UI epic (E08) needs to agree on what a STAC item looks like. What properties exist, what they're called, what values they hold. Without that contract, each component invents its own assumptions and they drift apart before integration even starts.

We defined a `debrief:` STAC extension namespace with six properties: `vessel_classes`, `tags`, `feature_tags`, `author`, `track_names`, and `nationalities`. These live in a LinkML schema module (`stac-extension.yaml`) that generates Pydantic models for validation. Vessel classes use slash-separated paths through a 4-level taxonomy — `surface/warship/frigate/type23` — with 20 types across domains like surface, subsurface, and air. Nationalities are ISO alpha-2 codes, enforced by regex. Both constraints are machine-checked, not just documented.

Then we generated 100 STAC item fixtures to drive Storybook development. These aren't random data — they're deterministic (seed=42, reproducible across machines) with realistic distributions. Submarine exercises cluster in the North Atlantic and Indo-Pacific. Short-duration items tend to be single-ship tracking exercises. Authors follow a long-tail distribution — a few prolific analysts, many occasional ones. The fixtures include edge cases: zero-track items for annotation-only plots, dense items with 5+ tracks, single-timestamp items with no duration.

## By the Numbers

| | |
|---|---|
| Tests passing | 210 (189 existing + 21 new) |
| Tests failed | 0 |
| Fixture items generated | 100 |
| Extension properties | 6 |
| Vessel types in taxonomy | 20 |
| Distinct nationalities | 6+ (all ISO alpha-2) |
| Distinct authors | 10+ |
| Geographic regions | 4+ |
| Duration buckets covered | 5/5 |
| Round-trip tests | 3 (zero data loss) |

## Lessons Learned

**Decision: duration is computed, not stored.** The SRD lists duration as a filter dimension, so the natural instinct is to store it as a property. But duration is derived from `start_datetime` and `end_datetime`, which already exist in STAC core. Storing it creates a staleness risk — if someone updates the temporal bounds, the stored duration is wrong until someone remembers to recompute it. Computing at query time is a few microseconds of arithmetic. We documented this in the spec and verified the fixtures support it: every item with a temporal range produces the correct duration bucket when computed client-side.

**Decision: an `unknown` root node in the taxonomy.** Early drafts had no way to distinguish "we don't know what vessel class this is" from "no vessel class was assigned." The `unknown` node sits at the taxonomy root — it's a valid, selectable classification, not a missing value. This matters for filtering: an analyst searching for "all unclassified vessels" gets results, rather than having to figure out whether to filter by empty arrays or null values.

**Regex enforcement caught real mistakes.** During fixture generation, a bug produced vessel paths with capital letters (`Surface/Warship/...`). The Pydantic regex constraint (`^[a-z]`) rejected them immediately. Without that constraint, the fixtures would have looked fine until a case-sensitive filter in the UI silently returned zero results. The fix was trivial — `.lower()` in the generator — but the catch was worth the 30 seconds it took to add the regex.

**Filter selectivity as a test.** One of the more useful tests checks that filtering by any single property value returns between 3% and 80% of items. This prevents degenerate distributions — if one vessel class covers 95% of items, the filter is useless for Storybook testing. If a nationality appears in only 1 item, the filter edge case isn't exercised. The selectivity range forced us to tune the generation weights until the distributions actually looked like what an analyst would encounter.

## What's Next

These fixtures and the extension contract are the foundation for nine downstream components in E08: the filter sidebar (#126), search bar (#127), results list (#128), map integration (#129), timeline integration (#130), pagination (#131), saved searches (#132), catalog switcher (#133), and responsive layout (#134). The filter sidebar is next — it'll use the vessel taxonomy for hierarchical checkbox trees and the nationality codes for a multi-select dropdown.

-> [See the spec](https://github.com/debrief/debrief-future/tree/125-stac-extension-mock-data/specs/125-stac-extension-mock-data)
-> [View the fixtures](https://github.com/debrief/debrief-future/tree/125-stac-extension-mock-data/shared/schemas/fixtures/stac-browser)
