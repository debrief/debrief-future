---
layout: future-post
title: "Planning: Import Legacy Sample Data"
date: 2026-03-20
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac, io, parsers, demo]
excerpt: "Parsing 148 legacy Debrief files into a browseable STAC catalog for stakeholder demos."
---

## What We're Building

We have about 148 sample data files sitting in the legacy Debrief repository. REP track files, DPF plot files (XML), DSF sensor files. Tutorials, multi-static sonar scenarios, SATC algorithm test data. Some of these files have been in active use for over a decade.

This week we're building the parsers and import pipeline to bring all of them into a STAC catalog that ships with the repository. Clone the repo, open in VS Code, and you're browsing real maritime analysis data immediately. No setup, no file hunting, no "where do I get sample data?"

The work breaks into three parts: a new DPF parser for the XML plot files, a DSF handler for standalone sensor contact files, and a batch import script that processes everything and commits the result at `demo/catalog/`.

## How It Fits

This sits directly on top of two pieces we've already built. The REP parser from Stage 2 handles 75 of the 148 files already. The STAC service from Stage 1 provides the catalog creation, plot management, and provenance tracking APIs.

The two new parsers (DPF, DSF) register alongside the existing REP handler in `debrief-io`. Same interface, same GeoJSON output format, same schema validation. The batch import script just walks a directory, dispatches to the right handler by extension, and feeds the results into the STAC service.

The committed catalog becomes the default dataset for every demo, screenshot, and test going forward. It also validates that our import pipeline works end-to-end across three different file formats with real-world data, not just test fixtures.

## Key Decisions

- **DPF parser uses stdlib `xml.etree.ElementTree`** -- no new dependencies. The XML structure is well-formed and consistent across all 46 files. We considered lxml but didn't need XPath, and the Constitution prefers stdlib where possible.

- **DSF reuses existing REP sensor parsing** -- DSF files contain exactly the same `;SENSOR:` line format as REP files, just without any track position data. The handler delegates to the existing parser rather than duplicating it.

- **One plot per source file** -- the simplest mapping. A REP file with NELSON and COLLINGWOOD tracks produces one plot containing both tracks as GeoJSON features. Provenance traces cleanly back to a single source.

- **Sensor contacts get null geometry when location is unknown** -- many sensor contacts in DPF and DSF files don't have explicit coordinates. They're bearing/range measurements relative to a host track that might be in a different file. Rather than guess or skip them, we store bearing and range in properties with null geometry. All data preserved, nothing fabricated.

- **Catalog organized by scenario category** -- the legacy directory structure already groups files meaningfully (Demo, SATC, MultiStatic, etc.). We preserve that as category tags on each plot so stakeholders can filter by scenario type.

- **Source files preserved as STAC assets** -- every original REP, DPF, and DSF file gets copied into the plot directory with provenance metadata. Constitution Article III requires this, and it means you can always get back to the raw data.

## What We'd Love Feedback On

- What scenario categories matter most for demos? We're deriving them from the legacy directory structure, but there may be better groupings.

- Should we attempt cross-file sensor-to-track correlation in the import, or leave that for runtime? Right now we keep it simple -- each file is independent -- but some DSF sensor files clearly belong with specific track files.

- The full catalog will be committed to the repo. Our target is under 50 MB for the parsed output (the source files total about 30 MB). Is there a size threshold where we should consider a separate data repository instead?

> [Join the discussion on GitHub](https://github.com/debrief/debrief-future/discussions)
