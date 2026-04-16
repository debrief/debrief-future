---
layout: future-post
title: "Shipped: A compact vocabulary bundle for the catalog LLM"
date: 2026-04-14
track: [momentum]
author: Ian
reading_time: 3
tags: [shipped, nl-search, stac-catalog, llm, tracer-bullet]
excerpt: "The LLM no longer needs to see the catalog to filter it — only the words analysts are allowed to use. One script, one 2.7 KB file, byte-identical on every run."
---

## What We Built

Item #187 ships the build-time producer that feeds the natural-language search LLM its vocabulary. `scripts/extract-enum-bundle.py` walks the platform registry (`shared/data/platform-registry.json`) and the regenerated sample catalog (`preview/workspace/samples/local-store/`), and emits `shared/data/enum-bundle.json` — five sections covering the vessel-class taxonomy (interior nodes only), every nationality code in use, every exercise name, every plot tag, and every feature tag.

On the current sample catalog the bundle weighs **2 706 bytes** — small enough to paste into any system prompt without noticing. Two consecutive runs with identical inputs produce a byte-identical file, so the committed artefact is a clean review surface: any PR that changes the registry, catalog, or extraction logic shows the exact diff the LLM will see.

The script is a thin argparse wrapper (≈110 LOC) around a pure-function library module in `debrief_data.enum_bundle` (≈270 LOC). No new third-party dependencies — everything runs on the existing `uv` workspace, `debrief-data` registry loader, and the Python standard library.

## Why It Matters

The throwaway prototype that proved analysts can ask "UK submarines in the 1990s" worked by stuffing the entire 70-item catalog into the prompt. That does not scale to 700, let alone 7 000. With the bundle in place, the LLM never sees operational data — it sees the *shape* of operational data, and that's enough to write a CQL2 filter the existing client-side engine evaluates locally.

This is the last piece Phase 3 of Epic E10 needed before the prompt design work in #188 can start. The contract between the two items is now pinned in a hand-written JSON Schema at `specs/187-build-time-enums/contracts/enum-bundle.schema.json`; the serialised bundle validates against it on every test run.

## Lessons Learned

- **Canonicalisation is a trade-off we're comfortable with.** Trim + case-fold for the deduplication key collapses obvious accidents like `"Training"` vs `"training "`, but preserves first-seen casing so tags like `"ASW"` and `"AAW"` stay visibly upper-cased for human reviewers. A stricter rule would surface every typo; a looser one would hide them. The middle ground felt right for a review-first artefact.
- **Committing the artefact pays for itself the first time it moves.** The review surface is the point — when the regenerated catalog next lands, the PR will show exactly how the LLM's worldview shifts. That's cheap diff-reading instead of expensive prompt debugging.
- **Pure functions + thin script is still the right shape.** Keeping `extract_class_tree`, `scan_catalog`, `build_bundle`, and `serialize` testable in isolation meant 44 unit tests covered the FRs, determinism, drift, conservative extraction, schema conformance, size budget, and CLI exit codes — all without mocking a filesystem.

## What's Next

- **#188 — NL → CQL2 prompt design.** The prompt builder will template the bundle into the system prompt and run a headless test harness of analyst phrases.
- **Drift watch.** Any future change to the registry (#180) or the catalog (#184) should regenerate and re-commit the bundle. The script is idempotent; the PR diff tells the story.
- **Possible follow-ups.** If the prompt builder wants additional vocabularies (start-year decades, region labels, classification bands), add them here rather than forking a local projection inside the prompt builder.
