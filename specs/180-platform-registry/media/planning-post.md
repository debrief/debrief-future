---
layout: future-post
title: "Planning: Platform Registry"
date: 2026-04-13
track: [momentum]
author: Ian
reading_time: 4
tags: [platform-registry, e10-catalog-discovery, shared-data, tracer-bullet]
excerpt: "Structuring vessel identity so queries like 'UK submarines' just work"
---

## What We're Building

Right now, ten platform-to-vessel-class mappings are hardcoded in a Python script. `NELSON` maps to `type23`, `COLLINGWOOD` maps to `type45`, and so on. The data is there, but it's trapped in a dictionary literal. Ask "which platforms are UK frigates?" and you're writing a bespoke filter by hand.

This week we're building a platform registry: a single YAML file that defines the full vessel class hierarchy as a tree, with real platforms as leaf nodes. A platform's identity — its nationality, vessel type, domain, role — is derived from where it sits in the tree, not stored as flat attributes. `NELSON` lives at `surface/warship/frigate/type23/NELSON`, so its domain is `surface`, its role is `frigate`, its type is `type23`. No redundant fields to get out of sync, no typos in nationality codes. Structural correctness by construction.

Both Python and TypeScript get loaders that read the same file and produce identical results. The Python service layer resolves `NELSON` to exactly the same metadata that the TypeScript frontend displays. One source of truth, two languages, zero drift.

## How It Fits

This is Phase 0 of the E10 epic (NL-Assisted Catalog Discovery) — the foundation everything else depends on. Once the registry exists, we can update the LinkML schema to carry registry-derived fields (#181), warn on unrecognised platforms during import (#182), resolve platform metadata at save time (#183), and regenerate the sample catalog with proper vessel class data (#184). Each of those features is a consumer of the registry, and none of them can start without it.

The registry lives in a new `shared/data/` package alongside `shared/schemas/`. This is domain knowledge, not storage infrastructure or UI logic. It needs to survive backend changes and be importable from any service or frontend. Same dual-language pattern we already use for schemas: `pyproject.toml` + `package.json` side by side, Python source in `src/debrief_data/`, TypeScript source in `src/ts/`.

## Key Decisions

- **YAML tree format, not a flat list** — interior nodes are vessel classes, leaves are platforms. A platform's metadata is derived from its position. This eliminates an entire class of data integrity bugs (mismatched nationality, wrong vessel type) because those values aren't manually authored — they're structural.
- **Build-time YAML-to-JSON for TypeScript** — adding a runtime YAML parser would mean a new dependency for a file that changes only when a developer edits it. A simple build script converts YAML to JSON, and the TypeScript loader reads JSON natively. Zero new runtime dependencies.
- **Golden fixture parity testing** — a single JSON file defines what every platform should resolve to. Both Python and TypeScript test suites load the same fixture and assert field-by-field equality. Cross-language drift becomes a test failure, not a production surprise.
- **`_class` convention for class metadata** — keys starting with `_` carry metadata about the vessel class itself (like a display name). Everything else is either a child class node or a platform leaf. The discriminator is simple: if a node's value has a `name` property, it's a platform.
- **Seeded with 10 known platforms** — the same ones currently hardcoded in the enrich script, mapped to the corrected taxonomy from the E10 epic design. Not all are real vessels (OWNSHIP, SENSOR, TARGET are functional identifiers from legacy exercises), but they represent the complete set we need to support today.

## What We'd Love Feedback On

- **Tree depth conventions**: The initial seed uses four levels (domain > role-category > role > type), but the loaders handle arbitrary depth. Is four levels the right granularity for the defence maritime domain, or are there cases where a fifth level would be natural?
- **Platform ID casing**: IDs are currently all-caps (`NELSON`, `COLLINGWOOD`), matching the legacy import data. Should we keep this convention going forward, or adopt a different casing rule for new platforms?
- **Contrib overlays**: Organisation-specific platforms are explicitly out of scope here, but the architecture needs to support them eventually (via `contrib/`). If you have views on how overlay registries should merge with the base tree, we'd rather hear them now than discover conflicts later.

-> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
