---
layout: future-post
title: "Shipped: 58 Legacy Tools Documented for Migration"
date: 2026-02-07
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, tool-migration, documentation, legacy-debrief]
excerpt: "Every migrateable tool in legacy Debrief now has a language-neutral spec and golden I/O test fixtures"
---

## What We Built

Legacy Debrief has nearly three decades of maritime analysis tools. We knew that going in. What we didn't know was exactly how many, where they all lived, or how tangled they were with Eclipse RCP.

Now we do. We scanned 85 tool-bearing classes across four package roots and triaged every one: 58 are ready for migration, 5 need further review, 22 are out of scope (pure UI plumbing, deprecated, or too Eclipse-specific to salvage). Each of the 58 ready tools now has a language-neutral specification with pseudocode algorithms, and golden I/O JSON fixtures that any re-implementation must match.

The deliverables break down into three things.

**A discovery report** cataloguing every tool with its category, complexity rating, legacy trigger type, selection context, and triage status. This is the authoritative inventory for planning the migration. It also maps legacy Debrief's 10 trigger types (context menu, toolbar button, drag-drop, wizard, and six others) to Future Debrief's 4 surfaces, flagging where gaps exist.

**63 tool specifications**, each following a 9-section template: metadata, MCP description, inputs, outputs, pseudocode algorithm, edge cases, examples, changelog, and references. The pseudocode uses a constrained keyword set (FUNCTION, FOR EACH, IF/ELSE, WHILE, RETURN) with no language-specific constructs. A developer who has never opened the Java source can read a spec and produce a correct implementation.

**151 golden I/O pairs** -- JSON input and output files capturing exact tool behaviour. Low-complexity tools get one example, medium-complexity get three, high-complexity get four or more. These become automated regression tests the moment someone writes a Python or TypeScript implementation.

**A schema gap analysis** identifying 7 new data types the tool specs imply we'll need in our LinkML schemas -- from `SENSOR` features to `TMA_SEGMENT` and `TUAS_SOLUTION` types. This gives the schema team a concrete shopping list before implementation begins.

## The Numbers

| Metric | Count |
|--------|-------|
| Tool-bearing classes scanned | 85 |
| Tools ready for migration | 58 |
| Tool categories | 7 |
| Tool specifications written | 63 |
| Golden I/O pairs | 151 |
| New schema types identified | 7 |
| Quality checklist items per spec | 11 |

The seven categories, sorted by size: track/measurement (19 tools), track/manipulation (14), track/analysis (8), dataset/export (8), sensor/analysis (4), sensor/calibration (3), track/styling (3). The distribution surprised me. I expected track/analysis to dominate. Instead, measurement tools -- the everyday calculations analysts reach for constantly -- are the largest group by far.

Complexity splits roughly into thirds: 37% low, 30% medium, 33% high. The high-complexity tools cluster in track/analysis and sensor/analysis, which makes sense. Those are the tools doing real mathematical work: CPA calculations, track interpolation, frequency analysis.

## What We Learned

**Manual golden I/O construction worked.** The original plan had two tracks: a Java capture harness for tools that could run in isolation, and manual construction from source analysis for tools too coupled to Eclipse. In practice, every tool used manual construction (Approach B). The legacy tools are deeply intertwined with Eclipse RCP. Rather than fighting that coupling, we read the source, understood the algorithm, and built representative examples by hand. It's slower, but it produced consistently well-structured fixtures.

**The 11-item quality checklist caught real problems.** Not just formatting issues. Missing edge cases, pseudocode that accidentally used Python syntax, result subtypes that didn't follow the naming convention. Validating every spec against the checklist before calling it done added time but avoided accumulating quality debt across 63 specifications.

**Tool parameters exposed schema gaps.** By documenting each tool's inputs and outputs against our LinkML schemas, we discovered 7 new `FeatureKindEnum` values needed (SENSOR, TMA_SEGMENT, TRACK_SEGMENT, TUAS_SOLUTION, LIGHTWEIGHT_TRACK, FREQUENCY_RESIDUALS, ZONE) plus new properties on existing types. The schema gap analysis gives the schema team a concrete list of extensions needed before tool implementation can begin.

**Categories shifted during discovery.** We started with 9 hypothesised categories. Two ended up empty (narrative/formatting had no tools; spatial/geometry merged into track/measurement). The final 7 emerged from what we actually found, not what we expected to find.

## What This Enables

Each specification is a blueprint. Each golden I/O pair is a test. When implementation begins, the path for any individual tool is: read the spec, write the code, run it against the golden fixtures, confirm the outputs match within 1e-9 epsilon tolerance. No ambiguity about what "correct" means.

The discovery report gives us a prioritised backlog. Low-complexity tools first -- they validate the implementation pipeline with minimal risk. High-complexity analysis tools last, when the pattern is proven.

-> [See the specification](https://github.com/debrief/debrief-future/tree/main/specs/001-document-debrief-algorithms)
