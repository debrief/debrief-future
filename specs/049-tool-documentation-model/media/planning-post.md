---
layout: future-post
title: "Planning: Language-Neutral Tool Documentation Model"
date: 2026-02-05
track: [momentum]
author: Ian
reading_time: 3
tags: [tool-spec, python, typescript, cross-implementation]
excerpt: "Building a shared specification system so Python and TypeScript implementations behave identically"
---

## What We're Building

Future Debrief runs tools in both Python (services) and TypeScript (VS Code extension). When the same tool exists in both languages, subtle differences creep in. A color that rounds differently. An edge case that one handles and the other ignores. These inconsistencies compound.

We're creating a tool specification system: markdown documents that define exactly what a tool does, with enough precision that two developers working independently in different languages produce implementations that behave identically.

Each spec has nine sections: metadata for tooling, MCP descriptions for LLM discovery, formal input/output schemas, a pseudocode algorithm, edge case documentation, golden examples, a changelog, and references. The algorithm section is the core. It uses language-neutral pseudocode that reads naturally to both Python and TypeScript developers without biasing toward either.

Golden examples are JSON file pairs sitting alongside each spec. Run any implementation against the input file; compare the output to the expected output. If they match, the implementation is correct. If not, either the implementation has a bug or the spec needs clarification.

## How It Fits

Tool specs live in `shared/tools/`, parallel to our existing `shared/schemas/`. The hierarchy mirrors tool categories: `track/styling/`, `track/analysis/`, `measure/`. This keeps specs discoverable and lets us build tooling around them later.

We're also adding a Python `@tool_spec` decorator that links implementations to their specs. At import time, it validates the spec exists. If someone references a spec that doesn't exist, they find out immediately, not when the tool runs in production. The decorator also makes specs accessible programmatically for introspection and documentation generation.

## Key Decisions

- **Semver in filenames**: `set-track-color.1.0.md` rather than version in metadata. Multiple versions coexist; implementations reference exact versions.
- **Reference existing schemas**: Inputs use GeoJSON feature schemas, outputs use ToolResults. No new data models.
- **Pseudocode over formal methods**: TLA+ or Z would be more rigorous but create a learning barrier. Python-ish pseudocode with FOR EACH, IF, END IF is readable by anyone.
- **Golden examples as JSON pairs**: Separate files for input and output. Naming convention enables automated test discovery.
- **Python decorator first**: TypeScript annotation infrastructure is future work. Python implementation validates the pattern.

## What We'd Love Feedback On

We're starting with four track/styling tools: set-track-color, apply-symbol-style, label-interval, symbol-interval. Simple tools, but enough to validate the template structure.

Questions we're wrestling with:

1. **Spec granularity**: Should each variation be a separate spec, or should one spec cover multiple related behaviors? For example, does "set color for all tracks" vs "set color by property value" warrant two specs?

2. **Algorithm precision**: How much detail is right? Too little and implementations diverge. Too much and we're basically writing the code twice.

3. **Golden example coverage**: Minimum viable examples vs comprehensive edge case coverage. What's the right balance for initial specs?

If you've worked on cross-implementation consistency problems, we'd welcome your perspective.

[Join the discussion](https://github.com/debrief/debrief-future/discussions)
