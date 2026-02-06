---
layout: future-post
title: "Planning: Cross-Service End-to-End Workflow Tests"
date: 2026-02-06
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, testing, integration, io, stac, calc]
excerpt: "Adding integration tests that exercise the full io-to-stac-to-calc pipeline to catch cross-service regressions"
---

## What We're Building

Each of Debrief's three core services -- io (file parsing), stac (catalog storage), and calc (analysis tools) -- already has its own unit tests. But nothing currently verifies that data flows correctly across the boundaries between them. A change to how io formats a parsed track could silently break what stac expects to receive. A shift in how stac structures its feature collections could confuse calc when it tries to run an analysis. These are the kinds of bugs that only show up when everything is wired together, and they tend to surface at the worst possible time.

So we're adding a set of end-to-end workflow tests that exercise the complete pipeline: parse a REP file with debrief-io, store the resulting features in a STAC catalog with debrief-stac, run an analysis tool with debrief-calc, and persist the results back into the catalog. The tests verify that the data contracts hold at every handoff point, and that provenance metadata -- the chain of custody from source file to analysis result -- survives the entire journey.

## How It Fits

This sits squarely in the "defence-grade reliability" territory from our constitution. The three services are designed to be independent, with clean API boundaries and no shared mutable state. That independence is valuable, but it creates seams where things can go wrong without anyone noticing. These tests are the stitching that keeps those seams honest. They live at the repository root in `tests/e2e/`, a workspace-level concern that doesn't belong to any single service. They slot into the existing `uv run pytest` pipeline with zero configuration changes -- run `task test` and they just appear.

## Key Decisions

- **Tests at the repository root, not inside a service.** Cross-service tests are a workspace concern. Putting them inside `services/stac/tests/` or `services/calc/tests/` would give a misleading signal about ownership. The `tests/e2e/` directory is auto-discovered by pytest through the existing root config.

- **Reusing existing io test fixtures.** The `boat1.rep` and `boat2.rep` files already in the io test suite give us well-characterised data (NELSON with 30 positions, COLLINGWOOD track). Duplicating them would create a maintenance burden and violate DRY. STAC catalogs are created fresh in `tmp_path` for each test to ensure isolation.

- **Three test modules, aligned with user stories.** `test_full_workflow.py` covers the complete parse-store-analyse-persist cycle. `test_multi_file.py` covers loading two REP files into the same plot and running multi-track analysis. `test_error_propagation.py` covers malformed input handling and kind mismatches. Each module runs independently, which makes debugging faster.

- **Direct Python imports, not MCP wrappers.** Tests call `from debrief_io import parse` and `from debrief_calc import run` directly. This tests the actual service API surface -- the same interface a real orchestrator would use. Wrapping calls in MCP would test the serialisation layer, not the contracts.

- **Provenance verified at every stage.** From `source_file` in the parsed features, through `debrief:provenance` in STAC assets, to `properties.provenance` in calc output with tool name, version, timestamp, and source references. The full chain must be internally consistent -- IDs match, timestamps are ordered.

- **Zero new dependencies, zero CI changes.** Everything uses existing workspace members and standard pytest. The tests complete in under 30 seconds.

## What We'd Love Feedback On

- **Coverage priority**: We've chosen three test modules aligned with the most common user workflows. Are there cross-service scenarios specific to maritime analysis that we should add? For instance, handling tracks that cross the antimeridian, or plots that accumulate analysis results from repeated tool runs.

- **Error scenarios**: We're testing malformed REP input and kind mismatches. Are there failure modes at the service boundaries that have bitten you in pipeline architectures before? Particularly interested in subtle data corruption cases versus loud failures.

- **Fixture data**: We're reusing the existing boat1.rep and boat2.rep test fixtures. If you have REP files with interesting edge cases -- unusual coordinate formats, very long tracks, mixed feature types -- those would make the test suite more robust.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
